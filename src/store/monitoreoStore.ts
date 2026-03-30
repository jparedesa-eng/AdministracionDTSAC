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
    usuarioCreacionId?: string;
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
const CONTROLES_TABLE = 'monitoreo_unidades_controles';
let isFetching = false;
let pendingFetch = false;

export async function fetchUnits(force = false): Promise<void> {
    // Basic cache (10 seconds) unless forced
    const now = Date.now();
    if (!force && now - state.lastFetch < 10000 && state.units.length > 0) {
        return;
    }

    if (isFetching) {
        pendingFetch = true;
        return;
    }
    isFetching = true;

    state.loading = true;
    state.error = null;
    notify();

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(`
                *,
                ${CONTROLES_TABLE} (*)
            `)
            .order('last_update', { ascending: false });

        if (error) throw error;

        // Map Supabase rows (snake_case) to TransportUnit (camelCase)
        state.units = (data || []).map((row: any) => {
            // Mapping the relational controls and stops
            const rawEvents = (row[CONTROLES_TABLE] || []);
            const controles = rawEvents
                .filter((e: any) => e.tipo === 'CONTROL')
                .sort((a: any, b: any) => new Date(a.timestamp_inicio).getTime() - new Date(b.timestamp_inicio).getTime())
                .map((e: any) => ({
                    id: e.id,
                    time: e.timestamp_inicio,
                    location: e.ubicacion,
                    coords: { lat: e.lat, lng: e.lng }
                }));

            const paradasProg = rawEvents
                .filter((e: any) => e.tipo === 'PARADA_PROG')
                .sort((a: any, b: any) => new Date(a.timestamp_inicio).getTime() - new Date(b.timestamp_inicio).getTime())
                .map((e: any) => ({
                    id: e.id,
                    location: e.ubicacion,
                    start: e.timestamp_inicio,
                    end: e.timestamp_fin || '',
                    time: e.duracion || '',
                    coords: { lat: e.lat, lng: e.lng }
                }));

            const paradasNoProg = rawEvents
                .filter((e: any) => e.tipo === 'PARADA_NOPROG')
                .sort((a: any, b: any) => new Date(a.timestamp_inicio).getTime() - new Date(b.timestamp_inicio).getTime())
                .map((e: any) => ({
                    id: e.id,
                    location: e.ubicacion,
                    start: e.timestamp_inicio,
                    end: e.timestamp_fin || '',
                    time: e.duracion || '',
                    cause: e.causa,
                    coords: { lat: e.lat, lng: e.lng }
                }));

            // --- DYNAMICALLY DERIVED PROPERTIES ---
            // We get the LAST event overall (control or stop) to define current state
            const allEvents = [...rawEvents].sort((a: any, b: any) => 
                new Date(a.timestamp_inicio).getTime() - new Date(b.timestamp_inicio).getTime()
            );
            const lastEvent = allEvents[allEvents.length - 1];

            return {
                id: row.id.toString(),
                unitName: row.unit_name || '',
                proceso: row.proceso || '',
                fechaIngresoPlanta: row.fecha_ingreso_planta || '',
                fechaSalidaPlanta: row.fecha_salida_planta || '',
                tipoEnvio: row.tipo_envio || '',
                operadorLogistico: row.operador_logistico || '',
                booking: row.booking || '',
                conductor: row.conductor || '',
                plateRemolque: row.plate_remolque || '',
                plateSemiRemolque: row.plate_semi_remolque || '',
                transportista: row.transportista || '',
                transportistaEstandar: row.transportista || '',
                telefono: row.telefono || '',
                status: row.status as UnitStatusType,

                controles,
                paradasProg,
                paradasNoProg,

                // DYNAMIC SOURCES: sourced from controls table if available
                ubicacionActual: lastEvent ? lastEvent.ubicacion : (row.ubicacion_actual || row.origin || 'PLANTA'),
                lastLocation: lastEvent ? lastEvent.ubicacion : (row.last_location || row.origin || 'PLANTA'),
                lastUpdate: lastEvent ? lastEvent.timestamp_inicio : (row.last_update || row.fecha_salida_planta || ''),

                path: Array.isArray(row.path_points) ? row.path_points : [],
                almacenDestino1: row.almacen_destino1 || '',
                fechaLlegadaDestino1: row.fecha_llegada_destino1 || '',
                tiempoTotal1: row.tiempo_total1 || '',
                tiempoNeto1: row.tiempo_neto1 || '',
                almacenDestino2: row.almacen_destino2 || '',
                fechaLlegadaDestino2: row.fecha_llegada_destino2 || '',
                tiempoTotal2: row.tiempo_total2 || '',
                tiempoNeto2: row.tiempo_neto2 || '',
                fechaSalidaDestino1: row.fecha_salida_destino1 || '',
                fechaSalidaDestino2: row.fecha_salida_destino2 || '',
                origin: row.origin || '',
                destination: row.destination || '',
                calificacionTNeto: row.calificacion_t_neto || '',
                calificacionTTotal: row.calificacion_t_total || '',
                incidente: row.incidente || '',
                detalleIncidente: row.detalle_incidente || '',
                rutaName: row.ruta_name || '',
                tiempoTransitoMin: row.tiempo_transito_min || '',
                tiempoTransitoMax: row.tiempo_transito_max || '',
                año: row.created_at ? new Date(row.created_at).getFullYear() : new Date().getFullYear(),
                mes: row.mes || '',
                fecha: row.fecha || '',
                tipoViaje: row.tipo_viaje || '',
                unidadEstandar: row.unidad_estandar || '',
                area: row.area || '',
                maxTravelHours: row.max_travel_hours || 0,
                solicitudId: row.solicitud_id || '',
                usuarioCreacionId: row.usuario_creacion_id || '',
                fechaEstimadaLlegada: row.fecha_estimada_llegada || '',
            };
        });


        state.lastFetch = Date.now();
    } catch (err: any) {
        state.error = err.message || 'Error fetching units';
        console.error("MonitoreoStore Fetch Error:", err);
    } finally {
        isFetching = false;
        state.loading = false;
        notify();
        if (pendingFetch) {
            pendingFetch = false;
            fetchUnits(force);
        }
    }
}

