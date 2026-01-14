
import { supabase } from "../supabase/supabaseClient";

export type EventoMayor = {
    id: string;
    fecha_hora: string;
    tipo_evento: string;
    descripcion?: string;
    impacto?: string;
    estado: string;
    created_at?: string;
};

interface EventosState {
    eventos: EventoMayor[];
    loaded: boolean;
    loading: boolean;
    error: string | null;
}

let state: EventosState = {
    eventos: [],
    loaded: false,
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((cb) => cb());
}

export function getEventosState() {
    return state;
}

export function subscribeEventos(listener: () => void) {
    listeners.add(listener);
    if (!state.loaded && !state.loading) {
        void fetchEventos();
    }
    return () => {
        listeners.delete(listener);
    };
}

async function fetchEventos() {
    state = { ...state, loading: true, error: null };
    notify();

    const { data, error } = await supabase
        .from("cctv_eventos_mayores")
        .select("*")
        .order("fecha_hora", { ascending: false });

    if (error) {
        console.error("Error fetching eventos mayores:", error);
        state = { ...state, loading: false, error: error.message };
    } else {
        state = {
            ...state,
            loading: false,
            loaded: true,
            eventos: (data as EventoMayor[]) || [],
        };
    }
    notify();
}

export async function upsertEvento(evento: Partial<EventoMayor>) {
    const { error } = await supabase
        .from("cctv_eventos_mayores")
        .upsert(evento)
        .select()
        .single();

    if (error) throw error;
    await fetchEventos();
}


