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

export interface Equipo {
    id: string;
    marca: string;
    modelo: string;
    imei: string;
    color?: string | null;
    estado: EstadoEquipo;
    created_at?: string;
}

export interface Chip {
    id: string;
    numero_linea: string;
    operador: string;
    estado: EstadoChip;
    created_at?: string;
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
    beneficiario_n_linea_ref?: string | null;

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
            .select("*")
            .order("created_at", { ascending: false });
        if (error) throw error;
        this.equipos = data as Equipo[];
    },

    async createEquipo(eq: Omit<Equipo, "id" | "created_at">) {
        const { data, error } = await supabase
            .from("telefonia_equipos")
            .insert([eq])
            .select()
            .single();
        if (error) throw error;
        this.equipos = [data as Equipo, ...this.equipos];
        return data;
    },

    async updateEquipo(id: string, updates: Partial<Equipo>) {
        const { data, error } = await supabase
            .from("telefonia_equipos")
            .update(updates)
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
            .select("*")
            .order("created_at", { ascending: false });
        if (error) throw error;
        this.chips = data as Chip[];
    },

    async createChip(chip: Omit<Chip, "id" | "created_at">) {
        const { data, error } = await supabase
            .from("telefonia_chips")
            .insert([chip])
            .select()
            .single();
        if (error) throw error;
        this.chips = [data as Chip, ...this.chips];
        return data;
    },

    async updateChip(id: string, updates: Partial<Chip>) {
        const { data, error } = await supabase
            .from("telefonia_chips")
            .update(updates)
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
        // Omitting relations from insert
        const { equipo, chip, id, created_at, ...payload } = sol;

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
};
