import { supabase } from "../supabase/supabaseClient";

/* =========================
 * Tipos
 * ========================= */
export type EstadoEquipo = "Disponible" | "Asignado" | "Mantenimiento" | "Baja";
export type EstadoChip = "Disponible" | "Asignado" | "Baja";
export type EstadoSolicitud =
    | "Pendiente IT" // Legacy or specific workflow
    | "Revisión Admin" // Renamed from Pendiente IT for Reposition/Admin flow
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
    operador?: string;
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

export interface Asignacion {
    id: string;
    solicitud_id: string;
    equipo_id?: string | null;
    chip_id?: string | null;
    fecha_entrega?: string | null;
    fecha_entrega_final?: string | null;
    fecha_devolucion?: string | null;
    estado: string;
    usuario_final_dni?: string | null;
    usuario_final_nombre?: string | null;
    usuario_final_area?: string | null;
    usuario_final_puesto?: string | null;
    responsable_dni?: string | null;
    responsable_nombre?: string | null;
    responsable_area?: string | null;
    responsable_puesto?: string | null;
    created_at?: string;
    // Relations
    equipo?: Equipo | null;
    chip?: Chip | null;
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
    tipo_solicitud?: string;
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
    ceco?: string | null;
    categoria?: string | null;
    proyecto?: string | null; // Renamed from descripcion_categoria
    gr?: string | null;

    // New fields for Reposition
    detalle_reposicion?: any; // JSONB
    simulacion_descuento?: any; // JSONB

    // Asignaciones
    alternativa_modelo?: string | null;

    // DEPRECATED COLUMNS (Legacy Data)
    equipo_asignado_id?: string | null;
    chip_asignado_id?: string | null;
    fecha_entrega?: string | null; // Keeps global delivery date
    recibido_por?: string | null; // Global signature
    fecha_devolucion?: string | null;
    estado_retorno?: string | null;
    observaciones_retorno?: string | null;

    created_by?: string | null;

    // Relations (para UI)
    equipo?: Equipo | null;
    chip?: Chip | null;
    usuario?: any;

    // Approvals
    aprobacion_gerencia?: boolean | null;
    fecha_aprobacion_gerencia?: string | null;
    aprobacion_gerencia_nombre?: string | null;

    aprobacion_admin?: boolean | null;
    fecha_aprobacion_admin?: string | null;
    aprobacion_admin_nombre?: string | null;

    // NEW: Multi-assignment
    asignaciones?: Asignacion[];
}

export interface BeneficiarioInput {
    dni: string;
    nombre: string;
    area: string;
    puesto: string;
}

export interface Modelo {
    id: string;
    nombre: string;
    marca: string;
    ram?: string | null;
    almacenamiento?: string | null;
    pantalla?: string | null;
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

export interface Proyecto {
    id: string;
    nombre: string;
    codigo?: string | null;
    active: boolean;
    created_at?: string;
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
    proyectos: [] as Proyecto[],
    solicitudes: [] as Solicitud[],
    asignaciones: [] as Asignacion[], // Cache if needed, or stick to inside Solicitud

    // --- PROYECTOS ---
    async fetchProyectos() {
        const { data, error } = await supabase
            .from("telefonia_proyectos")
            .select("*")
            .order("nombre", { ascending: true });
        if (error) throw error;
        this.proyectos = data as Proyecto[];
    },

    async createProyecto(proyecto: Omit<Proyecto, "id" | "created_at">) {
        const { data, error } = await supabase
            .from("telefonia_proyectos")
            .insert([proyecto])
            .select()
            .single();
        if (error) throw error;
        this.proyectos = [...this.proyectos, data as Proyecto];
        return data as Proyecto;
    },

    async updateProyecto(id: string, updates: Partial<Proyecto>) {
        const { data, error } = await supabase
            .from("telefonia_proyectos")
            .update(updates)
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        this.proyectos = this.proyectos.map((p) => (p.id === id ? (data as Proyecto) : p));
        return data as Proyecto;
    },

