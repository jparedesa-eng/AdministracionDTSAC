import { supabase } from "../supabase/supabaseClient";

export interface Destination {
    id: string;
    name: string;
    address?: string;
    type: 'DESCARGA' | 'MUESTRAS';
    city_zone: string;
    active: boolean;
    lat?: string;
    lng?: string;
    created_at?: string;
}

let destinationsState: Destination[] = [];
const listeners: Set<() => void> = new Set();

function notify() {
    listeners.forEach((l) => l());
}

export function getDestinationsState() {
    return { destinations: destinationsState };
}

export function subscribeDestinations(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export async function fetchDestinations() {
    const { data, error } = await supabase
        .from("monitoreo_destinos")
        .select("*")
        .order("name", { ascending: true });

    if (!error && data) {
        destinationsState = data as Destination[];
        notify();
    }
}

// Realtime subscription
supabase
    .channel("monitoreo_destinos_channel")
    .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "monitoreo_destinos" },
        () => {
            fetchDestinations();
        }
    )
    .subscribe();

fetchDestinations().catch(console.error);

// CRUD
export async function createDestination(item: Omit<Destination, "id" | "created_at">) {
    const { data, error } = await supabase
        .from("monitoreo_destinos")
        .insert([item])
        .select()
        .single();

    if (error) throw error;
    await fetchDestinations();
    return data;
}

export async function updateDestination(id: string, updates: Partial<Destination>) {
    const { data, error } = await supabase
        .from("monitoreo_destinos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    await fetchDestinations();
    return data;
}

export async function deleteDestination(id: string) {
    const { error } = await supabase
        .from("monitoreo_destinos")
        .delete()
        .eq("id", id);

    if (error) throw error;
    await fetchDestinations();
}
