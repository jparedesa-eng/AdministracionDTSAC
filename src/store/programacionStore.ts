// src/store/programacionStore.ts
import { supabase } from "../supabase/supabaseClient";

export type Turno = "DIA" | "NOCHE";
export type AssignmentStatus = "PENDING" | "CUMPLIDO" | "FALTA";
export type AbsenceType = "JUSTIFICADA" | "INJUSTIFICADA";

export type ProgramacionTurno = {
    id: string;
    fecha: string; // YYYY-MM-DD
    puesto_id: string;
    turno: Turno;
    agente_id: string;
    status: AssignmentStatus;
    absence_type?: AbsenceType | null;
    absence_reason?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

type ProgramacionState = {
    turnos: ProgramacionTurno[];
    loading: boolean;
    error: string | null;
};

const state: ProgramacionState = {
    turnos: [],
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export function getProgramacionState(): ProgramacionState {
    return state;
}

export function subscribeProgramacion(cb: () => void): () => void {
    listeners.add(cb);

    // Primera carga perezosa
    if (!state.loading && state.turnos.length === 0) {
        void refreshProgramacion();
    }

    return () => {
        listeners.delete(cb);
    };
}

export async function refreshProgramacion(
    year?: number,
    month?: number
): Promise<void> {
    state.loading = true;
    state.error = null;
    notify();

    let query = supabase.from("programacion_turnos").select("*");

    // Si se especifica año y mes, filtrar
    if (year !== undefined && month !== undefined) {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);

        query = query
            .gte("fecha", startDate.toISOString().split("T")[0])
            .lte("fecha", endDate.toISOString().split("T")[0]);
    }

    const { data, error } = await query.order("fecha", { ascending: true });

    if (error) {
        state.error = error.message;
        state.loading = false;
        notify();
        return;
    }

    state.turnos = (data || []).map((row) => ({
        id: row.id as string,
        fecha: row.fecha as string,
        puesto_id: row.puesto_id as string,
        turno: row.turno as Turno,
        agente_id: row.agente_id as string,
        status: row.status as AssignmentStatus,
        absence_type: row.absence_type as AbsenceType | null,
        absence_reason: row.absence_reason as string | null,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));

    state.loading = false;
    notify();
}

export async function upsertProgramacion(input: {
    id?: string;
    fecha: string;
    puesto_id: string;
    turno: Turno;
    agente_id: string;
    status?: AssignmentStatus;
    absence_type?: AbsenceType | null;
    absence_reason?: string | null;
}): Promise<void> {
    const payload = {
        fecha: input.fecha,
        puesto_id: input.puesto_id,
        turno: input.turno,
        agente_id: input.agente_id,
        status: input.status || "PENDING",
        absence_type: input.absence_type || null,
        absence_reason: input.absence_reason || null,
    };

    const { error } = await supabase
        .from("programacion_turnos")
        .upsert(
            input.id ? { id: input.id, ...payload } : payload,
            { onConflict: "id" }
        );

    if (error) {
        throw new Error(error.message);
    }

    await refreshProgramacion();
}

export async function deleteProgramacion(id: string): Promise<void> {
    const { error } = await supabase
        .from("programacion_turnos")
        .delete()
        .eq("id", id);

    if (error) {
        throw new Error(error.message);
    }

    await refreshProgramacion();
}

// Función auxiliar para obtener asignaciones por celda
export function getAssignmentsByCell(
    fecha: string,
    puestoId: string,
    turno: Turno
): ProgramacionTurno[] {
    return state.turnos.filter(
        (t) =>
            t.fecha === fecha &&
            t.puesto_id === puestoId &&
            t.turno === turno
    );
}

// Función auxiliar para verificar si un agente está disponible en una fecha
export function isAgenteDisponible(
    agenteId: string,
    fecha: string,
    excludeId?: string
): boolean {
    return !state.turnos.some(
        (t) =>
            t.agente_id === agenteId &&
            t.fecha === fecha &&
            t.id !== excludeId
    );
}

// Función auxiliar para actualizar el status de una asignación
export async function updateAssignmentStatus(
    id: string,
    status: AssignmentStatus,
    absenceType?: AbsenceType | null,
    absenceReason?: string | null
): Promise<void> {
    const turno = state.turnos.find((t) => t.id === id);
    if (!turno) {
        throw new Error("Asignación no encontrada");
    }

    await upsertProgramacion({
        id,
        fecha: turno.fecha,
        puesto_id: turno.puesto_id,
        turno: turno.turno,
        agente_id: turno.agente_id,
        status,
        absence_type: absenceType,
        absence_reason: absenceReason,
    });
}

// Función auxiliar para eliminar todas las asignaciones de una celda
export async function deleteAssignmentsByCell(
    fecha: string,
    puestoId: string,
    turno: Turno
): Promise<void> {
    const { error } = await supabase
        .from("programacion_turnos")
        .delete()
        .eq("fecha", fecha)
        .eq("puesto_id", puestoId)
        .eq("turno", turno);

    if (error) {
        throw new Error(error.message);
    }

    await refreshProgramacion();
}
