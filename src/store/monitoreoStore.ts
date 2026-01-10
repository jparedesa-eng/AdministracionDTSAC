import { supabase } from "../supabase/supabaseClient";
import type { TransportUnit, UnitStatusType } from "../pages/types";

// Define the state shape
export type MonitoreoState = {
    units: TransportUnit[];
    loading: boolean;
    error: string | null;
    lastFetch: number;
};

// Initial state
const state: MonitoreoState = {
    units: [],
    loading: false,
    error: null,
    lastFetch: 0
};

// Listeners for subscription pattern
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export function getMonitoreoState(): MonitoreoState {
    return state;
}

export function subscribeMonitoreo(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}

// ===== SUPABASE OPERATIONS =====

const TABLE_NAME = 'monitoreo_pt';

export async function fetchUnits(force = false): Promise<void> {
    // Basic cache (10 seconds) unless forced
    const now = Date.now();
    if (!force && now - state.lastFetch < 10000 && state.units.length > 0) {
        return;
    }

    state.loading = true;
    state.error = null;
    notify();

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('lastUpdate', { ascending: false });

        if (error) throw error;

        // Map Supabase rows to TransportUnit
        // Assumes JSON fields are automatically parsed by Supabase JS client or stored as JSONB
        state.units = (data || []).map((row: any) => ({
            id: row.id.toString(),
            unitName: row.unitName,
            proceso: row.proceso,
            fechaIngresoPlanta: row.fechaIngresoPlanta,
            fechaSalidaPlanta: row.fechaSalidaPlanta,
            tipoEnvio: row.tipoEnvio,
            operadorLogistico: row.operadorLogistico,
            booking: row.booking,
            conductor: row.conductor,
            plateRemolque: row.plateRemolque,
            plateSemiRemolque: row.plateSemiRemolque,
            transportistaEstandar: row.transportistaEstandar,
            transportista: row.transportista,
            telefono: row.telefono,
            ubicacionActual: row.ubicacionActual,
            fechaEstimadaLlegada: row.fechaEstimadaLlegada,
            status: row.status as UnitStatusType,

            // JSON fields - ensure they are arrays
            controles: Array.isArray(row.controles) ? row.controles : [],
            paradasProg: Array.isArray(row.paradasProg) ? row.paradasProg : [],
            paradasNoProg: Array.isArray(row.paradasNoProg) ? row.paradasNoProg : [],
            path: Array.isArray(row.path) ? row.path : [],

            almacenDestino1: row.almacenDestino1,
            fechaLlegadaDestino1: row.fechaLlegadaDestino1,
            tiempoTotal1: row.tiempoTotal1,
            tiempoNeto1: row.tiempoNeto1,
            almacenDestino2: row.almacenDestino2,
            fechaLlegadaDestino2: row.fechaLlegadaDestino2,
            tiempoTotal2: row.tiempoTotal2,

            statusMuestras: row.statusMuestras,
            fechaSalidaDestino1: row.fechaSalidaDestino1,
            fechaSalidaDestino2: row.fechaSalidaDestino2,

            origin: row.origin,
            destination: row.destination,
            calificacionTNeto: row.calificacionTNeto,
            calificacionTTotal: row.calificacionTTotal,
            incidente: row.incidente,
            detalleIncidente: row.detalleIncidente,
            rutaName: row.rutaName,
            tiempoTransitoMin: row.tiempoTransitoMin,
            tiempoTransitoMax: row.tiempoTransitoMax,

            año: row.año,
            mes: row.mes,
            fecha: row.fecha,
            tipoViaje: row.tipoViaje,
            cumplimiento: row.cumplimiento,
            unidadEstandar: row.unidadEstandar,
            area: row.area,

            lastLocation: row.lastLocation,
            lastUpdate: row.lastUpdate,
            maxTravelHours: row.maxTravelHours,

            solicitudId: row.solicitudId,
            alertLevel: row.alertLevel
        }));

        state.lastFetch = Date.now();
    } catch (err: any) {
        state.error = err.message || 'Error fetching units';
        console.error("MonitoreoStore Fetch Error:", err);
    } finally {
        state.loading = false;
        notify();
    }
}

export async function createUnit(unit: Omit<TransportUnit, 'id'>): Promise<string> {
    state.loading = true;
    notify();

    try {
        // Strip 'id' if present in the object, usually handled by DB default or UUID
        const { ...payload } = unit;

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        await fetchUnits(true); // Refresh local state
        return data.id.toString();
    } catch (err: any) {
        state.error = err.message;
        state.loading = false;
        notify();
        throw err;
    }
}

export async function updateUnit(id: string, updates: Partial<TransportUnit>): Promise<void> {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        // Optimistic update or refresh
        // For simplicity and correctness with large objects, we refresh
        await fetchUnits(true);
    } catch (err: any) {
        console.error("MonitoreoStore Update Error:", err);
        throw err;
    }
}


