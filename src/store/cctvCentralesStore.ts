// src/store/cctvCentralesStore.ts
import { supabase } from "../supabase/supabaseClient";

export type CctvCentral = {
    id: string;
    nombre: string;
    descripcion?: string | null;
    created_at?: string | null;
    sedes?: string[]; // Array of sede IDs
};

type CentralesState = {
    centrales: CctvCentral[];
    loading: boolean;
    error: string | null;
};

const state: CentralesState = {
    centrales: [],
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export function getCentralesState(): CentralesState {
    return state;
}

export function subscribeCentrales(cb: () => void): () => void {
    listeners.add(cb);

    // Primera carga perezosa
    if (!state.loading && state.centrales.length === 0) {
        void refreshCentrales();
    }

    return () => {
        listeners.delete(cb);
    };
}

export async function refreshCentrales(): Promise<void> {
    state.loading = true;
    state.error = null;
    notify();

    // Fetch centrales with their associated sedes
    const { data: centralesData, error: centralesError } = await supabase
        .from("cctv_centrales")
        .select("*")
        .order("nombre", { ascending: true });

    if (centralesError) {
        state.error = centralesError.message;
        state.loading = false;
        notify();
        return;
    }

    // Fetch all central-sede relationships
    const { data: relationsData, error: relationsError } = await supabase
        .from("cctv_centrales_sedes")
        .select("central_id, sede_id");

    if (relationsError) {
        state.error = relationsError.message;
        state.loading = false;
        notify();
        return;
    }

    // Map sedes to each central
    state.centrales = (centralesData || []).map((row) => {
        const sedeIds = (relationsData || [])
            .filter(rel => rel.central_id === row.id)
            .map(rel => rel.sede_id as string);

        return {
            id: row.id as string,
            nombre: row.nombre as string,
            descripcion: row.descripcion as string | null,
            created_at: row.created_at,
            sedes: sedeIds,
        };
    });

    state.loading = false;
    notify();
}

export async function upsertCentral(input: {
    id?: string;
    nombre: string;
    descripcion?: string | null;
    sedes?: string[]; // Array of sede IDs
}): Promise<void> {
    const payload: any = {
        nombre: input.nombre,
        descripcion: input.descripcion || null,
    };

    // Upsert the central
    const { data, error } = await supabase
        .from("cctv_centrales")
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

    const centralId = data.id;

    // Update sedes relationships
    if (input.sedes !== undefined) {
        // Delete existing relationships
        await supabase
            .from("cctv_centrales_sedes")
            .delete()
            .eq("central_id", centralId);

        // Insert new relationships
        if (input.sedes.length > 0) {
            const relations = input.sedes.map(sedeId => ({
                central_id: centralId,
                sede_id: sedeId,
            }));

            const { error: relError } = await supabase
                .from("cctv_centrales_sedes")
                .insert(relations);

            if (relError) {
                throw new Error(relError.message);
            }
        }
    }

    await refreshCentrales();
}

export async function deleteCentral(id: string): Promise<void> {
    const { error } = await supabase
        .from("cctv_centrales")
        .delete()
        .eq("id", id);

    if (error) {
        throw new Error(error.message);
    }

    await refreshCentrales();
}