export async function createUnit(unit: Omit<TransportUnit, 'id'>): Promise<string> {
    state.loading = true;
    notify();

    try {
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
            path_points: unit.path,
            almacen_destino1: unit.almacenDestino1,
            almacen_destino2: unit.almacenDestino2,
            origin: unit.origin,
            destination: unit.destination,
            ruta_name: unit.rutaName,
            area: unit.area,
            last_location: unit.lastLocation,
            last_update: unit.lastUpdate,
            tiempo_transito_min: unit.tiempoTransitoMin,
            tiempo_transito_max: unit.tiempoTransitoMax,
            usuario_creacion_id: unit.usuarioCreacionId
        };

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert(payload)
            .select()
            .single();

        if (error) {
            state.loading = false;
            notify();
            throw error;
        }

        await fetchUnits(true);
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
        const mappedUpdates: any = {};
        if (updates.proceso !== undefined) mappedUpdates.proceso = updates.proceso;
        if (updates.status !== undefined) mappedUpdates.status = updates.status;
        if (updates.ubicacionActual !== undefined) mappedUpdates.ubicacion_actual = updates.ubicacionActual;
        if (updates.lastUpdate !== undefined) mappedUpdates.last_update = updates.lastUpdate;
        if (updates.lastLocation !== undefined) mappedUpdates.last_location = updates.lastLocation;
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

        const originalUnits = [...state.units];
        state.units = state.units.map(u => u.id === id ? { ...u, ...updates } : u);
        notify();

        const { error } = await supabase
            .from(TABLE_NAME)
            .update(mappedUpdates)
            .eq('id', id);

        if (error) {
            state.units = originalUnits;
            state.error = error.message;
            notify();
            throw error;
        }
    } catch (err: any) {
        console.error("MonitoreoStore Update Error:", err);
        throw err;
    }
}

export async function syncUnitSummary(unitId: string) {
    try {
        const { data: events, error: eError } = await supabase
            .from(CONTROLES_TABLE)
            .select('*')
            .eq('unidad_id', unitId)
            .order('timestamp_inicio', { ascending: true });

        if (eError) throw eError;

        const { data: unit, error: uError } = await supabase
            .from(TABLE_NAME)
            .select('origin, fecha_salida_planta, status')
            .eq('id', unitId)
            .single();

        if (uError) throw uError;

        const terminalStatuses = ['LLEGADO', 'CANCELADO', 'Entregado'];
        if (terminalStatuses.includes(unit.status)) {
            return;
        }

        const lastEvent = events && events.length > 0 ? events[events.length - 1] : null;
        
        let newStatus = unit.status;
        const activeStatuses = ['En Ruta', 'EN PARADA', 'INCIDENTE', 'PENDIENTE', 'En Planta'];
        
        if (activeStatuses.includes(unit.status)) {
            if (lastEvent) {
                if (!lastEvent.timestamp_fin) {
                    if (lastEvent.tipo === 'PARADA_PROG') newStatus = 'EN PARADA';
                    else if (lastEvent.tipo === 'PARADA_NOPROG') newStatus = 'INCIDENTE';
                    else newStatus = 'En Ruta';
                } else {
                    newStatus = 'En Ruta';
                }
            } else {
                newStatus = 'En Ruta';
            }
        }

        const updates: any = {
            ubicacion_actual: lastEvent ? lastEvent.ubicacion : (unit.origin || 'PLANTA'),
            last_location: lastEvent ? lastEvent.ubicacion : (unit.origin || 'PLANTA'),
            last_update: lastEvent ? lastEvent.timestamp_inicio : (unit.fecha_salida_planta || new Date().toISOString()),
            status: newStatus
        };

        await supabase.from(TABLE_NAME).update(updates).eq('id', unitId);
    } catch (err) {
        console.error("Error syncing unit summary:", err);
    }
}

