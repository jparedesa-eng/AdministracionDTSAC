// src/store/sedesStore.ts
import { supabase } from "../supabase/supabaseClient";

export type Sede = {
    id: string;
    nombre: string;
    created_at?: string | null;
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

    const { data, error } = await supabase
        .from("sedes")
        .select("id, nombre, created_at")
        .order("nombre", { ascending: true });

    if (error) {
        state.error = error.message;
        state.loading = false;
        notify();
        return;
    }

    state.sedes = (data || []).map((row) => ({
        id: row.id as string,
        nombre: row.nombre as string,
        created_at: row.created_at,
    }));

    state.loading = false;
    notify();
}

export async function upsertSede(input: {
    id?: string;
    nombre: string;
}): Promise<void> {
    const payload = {
        nombre: input.nombre,
    };

    const { error } = await supabase
        .from("sedes")
        .upsert(
            input.id
                ? { id: input.id, ...payload }
                : payload,
            { onConflict: "id" }
        );

    if (error) {
        throw new Error(error.message);
    }

    await refreshSedes();
}
