import { supabase } from "../supabase/supabaseClient";

export interface TravelTime {
    id: string;
    proceso: string;
    origen: string;
    destino: string;
    min_time: string;
    max_time: string;
    tipo_envio: string;
    tipo_viaje: string;
    active: boolean;
    created_at?: string;
    origen_lat?: string;
    origen_lng?: string;
    destino_lat?: string;
    destino_lng?: string;
}

let travelTimesState: TravelTime[] = [];
const listeners: Set<() => void> = new Set();

function notify() {
    listeners.forEach((l) => l());
}

export function getTravelTimesState() {
    return { travelTimes: travelTimesState };
}

export function subscribeTravelTimes(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// Fetch initial data
export async function fetchTravelTimes() {
    const { data, error } = await supabase
        .from("monitoreo_tiempos")
        .select("*")
        .order("created_at", { ascending: false });

    if (!error && data) {
        travelTimesState = data as TravelTime[];
        notify();
    }
}

// Realtime subscription
supabase
    .channel("monitoreo_tiempos_channel")
    .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "monitoreo_tiempos" },
        () => {
            fetchTravelTimes();
        }
    )
    .subscribe();

// Initial fetch safe call
fetchTravelTimes().catch(err => console.error("Error invoking initial fetchTravelTimes:", err));

// CRUD Operations

export async function createTravelTime(
    item: Omit<TravelTime, "id" | "created_at">
) {
    const { data, error } = await supabase
        .from("monitoreo_tiempos")
        .insert([item])
        .select()
        .single();

    if (error) throw error;
    await fetchTravelTimes(); // Force refresh
    return data;
}

export async function updateTravelTime(
    id: string,
    updates: Partial<TravelTime>
) {
    const { data, error } = await supabase
        .from("monitoreo_tiempos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    await fetchTravelTimes(); // Force refresh
    return data;
}

export async function deleteTravelTime(id: string) {
    const { error } = await supabase
        .from("monitoreo_tiempos")
        .delete()
        .eq("id", id);

    if (error) throw error;
    await fetchTravelTimes(); // Force refresh
}
