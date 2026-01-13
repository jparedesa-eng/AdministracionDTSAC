import { supabase } from "../supabase/supabaseClient";

// ===== TYPE DEFINITIONS =====
export const UnitStatus = {
    PLANT: 'En Planta',
    TRANSIT: 'En Ruta',
    DELIVERED: 'Entregado',
    DELAYED: 'Retrasado',
    OVERNIGHT: 'Pernocta',
    CANCELLED: 'CANCELADO',
    STOPPED: 'EN PARADA',
    INCIDENT: 'INCIDENTE'
} as const;

export type UnitStatusType = typeof UnitStatus[keyof typeof UnitStatus];

export interface LatLng {
    lat: number;
    lng: number;
}

export interface ControlPoint {
    time: string;
    location: string;
    coords?: LatLng;
}

export interface StopPoint {
    location: string;
    start: string;
    end: string;
    time: string;
    cause?: string;
    coords?: LatLng;
}

export interface TransportUnit {
    id: string;
    unitName: string;
    proceso: string;
    fechaIngresoPlanta: string;
    fechaSalidaPlanta: string;
    tipoEnvio: string;
    operadorLogistico: string;
    booking: string;
    conductor: string;
    plateRemolque: string;
    plateSemiRemolque: string;
    transportistaEstandar: string;
    transportista: string;
    telefono: string;
    ubicacionActual: string;
    fechaEstimadaLlegada: string;
    status: UnitStatusType | string;

    controles: ControlPoint[];
    paradasProg: StopPoint[];
    paradasNoProg: StopPoint[];

    almacenDestino1: string;
    fechaLlegadaDestino1: string;
    tiempoTotal1: string;
    tiempoNeto1: string;

    almacenDestino2: string;
    fechaLlegadaDestino2: string;
    tiempoTotal2: string;
    tiempoNeto2: string;

    fechaSalidaDestino1?: string;
    fechaSalidaDestino2?: string;

    origin: string;
    destination: string;
    calificacionTNeto: string;
    calificacionTTotal: string;
    incidente: string;
    detalleIncidente: string;
    rutaName: string;
    tiempoTransitoMin: string;
    tiempoTransitoMax: string;

    año: number;
    mes: string;
    fecha: string;
    tipoViaje: string;
    unidadEstandar: string;
    area: string;

    lastLocation: string;
    lastUpdate: string;
    maxTravelHours?: number;

    path: LatLng[];
    solicitudId?: string;
}


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

