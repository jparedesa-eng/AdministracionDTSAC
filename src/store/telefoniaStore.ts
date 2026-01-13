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
    | "Cancelada"
    | "Auditada"; // Estado para bajas/asignaciones cerradas internamente

export type CondicionEquipo = "Nuevo" | "Segundo Uso" | "Dañado";

export interface ValidationResult {
    valid: boolean;
    lastDate?: string;
    message: string;
    equipo?: string;
}

export interface PlanTelefonico {
    id: string;
    operador: 'CLARO' | 'ENTEL' | 'MOVISTAR';
    nombre: string; // e.g. "Plan 29.90"
    costo: number;
    gigas: string; // e.g. "10GB", "Ilimitado"
    llamadas: string; // default "Ilimitadas"
    sms: string; // default "Ilimitados"
    active: boolean;
    created_at?: string;
}

export interface Equipo {
    id: string;
    marca: string;
    modelo: string;
    imei: string;
    color?: string | null;
    estado: EstadoEquipo;
    condicion?: CondicionEquipo;
    fecha_compra?: string | null;
    created_at?: string;
    // Relations
    chip_id?: string | null;
    chip?: Chip | null;
    // Specs
    ram?: string | null;
    almacenamiento?: string | null;
    pantalla?: string | null;
    // Helpers (Populated by store)
    asignacion_activa?: Solicitud | null;
}

export interface Chip {
    id: string;
    numero_linea: string;
    operador: string;
    estado: EstadoChip;
    plan_id?: string | null;
    created_at?: string;
    // Relations
    equipo_id?: string | null;
    equipo?: Equipo | null;
    plan?: PlanTelefonico | null;
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
    paquete_asignado?: string | null; // Nombre del plan (Legacy or UI selector)
    plan_costo?: number | null;
    plan_datos?: string | null;
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

    // Entrega / Asignación
    fecha_entrega?: string | null;
    recibido_por?: string | null;

    // Devolución / Retorno
    fecha_devolucion?: string | null;
    estado_retorno?: string | null; // Bueno, Dañado, Robado
    observaciones_retorno?: string | null;

    created_by?: string | null;

    // Relations (para UI)
    equipo?: Equipo | null;
    chip?: Chip | null;
    usuario?: any;
}

export interface Modelo {
    id: string;
    nombre: string;
    marca: string;
    ram?: string | null;
    almacenamiento?: string | null;
    created_at?: string;
}

export interface Puesto {
    id: string;
    nombre: string;
    modelo_recomendado_id?: string | null;
    plan_recomendado_id?: string | null;
    created_at?: string;
    // Relations
    modelo?: Modelo | null;
    plan?: PlanTelefonico | null;
}

/* =========================
 * Store
 * ========================= */
