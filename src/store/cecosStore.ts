import { supabase } from "../supabase/supabaseClient";

export type Ceco = {
    id: string;
    codigo: string; // The 10 digit numeric string
    descripcion?: string;
    created_at?: string;
    active: boolean;
};

type CecosState = {
    cecos: Ceco[];
    loading: boolean;
    error: string | null;
};

const state: CecosState = {
    cecos: [],
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export function getCecosState(): CecosState {
    return state;
}

export function subscribeCecos(cb: () => void): () => void {
    listeners.add(cb);
    if (!state.loading && state.cecos.length === 0) {
        void refreshCecos();
    }
    return () => {
        listeners.delete(cb);
    };
}

export async function refreshCecos(): Promise<void> {
    state.loading = true;
    state.error = null;
    notify();

    try {
        const { data, error } = await supabase
            .from("cecos") // IMPORTANT: Assuming table name 'cecos'
            .select("*")
            .order("codigo", { ascending: true });

        if (error) throw error;
        state.cecos = data as Ceco[];
    } catch (err: any) {
        console.error("Error fetching cecos:", err);
        state.error = err.message || "Error cargando CECOs";
    } finally {
        state.loading = false;
        notify();
    }
}

export async function upsertCeco(ceco: Partial<Ceco>): Promise<Ceco> {
    // Basic validation
    if (!ceco.codigo || ceco.codigo.length !== 10) {
        throw new Error("El CECO debe tener 10 dígitos numéricos.");
    }
    // Check numeric
    if (!/^\d+$/.test(ceco.codigo)) {
        throw new Error("El CECO debe contener solo números.");
    }

    const { data, error } = await supabase
        .from("cecos")
        .upsert({
            id: ceco.id,
            codigo: ceco.codigo,
            descripcion: ceco.descripcion,
            active: ceco.active ?? true,
        })
        .select()
        .single();

    if (error) throw error;

    await refreshCecos();
    return data as Ceco;
}

export async function deleteCeco(id: string): Promise<void> {
    const { error } = await supabase
        .from("cecos")
        .delete()
        .eq("id", id);
    if (error) throw error;
    await refreshCecos();
}