export async function addEventToDB(unitId: string, tipo: 'CONTROL' | 'PARADA_PROG' | 'PARADA_NOPROG', data: any, skipSync = false, skipFetch = false) {
    const payload = {
        unidad_id: unitId,
        tipo,
        ubicacion: data.location || data.ubicacion,
        timestamp_inicio: data.startTime || data.time || data.start,
        timestamp_fin: data.endTime || data.end || null,
        duracion: tipo !== 'CONTROL' ? (data.duration || data.time || null) : null,
        causa: data.cause || null,
        lat: data.coords?.lat,
        lng: data.coords?.lng
    };

    const { error } = await supabase.from(CONTROLES_TABLE).insert(payload);
    if (error) throw error;

    if (!skipSync) await syncUnitSummary(unitId);
    if (!skipFetch) await fetchUnits(true);
}

export async function updateEventInDB(eventId: string, updates: any, skipSync = false) {
    const mapped: any = {};
    if (updates.endTime !== undefined) mapped.timestamp_fin = updates.endTime;
    if (updates.duration !== undefined) mapped.duracion = updates.duration;
    if (updates.location !== undefined) mapped.ubicacion = updates.location;
    if (updates.time !== undefined) mapped.timestamp_inicio = updates.time;
    if (updates.coords !== undefined) {
        mapped.lat = updates.coords.lat;
        mapped.lng = updates.coords.lng;
    }

    const { error } = await supabase.from(CONTROLES_TABLE).update(mapped).eq('id', eventId);
    if (error) throw error;

    const { data: eventData } = await supabase.from(CONTROLES_TABLE).select('unidad_id').eq('id', eventId).single();
    if (eventData && !skipSync) await syncUnitSummary(eventData.unidad_id);
    await fetchUnits(true);
}

export async function deleteEventFromDB(eventId: string, skipSync = false) {
    const { data: eventData } = await supabase.from(CONTROLES_TABLE).select('unidad_id').eq('id', eventId).single();
    const { error } = await supabase.from(CONTROLES_TABLE).delete().eq('id', eventId);
    if (error) throw error;

    if (eventData && !skipSync) await syncUnitSummary(eventData.unidad_id);
    await fetchUnits(true);
}

export async function finalizeTripInDB(unitId: string, mode: 'SINGLE' | 'DEST1' | 'DEST2', data: any) {
    try {
        await addEventToDB(unitId, 'CONTROL', {
            time: data.arrivalDateTime,
            location: data.locationName,
            coords: data.coords
        }, true);

        const updates: any = {
            last_location: data.locationName,
            ubicacion_actual: data.locationName,
            last_update: data.arrivalDateTime
        };

        if (mode === 'SINGLE' || mode === 'DEST2') {
            updates.status = UnitStatus.DELIVERED;
            if (mode === 'DEST2') {
                updates.fecha_llegada_destino2 = data.arrivalDateTime;
                updates.fecha_salida_destino1 = data.exitD1;
                updates.tiempo_total2 = data.tiempoTotal;
                updates.tiempo_neto2 = data.tiempoNeto;
            } else {
                updates.fecha_llegada_destino1 = data.arrivalDateTime;
                updates.tiempo_total1 = data.tiempoTotal;
                updates.tiempo_neto1 = data.tiempoNeto;
                updates.calificacion_t_total = data.score;
                updates.calificacion_t_neto = data.score;
            }
        } else if (mode === 'DEST1') {
            updates.fecha_llegada_destino1 = data.arrivalDateTime;
            updates.tiempo_total1 = data.tiempoTotal;
            updates.tiempo_neto1 = data.tiempoNeto;
            updates.calificacion_t_total = data.score;
            updates.calificacion_t_neto = data.score;
            updates.ubicacion_actual = `LLEGADA A PUNTO 1: ${data.locationName}`;
        }

        if (data.path) updates.path_points = data.path;

        const { error } = await supabase.from(TABLE_NAME).update(updates).eq('id', unitId);
        if (error) throw error;

        await fetchUnits(true);
    } catch (err) {
        console.error("Error in finalizeTripInDB:", err);
        throw err;
    }
}

export async function registerControlInDB(unitId: string, eventData: any, newPath: LatLng[]) {
    try {
        // 1. Add the control event without fetching (we will fetch at the end)
        await addEventToDB(unitId, 'CONTROL', eventData, true, true);

        // 2. Update the unit with the new path
        const { error: pError } = await supabase
            .from(TABLE_NAME)
            .update({ path_points: newPath })
            .eq('id', unitId);

        if (pError) throw pError;

        // 3. Final synchronization and single state refresh
        await syncUnitSummary(unitId);
        await fetchUnits(true);
    } catch (err) {
        console.error("Error in registerControlInDB:", err);
        throw err;
    }
}
