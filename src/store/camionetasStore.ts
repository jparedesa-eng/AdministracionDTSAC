// src/store/camionetasStore.ts
import { supabase } from "../supabase/supabaseClient";

/* =========================
 * Tipos
 * ========================= */
export type EstadoVehiculo = "Disponible" | "En uso" | "Mantenimiento" | "Inactivo";

/** Estados de solicitud (incluye Cancelado y Reservada) */
export type EstadoSolicitud =
  | "Pendiente"
  | "Asignada"
  | "Reservada"
  | "En uso"
  | "Rechazada"
  | "Cancelado"
  | "Cerrada";

export interface Vehiculo {
  placa: string;
  marca?: string | null;
  modelo?: string | null;
  color?: string | null;
  responsableAsignado?: string | null;
  proveedor?: string | null;
  traccion?: "4x2" | "4x4" | null;
  revTecnica?: string | null;
  soat?: string | null;
  /** Nuevo: fecha de ingreso de la camioneta */
  fechaIngreso?: string | null;
  /** Nuevo: si el vehículo tiene volante físico (tarjeta) asignado */
  volante?: "Si" | "No";
  estado: EstadoVehiculo;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Solicitud {
  id: string;
  dni: string;
  nombre: string;
  origen: string;
  destino: string;
  motivo?: string | null;
  usoInicio: string;
  usoFin: string;
  estado: EstadoSolicitud;
  vehiculo: string | null;
  recojo: string | null;
  createdAt: string;

  /** Trazabilidad creador */
  creadoPorId?: string | null;
  creadoPorNombre?: string | null;
  creadoPorArea?: string | null;

  /** Nuevos campos: tiempos registrados por Garita */
  entregaGaritaAt?: string | null;
  terminoUsoGaritaAt?: string | null;
}

/* =========================
 * Mapeos DB <-> App
 * ========================= */
type VehiculoRow = {
  placa: string;
  marca: string | null;
  modelo: string | null;
  color: string | null;
  responsable_asignado: string | null;
  proveedor: string | null;
  traccion: "4x2" | "4x4" | null;
  rev_tecnica: string | null;
  soat: string | null;
  /** Nuevo col */
  fecha_ingreso: string | null;
  /** Nuevo: columna en BD */
  volante: "Si" | "No" | null;
  estado: EstadoVehiculo;
  created_at: string | null;
  updated_at: string | null;
};

function vFromRow(r: VehiculoRow): Vehiculo {
  return {
    placa: r.placa,
    marca: r.marca,
    modelo: r.modelo,
    color: r.color,
    responsableAsignado: r.responsable_asignado,
    proveedor: r.proveedor,
    traccion: r.traccion,
    revTecnica: r.rev_tecnica,
    soat: r.soat,
    fechaIngreso: r.fecha_ingreso,
    /** Si viene null, por defecto "No" */
    volante: (r.volante as "Si" | "No" | null) ?? "No",
    estado: r.estado,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function vToRow(v: Partial<Vehiculo>): Partial<VehiculoRow> {
  const out: Partial<VehiculoRow> = {};
  if (v.placa !== undefined) out.placa = v.placa;
  if (v.marca !== undefined) out.marca = v.marca ?? null;
  if (v.modelo !== undefined) out.modelo = v.modelo ?? null;
  if (v.color !== undefined) out.color = v.color ?? null;
  if (v.responsableAsignado !== undefined)
    out.responsable_asignado = v.responsableAsignado ?? null;
  if (v.proveedor !== undefined) out.proveedor = v.proveedor ?? null;
  if (v.traccion !== undefined) out.traccion = v.traccion ?? null;
  if (v.revTecnica !== undefined) out.rev_tecnica = v.revTecnica ?? null;
  if (v.soat !== undefined) out.soat = v.soat ?? null;
  if (v.fechaIngreso !== undefined) out.fecha_ingreso = v.fechaIngreso ?? null;
  if (v.volante !== undefined) out.volante = (v.volante as "Si" | "No") ?? "No";
  if (v.estado !== undefined) out.estado = v.estado;
  return out;
}

type SolicitudRow = {
  id: string;
  dni: string;
  nombre: string;
  origen: string;
  destino: string;
  motivo: string | null;
  uso_inicio: string;
  uso_fin: string;
  estado: EstadoSolicitud;
  vehiculo: string | null;
  recojo: string | null;
  created_at: string;

  /** Trazabilidad creador (columnas en BD) */
  creado_por_id: string | null;
  creado_por_nombre: string | null;
  creado_por_area: string | null;

  /** Nuevas columnas en BD (garita) */
  entrega_garita_at: string | null;
  termino_uso_garita_at: string | null;
};

function sFromRow(r: SolicitudRow): Solicitud {
  return {
    id: r.id,
    dni: r.dni,
    nombre: r.nombre,
    origen: r.origen,
    destino: r.destino,
    motivo: r.motivo,
    usoInicio: r.uso_inicio,
    usoFin: r.uso_fin,
    estado: r.estado,
    vehiculo: r.vehiculo,
    recojo: r.recojo,
    createdAt: r.created_at,
    creadoPorId: r.creado_por_id,
    creadoPorNombre: r.creado_por_nombre,
    creadoPorArea: r.creado_por_area,
    entregaGaritaAt: r.entrega_garita_at,
    terminoUsoGaritaAt: r.termino_uso_garita_at,
  };
}

/** Para inserts en solicitudes (la BD crea `id` y `created_at`) */
function sToInsertRowNoId(s: {
  dni: string;
  nombre: string;
  origen: string;
  destino: string;
  motivo?: string | null;
  usoInicio: string;
  usoFin: string;
  estado: EstadoSolicitud;
  vehiculo: string | null;
  recojo: string | null;

  /** trazabilidad creador */
  creadoPorId?: string | null;
  creadoPorNombre?: string | null;
  creadoPorArea?: string | null;
}): Omit<SolicitudRow, "id" | "created_at" | "entrega_garita_at" | "termino_uso_garita_at"> {
  return {
    dni: s.dni,
    nombre: s.nombre,
    origen: s.origen,
    destino: s.destino,
    motivo: s.motivo ?? null,
    uso_inicio: new Date(s.usoInicio).toISOString(),
    uso_fin: new Date(s.usoFin).toISOString(),
    estado: s.estado,
    vehiculo: s.vehiculo,
    recojo: s.recojo,
    creado_por_id: s.creadoPorId ?? null,
    creado_por_nombre: s.creadoPorNombre ?? null,
    creado_por_area: s.creadoPorArea ?? null,
  };
}

/* =========================
 * Store
 * ========================= */
export const camionetasStore = {
  inventario: [] as Vehiculo[],
  solicitudes: [] as Solicitud[],

  /* ---------- Sync ---------- */
  async syncInventario(): Promise<void> {
    const { data, error } = await supabase
      .from("vehiculos")
      .select("*")
      .order("placa", { ascending: true });
    if (error) throw error;
    this.inventario = (data as VehiculoRow[]).map(vFromRow);
  },

  async syncSolicitudes(): Promise<void> {
    const { data, error } = await supabase
      .from("solicitudes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    this.solicitudes = (data as SolicitudRow[]).map(sFromRow);
  },

  /* =========================================================
   * Reservas: helpers
   * ======================================================= */
  async crearReserva(opts: {
    placa: string;
    inicioISO: string;
    finISO: string;
    solicitudId: string;
  }): Promise<void> {
    const { error } = await supabase.from("reservas_vehiculo").insert([
      {
        placa: opts.placa,
        uso_inicio: new Date(opts.inicioISO).toISOString(),
        uso_fin: new Date(opts.finISO).toISOString(),
        solicitud_id: opts.solicitudId,
      },
    ]);
    if (error) throw error;
  },

  async borrarReservasDeSolicitud(solicitudId: string): Promise<void> {
    const { error } = await supabase
      .from("reservas_vehiculo")
      .delete()
      .eq("solicitud_id", solicitudId);
    if (error) throw error;
  },

  /* =========================================================
   * Disponibilidad por rango (usa reservas_vehiculo)
   * ======================================================= */
  async getDisponibles(inicioISO: string, finISO: string): Promise<string[]> {
    const inicio = new Date(inicioISO).toISOString();
    const fin = new Date(finISO).toISOString();

    const usables = this.inventario.filter((v) => v.estado === "Disponible");
    if (usables.length === 0) return [];

    // Reservas que se solapan
    const { data, error } = await supabase
      .from("reservas_vehiculo")
      .select("placa, uso_inicio, uso_fin")
      .lt("uso_inicio", fin)
      .gt("uso_fin", inicio);
    if (error) throw error;

    const ocupadas = new Set<string>((data ?? []).map((r: any) => r.placa as string));
    return usables.filter((v) => !ocupadas.has(v.placa)).map((v) => v.placa);
  },

  async disponibilidadRango(
    inicioISO: string,
    finISO: string
  ): Promise<{ total: number; placas: string[] }> {
    const placas = await this.getDisponibles(inicioISO, finISO);
    return { total: placas.length, placas };
  },

  /* =========================================================
   * Creación automática (1 ticket) + reserva
   * ======================================================= */
  async crearTicketAuto(payload: {
    dni: string;
    nombre: string;
    origen: string;
    destino: string;
    motivo?: string | null;
    usoInicio: string;
    usoFin: string;

    /** trazabilidad creador */
    creadoPorId?: string | null;
    creadoPorNombre?: string | null;
    creadoPorArea?: string | null;
  }): Promise<Solicitud> {
    const libres = await this.getDisponibles(payload.usoInicio, payload.usoFin);
    if (libres.length === 0) {
      throw new Error("No hay camionetas disponibles para el rango solicitado.");
    }
    const placa = libres[0];

    const insertRow = sToInsertRowNoId({
      dni: payload.dni,
      nombre: payload.nombre,
      origen: payload.origen,
      destino: payload.destino,
      motivo: payload.motivo ?? null,
      usoInicio: payload.usoInicio,
      usoFin: payload.usoFin,
      estado: "Reservada",
      vehiculo: placa,
      recojo: payload.usoInicio,
      creadoPorId: payload.creadoPorId ?? null,
      creadoPorNombre: payload.creadoPorNombre ?? null,
      creadoPorArea: payload.creadoPorArea ?? null,
    });

    const { data, error } = await supabase
      .from("solicitudes")
      .insert([insertRow])
      .select("*")
      .single();
    if (error) throw error;

    const inserted = sFromRow(data as SolicitudRow);

    // Registrar reserva ligada a la solicitud
    try {
      await this.crearReserva({
        placa,
        inicioISO: inserted.usoInicio,
        finISO: inserted.usoFin,
        solicitudId: inserted.id,
      });
    } catch (err: any) {
      // Si falla la reserva (por ejemplo, choque de horario con constraint),
      // borramos la solicitud recién creada para no dejar "huérfanos".
      await supabase.from("solicitudes").delete().eq("id", inserted.id);

      // Verificamos si es error de constraint de Supabase (código 23P01 u otros de exclusion)
      // O simplemente lanzamos mensaje genérico si detectamos conflicto
      console.error("Error creando reserva, rollback solicitud:", err);
      throw new Error(
        "La camioneta fue reservada por otro usuario mientras confirmabas. Por favor intenta nuevamente."
      );
    }

    this.solicitudes = [inserted, ...this.solicitudes];
    return inserted;
  },

  /* =========================================================
   * Flujo: aprobar/asignar, rechazar, CANCELAR, entrega, devolución
   * ======================================================= */
  async aprobarAsignando(args: {
    solicitudId: string;
    placa: string;
    recojo: string;
  }): Promise<void> {
    const { solicitudId, placa, recojo } = args;

    const sLocal = this.solicitudes.find((x) => x.id === solicitudId);
    if (!sLocal) throw new Error("Solicitud no encontrada");

    // Validar placa libre con reservas
    const libres = await this.getDisponibles(sLocal.usoInicio, sLocal.usoFin);
    if (!libres.includes(placa)) {
      throw new Error("La placa seleccionada ya no está disponible para ese rango.");
    }

    const { data: updated, error: e1 } = await supabase
      .from("solicitudes")
      .update({
        estado: "Reservada",
        vehiculo: placa,
        recojo: new Date(recojo).toISOString(),
      })
      .eq("id", solicitudId)
      .select("*")
      .single();
    if (e1) throw e1;

    const s = sFromRow(updated as SolicitudRow);

    // Crear reserva para esta asignación
    try {
      await this.crearReserva({
        placa,
        inicioISO: s.usoInicio,
        finISO: s.usoFin,
        solicitudId: s.id,
      });
    } catch (err: any) {
      // Rollback: regresamos la solicitud a estado anterior o simplemente lanzamos error.
      // Como ya se hizo update en BD (estado=Reservada), deberíamos revertirlo a 'Pendiente'
      // o dejarlo para que el usuario intente de nuevo.
      // Para seguridad, revertimos el update local y remoto.

      await supabase
        .from("solicitudes")
        .update({
          estado: sLocal.estado, // estado original
          vehiculo: sLocal.vehiculo ?? null,
          recojo: sLocal.recojo ?? null,
        })
        .eq("id", solicitudId);

      throw new Error(
        "No se pudo asignar: La camioneta tiene un cruce de horarios con otra reserva."
      );
    }

    const idx = this.solicitudes.findIndex((x) => x.id === solicitudId);
    if (idx >= 0) this.solicitudes[idx] = s;
  },

  async rechazar(id: string): Promise<void> {
    const { data, error } = await supabase
      .from("solicitudes")
      .update({ estado: "Rechazada" })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;

    // liberar reservas
    await this.borrarReservasDeSolicitud(id);

    const idx = this.solicitudes.findIndex((x) => x.id === id);
    if (idx >= 0) this.solicitudes[idx] = sFromRow(data as SolicitudRow);
  },

  /** Cancelar por el usuario (estado real en BD) */
  async cancelar(id: string): Promise<void> {
    const { data, error } = await supabase
      .from("solicitudes")
      .update({ estado: "Cancelado" })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;

    // liberar reservas ligadas a esa solicitud
    await this.borrarReservasDeSolicitud(id);

    const idx = this.solicitudes.findIndex((x) => x.id === id);
    if (idx >= 0) this.solicitudes[idx] = sFromRow(data as SolicitudRow);
  },

  /** Entrega: SOLO cambia la solicitud a "En uso". No toca vehiculos.estado */
  async marcarEntrega(id: string): Promise<void> {
    const { data: sUpd, error: e1 } = await supabase
      .from("solicitudes")
      .update({ estado: "En uso" })
      .eq("id", id)
      .select("*")
      .single();
    if (e1) throw e1;

    const s = sFromRow(sUpd as SolicitudRow);

    const idx = this.solicitudes.findIndex((x) => x.id === id);
    if (idx >= 0) this.solicitudes[idx] = s;
  },

  /** Devolución: cierra la solicitud más reciente para la placa. No toca vehiculos.estado */
  async registrarDevolucion(placa: string): Promise<void> {
    const { data: sRows, error: e1 } = await supabase
      .from("solicitudes")
      .select("*")
      .eq("vehiculo", placa)
      .in("estado", ["En uso", "Asignada", "Reservada"])
      .order("uso_inicio", { ascending: false })
      .limit(1);
    if (e1) throw e1;

    const target = (sRows as SolicitudRow[] | null)?.[0];
    if (target) {
      const { data: sClosed, error: e2 } = await supabase
        .from("solicitudes")
        .update({ estado: "Cerrada" })
        .eq("id", target.id)
        .select("*")
        .single();
      if (e2) throw e2;

      const sIdx = this.solicitudes.findIndex((x) => x.id === target.id);
      if (sIdx >= 0) this.solicitudes[sIdx] = sFromRow(sClosed as SolicitudRow);
    }

    // No tocar vehiculos.estado
  },

  /* ---------- Vehículos ---------- */
  async crearVehiculo(v: Vehiculo): Promise<void> {
    const payload: Partial<VehiculoRow> = vToRow({
      ...v,
      estado: v.estado ?? "Disponible",
      volante: v.volante ?? "No",
    });

    const { data, error } = await supabase
      .from("vehiculos")
      .insert([payload])
      .select("*")
      .single();
    if (error) throw error;

    this.inventario = [...this.inventario, vFromRow(data as VehiculoRow)];
  },

  async actualizarVehiculo(placa: string, partial: Partial<Vehiculo>): Promise<void> {
    const updatePayload = vToRow({ ...partial });
    const { data, error } = await supabase
      .from("vehiculos")
      .update(updatePayload)
      .eq("placa", placa)
      .select("*")
      .single();
    if (error) throw error;

    const idx = this.inventario.findIndex((x) => x.placa === placa);
    if (idx >= 0) this.inventario[idx] = vFromRow(data as VehiculoRow);
  },

  async cambiarEstadoVehiculo(placa: string, estado: EstadoVehiculo): Promise<void> {
    const { data, error } = await supabase
      .from("vehiculos")
      .update({ estado })
      .eq("placa", placa)
      .select("*")
      .single();
    if (error) throw error;

    const idx = this.inventario.findIndex((x) => x.placa === placa);
    if (idx >= 0) this.inventario[idx] = vFromRow(data as VehiculoRow);
  },
};
