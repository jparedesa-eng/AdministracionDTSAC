// src/store/checklistCamarasStore.ts
import { supabase } from "../supabase/supabaseClient";

export type ChecklistCamara = {
    id: string;
    fecha: string;
    central_id: string;
    usuario_id: string | null;
    turno?: string;
    supervisor_responsable?: string | null;
    completado: boolean;
    observaciones_generales?: string | null;
    created_at?: string | null;
};

export type ChecklistDetalle = {
    id: string;
    checklist_id: string;
    camara_id: string;
    operativa: boolean;
    calidad_imagen: number | null;
    observaciones?: string | null;
    created_at?: string | null;
};

export type ReporteCamara = {
    id: string;
    camara_id: string;
    tipo_incidente: string;
    descripcion?: string | null;
    fecha_reporte: string;
    usuario_id: string | null;
    resuelto: boolean;
    fecha_resolucion?: string | null;
    notas_resolucion?: string | null;
    created_at?: string | null;
};

type ChecklistState = {
    checklists: ChecklistCamara[];
    detalles: ChecklistDetalle[];
    reportes: ReporteCamara[];
    loading: boolean;
    error: string | null;
};

const state: ChecklistState = {
    checklists: [],
    detalles: [],
    reportes: [],
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export function getChecklistState(): ChecklistState {
    return state;
}

export function subscribeChecklist(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}

// ===== CHECKLIST OPERATIONS =====

export async function refreshChecklists(fecha?: string): Promise<void> {
    state.loading = true;
    state.error = null;
    notify();

    let query = supabase
        .from("checklist_camaras")
        .select("*")
        .order("fecha", { ascending: false });

    if (fecha) {
        query = query.eq("fecha", fecha);
    }

    const { data, error } = await query;

    if (error) {
        state.error = error.message;
        state.loading = false;
        notify();
        return;
    }

    state.checklists = (data || []).map((row) => ({
        id: row.id as string,
        fecha: row.fecha as string,
        central_id: row.central_id as string,
        usuario_id: row.usuario_id as string | null,
        turno: row.turno as string,
        supervisor_responsable: row.supervisor_responsable as string | null,
        completado: row.completado as boolean,
        observaciones_generales: row.observaciones_generales as string | null,
        created_at: row.created_at,
    }));

    state.loading = false;
    notify();
}

export async function createChecklist(input: {
    fecha: string;
    central_id: string;
    turno: string;
    supervisor_responsable?: string;
    usuario_id?: string | null;
    observaciones_generales?: string | null;
}): Promise<string> {
    const payload = {
        fecha: input.fecha,
        central_id: input.central_id,
        turno: input.turno,
        supervisor_responsable: input.supervisor_responsable || null,
        usuario_id: input.usuario_id || null,
        observaciones_generales: input.observaciones_generales || null,
        completado: false,
    };

    const { data, error } = await supabase
        .from("checklist_camaras")
        .insert(payload)
        .select()
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    await refreshChecklists();
    return data.id;
}

export async function updateChecklist(id: string, updates: {
    completado?: boolean;
    observaciones_generales?: string;
}): Promise<void> {
    const { error } = await supabase
        .from("checklist_camaras")
        .update(updates)
        .eq("id", id);

    if (error) {
        throw new Error(error.message);
    }

    await refreshChecklists();
}

export async function getChecklistByDateAndCentral(fecha: string, centralId: string, turno: string): Promise<ChecklistCamara | null> {
    const { data, error } = await supabase
        .from("checklist_camaras")
        .select("*")
        .eq("fecha", fecha)
        .eq("central_id", centralId)
        .eq("turno", turno)
        .maybeSingle();

    if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw new Error(error.message);
    }

    return data as ChecklistCamara;
}

// ===== CHECKLIST DETALLE OPERATIONS =====

