import { supabase } from "../supabase/supabaseClient";


export interface Post {
    id: string;
    name: string;
    site: string;
    requiredShifts: 'DAY' | 'NIGHT' | 'BOTH';
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

// Types mapped to Supabase Tables
export interface ReportePuestoEntry {
    id: string;
    post_id: string;
    agent_id: string | null;
    site_name: string;
    post_name: string;
    date: string;
    start_time: string;
    end_time: string;
    frequency_minutes: number;
    daily_indicator: string;
    created_at?: string;
}

export interface ReportePuestoDetalle {
    id: string;
    schedule_id: string;
    scheduled_time: string;
    status: CheckpointStatus;
    completed_at: string | null;
    comment: string | null;
    is_distress: boolean;
    manual_override: boolean;
    created_at?: string;
}

type ReportePuestoState = {
    schedules: AlertSchedule[];
    loading: boolean;
    error: string | null;
};

const state: ReportePuestoState = {
    schedules: [],
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export function getReportePuestoState(): ReportePuestoState {
    return state;
}

export function subscribeReportes(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}

// Fetch schedules (AlertSchedule format) for a specific date
export async function fetchSchedulesByDate(date: string): Promise<void> {
    state.loading = true;
    state.error = null;
    notify();

    try {
        // 1. Fetch Headers
        const { data: headerData, error: headerError } = await supabase
            .from("sp_reportepuesto")
            .select(`
                *,
                *,
                post:puestos_seguridad ( nombre, site:sedes ( nombre ) ), 
                agent:agentes_seguridad ( nombre )
            `)
            .eq("date", date);

        if (headerError) throw headerError;
        if (!headerData) {
            state.schedules = [];
            state.loading = false;
            notify();
            return;
        }

        const validHeaders = headerData as any[];
        const scheduleIds = validHeaders.map(h => h.id);

        // 2. Fetch Details for these headers
        let checkpointsMap: Record<string, Checkpoint[]> = {};

        if (scheduleIds.length > 0) {
            const { data: detailData, error: detailError } = await supabase
                .from("sp_reportepuesto_detalle")
                .select("*")
                .in("schedule_id", scheduleIds)
                .order("scheduled_time", { ascending: true }); // Important order

            if (detailError) throw detailError;

            (detailData || []).forEach((d: any) => {
                const cp: Checkpoint = {
                    id: d.id,
                    scheduledTime: d.scheduled_time.substring(0, 5), // 'HH:mm:ss' -> 'HH:mm'
                    status: d.status as CheckpointStatus,
                    completedAt: d.completed_at,
                    comment: d.comment,
                    isDistress: d.is_distress,
                    manualOverride: d.manual_override
                };
                if (!checkpointsMap[d.schedule_id]) {
                    checkpointsMap[d.schedule_id] = [];
                }
                checkpointsMap[d.schedule_id].push(cp);
            });
        }

        // 3. Map to AlertSchedule
        state.schedules = validHeaders.map(h => {
            // Extract optional joined names, fallback to stored site_name or empty
            const postName = h.post_name || h.post?.nombre || "Puesto Eliminado";
            // NOTE: "site" in Post is sometimes ID or Name. In previous steps we saw it used sedesStore. 
            // We stored 'site_name' directly in SP to simplify.
            const siteName = h.site_name;
            const agentName = h.agent?.nombre || "";

            return {
                id: h.id,
                agentId: h.agent_id || 'UNASSIGNED',
                agentName: agentName,
                postId: h.post_id,
                postName: postName,
                site: siteName,
                date: h.date,
                startTime: h.start_time.substring(0, 5),
                endTime: h.end_time.substring(0, 5),
                frequencyMinutes: h.frequency_minutes,
                dailyIndicator: h.daily_indicator,
                checkpoints: checkpointsMap[h.id] || []
            };
        });

    } catch (err: any) {
        console.error("fetchSchedulesByDate error:", err);
        state.error = err.message || "Error al cargar reporte de puestos.";
    } finally {
        state.loading = false;
        notify();
    }
}

// Create a new schedule + checkpoints (Transactional-like)
export async function createSchedule(
    input: Omit<ReportePuestoEntry, "id" | "created_at">,
    checkpoints: Omit<ReportePuestoDetalle, "id" | "schedule_id" | "created_at">[]
): Promise<void> {
    // We do this in two steps since Supabase RPC for complex transaction might be overkill if we don't have one set up. 
    // We'll insert header first, then details.

    try {
        const { data: header, error: headerError } = await supabase
            .from("sp_reportepuesto")
            .insert({
                post_id: input.post_id,
                agent_id: input.agent_id,
                site_name: input.site_name,
                post_name: input.post_name,
                date: input.date,
                start_time: input.start_time,
                end_time: input.end_time,
                frequency_minutes: input.frequency_minutes,
                daily_indicator: input.daily_indicator
            })
            .select()
            .single();

        if (headerError) throw headerError;
        if (!header) throw new Error("No se pudo crear la cabecera del turno.");

        const scheduleId = header.id;

        // Prepare details
        const detailsPayload = checkpoints.map(c => ({
            schedule_id: scheduleId,
            scheduled_time: c.scheduled_time,
            status: c.status,
            is_distress: c.is_distress,
            manual_override: c.manual_override
        }));

        const { error: detailsError } = await supabase
            .from("sp_reportepuesto_detalle")
            .insert(detailsPayload);

        if (detailsError) {
            // Rollback-ish: try to delete the header if details fail (optional but good practice)
            await supabase.from("sp_reportepuesto").delete().eq("id", scheduleId);
            throw detailsError;
        }

        // Do NOT auto-refresh with input.date as it might differ from the current view.
        // The Component is responsible for refreshing if the date matches.

    } catch (err: any) {
        throw new Error(err.message || "Error al crear la programación.");
    }
}

export async function deleteSchedule(id: string, date: string): Promise<void> {
    const { error } = await supabase
        .from("sp_reportepuesto")
        .delete()
        .eq("id", id);

    if (error) throw new Error(error.message);

    await fetchSchedulesByDate(date);
}

// Update specific fields of a schedule (e.g. assigning an agent)
export async function updateSchedule(id: string, date: string, updates: Partial<ReportePuestoEntry>): Promise<void> {
    const { error } = await supabase
        .from("sp_reportepuesto")
        .update(updates)
        .eq("id", id);

    if (error) throw new Error(error.message);
    await fetchSchedulesByDate(date);
}

// Update a checkpoint status (Intervention / Validation)
export async function updateCheckpoint(
    checkpointId: string,
    updates: Partial<ReportePuestoDetalle>,
    currentDateView: string // to refresh
): Promise<void> {
    const payload: any = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.completed_at !== undefined) payload.completed_at = updates.completed_at;
    if (updates.comment !== undefined) payload.comment = updates.comment;
    if (updates.is_distress !== undefined) payload.is_distress = updates.is_distress;
    if (updates.manual_override !== undefined) payload.manual_override = updates.manual_override;

    const { error } = await supabase
        .from("sp_reportepuesto_detalle")
        .update(payload)
        .eq("id", checkpointId);

    if (error) throw new Error(error.message);

    // We could optimize by locally updating state, but refreshing ensures consistency
    await fetchSchedulesByDate(currentDateView);
}
