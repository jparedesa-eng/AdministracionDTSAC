
import { supabase } from "../supabase/supabaseClient";

export type Sensor = {
    id: string;
    codigo: string;
    nombre: string;
    central_id: string;
    sede_id?: string;
    ubicacion?: string;
    tipo?: string;
    marca?: string;
    estado: string;
    created_at?: string;
};

interface SensoresState {
    sensores: Sensor[];
    loaded: boolean;
    loading: boolean;
    error: string | null;
}

let state: SensoresState = {
    sensores: [],
    loaded: false,
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((cb) => cb());
}

export function getSensoresState() {
    return state;
}

export function subscribeSensores(listener: () => void) {
    listeners.add(listener);
    if (!state.loaded && !state.loading) {
        void fetchSensores();
    }
    return () => {
        listeners.delete(listener);
    };
}

async function fetchSensores() {
    state = { ...state, loading: true, error: null };
    notify();

    const { data, error } = await supabase
        .from("cctv_sensores")
        .select("*")
        .order("codigo", { ascending: true });

    if (error) {
        console.error("Error fetching sensores:", error);
        state = { ...state, loading: false, error: error.message };
    } else {
        state = {
            ...state,
            loading: false,
            loaded: true,
            sensores: (data as Sensor[]) || [],
        };
    }
    notify();
}

export async function upsertSensor(sensor: Partial<Sensor>) {
    const { error } = await supabase
        .from("cctv_sensores")
        .upsert(sensor)
        .select()
        .single();

    if (error) throw error;
    await fetchSensores();
}

export async function deleteSensor(id: string) {
    const { error } = await supabase.from("cctv_sensores").delete().eq("id", id);
    if (error) throw error;
    await fetchSensores();
}
