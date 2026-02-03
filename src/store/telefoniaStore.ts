import { supabase } from "../supabase/supabaseClient";

/* =========================
 * Tipos
 * ========================= */
export type EstadoEquipo = "Disponible" | "Asignado" | "Mantenimiento" | "Baja" | "Para Devolucion" | "Para Revisión";
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
    // New Fields
    categoria?: 'TELEFONIA' | 'PROYECTO' | string;
    ubicacion?: string;
    estado_actual?: string; // Estado físico actual (Bueno, Dañado, Robado)
    // Helpers (Populated by store)
    asignacion_activa?: Solicitud | null;
    periodo_asignado?: string; // Derived from active assignment
    fecha_fin_asignado?: string; // Derived from active assignment

    // Facturación / Origen
    factura_id?: string | null;
    solicitud_compra_id?: string | null;
    factura?: Factura | null;
}

export interface FacturaItem {
    id: string;
    factura_id: string;
    modelo_id: string; // Link to Modelo
    nombre_modelo: string; // Snapshot name
    cantidad: number;
    costo_unitario: number;
    // Helper
    modelo?: Modelo;

    // Moved from Header
    solicitud_id?: string | null;
    ceco?: string | null;
    tipo_adquisicion?: string | null;
    asumido_por?: 'Danper' | 'Usuario' | string | null;
    solicitud?: import("./telefoniaStore").Solicitud; // Relation
}

export interface Factura {
    id: string;
    numero_factura: string;
    proveedor: 'CLARO' | 'ENTEL';
    fecha_compra: string;
    monto: number;
    cantidad_total?: number;
    created_at?: string;

    // Relations
    items?: FacturaItem[];
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
    asignacion_activa?: any | null; // Derived from active assignment
    periodo_asignado?: string; // Derived from active assignment
    fecha_fin_asignado?: string; // Derived from active assignment
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
    usuario_final_sede?: string | null;
    usuario_final_puesto?: string | null;
    responsable_dni?: string | null;
    responsable_nombre?: string | null;
    responsable_area?: string | null;
    responsable_puesto?: string | null;
    created_at?: string;
    // Relations
    equipo?: Equipo | null;
    chip?: Chip | null;

    // New Fields for Chip Only Request
    tipo_equipo_destino?: string | null;
    codigo_equipo_destino?: string | null;
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
    asignacion_id?: string | null; // ID of the specific assignment record

    // DEPRECATED COLUMNS (Legacy Data)
    // DEPRECATED / REMOVED COLUMNS
    // equipo_asignado_id?: string | null;
    // chip_asignado_id?: string | null;
    fecha_entrega?: string | null; // Keeps global delivery date
    recibido_por?: string | null; // Global signature
    // fecha_devolucion?: string | null; // Removed
    // estado_retorno?: string | null; // Removed
    // observaciones_retorno?: string | null; // Removed

    // created_by?: string | null;

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

    // New Fields for Chip Only Request
    tipo_equipo_destino?: string | null;
    codigo_equipo_destino?: string | null;
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

export interface Baja {
    id: string;
    created_at: string;
    equipo_id: string;
    motivo: string;
    usuario_solicitante_id?: string;
    dni_solicitante?: string;
    nombre_solicitante?: string;
    usuario_aprobador_id?: string;
    dni_aprobador?: string;
    nombre_aprobador?: string;
    estado: 'Pendiente' | 'Aprobado' | 'Rechazado';
    fecha_aprobacion?: string;
    equipo?: Equipo;
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
    bajas: [] as Baja[],
    asignaciones: [] as Asignacion[], // Cache if needed, or stick to inside Solicitud
    facturas: [] as Factura[],

