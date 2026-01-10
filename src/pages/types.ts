
export const UnitStatus = {
    PLANT: 'En Planta',
    TRANSIT: 'En Ruta',
    DELIVERED: 'Entregado',
    DELAYED: 'Retrasado',
    OVERNIGHT: 'Pernocta',
    // Agregados para compatibilidad con código actual
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

    almacenDestino2: string; // New: Secondary Destination (Muestras)
    fechaLlegadaDestino2: string; // New
    tiempoTotal2: string; // New

    // Status flags for multi-dest logic
    statusMuestras?: 'PENDING' | 'ARRIVED' | 'COMPLETED' | 'SKIPPED';
    fechaSalidaDestino1?: string; // Departure from Primary
    fechaSalidaDestino2?: string; // Departure from Secondary

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
    cumplimiento: 'CUMPLE' | 'NO CUMPLE' | 'PENDIENTE' | string;
    unidadEstandar: string;
    area: string;

    lastLocation: string;
    lastUpdate: string;
    maxTravelHours?: number;

    // Tracking path for map visualization
    path: LatLng[];

    // Optional legacy fields if needed
    solicitudId?: string;
    alertLevel?: string;
}

export interface Inspection {
    id: string;
    unitPlate: string;
    agentName: string;
    timestamp: string;
    checklist: {
        tires: boolean;
        lights: boolean;
        fluids: boolean;
        documents: boolean;
        safetyGear: boolean;
    };
    signatureData: string;
    approved: boolean;
}

export type ImageQuality = 'GOOD' | 'FAIR' | 'POOR' | 'UNREADABLE';

export interface Camera {
    id: string;
    systemId: string;
    site: string;
    name: string;
    location: string;
    status: 'ONLINE' | 'OFFLINE';
    imageQuality?: ImageQuality;
    lastCheck: string;
    lastCheckType?: 'AM' | 'PM';
    lastCheckBy?: string;
}

export interface Incident {
    id: string;
    type: 'NETWORK' | 'POWER' | 'VANDALISM' | 'OTHER';
    description: string;
    timestamp: string;
    resolved: boolean;
    cameraId?: string;
}

export interface Agent {
    id: string;
    name: string;
    dni: string;
}

export interface Post {
    id: string;
    name: string;
    site: string;
    requiredShifts: 'DAY' | 'NIGHT' | 'BOTH';
}

export interface ShiftAssignment {
    id: string;
    date: string;
    postId: string;
    shift: 'DAY' | 'NIGHT';
    agentId: string | 'UNCOVERED';
    status: 'PENDING' | 'COMPLETED' | 'ABSENT';
    absenceReason?: string;
    absenceJustified?: boolean;
}

export type CheckpointStatus = 'PENDING' | 'COMPLETED' | 'LATE' | 'MISSED';

export interface Checkpoint {
    id: string;
    scheduledTime: string;
    status: CheckpointStatus;
    completedAt?: string;
    comment?: string;
    isDistress?: boolean;
    manualOverride?: boolean;
}

export interface AlertSchedule {
    id: string;
    agentId: string;
    agentName: string;
    postId: string;
    postName: string;
    site: string;
    date: string;
    startTime: string;
    endTime: string;
    frequencyMinutes: number;
    dailyIndicator: string;
    checkpoints: Checkpoint[];
}

export type ViewState = 'DASHBOARD' | 'CAMERAS' | 'TRANSPORT' | 'INSPECTION' | 'SCHEDULER' | 'ALERT_MONITOR' | 'AGENT_REPORT' | 'TRAVEL_TIMES' | 'DESTINATIONS';
