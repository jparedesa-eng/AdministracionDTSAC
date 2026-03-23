
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
    solucion?: string;
    fecha_ejecucion?: string | null;
    usuario_ejecucion?: string;
    requiere_atencion?: boolean;
    created_at?: string;
};

interface EventosState {
    eventos: EventoMayor[];
    loaded: boolean;
    loading: boolean;
    error: string | null;
    lastFilters: { startDate?: string; endDate?: string };
}

let state: EventosState = {
    eventos: [],
    loaded: false,
    loading: false,
    error: null,
    lastFilters: {},
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
    // If called without args, try to use last filters
    const sDate = startDate !== undefined ? startDate : state.lastFilters.startDate;
    const eDate = endDate !== undefined ? endDate : state.lastFilters.endDate;

    state = { 
        ...state, 
        loading: true, 
        error: null,
        lastFilters: { startDate: sDate, endDate: eDate }
    };
    notify();

    // If no dates, clear events (default state)
    if (!sDate || !eDate) {
        state = { ...state, loading: false, loaded: true, eventos: [] };
        notify();
        return;
    }

    let query = supabase
        .from("cctv_eventos_mayores")
        .select("*")
        .order("fecha_evento", { ascending: false });

    // Apply strict date range
    if (sDate) query = query.gte("fecha_evento", sDate);
    if (eDate) query = query.lte("fecha_evento", eDate);

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
    
    // Refresh using last filters
    await fetchEventos();
}