    // --- FACTURAS ---
    async fetchFacturas() {
        // Fetch Header
        const { data: facturas, error } = await supabase
            .from("telefonia_factura_equipos")
            .select(`*`)
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Fetch Items (in separate query for simplicity or joint?)
        // Let's do separate for clarity and avoiding duplicates in main list
        const { data: items, error: itemsError } = await supabase
            .from("telefonia_factura_equipos_items")
            .select(`
                *, 
                modelo:telefonia_modelos(*),
                solicitud:telefonia_solicitudes(*) 
            `);

        if (itemsError) throw itemsError;

        // Map items to facturas
        const facturasWithItems = facturas?.map(f => ({
            ...f,
            items: items?.filter(i => i.factura_id === f.id) || []
        }));

        this.facturas = facturasWithItems as Factura[];
    },

    async createFactura(factura: Omit<Factura, "id" | "created_at" | "items" | "cantidad_total">, items: Omit<FacturaItem, "id" | "factura_id">[]) {
        // 1. Calculate Total Items
        const totalQty = items.reduce((acc, item) => acc + item.cantidad, 0);

        // 2. Insert Header
        const { data: newFactura, error: fError } = await supabase
            .from("telefonia_factura_equipos")
            .insert([{ ...factura, cantidad_total: totalQty }])
            .select()
            .single();

        if (fError) throw fError;

        // 3. Insert Items
        if (items.length > 0) {
            const itemsPayload = items.map(i => ({
                ...i,
                factura_id: newFactura.id
            }));

            const { error: iError } = await supabase
                .from("telefonia_factura_equipos_items")
                .insert(itemsPayload);

            if (iError) throw iError; // Ideally rollback, but basic implementation first
        }

        await this.fetchFacturas();
        return newFactura;
    },

    async updateFactura(id: string, factura: Omit<Factura, "id" | "created_at" | "items" | "cantidad_total">, items: Omit<FacturaItem, "id" | "factura_id">[]) {
        // 1. Calculate Total Items
        const totalQty = items.reduce((acc, item) => acc + item.cantidad, 0);

        // 2. Update Header
        const { data: updatedFactura, error: fError } = await supabase
            .from("telefonia_factura_equipos")
            .update({ ...factura, cantidad_total: totalQty })
            .eq("id", id)
            .select()
            .single();

        if (fError) throw fError;

        // 3. Replace Items (Delete All + Insert New)
        // Transaction safety would be better here, but doing sequential for now.
        const { error: delError } = await supabase
            .from("telefonia_factura_equipos_items")
            .delete()
            .eq("factura_id", id);

        if (delError) throw delError;

        if (items.length > 0) {
            const itemsPayload = items.map(i => ({
                ...i,
                factura_id: id
            }));

            const { error: iError } = await supabase
                .from("telefonia_factura_equipos_items")
                .insert(itemsPayload);

            if (iError) throw iError;
        }

        await this.fetchFacturas();
        return updatedFactura;
    },

    async deleteFactura(id: string) {
        const { error } = await supabase
            .from("telefonia_factura_equipos")
            .delete()
            .eq("id", id);

        if (error) throw error;
        this.facturas = this.facturas.filter(f => f.id !== id);
    },


    // --- VALIDATION ---
    async checkActiveAssignment(dni: string): Promise<{ exists: boolean; message?: string; detail?: any }> {
        if (!dni) return { exists: false };

        const { data, error } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .select(`
                *,
                equipo:telefonia_equipos(*),
                chip:telefonia_chips(*),
                solicitud:telefonia_solicitudes(*)
            `)
            .eq("usuario_final_dni", dni)
            .eq("estado", "Entregado");

        if (error) {
            console.error("Error checking active assignment:", error);
            // Fail safe: return false but log error. Or throw? Warning is safer.
            return { exists: false };
        }

        if (data && data.length > 0) {
            const active = data[0];
            return {
                exists: true,
                message: `El usuario con DNI ${dni} ya cuenta con un celular asignado`,
                detail: active
            };
        }

        return { exists: false };
    },