    async deleteProyecto(id: string) {
        const { error } = await supabase
            .from("telefonia_proyectos")
            .delete()
            .eq("id", id);
        if (error) throw error;
        this.proyectos = this.proyectos.filter((p) => p.id !== id);
    },

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
        // 1. Fetch Equipos (Recursive Chunking)
        let allEquipos: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data: chunk, error: eqError } = await supabase
                .from("telefonia_equipos")
                .select(`
                    *,
                    chip:telefonia_chips!telefonia_equipos_chip_id_fkey(
                        *,
                        plan:telefonia_planes!telefonia_chips_plan_id_fkey(*)
                    )
                `)
                .order("created_at", { ascending: false })
                .range(from, to);

            if (eqError) throw eqError;

            if (chunk) {
                allEquipos = [...allEquipos, ...chunk];
                if (chunk.length < pageSize) hasMore = false;
            } else {
                hasMore = false;
            }
            page++;
        }

        // 2. Fetch Active Assignments (Entregado status AND no return date)
        const { data: activeSols, error: solError } = await supabase
            .from("telefonia_solicitudes")
            .select("id, equipo_asignado_id, beneficiario_nombre, beneficiario_area, fecha_entrega, tipo_servicio, fundo_planta")
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

        // New Assignments (Graceful fetch)
        try {
            const { data: newAssigns, error: newAssignError } = await supabase
                .from("telefonia_solicitud_asignaciones")
                .select(`
                    id, 
                    equipo_id, 
                    usuario_final_nombre, 
                    usuario_final_area, 
                    fecha_entrega, 
                    solicitud_id,
                    solicitud:telefonia_solicitudes (
                        beneficiario_nombre,
                        beneficiario_area,
                        fundo_planta
                    )
                `)
                .eq("estado", "Entregado")
                .is("fecha_devolucion", null);

            if (!newAssignError && newAssigns) {
                newAssigns.forEach((a: any) => {
                    if (a.equipo_id) {
                        // Priority: Ticket Info > Assignment Info
                        const nombre = a.solicitud?.beneficiario_nombre || a.usuario_final_nombre || "Usuario Asignado";
                        const area = a.solicitud?.beneficiario_area || a.usuario_final_area || "Área asignada";
                        const fundo = a.solicitud?.fundo_planta || "";

                        activeMap.set(a.equipo_id, {
                            id: a.solicitud_id,
                            beneficiario_nombre: nombre,
                            beneficiario_area: area,
                            fecha_entrega: a.fecha_entrega,
                            tipo_servicio: "Asignación Múltiple",
                            fundo_planta: fundo
                        });
                    }
                });
            }
        } catch (e) {
            console.warn("Could not fetch new assignments in fetchEquipos", e);
        }

        this.equipos = (allEquipos as Equipo[]).map(e => ({
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
        // Fetch Chips (Recursive Chunking)
        let allChips: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data: chunk, error } = await supabase
                .from("telefonia_chips")
                .select(`
                    *,
                    equipo:telefonia_equipos!telefonia_chips_equipo_id_fkey(*),
                    plan:telefonia_planes!telefonia_chips_plan_id_fkey(*)
                `)
                .order("created_at", { ascending: false })
                .range(from, to);

            if (error) throw error;

            if (chunk) {
                allChips = [...allChips, ...chunk];
                if (chunk.length < pageSize) hasMore = false;
            } else {
                hasMore = false;
            }
            page++;
        }
        this.chips = allChips as Chip[];
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
        // Fetch Planes (Recursive Chunking)
        let allPlanes: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data: chunk, error } = await supabase
                .from("telefonia_planes")
                .select("*")
                .order("created_at", { ascending: false })
                .range(from, to);

            if (error) throw error;

            if (chunk) {
                allPlanes = [...allPlanes, ...chunk];
                if (chunk.length < pageSize) hasMore = false;
            } else {
                hasMore = false;
            }
            page++;
        }
        this.planes = allPlanes as PlanTelefonico[];
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
        // 1. Fetch Tickets (Recursive Chunking)
        let allTickets: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data: chunk, error } = await supabase
                .from("telefonia_solicitudes")
                .select(`
                    *,
                    equipo:telefonia_equipos!equipo_asignado_id(*),
                    chip:telefonia_chips!chip_asignado_id(*)
                `)
                .order("created_at", { ascending: false })
                .range(from, to);

            if (error) throw error;

            if (chunk) {
                allTickets = [...allTickets, ...chunk];
                if (chunk.length < pageSize) hasMore = false;
            } else {
                hasMore = false;
            }
            page++;
        }

        // ... (Assignments fetching logic remains same, assuming it's usually smaller or linked by ID) ...

        let assignmentsMap: Record<string, Asignacion[]> = {};

        // 2. Try Fetch Assignments (Graceful degradation if table missing)
        try {
            // Ideally we should also paginate this if it grows huge, but for now we focus on main tables
            const { data: allAssignments, error: assignError } = await supabase
                .from("telefonia_solicitud_asignaciones")
                .select(`
                    *,
                    equipo:telefonia_equipos(*),
                    chip:telefonia_chips(*)
                `); // Potentially needs pagination too if > 1000 rows

            if (!assignError && allAssignments) {
                // Group by solicitud_id
                allAssignments.forEach((a: any) => {
                    if (!assignmentsMap[a.solicitud_id]) {
                        assignmentsMap[a.solicitud_id] = [];
                    }
                    assignmentsMap[a.solicitud_id].push(a);
                });
            }
        } catch (e) {
            console.warn("Could not fetch assignments. Table might be missing.", e);
        }

        // 3. Merge
        this.solicitudes = allTickets.map((d: any) => ({
            ...d,
            equipo: d.equipo,
            chip: d.chip,
            asignaciones: assignmentsMap[d.id] || []
        })) as Solicitud[];
    },

    async createSolicitud(sol: Partial<Solicitud>, beneficiariosList: BeneficiarioInput[] = []) {
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

        // Insert Beneficiaries if any
        if (beneficiariosList.length > 0) {
            const assignsPayload = beneficiariosList.map(b => ({
                solicitud_id: newSol.id,
                estado: "Pendiente", // Waiting for assignment
                // Usuario Final (Beneficiary)
                usuario_final_dni: b.dni,
                usuario_final_nombre: b.nombre,
                usuario_final_area: b.area,
                usuario_final_puesto: b.puesto,
                // Responsable (Creator of ticket)
                responsable_dni: newSol.beneficiario_dni, // In new model creator is "beneficiario_*" column
                responsable_nombre: newSol.beneficiario_nombre,
                responsable_area: newSol.beneficiario_area,
                responsable_puesto: newSol.beneficiario_puesto
            }));

            const { error: assignError } = await supabase
                .from("telefonia_solicitud_asignaciones")
                .insert(assignsPayload);

            if (assignError) {
                console.error("Error creating beneficiaries assignments", assignError);
                // Non-blocking but warning
            }
        }

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
                        equipo: telefonia_equipos(*),
                            chip: telefonia_chips(*)
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
            operador,
            equipo: telefonia_equipos!telefonia_chips_equipo_id_fkey(*)
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

        const operador = (chipData as any).operador || "DESCONOCIDO";

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

        console.log(`Validation: Purchase = ${purchaseDate.toISOString()}, YearsDiff = ${yearsDiff} `);

        if (yearsDiff >= 3) {
            return {
                valid: true,
                lastDate: equipo.fecha_compra,
                equipo: infoEquipo,
                message: `Antigüedad: ${yearsDiff} años.Apto para renovación.`,
                operador: operador
            };
        } else {
            return {
                valid: false,
                lastDate: equipo.fecha_compra,
                equipo: infoEquipo,
                message: `Solo tiene ${yearsDiff} años de antigüedad(Req: 3 años).`,
                operador: operador
            };
        }
    },

    async validateReposicion(numero: string): Promise<{ found: boolean; equipo?: string; message: string; operador?: string; plan?: string }> {
        const cleanNumber = numero.replace(/\s+/g, '').trim();

        const { data: chipData, error: chipError } = await supabase
            .from("telefonia_chips")
            .select(`
                id,
                numero_linea,
                operador,
                equipo: telefonia_equipos!telefonia_chips_equipo_id_fkey(*),
                plan: telefonia_planes!telefonia_chips_plan_id_fkey(*)
            `)
            .eq("numero_linea", cleanNumber)
            .maybeSingle();

        if (chipError) {
            return { found: false, message: "Error de conexión" };
        }

        if (!chipData) {
            return { found: false, message: "No encontrado" };
        }

        const equipo = chipData.equipo as any;
        const plan = chipData.plan as any;

        if (!equipo) {
            return { found: true, message: "Línea sin equipo vinculado", equipo: "N/A", operador: chipData.operador, plan: plan ? plan.nombre : undefined };
        }

        return {
            found: true,
            equipo: `${equipo.marca} ${equipo.modelo}`,
            operador: chipData.operador,
            plan: plan ? plan.nombre : undefined,
            message: "Validado"
        };
    },

    async fetchHistorialEquipo(equipoId: string) {
        const { data, error } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .select(`
                *,
                solicitud:telefonia_solicitudes (
                    id,
                    beneficiario_nombre,
                    beneficiario_area,
                    beneficiario_puesto
                )
            `)
            .eq("equipo_id", equipoId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data as any[];
    },

    // --- ACCIONES AVANZADAS ---

    async registrarDevolucion(solicitudId: string | null, equipoId: string, estadoRetorno: string, observaciones: string) {
        const fechaDevolucion = new Date().toISOString();

        // 1. Update Specific Assignment in History Table
        let assignQuery = supabase
            .from("telefonia_solicitud_asignaciones")
            .update({
                fecha_devolucion: fechaDevolucion,
                estado: 'Devuelto'
            })
            .eq("equipo_id", equipoId)
            .is("fecha_devolucion", null);

        if (solicitudId) {
            assignQuery = assignQuery.eq("solicitud_id", solicitudId);
        } else {
            assignQuery = assignQuery.is("solicitud_id", null);
        }

        const { error: assignErr } = await assignQuery;
        if (assignErr) throw assignErr;

        // 2 & 3. Update Legacy Ticket (ONLY if ticket exists)
        if (solicitudId) {
            const { data: solData, error: fetchErr } = await supabase
                .from("telefonia_solicitudes")
                .select("chip_asignado_id, equipo_asignado_id")
                .eq("id", solicitudId)
                .single();

            if (!fetchErr && solData) {
                // We only update the global ticket return date if it's the main equipment.
                if (solData.equipo_asignado_id === equipoId) {
                    await supabase
                        .from("telefonia_solicitudes")
                        .update({
                            fecha_devolucion: fechaDevolucion,
                            estado_retorno: estadoRetorno,
                            observaciones_retorno: observaciones,
                            estado: 'Devuelto'
                        })
                        .eq("id", solicitudId);
                }
            }
        }

        // 4. Update Equipo Status (Free it)
        const nuevoEstadoEquipo: EstadoEquipo = (estadoRetorno === "Dañado" || estadoRetorno === "Robado")
            ? "Mantenimiento"
            : "Disponible";

        await supabase
            .from("telefonia_equipos")
            .update({
                estado: nuevoEstadoEquipo,
                condicion: "Segundo Uso"
            })
            .eq("id", equipoId);

        await this.fetchEquipos();
    },

    async asignarDirectamente(equipoId: string, datosUsuarioFinal: any, datosResponsable: any, ticketData?: {
        ceco?: string;
        justificacion?: string;
        tipo_servicio?: string;
        fundo_planta?: string;
        categoria?: string;
        proyecto?: string;
        beneficiario_puesto_nombre?: string;
        periodo?: string;
        fecha_inicio?: string;
        fecha_fin?: string;
        cultivo?: string;
        cantidad_lineas?: number;
        paquete_asignado?: string;
        plan_costo?: number;
        plan_datos?: string;
        usuario_creador_id?: string;
        gr?: string;
    }) {
        const fechaEntrega = new Date().toISOString();
        const equipo = this.equipos.find(e => e.id === equipoId);

        // 1. Create Ticket (Solicitud) - Status Entregado
        const ticketPayload = {
            tipo_solicitud: "ASIGNACION_DIRECTA", // Or "Inventario"
            tipo_servicio: ticketData?.tipo_servicio ?? "",
            justificacion: ticketData?.justificacion || "Asignación desde Inventario",
            ceco: ticketData?.ceco || "",

            // New Fields
            fundo_planta: ticketData?.fundo_planta || "",
            categoria: ticketData?.categoria || "",
            proyecto: ticketData?.proyecto || "", // Renamed from descripcion_categoria
            gr: ticketData?.gr || "",
            beneficiario_puesto: ticketData?.beneficiario_puesto_nombre || datosResponsable.puesto, // Perfil de Puesto override
            periodo_uso: ticketData?.periodo || "",
            fecha_inicio_uso: ticketData?.fecha_inicio || null,
            fecha_fin_uso: ticketData?.fecha_fin || null,
            cultivo: ticketData?.cultivo || "",
            cantidad_lineas: 1, // Always 1

            // Plan Details
            paquete_asignado: ticketData?.paquete_asignado || null,
            plan_costo: ticketData?.plan_costo || 0,
            plan_datos: ticketData?.plan_datos || null,

            estado: "Entregado",
            fecha_entrega: fechaEntrega,
            beneficiario_dni: datosResponsable.dni,
            beneficiario_nombre: datosResponsable.nombre,
            beneficiario_area: datosResponsable.area,
            // beneficiario_puesto is set above from ticketData
            created_by: ticketData?.usuario_creador_id || null
        };

        const { data: ticket, error: ticketError } = await supabase
            .from("telefonia_solicitudes")
            .insert([ticketPayload])
            .select()
            .single();

        if (ticketError) throw ticketError;

        // 2. Create Assignment associated with Ticket
        const payload = {
            equipo_id: equipoId,
            chip_id: equipo?.chip_id || null,
            estado: "Entregado",
            fecha_entrega: fechaEntrega,
            solicitud_id: ticket.id,

            // Usuario Final
            usuario_final_dni: datosUsuarioFinal.dni,
            usuario_final_nombre: datosUsuarioFinal.nombre,
            usuario_final_area: datosUsuarioFinal.area,
            usuario_final_puesto: datosUsuarioFinal.puesto,

            // Responsable 
            responsable_dni: datosResponsable.dni,
            responsable_nombre: datosResponsable.nombre,
            responsable_area: datosResponsable.area,
            responsable_puesto: datosResponsable.puesto
        };

        const { error } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .insert([payload]);

        if (error) throw error;

        // 3. Update Equipment Status
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
        await this.fetchSolicitudes(); // Refresh tickets too
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
    },

    async fetchAsignaciones(solicitudId: string) {
        const { data, error } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .select(`
                *,
                equipo:telefonia_equipos(*),
                chip:telefonia_chips(*)
            `)
            .eq("solicitud_id", solicitudId);

        if (error) throw error;
        return data as Asignacion[];
    },

    async fetchAsignacionesPorResponsable(dni: string) {
        const { data, error } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .select(`
                *,
                equipo:telefonia_equipos(*),
                chip:telefonia_chips(*)
            `)
            .eq("responsable_dni", dni)
            .eq("estado", "Entregado")
            .is("fecha_devolucion", null);

        if (error) throw error;
        return data as Asignacion[];
    },

    async asignarEquipos(solicitudId: string, items: { equipoId: string; chipId?: string | null }[], firma?: string) {
        // 1. Process Assignments (Update existing or Insert new)
        const newAssignments = [];
        const updatePromises = [];

        for (const item of items) {
            if ((item as any).asignacionId) {
                // UPDATE existing assignment
                updatePromises.push(
                    supabase
                        .from("telefonia_solicitud_asignaciones")
                        .update({
                            equipo_id: item.equipoId,
                            chip_id: item.chipId || null,
                            fecha_entrega: new Date().toISOString(),
                            estado: 'Entregado'
                        })
                        .eq("id", (item as any).asignacionId)
                );
            } else {
                // INSERT new assignment (Legacy fallback)
                newAssignments.push({
                    solicitud_id: solicitudId,
                    equipo_id: item.equipoId,
                    chip_id: item.chipId || null,
                    fecha_entrega: new Date().toISOString(),
                    estado: 'Entregado'
                });
            }
        }

        // Execute updates
        if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
        }

        // Execute inserts
        if (newAssignments.length > 0) {
            const { error: assignError } = await supabase
                .from("telefonia_solicitud_asignaciones")
                .insert(newAssignments);
            if (assignError) throw assignError;
        }



        // 2. Update Equipment Status
        const equipoIds = items.map(i => i.equipoId);
        const { error: eqError } = await supabase
            .from("telefonia_equipos")
            .update({ estado: "Asignado" })
            .in("id", equipoIds);

        if (eqError) throw eqError;

        // 3. Update Chips Status (if any)
        const chipIds = items.map(i => i.chipId).filter(id => id);
        if (chipIds.length > 0) {
            await supabase
                .from("telefonia_chips")
                .update({ estado: "Asignado" })
                .in("id", chipIds);
        }

        // 4. Update Solicitud Status (Entregado) and Main Signature
        // NOTE: We persist the MAIN signature in the ticket for record of "Bulk Delivery".
        // Recipient is the "Responsable del Bloque".
        await this.updateSolicitud(solicitudId, {
            estado: "Entregado",
            fecha_entrega: new Date().toISOString(),
            recibido_por: firma
        });

        await this.fetchSolicitudes();
        await this.fetchEquipos();
    },

    async updateAsignacionResponsable(asignacionId: string, datos: { dni: string; nombre: string; area: string; fecha_entrega_final?: string }) {
        const { error } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .update({
                usuario_final_dni: datos.dni,
                usuario_final_nombre: datos.nombre,
                usuario_final_area: datos.area,
                fecha_entrega_final: datos.fecha_entrega_final
            })
            .eq("id", asignacionId);

        if (error) throw error;
        await this.fetchSolicitudes();
    },

    async registrarDevolucionItem(asignacionId: string, estadoRetorno: string, _observaciones: string) {
        // 1. Update Asignacion
        const { data: asignacion, error: fetchErr } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .update({
                fecha_devolucion: new Date().toISOString(),
                estado: "Devuelto",
                // We might want to store return condition per item in a separate log or field if needed,
                // but schema only has status. For now we assume 'Devuelto' status implies return.
                // We can use the 'estado' field for tracking 'Devuelto' status.
            })
            .eq("id", asignacionId)
            .select()
            .single();

        if (fetchErr) throw fetchErr;

        // 2. Update Equipo Status
        if (asignacion.equipo_id) {
            await supabase
                .from("telefonia_equipos")
                .update({
                    estado: (estadoRetorno === "Dañado" || estadoRetorno === "Robado") ? "Mantenimiento" : "Disponible",
                    condicion: "Segundo Uso"
                })
                .eq("id", asignacion.equipo_id);
        }

        // 3. Update Chip Status
        if (asignacion.chip_id) {
            await supabase
                .from("telefonia_chips")
                .update({ estado: "Disponible" })
                .eq("id", asignacion.chip_id);
        }

        // 4. Check if ALL items in the ticket are returned?
        // Optional: If all returned, mark Ticket as "Finalizado/Devuelto"?
        // For now, we leave the ticket as "Entregado" but items are free.

        await this.fetchSolicitudes();
        await this.fetchEquipos();
    }
};
