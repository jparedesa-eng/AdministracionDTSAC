
import { supabase } from "../supabase/supabaseClient";

export type Pantalla = {
    id: string;
    codigo: string;
    nombre: string;
    central_id: string;
    sede_id?: string;
    ubicacion?: string;
    marca?: string;
    pulgadas?: string;
    estado: string;
    created_at?: string;
};

interface PantallasState {
    pantallas: Pantalla[];
    loaded: boolean;
    loading: boolean;
    error: string | null;
}

let state: PantallasState = {
    pantallas: [],
    loaded: false,
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((cb) => cb());
}

export function getPantallasState() {
    return state;
}

export function subscribePantallas(listener: () => void) {
    listeners.add(listener);
    if (!state.loaded && !state.loading) {
        void fetchPantallas();
    }
    return () => {
        listeners.delete(listener);
    };
}

async function fetchPantallas() {
    state = { ...state, loading: true, error: null };
    notify();

    const { data, error } = await supabase
        .from("cctv_pantallas")
        .select("*")
        .order("codigo", { ascending: true });

    if (error) {
        console.error("Error fetching pantallas:", error);
        state = { ...state, loading: false, error: error.message };
    } else {
        state = {
            ...state,
            loading: false,
            loaded: true,
            pantallas: (data as Pantalla[]) || [],
        };
    }
    notify();
}

export async function upsertPantalla(pantalla: Partial<Pantalla>) {
    const { error } = await supabase
        .from("cctv_pantallas")
        .upsert(pantalla)
        .select()
        .single();

    if (error) throw error;
    await fetchPantallas();
}

export async function deletePantalla(id: string) {
    const { error } = await supabase.from("cctv_pantallas").delete().eq("id", id);
    if (error) throw error;
    await fetchPantallas();
}