    // --- DEVOLUCIONES ---
    async marcarParaDevolucion(asignacionId: string, equipoId?: string, _chipId?: string) {
        // 1. Update Asignacion Status
        const { error: asigError } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .update({ estado: "PARA DEVOLUCION" })
            .eq("id", asignacionId);

        if (asigError) throw asigError;

        // 2. Update Equipo Status (if exists)
        if (equipoId) {
            const { error: eqError } = await supabase
                .from("telefonia_equipos")
                .update({ estado: "Para Devolucion" }) // Note casing matches type
                .eq("id", equipoId);

            if (eqError) throw eqError;
        }

        // 3. Update Chip Status (if exists and is solo chip or part of package?) 
        // User mainly mentioned 'Equipo', but let's be safe. If it's a chip assignment, maybe chip status too?
        // Usually chips don't go "Para Revision" in the same way, but let's stick to user request "cambiando el estado del equipo".
        // If it's just a chip, maybe we treat it similar. 
        // For now, I will assume this applies primarily to physical Equipment.
    },

    async recepcionarEquipo(asignacionId: string, equipoId?: string) {
        // 1. Update Asignacion Status
        const { error: asigError } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .update({ estado: "PARA REVISION" })
            .eq("id", asignacionId);

        if (asigError) throw asigError;

        // 2. Update Equipo Status
        if (equipoId) {
            const { error } = await supabase
                .from("telefonia_equipos")
                .update({ estado: "Para Revisión" })
                .eq("id", equipoId);
            if (error) throw error;
        }
    },

    async finalizarRevision(asignacionId: string, equipoId: string, nuevoEstado: "Disponible" | "Mantenimiento") {
        // 1. Update Equipo Status
        const { error: eqError } = await supabase
            .from("telefonia_equipos")
            .update({
                estado: nuevoEstado,
                // If it's available, it's no longer assigned physically? 
                // Wait, logic says "DISPONBILE SI ESTA BUENO".
                // We should probably unlink the active assignment?
                // But the user said "EL ESTADO EN ASIGNACIONES CAMBIARIA A DEVUELTO".
            })
            .eq("id", equipoId);

        if (eqError) throw eqError;

        // 2. Update Asignacion Status -> "DEVUELTO"
        const { error: asigError } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .update({
                estado: "Devuelto",
                fecha_devolucion: new Date().toISOString() // Set return date now
            })
            .eq("id", asignacionId);

        if (asigError) throw asigError;
    },


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

        // 2. Fetch Active Assignments (ONLY from telefonia_solicitud_asignaciones now)
        const activeMap = new Map();
        // Legacy activeSols block removed as columns deleted


        // New Assignments (Graceful fetch)
        try {
            const { data: newAssigns, error: newAssignError } = await supabase
                .from("telefonia_solicitud_asignaciones")
                .select(`
                    id, 
                    equipo_id, 
                    usuario_final_nombre, 
                    usuario_final_area,
                    usuario_final_sede,
                    fecha_entrega, 
                    solicitud_id,
                    estado,
                    solicitud:telefonia_solicitudes (
                        beneficiario_nombre,
                        beneficiario_area,
                        fundo_planta,
                        cultivo,
                        periodo_uso,
                        fecha_fin_uso
                    )
                `)
                .in("estado", ["Entregado", "PARA DEVOLUCION", "PARA REVISION"])
                .is("fecha_devolucion", null);

            if (!newAssignError && newAssigns) {
                newAssigns.forEach((a: any) => {
                    if (a.equipo_id) {
                        // Priority: Ticket Info > Assignment Info
                        const nombre = a.solicitud?.beneficiario_nombre || a.usuario_final_nombre || "Usuario Asignado";
                        const area = a.solicitud?.beneficiario_area || a.usuario_final_area || "Área asignada";

                        // Priority for Fundo/Planta display: Sede (Usuario Final) -> Fundo/Planta (Ticket)
                        const fundo = a.usuario_final_sede || a.solicitud?.fundo_planta || "";
                        const cultivo = a.solicitud?.cultivo || "";

                        // Period info
                        const periodo = a.solicitud?.periodo_uso || "PERMANENTE";
                        const fechaFin = a.solicitud?.fecha_fin_uso || "";

                        activeMap.set(a.equipo_id, {
                            id: a.solicitud_id,
                            asignacion_id: a.id, // Pass Assignment ID
                            beneficiario_nombre: nombre,
                            beneficiario_area: area,
                            fecha_entrega: a.fecha_entrega,
                            tipo_servicio: "Asignación Múltiple",
                            fundo_planta: fundo,
                            cultivo: cultivo,
                            periodo_uso: periodo,
                            fecha_fin_uso: fechaFin
                        });
                    }
                });
            }
        } catch (e) {
            console.warn("Could not fetch new assignments in fetchEquipos", e);
        }