export const telefoniaStore = {
    equipos: [] as Equipo[],
    chips: [] as Chip[],
    planes: [] as PlanTelefonico[],
    modelos: [] as Modelo[],
    puestos: [] as Puesto[],
    solicitudes: [] as Solicitud[],

    // --- MODELOS ---
    async fetchModelos() {
        const { data, error } = await supabase
            .from("telefonia_modelos")
            .select("*")
            .order("nombre", { ascending: true });
        if (error) throw error;
        this.modelos = data as Modelo[];
    },

    async createModelo(modelo: Omit<Modelo, "id" | "created_at">) {
        const { data, error } = await supabase
            .from("telefonia_modelos")
            .insert([modelo])
            .select()
            .single();
        if (error) throw error;
        await this.fetchModelos();
        return data as Modelo;
    },

    async updateModelo(id: string, updates: Partial<Modelo>) {
        const { data, error } = await supabase
            .from("telefonia_modelos")
            .update(updates)
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        await this.fetchModelos();
        return data as Modelo;
    },

    async deleteModelo(id: string) {
        const { error } = await supabase
            .from("telefonia_modelos")
            .delete()
            .eq("id", id);
        if (error) throw error;
        this.modelos = this.modelos.filter((m) => m.id !== id);
    },

    // --- PUESTOS ---
    async fetchPuestos() {
        const { data, error } = await supabase
            .from("telefonia_puestos")
            .select(`
                *,
                modelo:telefonia_modelos(*),
                plan:telefonia_planes(*)
            `)
            .order("nombre", { ascending: true });
        if (error) throw error;
        this.puestos = data as Puesto[];
    },

    async createPuesto(puesto: Omit<Puesto, "id" | "created_at" | "modelo" | "plan">) {
        const { data, error } = await supabase
            .from("telefonia_puestos")
            .insert([puesto])
            .select()
            .single();
        if (error) throw error;
        await this.fetchPuestos();
        return data as Puesto;
    },

    async updatePuesto(id: string, updates: Partial<Puesto>) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { modelo, plan, ...payload } = updates;
        const { data, error } = await supabase
            .from("telefonia_puestos")
            .update(payload)
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        await this.fetchPuestos();
        return data as Puesto;
    },

    async deletePuesto(id: string) {
        const { error } = await supabase
            .from("telefonia_puestos")
            .delete()
            .eq("id", id);
        if (error) throw error;
        this.puestos = this.puestos.filter((p) => p.id !== id);
    },

    // --- EQUIPOS ---
    async fetchEquipos() {
        // 1. Fetch Equipos
        const { data: equiposData, error: eqError } = await supabase
            .from("telefonia_equipos")
            .select(`
                *,
                chip:telefonia_chips!telefonia_equipos_chip_id_fkey(
                    *,
                    plan:telefonia_planes!telefonia_chips_plan_id_fkey(*)
                )
            `)
            .order("created_at", { ascending: false });
        if (eqError) throw eqError;

        // 2. Fetch Active Assignments (Entregado status AND no return date)
        const { data: activeSols, error: solError } = await supabase
            .from("telefonia_solicitudes")
            .select("id, equipo_asignado_id, beneficiario_nombre, beneficiario_area, fecha_entrega, tipo_servicio")
            .eq("estado", "Entregado")
            .not("equipo_asignado_id", "is", null)
            .is("fecha_devolucion", null);

        if (solError) throw solError;

        // 3. Map assignments
        const activeMap = new Map();
        if (activeSols) {
            activeSols.forEach((s) => {
                if (s.equipo_asignado_id) {
                    activeMap.set(s.equipo_asignado_id, s);
                }
            });
        }

        this.equipos = (equiposData as Equipo[]).map(e => ({
            ...e,
            asignacion_activa: activeMap.get(e.id) || null
        }));
    },

    async createEquipo(eq: Omit<Equipo, "id" | "created_at">) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { chip, asignacion_activa, ...payload } = eq;
        const { data, error } = await supabase
            .from("telefonia_equipos")
            .insert([payload])
            .select()
            .single();
        if (error) throw error;
        await this.fetchEquipos();
        return data as Equipo;
    },

    async updateEquipo(id: string, updates: Partial<Equipo>) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { chip, asignacion_activa, ...payload } = updates;
        const { data, error } = await supabase
            .from("telefonia_equipos")
            .update(payload)
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        await this.fetchEquipos();
        return data as Equipo;
    },

    // --- CHIPS ---
    async fetchChips() {
        const { data, error } = await supabase
            .from("telefonia_chips")
            .select(`
                *,
                equipo:telefonia_equipos!telefonia_chips_equipo_id_fkey(*),
                plan:telefonia_planes!telefonia_chips_plan_id_fkey(*)
            `)
            .order("created_at", { ascending: false });
        if (error) throw error;
        this.chips = data as Chip[];
    },

    async createChip(chip: Omit<Chip, "id" | "created_at">) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { equipo, plan, ...payload } = chip;
        const { data, error } = await supabase
            .from("telefonia_chips")
            .insert([payload])
            .select()
            .single();
        if (error) throw error;
        await this.fetchChips();
        return data as Chip;
    },

    async updateChip(id: string, updates: Partial<Chip>) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { equipo, plan, ...payload } = updates;
        const { data, error } = await supabase
            .from("telefonia_chips")
            .update(payload)
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        await this.fetchChips();
        return data as Chip;
    },

    // --- PLANES ---
    async fetchPlanes() {
        const { data, error } = await supabase
            .from("telefonia_planes")
            .select("*")
            .order("created_at", { ascending: false });
        if (error) throw error;
        this.planes = data as PlanTelefonico[];
    },

    async createPlan(plan: Omit<PlanTelefonico, "id" | "created_at">) {
        const { data, error } = await supabase
            .from("telefonia_planes")
            .insert([plan])
            .select()
            .single();
        if (error) throw error;
        this.planes = [data as PlanTelefonico, ...this.planes];
        return data;
    },

    async updatePlan(id: string, updates: Partial<PlanTelefonico>) {
        const { data, error } = await supabase
            .from("telefonia_planes")
            .update(updates)
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        this.planes = this.planes.map((p) => (p.id === id ? (data as PlanTelefonico) : p));
        return data;
    },

    async deletePlan(id: string) {
        const { error } = await supabase
            .from("telefonia_planes")
            .delete()
            .eq("id", id);
        if (error) throw error;
        this.planes = this.planes.filter((p) => p.id !== id);
    },

    // --- SOLICITUDES ---
    async fetchSolicitudes() {
        const { data, error } = await supabase
            .from("telefonia_solicitudes")
            .select(`
        *,
        equipo:telefonia_equipos(*),
        chip:telefonia_chips(*),
        usuario:created_by ( id, nombre1, nombre2, ap_pat, ap_mat )
      `)
            .order("created_at", { ascending: false });
        if (error) throw error;

        this.solicitudes = data.map((d: any) => ({
            ...d,
            equipo: d.equipo,
            chip: d.chip,
        })) as Solicitud[];
    },

    async createSolicitud(sol: Partial<Solicitud>) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { equipo, chip, id, created_at, usuario, ...rest } = sol;
        const payload: any = { ...rest };

        const { data, error } = await supabase
            .from("telefonia_solicitudes")
            .insert([payload])
            .select()
            .single();
        if (error) throw error;

        const newSol = data as Solicitud;
        this.solicitudes = [newSol, ...this.solicitudes];
        return newSol;
    },

    async updateSolicitud(id: string, updates: Partial<Solicitud>) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { equipo, chip, usuario, ...payload } = updates;
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

        const updated = { ...data } as Solicitud;
        this.solicitudes = this.solicitudes.map((s) => s.id === id ? updated : s);
        return updated;
    },

    // --- LINKING ---
    async vincular(equipoId: string, chipId: string) {
        // 1. Update Equipo
        const { error: errEq } = await supabase
            .from("telefonia_equipos")
            .update({ chip_id: chipId })
            .eq("id", equipoId);
        if (errEq) throw errEq;

        // 2. Update Chip
        const { error: errCh } = await supabase
            .from("telefonia_chips")
            .update({ equipo_id: equipoId })
            .eq("id", chipId);
        if (errCh) throw errCh;

        await this.fetchEquipos();
        await this.fetchChips();
    },

    async desvincular(equipoId: string, chipId: string) {
        const { error: errEq } = await supabase
            .from("telefonia_equipos")
            .update({ chip_id: null })
            .eq("id", equipoId);
        if (errEq) throw errEq;

        const { error: errCh } = await supabase
            .from("telefonia_chips")
            .update({ equipo_id: null })
            .eq("id", chipId);
        if (errCh) throw errCh;

        await this.fetchEquipos();
        await this.fetchChips();
    },

    // --- LOGIC / VALIDATIONS ---
    async validateRenovacion(numero: string): Promise<ValidationResult> {
        // Clean input (remove spaces, hyphens)
        const cleanNumber = numero.replace(/\s+/g, '').trim();
        console.log("Validating renovation for:", cleanNumber);

        // 1. Buscar el chip activo con ese número
        const { data: chipData, error: chipError } = await supabase
            .from("telefonia_chips")
            .select(`
                id, 
                numero_linea, 
                equipo:telefonia_equipos!telefonia_chips_equipo_id_fkey(*)
            `)
            .eq("numero_linea", cleanNumber)
            .maybeSingle();

        if (chipError) {
            console.error("Error finding chip:", chipError);
            return { valid: false, message: "Error al consultar inventario." };
        }

        if (!chipData) {
            return { valid: false, message: `No se encontró línea activa con el número ${cleanNumber}.` };
        }

        // 2. Verificar si tiene equipo vinculado
        const equipo = chipData.equipo as any;
        if (!equipo) {
            return { valid: false, message: "La línea existe pero no tiene un equipo vinculado." };
        }

        const infoEquipo = `${equipo.marca} ${equipo.modelo}`;

        // 3. Verificar fecha de compra
        if (!equipo.fecha_compra) {
            return {
                valid: false,
                equipo: infoEquipo,
                message: "El equipo no tiene Fecha de Compra registrada."
            };
        }

        const purchaseDate = new Date(equipo.fecha_compra);
        const today = new Date();

        // Calculate precise year difference
        let yearsDiff = today.getFullYear() - purchaseDate.getFullYear();
        const m = today.getMonth() - purchaseDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < purchaseDate.getDate())) {
            yearsDiff--;
        }

        console.log(`Validation: Purchase=${purchaseDate.toISOString()}, YearsDiff=${yearsDiff}`);

        if (yearsDiff >= 3) {
            return {
                valid: true,
                lastDate: equipo.fecha_compra,
                equipo: infoEquipo,
                message: `Antigüedad: ${yearsDiff} años. Apto para renovación.`
            };
        } else {
            return {
                valid: false,
                lastDate: equipo.fecha_compra,
                equipo: infoEquipo,
                message: `Solo tiene ${yearsDiff} años de antigüedad (Req: 3 años).`
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
    },

    // --- ACCIONES AVANZADAS ---

    async registrarDevolucion(solicitudId: string, estadoRetorno: string, observaciones: string) {
        // 1. Fetch info
        const { data: solData, error: fetchErr } = await supabase
            .from("telefonia_solicitudes")
            .select("equipo_asignado_id, chip_asignado_id")
            .eq("id", solicitudId)
            .single();

        if (fetchErr) throw fetchErr;

        const { equipo_asignado_id, chip_asignado_id } = solData;
        const fechaDevolucion = new Date().toISOString();

        // 2. Update Solicitud
        const { error: solUpdateErr } = await supabase
            .from("telefonia_solicitudes")
            .update({
                fecha_devolucion: fechaDevolucion,
                estado_retorno: estadoRetorno,
                observaciones_retorno: observaciones
            })
            .eq("id", solicitudId);

        if (solUpdateErr) throw solUpdateErr;

        // 3. Update Equipo
        const nuevoEstadoEquipo: EstadoEquipo = (estadoRetorno === "Dañado" || estadoRetorno === "Robado")
            ? "Mantenimiento"
            : "Disponible";

        if (equipo_asignado_id) {
            await supabase
                .from("telefonia_equipos")
                .update({
                    estado: nuevoEstadoEquipo,
                    condicion: "Segundo Uso"
                })
                .eq("id", equipo_asignado_id);

            // Si hay chip, desvincular y liberar
            if (chip_asignado_id) {
                await this.desvincular(equipo_asignado_id, chip_asignado_id);
                await supabase
                    .from("telefonia_chips")
                    .update({ estado: "Disponible" })
                    .eq("id", chip_asignado_id);
            }
        }
        await this.fetchEquipos();
    },

    async asignarDirectamente(equipoId: string, datosBeneficiario: any) {
        // Crea un ticket "ASIGNACION_DIRECTA" entregado
        const payload: Partial<Solicitud> = {
            tipo_servicio: "ASIGNACION_DIRECTA",
            beneficiario_dni: datosBeneficiario.dni,
            beneficiario_nombre: datosBeneficiario.nombre,
            beneficiario_area: datosBeneficiario.area,
            beneficiario_puesto: datosBeneficiario.puesto,
            equipo_asignado_id: equipoId,
            estado: "Entregado",
            fecha_entrega: new Date().toISOString(),
            justificacion: "Asignación manual desde Inventario",
        };

        const equipo = this.equipos.find(e => e.id === equipoId);
        if (equipo && equipo.chip_id) {
            payload.chip_asignado_id = equipo.chip_id;
        }

        const { error } = await supabase
            .from("telefonia_solicitudes")
            .insert([payload]);
        if (error) throw error;

        // Update status
        await supabase
            .from("telefonia_equipos")
            .update({ estado: "Asignado" })
            .eq("id", equipoId);

        if (equipo && equipo.chip_id) {
            await supabase
                .from("telefonia_chips")
                .update({ estado: "Asignado" })
                .eq("id", equipo.chip_id);
        }

        await this.fetchEquipos();
    },

    async solicitarBajaDirecta(equipoId: string, motivo: string, usuarioId?: string) {
        const payload: Partial<Solicitud> = {
            tipo_servicio: "BAJA_INTERNA",
            justificacion: motivo,
            equipo_asignado_id: equipoId,
            estado: "Pendiente Admin",
            beneficiario_nombre: "INTERNAL_SYSTEM",
            created_by: usuarioId
        };

        const { error } = await supabase
            .from("telefonia_solicitudes")
            .insert([payload]);
        if (error) throw error;

        await supabase
            .from("telefonia_equipos")
            .update({ estado: "Mantenimiento" }) // Pendiente de baja
            .eq("id", equipoId);

        await this.fetchEquipos();
    },

    async procesarBaja(equipoId: string, accion: 'APROBAR' | 'REPARADO') {
        if (accion === 'APROBAR') {
            await supabase
                .from("telefonia_equipos")
                .update({ estado: "Baja" })
                .eq("id", equipoId);
        } else {
            await supabase
                .from("telefonia_equipos")
                .update({ estado: "Disponible", condicion: "Segundo Uso" })
                .eq("id", equipoId);
        }

        // Aquí deberíamos buscar la solicitud de BAJA_INTERNA pendiente y cerrarla
        // pero por ahora simplificamos solo actualizando el equipo.
        await this.fetchEquipos();
    }
};
