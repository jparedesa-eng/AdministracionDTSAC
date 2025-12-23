// src/store/agentesStore.ts
import { supabase } from "../supabase/supabaseClient";

export type Agente = {
    id: string;
    nombre: string;
    dni?: string | null;
    supervisor?: string | null;
    activo: boolean;
    created_at?: string | null;
    updated_at?: string | null;
};

type AgentesState = {
    agentes: Agente[];
    loading: boolean;
    error: string | null;
};

const state: AgentesState = {
    agentes: [],
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export function getAgentesState(): AgentesState {
    return state;
}

export function subscribeAgentes(cb: () => void): () => void {
    listeners.add(cb);

    // Primera carga perezosa
    if (!state.loading && state.agentes.length === 0) {
        void refreshAgentes();
    }

    return () => {
        listeners.delete(cb);
    };
}

export async function refreshAgentes(): Promise<void> {
    state.loading = true;
    state.error = null;
    notify();

    const { data, error } = await supabase
        .from("agentes_seguridad")
        .select("*")
        .order("nombre", { ascending: true });

    if (error) {
        state.error = error.message;
        state.loading = false;
        notify();
        return;
    }

    state.agentes = (data || []).map((row) => ({
        id: row.id as string,
        nombre: row.nombre as string,
        dni: row.dni,
        supervisor: row.supervisor,
        activo: row.activo as boolean,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));

    state.loading = false;
    notify();
}

export async function upsertAgente(input: {
    id?: string;
    nombre: string;
    dni?: string;
    supervisor?: string;
    activo?: boolean;
}): Promise<void> {
    const payload = {
        nombre: input.nombre,
        dni: input.dni || null,
        supervisor: input.supervisor || null,
        activo: input.activo ?? true,
    };

    const { error } = await supabase
        .from("agentes_seguridad")
        .upsert(
            input.id
                ? { id: input.id, ...payload }
                : payload,
            { onConflict: "id" }
        );

    if (error) {
        throw new Error(error.message);
    }

    await refreshAgentes();
}

export async function deleteAgente(id: string): Promise<void> {
    const { error } = await supabase
        .from("agentes_seguridad")
        .delete()
        .eq("id", id);

    if (error) {
        throw new Error(error.message);
    }

    await refreshAgentes();
}
