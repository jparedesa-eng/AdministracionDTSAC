import { supabase } from "../supabase/supabaseClient";

/* =========================
 * Tipos
 * ========================= */
export type EstadoEquipo = "Disponible" | "Asignado" | "Mantenimiento" | "Baja";
export type EstadoChip = "Disponible" | "Asignado" | "Baja";
export type EstadoSolicitud =
    | "Pendiente IT"
    | "Pendiente Gerencia"
    | "Pendiente Admin"
    | "Programar Entrega"
    | "Entregado"
    | "Rechazada"
    | "Cancelada";

export interface ValidationResult {
    valid: boolean;
    lastDate?: string;
    message: string;
    equipo?: string;
}

export interface Equipo {
    id: string;
    marca: string;
    modelo: string;
    imei: string;
    color?: string | null;
    estado: EstadoEquipo;
    created_at?: string;
    // Relations
    chip_id?: string | null;
    chip?: Chip | null;
}

export interface Chip {
    id: string;
    numero_linea: string;
    operador: string;
    estado: EstadoChip;
    created_at?: string;
    // Relations
    equipo_id?: string | null;
    equipo?: Equipo | null;
}

export interface Solicitud {
    id: string;
    created_at: string;
    usuario_creador_id?: string | null;
    // Datos del beneficiario
    beneficiario_dni?: string | null;
    beneficiario_nombre?: string | null;
    beneficiario_area?: string | null;
    beneficiario_puesto?: string | null;
    beneficiario_n_linea_ref?: string;
    tipo_servicio?: string | null;
    periodo_uso?: string | null;
    fecha_inicio_uso?: string | null;
    fecha_fin_uso?: string | null;
    fundo_planta?: string | null;
    cultivo?: string | null;
    cantidad_lineas?: number | null;
    justificacion?: string | null;
    aplicativos?: string[] | null;

    estado: EstadoSolicitud;

    // Asignaciones
    alternativa_modelo?: string | null;
    equipo_asignado_id?: string | null;
    chip_asignado_id?: string | null;

    // Aprobaciones
    aprobacion_gerencia: boolean;
    fecha_aprobacion_gerencia?: string | null;
    aprobacion_admin: boolean;
    fecha_aprobacion_admin?: string | null;

    // Entrega
    fecha_entrega?: string | null;
    recibido_por?: string | null;

    created_by?: string | null;

    // Relations (para UI)
    equipo?: Equipo | null;
    chip?: Chip | null;
}

/* =========================
 * Store
 * ========================= */
