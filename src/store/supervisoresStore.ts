import { supabase } from "../supabase/supabaseClient";

export type Supervisor = {
    id: string;
    nombre: string;
    dni: string;
    sedes_asignadas?: string[] | null; // Array of Sede IDs
    activo: boolean; // Computed or stored? Usually stored.
    created_at?: string | null;
};

type SupervisoresState = {
    supervisores: Supervisor[];
    loading: boolean;
    error: string | null;
};

const state: SupervisoresState = {
    supervisores: [],
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export function getSupervisoresState(): SupervisoresState {
    return state;
}

export function subscribeSupervisores(cb: () => void): () => void {
    listeners.add(cb);

    // Initial load
    if (!state.loading && state.supervisores.length === 0) {
        void refreshSupervisores();
    }

    return () => {
        listeners.delete(cb);
    };
}

export async function refreshSupervisores(): Promise<void> {
    state.loading = true;
    state.error = null;
    notify();

    const { data, error } = await supabase
        .from("supervisores_sp")
        .select("*")
        .order("nombre", { ascending: true });

    if (error) {
        state.error = error.message;
        state.loading = false;
        notify();
        return;
    }

    state.supervisores = (data || []).map((row) => ({
        id: row.id,
        nombre: row.nombre,
        dni: row.dni,
        sedes_asignadas: row.sedes_asignadas,
        activo: row.activo ?? true,
        created_at: row.created_at,
    }));

    state.loading = false;
    notify();
}

export async function upsertSupervisor(input: {
    id?: string;
    nombre: string;
    dni: string;
    sedes_asignadas: string[];
    activo?: boolean;
}): Promise<void> {
    const payload = {
        nombre: input.nombre.trim().toUpperCase(),
        dni: input.dni.trim(),
        sedes_asignadas: input.sedes_asignadas,
        activo: input.activo ?? true,
    };

    const { error } = await supabase
        .from("supervisores_sp")
        .upsert(
            input.id
                ? { id: input.id, ...payload }
                : payload,
            { onConflict: "id" }
        );

    if (error) {
        throw new Error(error.message);
    }

    await refreshSupervisores();
}

export async function deleteSupervisor(id: string): Promise<void> {
    const { error } = await supabase
        .from("supervisores_sp")
        .delete()
        .eq("id", id);

    if (error) {
        throw new Error(error.message);
    }

    await refreshSupervisores();
}
