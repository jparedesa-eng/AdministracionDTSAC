// src/store/camarasStore.ts
import { supabase } from "../supabase/supabaseClient";

export type Camara = {
    id: string;
    codigo: string;
    nombre: string;
    central_id: string;
    sede_id: string | null;
    nave_fundo?: string | null;
    tiempo_respaldo?: string | null;
    marca?: string | null;
    tipo_componente: "CAMARA FIJA" | "CAMARA DOMO" | null;
    ubicacion: "INTERIOR" | "EXTERIOR" | null;
    fecha_instalacion?: string | null;
    area?: string | null;
    activa: boolean;
    created_at?: string | null;
};

type CamarasState = {
    camaras: Camara[];
    loading: boolean;
    error: string | null;
};

const state: CamarasState = {
    camaras: [],
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export function getCamarasState(): CamarasState {
    return state;
}

export function subscribeCamaras(cb: () => void): () => void {
    listeners.add(cb);

    // Primera carga perezosa
    if (!state.loading && state.camaras.length === 0) {
        void refreshCamaras();
    }

    return () => {
        listeners.delete(cb);
    };
}

export async function refreshCamaras(): Promise<void> {
    state.loading = true;
    state.error = null;
    notify();

    const { data, error } = await supabase
        .from("camaras")
        .select("*")
        .order("codigo", { ascending: true })
        .limit(10000);

    if (error) {
        state.error = error.message;
        state.loading = false;
        notify();
        return;
    }

    state.camaras = (data || []).map((row) => ({
        id: row.id as string,
        codigo: row.codigo as string,
        nombre: row.nombre as string,
        central_id: row.central_id as string,
        sede_id: row.sede_id as string | null,
        nave_fundo: row.nave_fundo as string | null,
        tiempo_respaldo: row.tiempo_respaldo as string | null,
        marca: row.marca as string | null,
        tipo_componente: row.tipo_componente as "CAMARA FIJA" | "CAMARA DOMO" | null,
        ubicacion: row.ubicacion as "INTERIOR" | "EXTERIOR" | null,
        fecha_instalacion: row.fecha_instalacion as string | null,
        area: row.area as string | null,
        activa: row.activa as boolean,
        created_at: row.created_at,
    }));

    state.loading = false;
    notify();
}

export async function upsertCamara(input: {
    id?: string;
    codigo: string;
    nombre: string;
    central_id: string;
    sede_id?: string | null;
    nave_fundo?: string | null;
    tiempo_respaldo?: string | null;
    marca?: string | null;
    tipo_componente?: "CAMARA FIJA" | "CAMARA DOMO" | null;
    ubicacion?: "INTERIOR" | "EXTERIOR" | null;
    fecha_instalacion?: string | null;
    area?: string | null;
    activa?: boolean;
}): Promise<void> {
    const payload: any = {
        codigo: input.codigo,
        nombre: input.nombre,
        central_id: input.central_id,
        sede_id: input.sede_id || null,
        nave_fundo: input.nave_fundo || null,
        tiempo_respaldo: input.tiempo_respaldo || null,
        marca: input.marca || null,
        tipo_componente: input.tipo_componente || null,
        ubicacion: input.ubicacion || null,
        fecha_instalacion: input.fecha_instalacion || null,
        area: input.area || null,
        activa: input.activa !== undefined ? input.activa : true,
    };

    const { error } = await supabase
        .from("camaras")
        .upsert(
            input.id
                ? { id: input.id, ...payload }
                : payload,
            { onConflict: "id" }
        );

    if (error) {
        throw new Error(error.message);
    }

    await refreshCamaras();
}

export async function deleteCamara(id: string): Promise<void> {
    // Soft delete - just mark as inactive
    const { error } = await supabase
        .from("camaras")
        .update({ activa: false })
        .eq("id", id);

    if (error) {
        throw new Error(error.message);
    }

    await refreshCamaras();
}

export function getCamarasByCentral(centralId: string): Camara[] {
    return state.camaras.filter(c => c.central_id === centralId);
}

export function getCamarasBySede(sedeId: string): Camara[] {
    return state.camaras.filter(c => c.sede_id === sedeId);
}

// ===== LEGACY TYPES FROM types.ts =====
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

// Renamed from Camera to avoid conflict with existing Camara type
export interface LegacyCamera {
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


export type ViewState = 'DASHBOARD' | 'CAMERAS' | 'TRANSPORT' | 'INSPECTION' | 'SCHEDULER' | 'ALERT_MONITOR' | 'AGENT_REPORT' | 'TRAVEL_TIMES' | 'DESTINATIONS';