        this.equipos = (allEquipos as Equipo[]).map(e => {
            const active = activeMap.get(e.id);
            return {
                ...e,
                asignacion_activa: active || null,
                periodo_asignado: active?.periodo_uso,
                fecha_fin_asignado: active?.fecha_fin_uso
            };
        });
    },

    async createEquipo(eq: Omit<Equipo, "id" | "created_at">) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { chip, asignacion_activa, ...payload } = eq;

        // Default estado_actual to the initial condition ('Nuevo' or 'Segundo Uso')
        const finalPayload = {
            ...payload,
            estado_actual: payload.estado_actual || payload.condicion
        };

        const { data, error } = await supabase
            .from("telefonia_equipos")
            .insert([finalPayload])
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

        // Fetch Active Assignments for Chips
        const activeChipMap = new Map();
        try {
            const { data: chipAssigns, error: chipAssignError } = await supabase
                .from("telefonia_solicitud_asignaciones")
                .select(`
                    id, 
                    chip_id, 
                    usuario_final_nombre, 
                    usuario_final_area,
                    usuario_final_sede,
                    fecha_entrega, 
                    solicitud_id,
                    estado,
                    solicitud:telefonia_solicitudes (
                        beneficiario_nombre,
                        beneficiario_area,
                        fundo_planta,
                        cultivo,
                        periodo_uso,
                        fecha_fin_uso
                    )
                `)
                .in("estado", ["Entregado", "PARA DEVOLUCION", "PARA REVISION"])
                .is("fecha_devolucion", null)
                .not("chip_id", "is", null);

            if (!chipAssignError && chipAssigns) {
                chipAssigns.forEach((a: any) => {
                    if (a.chip_id) {
                        const nombre = a.solicitud?.beneficiario_nombre || a.usuario_final_nombre || "";
                        const area = a.solicitud?.beneficiario_area || a.usuario_final_area || "";
                        const periodo = a.solicitud?.periodo_uso || "PERMANENTE";
                        const fechaFin = a.solicitud?.fecha_fin_uso || "";
                        const cultivo = a.solicitud?.cultivo || "";

                        activeChipMap.set(a.chip_id, {
                            id: a.solicitud_id,
                            beneficiario_nombre: nombre,
                            beneficiario_area: area,
                            fecha_entrega: a.fecha_entrega,
                            periodo_uso: periodo,
                            fecha_fin_uso: fechaFin,
                            cultivo: cultivo
                        });
                    }
                });
            }
        } catch (e) {
            console.warn("Could not fetch chip assignments", e);
        }

