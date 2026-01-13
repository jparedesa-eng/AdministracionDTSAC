// src/store/sedesStore.ts
import { supabase } from "../supabase/supabaseClient";

export type Sede = {
    id: string;
    nombre: string;
    created_at?: string | null;
    operadores?: string[]; // ["CLARO", "ENTEL", ...]
};

type SedesState = {
    sedes: Sede[];
    loading: boolean;
    error: string | null;
};

const state: SedesState = {
    sedes: [],
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export function getSedesState(): SedesState {
    return state;
}

export function subscribeSedes(cb: () => void): () => void {
    listeners.add(cb);

    // Primera carga perezosa
    if (!state.loading && state.sedes.length === 0) {
        void refreshSedes();
    }

    return () => {
        listeners.delete(cb);
    };
}

export async function refreshSedes(): Promise<void> {
    state.loading = true;
    state.error = null;
    notify();

    // 1. Fetch Sedes
    const { data: sedesData, error: sedesError } = await supabase
        .from("sedes")
        .select("id, nombre, created_at")
        .order("nombre", { ascending: true });

    if (sedesError) {
        state.error = sedesError.message;
        state.loading = false;
        notify();
        return;
    }

    // 2. Fetch Coverage (Sede -> Operador)
    const { data: opsData, error: opsError } = await supabase
        .from("telefonia_sedes_operadores")
        .select("sede_id, operador");

    if (opsError) {
        console.error("Error fetching coverage:", opsError);
        // We continue, just without coverage info
    }

    // 3. Map coverage to sedes
    const coverageMap = new Map<string, string[]>();
    if (opsData) {
        opsData.forEach((row) => {
            const current = coverageMap.get(row.sede_id) || [];
            current.push(row.operador);
            coverageMap.set(row.sede_id, current);
        });
    }

    state.sedes = (sedesData || []).map((row) => ({
        id: row.id as string,
        nombre: row.nombre as string,
        created_at: row.created_at,
        operadores: coverageMap.get(row.id) || [],
    }));

    state.loading = false;
    notify();
}

export async function upsertSede(input: {
    id?: string;
    nombre: string;
    operadores?: string[]; // Optional: update coverage too
}): Promise<void> {
    const payload = {
        nombre: input.nombre,
    };

    // 1. Upsert Sede
    const { data, error } = await supabase
        .from("sedes")
        .upsert(
            input.id
                ? { id: input.id, ...payload }
                : payload,
            { onConflict: "id" }
        )
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    const sedeId = data.id;

    // 2. Update Operators if provided
    if (input.operadores !== undefined) {
        // Delete all existing for this sede
        await supabase
            .from("telefonia_sedes_operadores")
            .delete()
            .eq("sede_id", sedeId);

        // Insert new ones
        if (input.operadores.length > 0) {
            const opsPayload = input.operadores.map(op => ({
                sede_id: sedeId,
                operador: op
            }));
            const { error: opsErr } = await supabase
                .from("telefonia_sedes_operadores")
                .insert(opsPayload);

            if (opsErr) throw new Error("Error saving operators coverage: " + opsErr.message);
        }
    }

    await refreshSedes();
}
