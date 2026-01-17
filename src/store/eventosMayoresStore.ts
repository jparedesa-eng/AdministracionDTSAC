
import { supabase } from "../supabase/supabaseClient";

export type EventoMayor = {
    id: string;
    cctv_id: string;
    sede_id: string;
    fecha_evento: string;
    fecha_hora_inicio: string;
    fecha_hora_fin?: string | null;
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

// Removed auto-fetch in subscribeEventos
export function subscribeEventos(listener: () => void) {
    listeners.add(listener);
    // Auto-fetch removed as per requirement: "por defecto no debe mostrar ningun registro"
    return () => {
        listeners.delete(listener);
    };
}

export async function fetchEventos(startDate?: string, endDate?: string) {
    state = { ...state, loading: true, error: null };
    notify();

    // If no dates, clear events (default state)
    if (!startDate || !endDate) {
        state = { ...state, loading: false, loaded: true, eventos: [] };
        notify();
        return;
    }

    let query = supabase
        .from("cctv_eventos_mayores")
        .select("*")
        .order("fecha_evento", { ascending: false });

    // Apply strict date range
    if (startDate) query = query.gte("fecha_evento", startDate);
    if (endDate) query = query.lte("fecha_evento", endDate);

    const { data, error } = await query;

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


