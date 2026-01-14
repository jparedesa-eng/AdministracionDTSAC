
import { supabase } from "../supabase/supabaseClient";

export type NVR = {
    id: string;
    codigo: string;
    nombre: string;
    central_id: string;
    marca?: string;
    canales?: string;
    capacidad_tb?: string;
    estado: string;
    created_at?: string;
};

interface NVRState {
    nvrs: NVR[];
    loaded: boolean;
    loading: boolean;
    error: string | null;
}

let state: NVRState = {
    nvrs: [],
    loaded: false,
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((cb) => cb());
}

export function getNVRState() {
    return state;
}

export function subscribeNVR(listener: () => void) {
    listeners.add(listener);
    if (!state.loaded && !state.loading) {
        void fetchNVRs();
    }
    return () => {
        listeners.delete(listener);
    };
}

async function fetchNVRs() {
    state = { ...state, loading: true, error: null };
    notify();

    const { data, error } = await supabase
        .from("cctv_nvr")
        .select("*")
        .order("codigo", { ascending: true });

    if (error) {
        console.error("Error fetching nvrs:", error);
        state = { ...state, loading: false, error: error.message };
    } else {
        state = {
            ...state,
            loading: false,
            loaded: true,
            nvrs: (data as NVR[]) || [],
        };
    }
    notify();
}

export async function upsertNVR(nvr: Partial<NVR>) {
    const { error } = await supabase
        .from("cctv_nvr")
        .upsert(nvr)
        .select()
        .single();

    if (error) throw error;
    await fetchNVRs();
}

export async function deleteNVR(id: string) {
    const { error } = await supabase.from("cctv_nvr").delete().eq("id", id);
    if (error) throw error;
    await fetchNVRs();
}
