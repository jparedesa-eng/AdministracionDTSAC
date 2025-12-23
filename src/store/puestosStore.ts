// src/store/puestosStore.ts
import { supabase } from "../supabase/supabaseClient";

export type Turno = "DIA" | "NOCHE";

export type Puesto = {
    id: string;
    nombre: string;
    sede_id: string;
    turnos: Turno[];
    activo: boolean;
    created_at?: string | null;
    updated_at?: string | null;
};

type PuestosState = {
    puestos: Puesto[];
    loading: boolean;
    error: string | null;
};

const state: PuestosState = {
    puestos: [],
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export function getPuestosState(): PuestosState {
    return state;
}

export function subscribePuestos(cb: () => void): () => void {
    listeners.add(cb);

    // Primera carga perezosa
    if (!state.loading && state.puestos.length === 0) {
        void refreshPuestos();
    }

    return () => {
        listeners.delete(cb);
    };
}

export async function refreshPuestos(): Promise<void> {
    state.loading = true;
    state.error = null;
    notify();

    const { data, error } = await supabase
        .from("puestos_seguridad")
        .select("*")
        .order("nombre", { ascending: true });

    if (error) {
        state.error = error.message;
        state.loading = false;
        notify();
        return;
    }

    state.puestos = (data || []).map((row) => ({
        id: row.id as string,
        nombre: row.nombre as string,
        sede_id: row.sede_id as string,
        turnos: (row.turnos || []) as Turno[],
        activo: row.activo as boolean,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));

    state.loading = false;
    notify();
}

export async function upsertPuesto(input: {
    id?: string;
    nombre: string;
    sede_id: string;
    turnos: Turno[];
    activo?: boolean;
}): Promise<void> {
    const payload = {
        nombre: input.nombre,
        sede_id: input.sede_id,
        turnos: input.turnos,
        activo: input.activo ?? true,
    };

    const { error } = await supabase
        .from("puestos_seguridad")
        .upsert(
            input.id
                ? { id: input.id, ...payload }
                : payload,
            { onConflict: "id" }
        );

    if (error) {
        throw new Error(error.message);
    }

    await refreshPuestos();
}

export async function deletePuesto(id: string): Promise<void> {
    const { error } = await supabase
        .from("puestos_seguridad")
        .delete()
        .eq("id", id);

    if (error) {
        throw new Error(error.message);
    }

    await refreshPuestos();
}