export const telefoniaStore = {
    equipos: [] as Equipo[],
    chips: [] as Chip[],
    solicitudes: [] as Solicitud[],

    // --- EQUIPOS ---
    async fetchEquipos() {
        const { data, error } = await supabase
            .from("telefonia_equipos")
            .select(`
                *,
                chip:telefonia_chips!telefonia_equipos_chip_id_fkey(*)
            `)
            .order("created_at", { ascending: false });
        if (error) throw error;
        this.equipos = data as Equipo[];
    },

    async createEquipo(eq: Omit<Equipo, "id" | "created_at">) {
        const { chip, ...payload } = eq;
        const { data, error } = await supabase
            .from("telefonia_equipos")
            .insert([payload])
            .select()
            .single();
        if (error) throw error;
        this.equipos = [data as Equipo, ...this.equipos];
        return data;
    },

    async updateEquipo(id: string, updates: Partial<Equipo>) {
        const { chip, ...payload } = updates;
        const { data, error } = await supabase
            .from("telefonia_equipos")
            .update(payload)
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        this.equipos = this.equipos.map((e) => (e.id === id ? (data as Equipo) : e));
        return data;
    },

    // --- CHIPS ---
    async fetchChips() {
        const { data, error } = await supabase
            .from("telefonia_chips")
            .select(`
                *,
                equipo:telefonia_equipos!telefonia_chips_equipo_id_fkey(*)
            `)
            .order("created_at", { ascending: false });
        if (error) throw error;
        this.chips = data as Chip[];
    },

    async createChip(chip: Omit<Chip, "id" | "created_at">) {
        const { equipo, ...payload } = chip;
        const { data, error } = await supabase
            .from("telefonia_chips")
            .insert([payload])
            .select()
            .single();
        if (error) throw error;
        this.chips = [data as Chip, ...this.chips];
        return data;
    },

    async updateChip(id: string, updates: Partial<Chip>) {
        const { equipo, ...payload } = updates;
        const { data, error } = await supabase
            .from("telefonia_chips")
            .update(payload)
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        this.chips = this.chips.map((c) => (c.id === id ? (data as Chip) : c));
        return data;
    },

    // --- SOLICITUDES ---
    async fetchSolicitudes() {
        const { data, error } = await supabase
            .from("telefonia_solicitudes")
            .select(`
        *,
        equipo:telefonia_equipos(*),
        chip:telefonia_chips(*)
      `)
            .order("created_at", { ascending: false });
        if (error) throw error;

        // Map relations manually if needed, or rely on Supabase return structure matching interface
        this.solicitudes = data.map((d: any) => ({
            ...d,
            equipo: d.equipo,
            chip: d.chip,
        })) as Solicitud[];
    },

    async createSolicitud(sol: Partial<Solicitud>) {
        // Omitting relations and mapping legacy/frontend-only fields
        const { equipo, chip, id, created_at, ...rest } = sol;

        const payload: any = { ...rest };

        const { data, error } = await supabase
            .from("telefonia_solicitudes")
            .insert([payload])
            .select()
            .single();
        if (error) throw error;

        // Add to local state (might need refresh to get relations)
        const newSol = data as Solicitud;
        this.solicitudes = [newSol, ...this.solicitudes];
        return newSol;
    },

    async updateSolicitud(id: string, updates: Partial<Solicitud>) {
        const { equipo, chip, ...payload } = updates;
        const { data, error } = await supabase
            .from("telefonia_solicitudes")
            .update(payload)
            .eq("id", id)
            .select(`
        *,
        equipo:telefonia_equipos(*),
        chip:telefonia_chips(*)
      `)
            .single();
        if (error) throw error;

        const updated = {
            ...data,
            equipo: data.equipo,
            chip: data.chip
        } as Solicitud;

        this.solicitudes = this.solicitudes.map((s) =>
            s.id === id ? updated : s
        );
        return updated;
    },

    // --- LINKING ---
    async vincular(equipoId: string, chipId: string) {
        // 1. Update Equipo -> set chip_id
        const { error: errEq } = await supabase
            .from("telefonia_equipos")
            .update({ chip_id: chipId })
            .eq("id", equipoId);
        if (errEq) throw errEq;

        // 2. Update Chip -> set equipo_id
        const { error: errCh } = await supabase
            .from("telefonia_chips")
            .update({ equipo_id: equipoId })
            .eq("id", chipId);
        if (errCh) throw errCh;

        // Refresh data to update UI
        await this.fetchEquipos();
        await this.fetchChips();
    },

    async desvincular(equipoId: string, chipId: string) {
        // 1. Update Equipo -> clear chip_id
        const { error: errEq } = await supabase
            .from("telefonia_equipos")
            .update({ chip_id: null })
            .eq("id", equipoId);
        if (errEq) throw errEq;

        // 2. Update Chip -> clear equipo_id
        const { error: errCh } = await supabase
            .from("telefonia_chips")
            .update({ equipo_id: null })
            .eq("id", chipId);
        if (errCh) throw errCh;

        // Refresh data
        await this.fetchEquipos();
        await this.fetchChips();
    },

    // --- LOGIC / VALIDATIONS ---
    async validateRenovacion(numero: string): Promise<ValidationResult> {
        const { data, error } = await supabase
            .from("telefonia_solicitudes")
            .select(`
                *,
                equipo:telefonia_equipos(*)
            `)
            .eq("detalle_numero_telefono", numero)
            .eq("estado", "Entregado")
            .order("fecha_entrega", { ascending: false })
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
            return {
                valid: false,
                message: "No se encontró historial de entregas para este número."
            };
        }

        const lastSolicitud = data[0];
        if (!lastSolicitud.fecha_entrega) {
            return {
                valid: false,
                message: "El registro existe pero no tiene fecha de entrega."
            };
        }

        const deliveryDate = new Date(lastSolicitud.fecha_entrega);
        const today = new Date();

        // Calcular diferencia en años
        let yearsDiff = today.getFullYear() - deliveryDate.getFullYear();
        const m = today.getMonth() - deliveryDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < deliveryDate.getDate())) {
            yearsDiff--;
        }

        const infoEquipo = lastSolicitud.equipo
            ? `${lastSolicitud.equipo.marca} ${lastSolicitud.equipo.modelo}`
            : "Equipo desconocido";

        if (yearsDiff >= 3) {
            return {
                valid: true,
                lastDate: lastSolicitud.fecha_entrega,
                equipo: infoEquipo,
                message: `Última renovación: ${deliveryDate.toLocaleDateString()}. Han pasado ${yearsDiff} años.`
            };
        } else {
            return {
                valid: false,
                lastDate: lastSolicitud.fecha_entrega,
                equipo: infoEquipo,
                message: `Última renovación: ${deliveryDate.toLocaleDateString()}. Solo han pasado ${yearsDiff} años (Regla: 3 años).`
            };
        }
    },

    async fetchHistorialEquipo(equipoId: string) {
        const { data, error } = await supabase
            .from("telefonia_solicitudes")
            .select(`
                *,
                usuario:created_by ( nombre, area )
            `)
            .eq("equipo_asignado_id", equipoId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data as Solicitud[];
    }
};