const TABLE_NAME = 'monitoreo_unidades';

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
            .order('last_update', { ascending: false });

        if (error) throw error;

        // Map Supabase rows (snake_case) to TransportUnit (camelCase)
        state.units = (data || []).map((row: any) => ({
            id: row.id.toString(),
            unitName: row.unit_name,
            proceso: row.proceso,
            fechaIngresoPlanta: row.fecha_ingreso_planta,
            fechaSalidaPlanta: row.fecha_salida_planta,
            tipoEnvio: row.tipo_envio,
            operadorLogistico: row.operador_logistico,
            booking: row.booking,
            conductor: row.conductor,
            plateRemolque: row.plate_remolque,
            plateSemiRemolque: row.plate_semi_remolque,
            transportistaEstandar: row.transportista, // Mapping to same if missing
            transportista: row.transportista,
            telefono: row.telefono,
            ubicacionActual: row.ubicacion_actual,
            fechaEstimadaLlegada: row.fecha_estimada_llegada,
            status: row.status as UnitStatusType,

            // JSON fields - ensure they are arrays
            // Note: DB uses 'path_points', app uses 'path'
            // DB might be missing 'controles', 'paradas_prog', 'paradas_no_prog' in provided SQL
            // We map what we expect, defaulting to empty array if column missing
            controles: Array.isArray(row.controles) ? row.controles : [],
            paradasProg: Array.isArray(row.paradas_prog) ? row.paradas_prog : [],
            paradasNoProg: Array.isArray(row.paradas_no_prog) ? row.paradas_no_prog : [],
            path: Array.isArray(row.path_points) ? row.path_points : [],

            almacenDestino1: row.almacen_destino1,
            fechaLlegadaDestino1: row.fecha_llegada_destino1,
            tiempoTotal1: row.tiempo_total1, // Assuming column matches or needs addition
            tiempoNeto1: row.tiempo_neto1,   // Assuming column matches or needs addition
            almacenDestino2: row.almacen_destino2,
            fechaLlegadaDestino2: row.fecha_llegada_destino2,
            tiempoTotal2: row.tiempo_total2, // Assuming column matches
            tiempoNeto2: row.tiempo_neto2, // New


            fechaSalidaDestino1: row.fecha_salida_destino1,
            fechaSalidaDestino2: row.fecha_salida_destino2,

            origin: row.origin,
            destination: row.destination,
            calificacionTNeto: row.calificacion_t_neto,
            calificacionTTotal: row.calificacion_t_total,
            incidente: row.incidente,
            detalleIncidente: row.detalle_incidente,
            rutaName: row.ruta_name,
            tiempoTransitoMin: row.tiempo_transito_min,
            tiempoTransitoMax: row.tiempo_transito_max,

            año: new Date(row.created_at).getFullYear(), // Fallback if distinct column
            mes: row.mes || '',
            fecha: row.fecha || '',
            tipoViaje: row.tipo_viaje,
            unidadEstandar: row.unidad_estandar,
            area: row.area,

            lastLocation: row.last_location,
            lastUpdate: row.last_update,
            maxTravelHours: row.max_travel_hours,

            solicitudId: row.solicitud_id,

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
        // Map camelCase app model to snake_case DB columns
        const payload = {
            unit_name: unit.unitName,
            proceso: unit.proceso,
            fecha_ingreso_planta: unit.fechaIngresoPlanta,
            fecha_salida_planta: unit.fechaSalidaPlanta,
            tipo_envio: unit.tipoEnvio,
            operador_logistico: unit.operadorLogistico,
            booking: unit.booking,
            conductor: unit.conductor,
            plate_remolque: unit.plateRemolque,
            plate_semi_remolque: unit.plateSemiRemolque,
            transportista: unit.transportista,
            telefono: unit.telefono,
            ubicacion_actual: unit.ubicacionActual,
            fecha_estimada_llegada: unit.fechaEstimadaLlegada,
            status: unit.status,

            // JSON fields
            controles: unit.controles,
            paradas_prog: unit.paradasProg,
            paradas_no_prog: unit.paradasNoProg,
            path_points: unit.path,

            almacen_destino1: unit.almacenDestino1,
            almacen_destino2: unit.almacenDestino2,
            // Only include fields that exist in the form/unit object
            origin: unit.origin,
            destination: unit.destination,
            ruta_name: unit.rutaName,
            area: unit.area,

            last_location: unit.lastLocation,
            last_update: unit.lastUpdate,

            // Add other fields as they become relevant or defined in the UI
            tiempo_transito_min: unit.tiempoTransitoMin,
            tiempo_transito_max: unit.tiempoTransitoMax
        };

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
        // Map updates to snake_case
        const mappedUpdates: any = {};
        if (updates.proceso !== undefined) mappedUpdates.proceso = updates.proceso;
        if (updates.status !== undefined) mappedUpdates.status = updates.status;
        if (updates.ubicacionActual !== undefined) mappedUpdates.ubicacion_actual = updates.ubicacionActual;
        if (updates.lastUpdate !== undefined) mappedUpdates.last_update = updates.lastUpdate;
        if (updates.lastLocation !== undefined) mappedUpdates.last_location = updates.lastLocation;

        if (updates.controles !== undefined) mappedUpdates.controles = updates.controles;
        if (updates.paradasProg !== undefined) mappedUpdates.paradas_prog = updates.paradasProg;
        if (updates.paradasNoProg !== undefined) mappedUpdates.paradas_no_prog = updates.paradasNoProg;
        if (updates.path !== undefined) mappedUpdates.path_points = updates.path;

        if (updates.fechaLlegadaDestino1 !== undefined) mappedUpdates.fecha_llegada_destino1 = updates.fechaLlegadaDestino1;
        if (updates.fechaSalidaDestino1 !== undefined) mappedUpdates.fecha_salida_destino1 = updates.fechaSalidaDestino1;
        if (updates.fechaLlegadaDestino2 !== undefined) mappedUpdates.fecha_llegada_destino2 = updates.fechaLlegadaDestino2;

        if (updates.tiempoTotal1 !== undefined) mappedUpdates.tiempo_total1 = updates.tiempoTotal1;
        if (updates.tiempoNeto1 !== undefined) mappedUpdates.tiempo_neto1 = updates.tiempoNeto1;
        if (updates.tiempoTotal2 !== undefined) mappedUpdates.tiempo_total2 = updates.tiempoTotal2;
        if (updates.tiempoNeto2 !== undefined) mappedUpdates.tiempo_neto2 = updates.tiempoNeto2;

        if (updates.calificacionTTotal !== undefined) mappedUpdates.calificacion_t_total = updates.calificacionTTotal;
        if (updates.calificacionTNeto !== undefined) mappedUpdates.calificacion_t_neto = updates.calificacionTNeto;
        if (updates.fechaEstimadaLlegada !== undefined) mappedUpdates.fecha_estimada_llegada = updates.fechaEstimadaLlegada;

        // Missing fields added:
        if (updates.unitName !== undefined) mappedUpdates.unit_name = updates.unitName;
        if (updates.fechaIngresoPlanta !== undefined) mappedUpdates.fecha_ingreso_planta = updates.fechaIngresoPlanta;
        if (updates.fechaSalidaPlanta !== undefined) mappedUpdates.fecha_salida_planta = updates.fechaSalidaPlanta;
        if (updates.tipoEnvio !== undefined) mappedUpdates.tipo_envio = updates.tipoEnvio;
        if (updates.operadorLogistico !== undefined) mappedUpdates.operador_logistico = updates.operadorLogistico;
        if (updates.booking !== undefined) mappedUpdates.booking = updates.booking;
        if (updates.conductor !== undefined) mappedUpdates.conductor = updates.conductor;
        if (updates.plateRemolque !== undefined) mappedUpdates.plate_remolque = updates.plateRemolque;
        if (updates.plateSemiRemolque !== undefined) mappedUpdates.plate_semi_remolque = updates.plateSemiRemolque;
        if (updates.transportista !== undefined) mappedUpdates.transportista = updates.transportista;
        if (updates.telefono !== undefined) mappedUpdates.telefono = updates.telefono;
        if (updates.origin !== undefined) mappedUpdates.origin = updates.origin;
        if (updates.destination !== undefined) mappedUpdates.destination = updates.destination;
        if (updates.rutaName !== undefined) mappedUpdates.ruta_name = updates.rutaName;
        if (updates.almacenDestino1 !== undefined) mappedUpdates.almacen_destino1 = updates.almacenDestino1;
        if (updates.almacenDestino2 !== undefined) mappedUpdates.almacen_destino2 = updates.almacenDestino2;

        // Pass through any other fields if necessary, but manual mapping is safer for snake_case conversion

        const { error } = await supabase
            .from(TABLE_NAME)
            .update(mappedUpdates)
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