        this.chips = (allChips as Chip[]).map(c => {
            const active = activeChipMap.get(c.id);
            return {
                ...c,
                asignacion_activa: active || null,
                periodo_asignado: active?.periodo_uso,
                fecha_fin_asignado: active?.fecha_fin_uso
            };
        });
    },

    async createChip(chip: Omit<Chip, "id" | "created_at">) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { equipo, plan, asignacion_activa, periodo_asignado, fecha_fin_asignado, ...payload } = chip;
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
        const { equipo, plan, asignacion_activa, periodo_asignado, fecha_fin_asignado, ...payload } = updates;
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
                    *
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

    async createSolicitud(sol: Partial<Solicitud>, asignacionesList: Partial<Asignacion>[] = []) {
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

        // Insert Assignments if any
        if (asignacionesList.length > 0) {
            const assignsPayload = asignacionesList.map(a => ({
                ...a,
                solicitud_id: newSol.id,
                estado: "Pendiente", // Waiting for assignment

                // Ensure responsible data is linked if not provided (it usually isn't for beneficiaries)
                responsable_dni: newSol.beneficiario_dni,
                responsable_nombre: newSol.beneficiario_nombre,
                responsable_area: newSol.beneficiario_area
            }));

            const { error: assignError } = await supabase
                .from("telefonia_solicitud_asignaciones")
                .insert(assignsPayload);

            if (assignError) {
                console.error("Error creating assignments", assignError);
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
            .select('*')
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

        // 3. Update Active Assignment if exists (Fix for vincular post-delivery)
        const { data: activeAssignments } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .select("id")
            .eq("equipo_id", equipoId)
            .eq("estado", "Entregado");

        if (activeAssignments && activeAssignments.length > 0) {
            for (const assign of activeAssignments) {
                await supabase
                    .from("telefonia_solicitud_asignaciones")
                    .update({ chip_id: chipId })
                    .eq("id", assign.id);
            }
        }

        await this.fetchEquipos();
        await this.fetchChips();
    },

    async desvincular(equipoId: string, chipId: string) {
        const { error: errEq } = await supabase
            .from("telefonia_equipos")
            .update({ chip_id: null })
            .eq("id", equipoId);
        if (errEq) throw errEq;

        // 2. Update Chip
        const { error: errCh } = await supabase
            .from("telefonia_chips")
            .update({ equipo_id: null })
            .eq("id", chipId);
        if (errCh) throw errCh;

        // ONLY if status is 'Entregado' (not Devuelto)
        const { data: activeAssignments } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .select("id")
            .eq("equipo_id", equipoId)
            .eq("chip_id", chipId) // Ensure we are unlinking the correct chip from the assignment
            .eq("estado", "Entregado");

        if (activeAssignments && activeAssignments.length > 0) {
            for (const assign of activeAssignments) {
                await supabase
                    .from("telefonia_solicitud_asignaciones")
                    .update({ chip_id: null }) // Remove chip from assignment
                    .eq("id", assign.id);
            }
        }

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
        return data || [];
    },

    async fetchHistorialChip(chipId: string) {
        const { data, error } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .select(`
                *,
                solicitud:telefonia_solicitudes(*)
            `)
            .eq("chip_id", chipId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // --- ACCIONES AVANZADAS ---

    async registrarDevolucion(solicitudId: string | null, equipoId: string, estadoRetorno: string, observaciones: string) {
        const fechaDevolucion = new Date().toISOString();

        // 1. Update Specific Assignment in History Table
        let assignQuery = supabase
            .from("telefonia_solicitud_asignaciones")
            .update({
                fecha_devolucion: fechaDevolucion,
                estado: 'Devuelto',
                observacion_retorno: observaciones,
                condicion_retorno: estadoRetorno
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
                condicion: "Segundo Uso",
                estado_actual: estadoRetorno,
                ubicacion: "BASE" // Return to BASE upon return
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
            proyecto: ticketData?.proyecto || "",
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
            usuario_creador_id: ticketData?.usuario_creador_id || null
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
            fecha_entrega_final: fechaEntrega,
            solicitud_id: ticket.id,

            // Usuario Final
            usuario_final_dni: datosUsuarioFinal.dni,
            usuario_final_nombre: datosUsuarioFinal.nombre,
            usuario_final_area: datosUsuarioFinal.area,
            usuario_final_puesto: datosUsuarioFinal.puesto,
            usuario_final_sede: datosUsuarioFinal.sede, // New field

            // Responsable 
            responsable_dni: datosResponsable.dni,
            responsable_nombre: datosResponsable.nombre,
            responsable_area: datosResponsable.area,

            // responsable_puesto: datosResponsable.puesto, // Removed as per user request
            // New fields request
            periodo_uso: ticketData?.periodo || "PERMANENTE",
            fecha_fin_uso: ticketData?.fecha_fin || null

        };

        const { error } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .insert([payload]);

        if (error) throw error;

        // 3. Update Equipment Status and Location
        // Priority: Sede (User Final) > Fundo/Planta (Ticket) > BASE
        const ubicacionFinal = datosUsuarioFinal.sede || datosResponsable.fundo_planta || (ticketData && ticketData.fundo_planta) || "BASE";

        await supabase
            .from("telefonia_equipos")
            .update({
                estado: "Asignado",
                ubicacion: ubicacionFinal
            })
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

    async asignarChipDirectamente(
        chipId: string,
        datosResponsable: { dni: string; nombre: string; area: string; puesto: string },
        ticketData: {
            ceco: string;
            fundo_planta: string;
            categoria: string;
            proyecto: string;
            gr: string;

            fecha_inicio: string;
            fecha_fin?: string;
            periodo: string;


            cultivo: string;
            usuario_creador_id?: string;
        },
        deviceData: {
            tipo_equipo: string;
            codigo: string;
        }
    ) {
        const fechaEntrega = new Date().toISOString();
        const chip = this.chips.find(c => c.id === chipId);

        // 1. Create Ticket (Solicitud) - Status Entregado
        const ticketPayload = {
            tipo_solicitud: "ASIGNACION_SOLO_CHIP",
            tipo_servicio: chip?.operador || "Línea Nueva",
            justificacion: "Asignación Directa de Chip - Solo Sim",
            ceco: ticketData.ceco,
            fundo_planta: ticketData.fundo_planta,
            categoria: ticketData.categoria,
            proyecto: ticketData.proyecto,
            gr: ticketData.gr,
            beneficiario_puesto: datosResponsable.puesto,
            periodo_uso: ticketData.periodo,
            fecha_inicio_uso: ticketData.fecha_inicio,
            fecha_fin_uso: ticketData.fecha_fin || null, // Now supported in signature
            cultivo: ticketData.cultivo,

            cantidad_lineas: 1,
            paquete_asignado: chip?.plan?.nombre || null,
            plan_costo: chip?.plan?.costo || 0,
            plan_datos: chip?.plan?.gigas || null,
            estado: "Entregado",
            fecha_entrega: fechaEntrega,
            beneficiario_dni: datosResponsable.dni,
            beneficiario_nombre: datosResponsable.nombre,
            beneficiario_area: datosResponsable.area,
            usuario_creador_id: ticketData.usuario_creador_id,
            // New Device Fields
            tipo_equipo_destino: deviceData.tipo_equipo,
            codigo_equipo_destino: deviceData.codigo
        };

        const { data: ticket, error: ticketError } = await supabase
            .from("telefonia_solicitudes")
            .insert([ticketPayload])
            .select()
            .single();

        if (ticketError) throw ticketError;

        // 2. Create Assignment
        const assignPayload = {
            solicitud_id: ticket.id,
            equipo_id: null,
            chip_id: chipId,
            estado: "Entregado",
            fecha_entrega: fechaEntrega,
            // Usuario Final is Responsable (Ticket Owner)
            usuario_final_dni: datosResponsable.dni,
            usuario_final_nombre: datosResponsable.nombre,
            usuario_final_area: datosResponsable.area,
            usuario_final_puesto: datosResponsable.puesto,
            usuario_final_sede: ticketData.fundo_planta, // Matches Ticket Sede
            // Responsable
            responsable_dni: datosResponsable.dni,
            responsable_nombre: datosResponsable.nombre,
            responsable_area: datosResponsable.area,

            periodo_uso: ticketData.periodo || "PERMANENTE",

            fecha_fin_uso: ticketData.fecha_fin || null,


            // Device Info
            tipo_equipo_destino: deviceData.tipo_equipo,
            codigo_equipo_destino: deviceData.codigo
        };

        const { error: assignError } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .insert([assignPayload]);

        if (assignError) throw assignError;

        // 3. Update Chip Status
        await supabase
            .from("telefonia_chips")
            .update({ estado: "Asignado" })
            .eq("id", chipId);

        await this.fetchChips();
        await this.fetchSolicitudes();
    },

    async registrarDevolucionChip(chipId: string, observaciones: string) {
        // Find active assignment for this chip
        const { data: assignments, error: fetchErr } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .select("*")
            .eq("chip_id", chipId)
            .eq("estado", "Entregado")
            .is("fecha_devolucion", null);

        if (fetchErr) throw fetchErr;

        if (assignments && assignments.length > 0) {
            // Close all active assignments for this chip (should be one usually)
            for (const assign of assignments) {
                await supabase
                    .from("telefonia_solicitud_asignaciones")
                    .update({
                        estado: "Devuelto",
                        fecha_devolucion: new Date().toISOString(),
                        observacion_retorno: observaciones
                    })
                    .eq("id", assign.id);
            }
        }

        // Update Chip Status
        await supabase
            .from("telefonia_chips")
            .update({ estado: "Disponible" })
            .eq("id", chipId);

        await this.fetchChips();
    },

    // --- BAJAS (Decommissioning) ---
    async fetchBajas() {
        // Fetch Bajas
        const { data, error } = await supabase
            .from("telefonia_bajas")
            .select(`
                *,
                equipo:telefonia_equipos(*)
            `)
            .order("created_at", { ascending: false });

        if (error) throw error;
        this.bajas = data as Baja[];
    },

    async solicitarBajaDirecta(equipoId: string, motivo: string, solicitante: { id: string, dni: string, nombre: string }) {
        const payload = {
            equipo_id: equipoId,
            motivo: motivo,
            usuario_solicitante_id: solicitante.id,
            dni_solicitante: solicitante.dni,
            nombre_solicitante: solicitante.nombre,
            estado: 'Pendiente'
        };

        const { error } = await supabase
            .from("telefonia_bajas")
            .insert([payload]);

        if (error) throw error;

        // Update Equipment to "Mantenimiento" (Pending Decommission) so it can't be assigned
        await supabase
            .from("telefonia_equipos")
            .update({ estado: "Mantenimiento", estado_actual: "Proceso de Baja" }) // estado_actual info
            .eq("id", equipoId);

        await this.fetchEquipos();
    },

    async procesarBaja(bajaId: string, equipoId: string, accion: 'APROBAR' | 'RECHAZAR', aprobador: { id: string, dni: string, nombre: string }) {
        const fecha = new Date().toISOString();

        if (accion === 'APROBAR') {
            // 1. Update Baja Request
            const { error: bajaErr } = await supabase
                .from("telefonia_bajas")
                .update({
                    estado: 'Aprobado',
                    fecha_aprobacion: fecha,
                    usuario_aprobador_id: aprobador.id,
                    dni_aprobador: aprobador.dni,
                    nombre_aprobador: aprobador.nombre
                })
                .eq("id", bajaId);
            if (bajaErr) throw bajaErr;

            // 2. Update Equipment -> Baja Definitiva
            const { error: eqErr } = await supabase
                .from("telefonia_equipos")
                .update({ estado: "Baja", ubicacion: "BAJA" })
                .eq("id", equipoId);
            if (eqErr) throw eqErr;

        } else {
            // RECHAZAR / CANCELAR
            // 1. Update Baja Request
            const { error: bajaErr } = await supabase
                .from("telefonia_bajas")
                .update({
                    estado: 'Rechazado',
                    fecha_aprobacion: fecha,
                    usuario_aprobador_id: aprobador.id,
                    dni_aprobador: aprobador.dni,
                    nombre_aprobador: aprobador.nombre
                })
                .eq("id", bajaId);
            if (bajaErr) throw bajaErr;

            // 2. Restore Equipment -> Disponible / Segundo Uso (Assuming it was in checks)
            // Or "Mantenimiento" if it needs repair? Usually rejection means "Don't throw away", so maybe "Disponible" or "Mantenimiento"?
            // Let's set to "Disponible" "Segundo Uso" as default fallback check.
            const { error: eqErr } = await supabase
                .from("telefonia_equipos")
                .update({ estado: "Disponible", condicion: "Segundo Uso", estado_actual: "Bueno" })
                .eq("id", equipoId);
            if (eqErr) throw eqErr;
        }

        await this.fetchBajas();
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
            .in("estado", ["Entregado", "PARA DEVOLUCION", "PARA REVISION"])
            .is("fecha_devolucion", null);

        if (error) throw error;
        return data as Asignacion[];
    },

    async asignarEquipos(solicitudId: string, items: { equipoId: string; chipId?: string | null }[], firma?: string, gr?: string) {
        // 0. Fetch Ticket Data to propagate fields (e.g. tipo_equipo_destino) and location
        const { data: ticketData } = await supabase
            .from("telefonia_solicitudes")
            .select("fundo_planta, tipo_equipo_destino, codigo_equipo_destino, beneficiario_dni, beneficiario_nombre, beneficiario_area, beneficiario_puesto")
            .eq("id", solicitudId)
            .single();

        let targetLocation = ticketData?.fundo_planta || "BASE";

        // 1. Process Assignments (Update existing or Insert new)
        const newAssignments = [];
        const updatePromises = [];

        for (const item of items) {
            const assignmentPayload = {
                equipo_id: item.equipoId || null, // Handle empty string as null
                chip_id: item.chipId || null,
                fecha_entrega: new Date().toISOString(),
                estado: 'Entregado',
                // Propagate fields from Ticket if present
                tipo_equipo_destino: ticketData?.tipo_equipo_destino || null,
                codigo_equipo_destino: ticketData?.codigo_equipo_destino || null,

                // Ensure Responsable Data is filled (User Request)
                responsable_dni: ticketData?.beneficiario_dni || null,
                responsable_nombre: ticketData?.beneficiario_nombre || null,
                responsable_area: ticketData?.beneficiario_area || null
            };

            if ((item as any).asignacionId) {
                // UPDATE existing assignment
                updatePromises.push(
                    supabase
                        .from("telefonia_solicitud_asignaciones")
                        .update(assignmentPayload)
                        .eq("id", (item as any).asignacionId)
                );
            } else {
                // INSERT new assignment (Legacy fallback)
                newAssignments.push({
                    solicitud_id: solicitudId,
                    usuario_final_sede: ticketData?.fundo_planta || null, // Add default Sede for new assignments
                    ...assignmentPayload
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
        const equipoIds = items.map(i => i.equipoId).filter(id => id); // Filter empty if any
        if (equipoIds.length > 0) {
            const { error: eqError } = await supabase
                .from("telefonia_equipos")
                .update({
                    estado: "Asignado",
                    ubicacion: targetLocation
                })
                .in("id", equipoIds);

            if (eqError) throw eqError;
        }

        // 3. Update Chips Status (if any)
        const chipIds = items.map(i => i.chipId).filter(id => id);
        if (chipIds.length > 0) {
            await supabase
                .from("telefonia_chips")
                .update({ estado: "Asignado" })
                .in("id", chipIds);
        }

        // 4. Update Solicitud Status (Entregado) and Main Signature
        await this.updateSolicitud(solicitudId, {
            estado: "Entregado",
            fecha_entrega: new Date().toISOString(),
            recibido_por: firma,
            gr: gr
        });

        await this.fetchSolicitudes();
        await this.fetchEquipos();
    },

    async updateAsignacionResponsable(asignacionId: string, datos: { dni: string; nombre: string; area: string; sede?: string; fecha_entrega_final?: string; puesto?: string }) {
        const { error } = await supabase
            .from("telefonia_solicitud_asignaciones")
            .update({
                usuario_final_dni: datos.dni,
                usuario_final_nombre: datos.nombre,
                usuario_final_area: datos.area,
                usuario_final_sede: datos.sede,
                usuario_final_puesto: datos.puesto,
                fecha_entrega_final: datos.fecha_entrega_final
            })
            .eq("id", asignacionId);

        if (error) throw error;
        await this.fetchSolicitudes();
        // Also fetch direct assignments to refresh the view
        // We aren't calling it here explicitly but MisEquipos calls it on mount. 
        // Ideally we should retain local state update in MisEquipos to avoid full refetch or refetch if needed.
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
