import { supabase } from "../supabase/supabaseClient";
import { notificationsStore } from "./notificationsStore";

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
  | "Cerrada"
  | "Vencido";

export interface Vehiculo {
  id?: string; // Added id
  placa: string;
  marca?: string | null;
  modelo?: string | null;
  color?: string | null;
  responsableAsignado?: string | null;
  responsable?: string | null; // Added to match other parts
  dniResponsable?: string | null; // Added
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
  id: string; // Added
  placa: string;
  marca: string | null;
  modelo: string | null;
  color: string | null;
  responsable_asignado: string | null;
  responsable: string | null; // Added
  dni_responsable: string | null; // Added
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
    id: r.id,
    placa: r.placa,
    marca: r.marca,
    modelo: r.modelo,
    color: r.color,
    responsableAsignado: r.responsable_asignado,
    responsable: r.responsable, // Mapped
    dniResponsable: r.dni_responsable, // Mapped
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
  if (v.id !== undefined) out.id = v.id;
  if (v.placa !== undefined) out.placa = v.placa;
  if (v.marca !== undefined) out.marca = v.marca ?? null;
  if (v.modelo !== undefined) out.modelo = v.modelo ?? null;
  if (v.color !== undefined) out.color = v.color ?? null;
  if (v.responsableAsignado !== undefined)
    out.responsable_asignado = v.responsableAsignado ?? null;
  if (v.responsable !== undefined) out.responsable = v.responsable ?? null;
  if (v.dniResponsable !== undefined) out.dni_responsable = v.dniResponsable ?? null;
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
    // Importante: Hacemos join con solicitudes para ver si el ticket sigue activo.
    // Si el ticket está 'Cerrada', 'Cancelado' o 'Rechazada', ignoramos esa reserva
    // (aunque el rango de horas en reservas_vehiculo siga ocupado).
    const { data, error } = await supabase
      .from("reservas_vehiculo")
      .select(`
        placa,
        uso_inicio,
        uso_fin,
        solicitudes (
          estado
        )
      `)
      .lt("uso_inicio", fin)
      .gt("uso_fin", inicio);
    if (error) throw error;

    const ocupadas = new Set<string>();

    if (data) {
      for (const r of data) {
        const s = (r as any).solicitudes;
        // Si no hay solicitud linkeada (casos raros) o si el estado es activo:
        // Activos: Pendiente, Asignada, Reservada, En uso.
        // Inactivos (liberan): Cancelado, Rechazada, Cerrada, Vencido.

        // Ojo: s puede ser un objeto o array dependiendo de la relación. Asumimos objeto (1:1 o N:1).
        // Si es array, tomamos el primero.
        const estado = Array.isArray(s) ? s[0]?.estado : s?.estado;

        // Si no hay estado (data legacy sin solicitud id?), asumimos ocupado por seguridad.
        if (!estado) {
          ocupadas.add(r.placa as string);
          continue;
        }

        const activo = ["Pendiente", "Asignada", "Reservada", "En uso"].includes(estado);
        if (activo) {
          ocupadas.add(r.placa as string);
        }
      }
    }

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