export async function refreshDetalles(checklistId: string): Promise<void> {
    state.loading = true;
    state.error = null;
    notify();

    const { data, error } = await supabase
        .from("checklist_camaras_detalle")
        .select("*")
        .eq("checklist_id", checklistId);

    if (error) {
        state.error = error.message;
        state.loading = false;
        notify();
        return;
    }

    state.detalles = (data || []).map((row) => ({
        id: row.id as string,
        checklist_id: row.checklist_id as string,
        camara_id: row.camara_id as string,
        operativa: row.operativa as boolean,
        calidad_imagen: row.calidad_imagen as number | null,
        observaciones: row.observaciones as string | null,
        created_at: row.created_at,
    }));

    state.loading = false;
    notify();
}

export async function upsertChecklistDetalle(input: {
    id?: string;
    checklist_id: string;
    camara_id: string;
    operativa: boolean;
    calidad_imagen?: number | null;
    observaciones?: string | null;
}): Promise<void> {
    const payload: any = {
        checklist_id: input.checklist_id,
        camara_id: input.camara_id,
        operativa: input.operativa,
        calidad_imagen: input.calidad_imagen || null,
        observaciones: input.observaciones || null,
    };

    const { error } = await supabase
        .from("checklist_camaras_detalle")
        .upsert(
            input.id
                ? { id: input.id, ...payload }
                : payload,
            { onConflict: "checklist_id,camara_id" }
        );

    if (error) {
        throw new Error(error.message);
    }

    await refreshDetalles(input.checklist_id);
}

export function getDetalleForCamara(checklistId: string, camaraId: string): ChecklistDetalle | undefined {
    return state.detalles.find(d => d.checklist_id === checklistId && d.camara_id === camaraId);
}

// ===== REPORTES OPERATIONS =====

export async function refreshReportes(camaraId?: string): Promise<void> {
    state.loading = true;
    state.error = null;
    notify();

    let query = supabase
        .from("reportes_camaras")
        .select("*")
        .order("fecha_reporte", { ascending: false });

    if (camaraId) {
        query = query.eq("camara_id", camaraId);
    }

    const { data, error } = await query;

    if (error) {
        state.error = error.message;
        state.loading = false;
        notify();
        return;
    }

    state.reportes = (data || []).map((row) => ({
        id: row.id as string,
        camara_id: row.camara_id as string,
        tipo_incidente: row.tipo_incidente as string,
        descripcion: row.descripcion as string | null,
        fecha_reporte: row.fecha_reporte as string,
        usuario_id: row.usuario_id as string | null,
        resuelto: row.resuelto as boolean,
        fecha_resolucion: row.fecha_resolucion as string | null,
        notas_resolucion: row.notas_resolucion as string | null,
        created_at: row.created_at,
    }));

    state.loading = false;
    notify();
}

export async function createReporte(input: {
    camara_id: string;
    tipo_incidente: string;
    descripcion?: string | null;
    usuario_id?: string | null;
}): Promise<void> {
    const payload = {
        camara_id: input.camara_id,
        tipo_incidente: input.tipo_incidente,
        descripcion: input.descripcion || null,
        usuario_id: input.usuario_id || null,
        resuelto: false,
    };

    const { error } = await supabase
        .from("reportes_camaras")
        .insert(payload);

    if (error) {
        throw new Error(error.message);
    }

    await refreshReportes();
}

export async function resolverReporte(id: string, notasResolucion?: string): Promise<void> {
    const { error } = await supabase
        .from("reportes_camaras")
        .update({
            resuelto: true,
            fecha_resolucion: new Date().toISOString(),
            notas_resolucion: notasResolucion || null,
        })
        .eq("id", id);

    if (error) {
        throw new Error(error.message);
    }

    await refreshReportes();
}

export async function deleteReporte(id: string): Promise<void> {
    const { error } = await supabase
        .from("reportes_camaras")
        .delete()
        .eq("id", id);

    if (error) {
        throw new Error(error.message);
    }

    await refreshReportes();
}

export function getReportesPendientes(): ReporteCamara[] {
    return state.reportes.filter(r => !r.resuelto);
}
