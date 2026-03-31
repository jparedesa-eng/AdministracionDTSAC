import { supabase } from "../supabase/supabaseClient";

export interface LatLng {
    lat: number;
    lng: number;
}

export interface MMPPRecord {
    id: string;
    usuario_creacion_id: string;
    created_at: string;
    operador_cctv: string;
    empresa: string;
    origen: string;
    destino: string;
    fecha_hora_origen: string;
    transportista: string;
    placa: string;
    conductor: string;
    celular_conductor: string;
    parihuelas_pallets: number;
    jabas_bines: number;
    materia_prima: string;
    peso_neto_bruto: number;
    inicio_monitoreo: string;
    fin_monitoreo: string;
    frecuencia: string;
    fecha_hora_llegada: string;
    resguardo: boolean;
    nombre_resguardo: string;
    estado: string;
    tiempo_recorrido: string;
    updated_at: string;
    ubicaciones?: MMPPUbicacion[];
}

export interface MMPPUbicacion {
    id: string;
    monitoreo_mmpp_id: string;
    ubicacion: string;
    timestamp: string;
    usuario_id: string;
}

export interface MMPPRouteTime {
    id: string;
    empresa: string;
    origen: string;
    destino: string;
    tiempo_min: number;
    tiempo_max: number;
    tipo_ruta: string;
}

export interface MMPPTransportista {
    id: string;
    nombre: string;
    placa: string;
    conductor: string;
    celular: string;
    created_at?: string;
}

export type MMPPState = {
    records: MMPPRecord[];
    routeTimes: MMPPRouteTime[];
    transportistas: MMPPTransportista[];
    loading: boolean;
    error: string | null;
};

const state: MMPPState = {
    records: [],
    routeTimes: [],
    transportistas: [],
    loading: false,
    error: null
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export function getMMPPState(): MMPPState {
    return state;
}

export function subscribeMMPP(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}

// ===== SUPABASE OPERATIONS =====

const TABLE_MMPP = 'monitoreo_mmpp';
const TABLE_UBICACIONES = 'monitoreo_mmpp_ubicaciones';
const TABLE_ROUTES = 'monitoreo_mmpp_tiempos_ruta';
const TABLE_TRANSPORTISTAS = 'monitoreo_mmpp_transportistas';

export async function fetchMMPPRecords(): Promise<void> {
    state.loading = true;
    state.error = null;
    notify();

    try {
        const { data, error } = await supabase
            .from(TABLE_MMPP)
            .select(`
                *,
                ${TABLE_UBICACIONES} (*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        state.records = data || [];
    } catch (err: any) {
        state.error = err.message;
    } finally {
        state.loading = false;
        notify();
    }
}

export async function createMMPPRecord(record: Partial<MMPPRecord>): Promise<string> {
    try {
        const { data, error } = await supabase
            .from(TABLE_MMPP)
            .insert(record)
            .select()
            .single();

        if (error) throw error;
        await fetchMMPPRecords();
        return data.id;
    } catch (err: any) {
        throw err;
    }
}

export async function updateMMPPRecord(id: string, updates: Partial<MMPPRecord>): Promise<void> {
    try {
        const { error } = await supabase
            .from(TABLE_MMPP)
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        await fetchMMPPRecords();
    } catch (err: any) {
        throw err;
    }
}

export async function deleteMMPPRecord(id: string): Promise<void> {
    try {
        const { error } = await supabase
            .from(TABLE_MMPP)
            .delete()
            .eq('id', id);

        if (error) throw error;
        await fetchMMPPRecords();
    } catch (err: any) {
        throw err;
    }
}

export async function addMMPPUbicacion(recordId: string, location: string, userId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from(TABLE_UBICACIONES)
            .insert({
                monitoreo_mmpp_id: recordId,
                ubicacion: location,
                usuario_id: userId
            });

        if (error) throw error;
        await fetchMMPPRecords();
    } catch (err: any) {
        throw err;
    }
}

// ===== ROUTE TIMES OPERATIONS =====

export async function fetchMMPPRouteTimes(): Promise<void> {
    try {
        const { data, error } = await supabase
            .from(TABLE_ROUTES)
            .select('*');

        if (error) throw error;
        state.routeTimes = data || [];
        notify();
    } catch (err: any) {
        console.error("Error fetching route times:", err);
    }
}

export async function saveMMPPRouteTime(route: Partial<MMPPRouteTime>): Promise<void> {
    try {
        const { error } = await supabase
            .from(TABLE_ROUTES)
            .upsert(route);

        if (error) throw error;
        await fetchMMPPRouteTimes();
    } catch (err: any) {
        throw err;
    }
}

export async function deleteMMPPRouteTime(id: string): Promise<void> {
    try {
        const { error } = await supabase
            .from(TABLE_ROUTES)
            .delete()
            .eq('id', id);

        if (error) throw error;
        await fetchMMPPRouteTimes();
    } catch (err: any) {
        throw err;
    }
}

// ===== TRANSPORTISTAS OPERATIONS =====

export async function fetchMMPPTransportistas(): Promise<void> {
    try {
        const { data, error } = await supabase
            .from(TABLE_TRANSPORTISTAS)
            .select('*')
            .order('nombre', { ascending: true });

        if (error) throw error;
        state.transportistas = data || [];
        notify();
    } catch (err: any) {
        console.error("Error fetching transportistas:", err);
    }
}

export async function saveMMPPTransportista(t: Partial<MMPPTransportista>): Promise<void> {
    try {
        const { error } = await supabase
            .from(TABLE_TRANSPORTISTAS)
            .upsert(t);

        if (error) throw error;
        await fetchMMPPTransportistas();
    } catch (err: any) {
        throw err;
    }
}

export async function deleteMMPPTransportista(id: string): Promise<void> {
    try {
        const { error } = await supabase
            .from(TABLE_TRANSPORTISTAS)
            .delete()
            .eq('id', id);

        if (error) throw error;
        await fetchMMPPTransportistas();
    } catch (err: any) {
        throw err;
    }
}