    // Trigger Notification: New Request
    // "quiere notificacion para el usuario JEFE Y DEL AREA ADMINISTRACION CADA VEZ QUE SE CREA UN REGISTRO"
    try {
      await notificationsStore.notifyUsersByRoleAndArea(
        "jefe",
        "ADMINISTRACION",
        "Nueva Solicitud de Camioneta",
        `El usuario ${inserted.nombre} ha generado una solicitud (origen: ${inserted.origen}, destino: ${inserted.destino}).`,
        "info"
      );
    } catch (e) {
      console.warn("Error enviando notificación automática:", e);
    }

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
    if (idx >= 0) {
      const prev = this.solicitudes[idx];
      this.solicitudes[idx] = sFromRow(data as SolicitudRow);

      // Notify Cancel
      try {
        await notificationsStore.notifyUsersByRoleAndArea(
          "jefe",
          "ADMINISTRACION",
          "Solicitud Cancelada",
          `La solicitud de ${prev.nombre} (Placa: ${prev.vehiculo ?? "S/N"}) ha sido cancelada.`,
          "warning"
        );
      } catch (e) {
        console.warn("Error enviando notificacion cancel:", e);
      }
    }
  },

  /* =========================================================
   * Garita Actions (Entregar / Devolver con lógica de disponibilidad)
   * ======================================================= */

  /**
   * Entregar llave en garita -> Estado "En uso"
   * Registra fecha/hora real de entrega.
   */
  async entregarVehiculoGarita(id: string): Promise<void> {
    const ahoraISO = new Date().toISOString();

    const { data: sUpd, error: e1 } = await supabase
      .from("solicitudes")
      .update({
        estado: "En uso",
        entrega_garita_at: ahoraISO,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (e1) throw e1;

    const s = sFromRow(sUpd as SolicitudRow);
    const idx = this.solicitudes.findIndex((x) => x.id === id);
    if (idx >= 0) this.solicitudes[idx] = s;
  },

  /**
   * Terminar uso en garita -> Estado "Cerrada"
   * Registra fecha/hora real de término.
   * IMPORTANTE: Libera el horario en reservas_vehiculo estableciendo uso_fin = NOW()
   */
  async terminarUsoGarita(id: string): Promise<void> {
    const ahoraISO = new Date().toISOString();

    // 1. Actualizar solicitud
    const { data: sUpd, error: e1 } = await supabase
      .from("solicitudes")
      .update({
        estado: "Cerrada",
        termino_uso_garita_at: ahoraISO,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (e1) throw e1;

    // 2. Liberar disponibilidad: actualizar uso_fin en la reserva asociada
    //    Para que si se devolvió antes, el resto del tiempo quede libre.
    const { error: e2 } = await supabase
      .from("reservas_vehiculo")
      .update({
        uso_fin: ahoraISO,
      })
      .eq("solicitud_id", id);

    if (e2) {
      console.warn("No se pudo liberar la reserva (update uso_fin)", e2);
      // No lanzamos error fatal, ya se cerró el ticket. Pero es un warning.
    }

    const s = sFromRow(sUpd as SolicitudRow);
    const idx = this.solicitudes.findIndex((x) => x.id === id);
    if (idx >= 0) this.solicitudes[idx] = s;
  },

  /** Entrega: SOLO cambia la solicitud a "En uso". No toca vehiculos.estado */
  async marcarEntrega(id: string): Promise<void> {
    return this.entregarVehiculoGarita(id);
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
      // Reutilizamos la lógica que libera disponibilidad
      await this.terminarUsoGarita(target.id);
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

  /* =========================================================
   * Mantenimiento Automático
   * ======================================================= */
  /**
   * Revisa tickets "Reservada" o "En uso" cuya fecha fin ya pasó.
   * Los marca como "Vencido" en la BD.
   */
  async verificarVencidos(): Promise<void> {
    // 1. Buscamos candidatos locales o remotos. 
    // Para asegurar consistencia, consultamos a la BD directo o usamos lo que ya tenemos en memoria.
    // Usaremos memoria para detectar IDs, luego update en batch (o uno por uno).

    // Filtramos de 'this.solicitudes' (asumiendo que están frescas o tras un sync)
    // O mejor, hacemos fetch de los activos de la BD para ser precisos.
    const { data: activos, error } = await supabase
      .from("solicitudes")
      .select("id, uso_fin, estado")
      .in("estado", ["Reservada", "En uso"]);

    if (error) {
      console.error("Error fetching activos para verificar vencidos:", error);
      return;
    }

    const now = new Date();
    const vencidosIds: string[] = [];

    (activos as any[]).forEach((t) => {
      const fin = new Date(t.uso_fin);
      if (now > fin) {
        vencidosIds.push(t.id);
      }
    });

    if (vencidosIds.length === 0) return;

    // 2. Update masivo
    const { error: updateError } = await supabase
      .from("solicitudes")
      .update({ estado: "Vencido" })
      .in("id", vencidosIds);

    if (updateError) {
      console.error("Error marcando vencidos:", updateError);
    } else {
      console.log(`Se marcaron ${vencidosIds.length} tickets como Vencidos.`);
      // 3. Refrescar local
      await this.syncSolicitudes();
    }
  },

  /* =========================================================
   * Historial de Responsables
   * ======================================================= */
  async fetchHistorial(vehiculoId: string): Promise<HistorialResponsable[]> {
    const { data, error } = await supabase
      .from("vehiculos_historial_responsables")
      .select("*")
      .eq("vehiculo_id", vehiculoId)
      .order("fecha_inicio", { ascending: false });

    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      vehiculoId: r.vehiculo_id,
      responsable: r.responsable,
      dniResponsable: r.dni_responsable,
      fechaInicio: r.fecha_inicio,
      fechaFin: r.fecha_fin,
      tipoAsignacion: r.tipo_asignacion,
      observacion: r.observacion,
      createdAt: r.created_at,
    }));
  },

  async asignarResponsable(payload: {
    vehiculoId: string;
    responsable: string;
    dniResponsable: string;
    fechaInicio: string;
    fechaFin?: string | null;
    tipoAsignacion: "Indefinida" | "Rango";
    observacion?: string;
  }): Promise<void> {
    // 1. Insert history record
    const { error: histError } = await supabase
      .from("vehiculos_historial_responsables")
      .insert([
        {
          vehiculo_id: payload.vehiculoId,
          responsable: payload.responsable,
          dni_responsable: payload.dniResponsable,
          fecha_inicio: payload.fechaInicio, // ISO
          fecha_fin: payload.fechaFin ?? null, // ISO or null
          tipo_asignacion: payload.tipoAsignacion,
          observacion: payload.observacion ?? null,
        },
      ]);

    if (histError) throw histError;

    // 2. Update vehicle current responsible
    // Note: If assignment is future-dated, we might NOT want to update the vehicle immediately?
    // User request: "fecha de asignación".
    // Usually "Assign" means "Effective from...".
    // If fechaInicio is <= NOW, we update current.
    // However, for simplicity and "Assignment" semantics, we usually update the current holder if it's the latest assignment.
    // For now, we will update the vehicle record with the new responsible.

    // We only update the vehicle core table if the assignment effectively starts now or in the past (active).
    // Or simpler: The user wants to set the responsible. We update the table.
    // If there is conflict with future dates, that's complex logic.
    // We'll update the vehicle table to reflect this new assignment as the "current" one.

    // We only update the vehicle core table if the assignment effectively starts now or in the past (active).
    // Or simpler: The user wants to set the responsible. We update the table.
    // If there is conflict with future dates, that's complex logic.
    // We'll update the vehicle table to reflect this new assignment as the "current" one.

    // Direct update by ID
    const { error: updError } = await supabase
      .from("vehiculos")
      .update({
        responsable: payload.responsable,
        dni_responsable: payload.dniResponsable,
        updated_at: new Date().toISOString()
      })
      .eq("id", payload.vehiculoId);

    if (updError) throw updError;

    // Update local state
    const idx = this.inventario.findIndex((v) => v.id === payload.vehiculoId);
    if (idx >= 0) {
      this.inventario[idx] = {
        ...this.inventario[idx],
        responsable: payload.responsable,
        dniResponsable: payload.dniResponsable,
        updatedAt: new Date().toISOString()
      };
    }
  },
};

export interface HistorialResponsable {
  id: string;
  vehiculoId: string;
  responsable: string;
  dniResponsable: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  tipoAsignacion: "Indefinida" | "Rango";
  observacion: string | null;
  createdAt: string;
}
