// src/store/pasajeStore.ts
/* Store para Pasaje/Hospedaje conectado a Supabase.
   Mantiene un estado en memoria y lo sincroniza con la tabla "solicitudes_pyh".
*/

import { supabase } from "../supabase/supabaseClient";

/* ----------------------------------
   Tipos
---------------------------------- */

export type EstadoSolicitud =
  | "Pendiente"
  | "Pendiente propuesta"
  | "Propuesta realizada"
  | "Gerencia aprobado"
  | "Pendiente de compra"
  | "Compra realizada"
  | "En proceso" // legacy, casi no usado ya
  | "Costo aprobado" // legacy, casi no usado ya
  | "Con pase" // legacy, casi no usado ya
  | "Facturado"
  | "Cerrado"
  | "Rechazado";

export type Solicitud = {
  // Usamos el código legible (PYH00001) como id en el front
  id: string; // == codigo
  creado: Date;

  // Beneficiario
  dni: string;
  nombre: string;
  gerencia: string;

  // Empresa / centro de costo
  empresa: string | null;
  ceco: string | null;

  // Tipo
  tipo: "Pasaje" | "Hospedaje";

  // Pasaje
  subtipo?: "Aéreo" | "Terrestre";
  origen: string | null;
  destino: string | null;
  salida?: Date | null;
  retorno?: Date | null;

  // Datos extra para pasaje aéreo (del solicitante)
  fechaNacimiento: Date | null;
  telefono: string | null;
  correo: string | null;

  // Hospedaje
  lugar?: string | null;
  inicio?: Date | null;
  fin?: Date | null;

  // Datos que llenará proveedor (según tipo)

  // Pasaje terrestre
  asiento: string | null;

  // Hospedaje
  noches: number | null;
  habitacion: string | null;
  detalleServicios: string | null; // texto libre de servicios ofrecidos

  // Pasaje aéreo (ticket final)
  codigoViaje: string | null;
  clase: string | null; // S, X, etc
  tieneEscalas: boolean | null;
  tarifa: string | null; // Básica, Light, Full (texto)

  // Adicionales antiguos (se mantienen por compatibilidad)
  traslado: boolean;
  alimentacion?: string | null;
  motivo: string;

  // Flujo
  estado: EstadoSolicitud;
  proveedor: string | null;
  paseCompra: boolean;

  // Costos (legacy: ya no usamos "costo vigente" en la UI nueva)
  costo: number | null;
  costoVenceEn: Date | null;
  costoAprobado: boolean | null;

  // Factura / cierre
  factura: string | null;
  cerradoEn: Date | null;

  // Metadatos de creación
  createdBy: string | null; // uuid usuario Supabase (auth.users.id)
  createdByEmail: string | null;
  createdByName: string | null; // viene de profiles.nombre
};

// Nuevo tipo para selecciones de propuestas (tabla separada)
export type PropuestaSeleccion = {
  solicitudCodigo: string;

  // Selección Gerencia
  propuestaIdaGerencia: number | null;
  propuestaVueltaGerencia: number | null;
  fechaSeleccionGerencia: Date | null;

  // Selección Admin
  propuestaIdaAdmin: number | null;
  propuestaVueltaAdmin: number | null;
  fechaSeleccionAdmin: Date | null;
};

/* ----------------------------------
   Estado en memoria / suscripción
---------------------------------- */

type Listener = () => void;

const listeners = new Set<Listener>();

const state = {
  solicitudes: [] as Solicitud[],
  propuestasSeleccion: [] as PropuestaSeleccion[], // Nueva tabla separada
  loaded: false,
};

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getState() {
  return state;
}

/* ----------------------------------
   Helpers
---------------------------------- */

function asDate(v: any): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(+d)) return d;
  }
  return null;
}

/** Genera el siguiente código tipo PYH00001 según lo cargado en memoria */
function nextCodigo(): string {
  let max = 0;
  for (const s of state.solicitudes) {
    const m = /^PYH(\d+)$/.exec(s.id);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  const next = max + 1;
  return "PYH" + String(next).padStart(5, "0");
}

/* ----------------------------------
   Mapping Supabase <-> Solicitud
   (tabla: solicitudes_pyh)
---------------------------------- */

type SolicitudRow = {
  id: number; // bigserial interno
  creado: string;

  created_by: string;
  created_by_email: string | null;
  created_by_name: string | null;

  codigo: string;

  dni: string;
  nombre: string;
  gerencia: string;

  empresa: string | null;
  ceco: string | null;

  tipo: "Pasaje" | "Hospedaje";
  subtipo: "Aéreo" | "Terrestre" | null;

  origen: string | null;
  destino: string | null;

  fecha_nacimiento: string | null;
  telefono: string | null;
  correo: string | null;

  salida: string | null;
  retorno: string | null;

  lugar: string | null;
  inicio: string | null;
  fin: string | null;

  // Proveedor - pasaje terrestre
  asiento: string | null;

  // Proveedor - hospedaje
  noches: number | null;
  habitacion: string | null;
  detalle_servicios: string | null;

  // Proveedor - pasaje aéreo
  codigo_viaje: string | null;
  clase: string | null;
  tiene_escalas: boolean | null;
  tarifa: string | null;

  // Campos antiguos
  traslado: boolean;
  alimentacion: string | null;
  motivo: string;

  estado: string;
  proveedor: string | null;
  pase_compra: boolean;

  costo: number | null;
  costo_vence_en: string | null;
  costo_aprobado: boolean | null;

  factura: string | null;
  cerrado_en: string | null;
};

function rowToSolicitud(r: SolicitudRow): Solicitud {
  const nombreCreador = r.created_by_name;

  return {
    id: r.codigo, // usamos el código legible como id
    creado: asDate(r.creado) ?? new Date(),

    dni: r.dni,
    nombre: r.nombre,
    gerencia: r.gerencia,

    empresa: r.empresa ?? null,
    ceco: r.ceco ?? null,

    tipo: r.tipo,
    subtipo: (r.subtipo as any) ?? undefined,

    origen: r.origen ?? null,
    destino: r.destino ?? null,
    fechaNacimiento: asDate(r.fecha_nacimiento),
    telefono: r.telefono ?? null,
    correo: r.correo ?? null,

    salida: asDate(r.salida),
    retorno: asDate(r.retorno),

    lugar: r.lugar,
    inicio: asDate(r.inicio),
    fin: asDate(r.fin),

    asiento: r.asiento ?? null,
    noches: r.noches ?? null,
    habitacion: r.habitacion ?? null,
    detalleServicios: r.detalle_servicios ?? null,

    codigoViaje: r.codigo_viaje ?? null,
    clase: r.clase ?? null,
    tieneEscalas: r.tiene_escalas,
    tarifa: r.tarifa ?? null,

    traslado: !!r.traslado,
    alimentacion: r.alimentacion,
    motivo: r.motivo,

    estado: (r.estado as EstadoSolicitud) ?? "Pendiente",
    proveedor: r.proveedor,
    paseCompra: !!r.pase_compra,

    costo: r.costo,
    costoVenceEn: asDate(r.costo_vence_en),
    costoAprobado: r.costo_aprobado,

    factura: r.factura,
    cerradoEn: asDate(r.cerrado_en),

    createdBy: r.created_by,
    createdByEmail: r.created_by_email,
    createdByName: nombreCreador,
  };
}

function solicitudToInsert(p: Solicitud): Partial<SolicitudRow> {
  return {
    codigo: p.id,
    creado: p.creado.toISOString(),

    created_by: p.createdBy!,
    created_by_email: p.createdByEmail,
    created_by_name: p.createdByName,

    dni: p.dni,
    nombre: p.nombre,
    gerencia: p.gerencia,

    empresa: p.empresa ?? null,
    ceco: p.ceco ?? null,

    tipo: p.tipo,
    subtipo: p.subtipo ?? null,

    origen: p.origen ?? null,
    destino: p.destino ?? null,

    fecha_nacimiento: p.fechaNacimiento
      ? p.fechaNacimiento.toISOString()
      : null,
    telefono: p.telefono ?? null,
    correo: p.correo ?? null,

    salida: p.salida ? p.salida.toISOString() : null,
    retorno: p.retorno ? p.retorno.toISOString() : null,

    lugar: p.lugar ?? null,
    inicio: p.inicio ? p.inicio.toISOString() : null,
    fin: p.fin ? p.fin.toISOString() : null,

    asiento: p.asiento ?? null,
    noches: p.noches ?? null,
    habitacion: p.habitacion ?? null,
    detalle_servicios: p.detalleServicios ?? null,

    codigo_viaje: p.codigoViaje ?? null,
    clase: p.clase ?? null,
    tiene_escalas: p.tieneEscalas ?? null,
    tarifa: p.tarifa ?? null,

    traslado: p.traslado,
    alimentacion: p.alimentacion ?? null,
    motivo: p.motivo,

    estado: p.estado,
    proveedor: p.proveedor,
    pase_compra: p.paseCompra,

    costo: p.costo,
    costo_vence_en: p.costoVenceEn
      ? p.costoVenceEn.toISOString()
      : null,
    costo_aprobado: p.costoAprobado,

    factura: p.factura,
    cerrado_en: p.cerradoEn ? p.cerradoEn.toISOString() : null,
  };
}

/* ----------------------------------
   Carga inicial
---------------------------------- */

export async function loadSolicitudes() {
  const { data, error } = await supabase
    .from("solicitudes_pyh")
    .select("*")
    .order("creado", { ascending: true });

  if (error) {
    console.error("Error cargando tickets", error);
    throw error;
  }

  const rows = (data as SolicitudRow[]) || [];
  state.solicitudes = rows.map(rowToSolicitud);
  state.loaded = true;

  // Cargar selecciones de propuestas también
  try {
    await loadPropuestasSeleccion();
  } catch (err) {
    console.error("Error cargando selecciones de propuestas", err);
    // No lanzar error, solo log
  }

  console.log(
    "[pasajeStore] Solicitudes cargadas:",
    state.solicitudes.length
  );
  emit();
}

/** Helper opcional por si quieres usarlo en vistas */
export async function ensureSolicitudesLoaded() {
  if (!state.loaded) {
    await loadSolicitudes();
  }
}

/* ----------------------------------
   Utilidades de estado
---------------------------------- */

export function indexById(codigo: string): number {
  return state.solicitudes.findIndex((s) => s.id === codigo);
}

/** Legacy: vigencia de costos, ya casi no usado */
export function syncVigenciaCostos() {
  const now = new Date();
  for (const s of state.solicitudes) {
    if (!s.costo || !s.costoVenceEn) continue;
    if (
      now > s.costoVenceEn &&
      s.estado !== "Cerrado" &&
      !s.factura &&
      s.costoAprobado !== true
    ) {
      s.costo = null;
      s.costoVenceEn = null;
      if (s.estado === "Costo aprobado") s.estado = "En proceso";
    }
  }
}

/* ----------------------------------
   Crear ticket
---------------------------------- */

export async function crear(
  payload: Partial<Solicitud>
): Promise<string> {
  if (!state.loaded) {
    await loadSolicitudes();
  }

  const { data: authData, error: authError } =
    await supabase.auth.getUser();
  if (authError || !authData?.user) {
    throw new Error("No hay usuario autenticado.");
  }

  const user = authData.user;
  const createdBy = user.id;
  const createdByEmail = user.email ?? null;

  // Buscamos el nombre en la tabla "profiles"
  let createdByName: string | null = null;
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("nombre")
    .eq("id", user.id);

  if (!profileError && profileRows && profileRows.length > 0) {
    const rawNombre = (profileRows[0] as any).nombre;
    if (rawNombre && String(rawNombre).trim().length > 0) {
      createdByName = String(rawNombre).trim();
    }
  }

  const now = new Date();
  const codigo = nextCodigo();

  const tipo: "Pasaje" | "Hospedaje" =
    payload.tipo === "Hospedaje" ? "Hospedaje" : "Pasaje";

  const local: Solicitud = {
    id: codigo,
    creado: now,

    dni: String(payload.dni ?? ""),
    nombre: String(payload.nombre ?? ""),
    gerencia: String(payload.gerencia ?? ""),

    empresa: payload.empresa ?? null,
    ceco: payload.ceco ?? null,

    tipo,
    subtipo: payload.subtipo,

    origen: payload.origen ?? null,
    destino: payload.destino ?? null,
    fechaNacimiento: payload.fechaNacimiento
      ? asDate(payload.fechaNacimiento)!
      : null,
    telefono: payload.telefono ?? null,
    correo: payload.correo ?? null,

    salida: payload.salida ? asDate(payload.salida)! : null,
    retorno: payload.retorno ? asDate(payload.retorno)! : null,

    lugar: payload.lugar ?? null,
    inicio: payload.inicio ? asDate(payload.inicio)! : null,
    fin: payload.fin ? asDate(payload.fin)! : null,

    // Datos proveedor: inicialmente vacíos
    asiento: payload.asiento ?? null,
    noches: payload.noches ?? null,
    habitacion: payload.habitacion ?? null,
    detalleServicios: payload.detalleServicios ?? null,

    codigoViaje: payload.codigoViaje ?? null,
    clase: payload.clase ?? null,
    tieneEscalas:
      typeof payload.tieneEscalas === "boolean"
        ? payload.tieneEscalas
        : null,
    tarifa: payload.tarifa ?? null,

    traslado: !!payload.traslado,
    alimentacion: payload.alimentacion ?? null,
    motivo: String(payload.motivo ?? ""),

    // Flujo inicial: siempre Pendiente (esperando Gerencia)
    estado: "Pendiente",
    proveedor: payload.proveedor ?? null,
    paseCompra: false,

    costo: null,
    costoVenceEn: null,
    costoAprobado: null,

    factura: null,
    cerradoEn: null,

    createdBy,
    createdByEmail,
    createdByName,
  };

  const row = solicitudToInsert(local);

  const { error } = await supabase
    .from("solicitudes_pyh")
    .insert(row);

  if (error) {
    console.error("Error creando ticket", error);
    throw error;
  }

  state.solicitudes.push(local);
  emit();
  return local.id;
}

/* ----------------------------------
   setProveedor (Administración asigna proveedor)
---------------------------------- */

export async function setProveedor(
  index: number,
  nombre: string
): Promise<boolean> {
  const s = state.solicitudes[index];
  if (!s) return false;
  if (s.estado === "Cerrado" || s.factura) return false;

  let nuevoEstado: EstadoSolicitud;
  let paseCompra = false;

  // Determinar si es pasaje aéreo
  // Verificamos subtipo explícitamente o si ya tiene proveedor asignado previamente
  const esAereo = s.tipo === "Pasaje" && s.subtipo === "Aéreo";

  // Si el subtipo es undefined pero el tipo es Pasaje, asumimos que podría ser aéreo
  // si el estado actual sugiere que está en flujo de propuestas
  const posibleAereo = s.tipo === "Pasaje" &&
    !s.subtipo &&
    (s.estado === "Pendiente" || s.estado === "Pendiente propuesta" || s.estado === "Propuesta realizada");

  if (esAereo || posibleAereo) {
    // Pasaje Aéreo: cambiar a "Pendiente propuesta"
    // Permitir asignar proveedor en cualquier estado antes de "Pendiente de compra"
    nuevoEstado = "Pendiente propuesta";
    paseCompra = false;
  } else {
    // Pasaje Terrestre o Hospedaje: cambiar a "Pendiente de compra"
    // Solo permitir si Gerencia ya aprobó
    if (s.estado !== "Gerencia aprobado") {
      console.error("No se puede asignar proveedor: Gerencia debe aprobar primero");
      return false;
    }
    nuevoEstado = "Pendiente de compra";
    paseCompra = true;
  }

  const { error } = await supabase
    .from("solicitudes_pyh")
    .update({
      proveedor: nombre,
      estado: nuevoEstado,
      pase_compra: paseCompra,
    })
    .eq("codigo", s.id);

  if (error) {
    console.error("Error setProveedor", error);
    return false;
  }

  s.proveedor = nombre;
  s.estado = nuevoEstado;
  s.paseCompra = paseCompra;
  emit();
  return true;
}

/* ----------------------------------
   NUEVO FLUJO: Aprobación Gerencia / Administración
---------------------------------- */

/** Gerencia aprueba o rechaza el ticket. */
export async function aprobarGerencia(
  index: number,
  aprueba: boolean
): Promise<boolean> {
  const s = state.solicitudes[index];
  if (!s) return false;
  if (s.estado === "Cerrado") return false;

  const nuevoEstado: EstadoSolicitud = aprueba ? "En proceso" : "Rechazado";

  const { error } = await supabase
    .from("solicitudes_pyh")
    .update({ estado: nuevoEstado })
    .eq("codigo", s.id);

  if (error) {
    console.error("Error aprobarGerencia", error);
    return false;
  }

  s.estado = nuevoEstado;
  emit();
  return true;
}

/** Administración valida o rechaza el ticket. */
export async function aprobarAdministracion(
  index: number,
  aprueba: boolean
): Promise<boolean> {
  const s = state.solicitudes[index];
  if (!s) return false;
  if (s.estado === "Cerrado") return false;

  const nuevoEstado: EstadoSolicitud = aprueba ? "Con pase" : "Rechazado";
  const pase = aprueba;

  const { error } = await supabase
    .from("solicitudes_pyh")
    .update({
      estado: nuevoEstado,
      pase_compra: pase,
    })
    .eq("codigo", s.id);

  if (error) {
    console.error("Error aprobarAdministracion", error);
    return false;
  }

  s.estado = nuevoEstado;
  s.paseCompra = pase;
  emit();
  return true;
}

/* ----------------------------------
   Registro de compra del proveedor
---------------------------------- */

export async function registrarCompraTerrestre({
  index,
  salida,
  retorno,
  asiento,
  costoTotal,
}: {
  index: number;
  salida: Date;
  retorno: Date | null;
  asiento: string;
  costoTotal: number;
}): Promise<boolean> {
  const s = state.solicitudes[index];
  if (!s) return false;
  if (s.tipo !== "Pasaje" || s.subtipo !== "Terrestre") return false;
  if (s.estado === "Cerrado") return false;

  const { error } = await supabase
    .from("solicitudes_pyh")
    .update({
      salida: salida.toISOString(),
      retorno: retorno ? retorno.toISOString() : null,
      asiento,
      costo: costoTotal,
    })
    .eq("codigo", s.id);

  if (error) {
    console.error("Error registrarCompraTerrestre", error);
    return false;
  }

  s.salida = salida;
  s.retorno = retorno ?? null;
  s.asiento = asiento;
  s.costo = costoTotal;
  emit();
  return true;
}

export async function registrarCompraHospedaje({
  index,
  inicio,
  fin,
  noches,
  habitacion,
  detalleServicios,
  costoTotal,
}: {
  index: number;
  inicio: Date;
  fin: Date;
  noches: number;
  habitacion: string;
  detalleServicios: string;
  costoTotal: number;
}): Promise<boolean> {
  const s = state.solicitudes[index];
  if (!s) return false;
  if (s.tipo !== "Hospedaje") return false;
  if (s.estado === "Cerrado") return false;

  const { error } = await supabase
    .from("solicitudes_pyh")
    .update({
      inicio: inicio.toISOString(),
      fin: fin.toISOString(),
      noches,
      habitacion,
      detalle_servicios: detalleServicios,
      costo: costoTotal,
    })
    .eq("codigo", s.id);

  if (error) {
    console.error("Error registrarCompraHospedaje", error);
    return false;
  }

  s.inicio = inicio;
  s.fin = fin;
  s.noches = noches;
  s.habitacion = habitacion;
  s.detalleServicios = detalleServicios;
  s.costo = costoTotal;
  emit();
  return true;
}

export async function registrarCompraAereo({
  index,
  salida,
  retorno,
  codigoViaje,
  clase,
  tieneEscalas,
  tarifa,
  costoTotal,
}: {
  index: number;
  salida: Date;
  retorno: Date | null;
  codigoViaje: string;
  clase: string;
  tieneEscalas: boolean;
  tarifa: string;
  costoTotal: number;
}): Promise<boolean> {
  const s = state.solicitudes[index];
  if (!s) return false;
  if (s.tipo !== "Pasaje" || s.subtipo !== "Aéreo") return false;
  if (s.estado === "Cerrado") return false;

  const { error } = await supabase
    .from("solicitudes_pyh")
    .update({
      salida: salida.toISOString(),
      retorno: retorno ? retorno.toISOString() : null,
      codigo_viaje: codigoViaje,
      clase,
      tiene_escalas: tieneEscalas,
      tarifa,
      costo: costoTotal,
    })
    .eq("codigo", s.id);

  if (error) {
    console.error("Error registrarCompraAereo", error);
    return false;
  }

  s.salida = salida;
  s.retorno = retorno ?? null;
  s.codigoViaje = codigoViaje;
  s.clase = clase;
  s.tieneEscalas = tieneEscalas;
  s.tarifa = tarifa;
  s.costo = costoTotal;
  emit();
  return true;
}

/* ----------------------------------
   LEGACY: aprobarCosto (para vistas antiguas)
---------------------------------- */

export async function aprobarCosto(
  index: number,
  aprueba: boolean
): Promise<boolean> {
  const s = state.solicitudes[index];
  if (!s) return false;

  if (s.factura || s.estado === "Cerrado") return false;

  const nuevoEstado: EstadoSolicitud = aprueba ? "Gerencia aprobado" : "Rechazado";

  const { error } = await supabase
    .from("solicitudes_pyh")
    .update({
      costo_aprobado: aprueba, // usado como "aprobado por gerencia" legacy
      estado: nuevoEstado,
    })
    .eq("codigo", s.id);

  if (error) {
    console.error("Error aprobarCosto", error);
    return false;
  }

  s.costoAprobado = aprueba;
  s.estado = nuevoEstado;
  emit();
  return true;
}

/* ----------------------------------
   NUEVO: Selección de propuestas (Aéreos) - Tabla separada
---------------------------------- */

// Tipo para la fila de la tabla propuestas_aereas_seleccion
type PropuestaSeleccionRow = {
  solicitud_codigo: string;
  propuesta_ida_gerencia: number | null;
  propuesta_vuelta_gerencia: number | null;
  fecha_seleccion_gerencia: string | null;
  propuesta_ida_admin: number | null;
  propuesta_vuelta_admin: number | null;
  fecha_seleccion_admin: string | null;
};

function rowToSeleccion(r: PropuestaSeleccionRow): PropuestaSeleccion {
  return {
    solicitudCodigo: r.solicitud_codigo,
    propuestaIdaGerencia: r.propuesta_ida_gerencia,
    propuestaVueltaGerencia: r.propuesta_vuelta_gerencia,
    fechaSeleccionGerencia: asDate(r.fecha_seleccion_gerencia),
    propuestaIdaAdmin: r.propuesta_ida_admin,
    propuestaVueltaAdmin: r.propuesta_vuelta_admin,
    fechaSeleccionAdmin: asDate(r.fecha_seleccion_admin),
  };
}

// Cargar selecciones de propuestas
export async function loadPropuestasSeleccion() {
  const { data, error } = await supabase
    .from("propuestas_aereas_seleccion")
    .select("*");

  if (error) {
    console.error("Error cargando selecciones de propuestas", error);
    throw error;
  }

  const rows = (data || []) as PropuestaSeleccionRow[];
  state.propuestasSeleccion = rows.map(rowToSeleccion);
  emit();
}

// Obtener selección de una solicitud específica
export function getPropuestaSeleccion(solicitudCodigo: string): PropuestaSeleccion | null {
  return state.propuestasSeleccion.find(ps => ps.solicitudCodigo === solicitudCodigo) || null;
}

export async function seleccionarPropuestasGerencia(
  id: string,
  idaId: number | null,
  vueltaId: number | null
): Promise<boolean> {
  const s = state.solicitudes.find((x) => x.id === id);
  if (!s) return false;

  // Upsert en la tabla propuestas_aereas_seleccion
  const { error: selError } = await supabase
    .from("propuestas_aereas_seleccion")
    .upsert({
      solicitud_codigo: id,
      propuesta_ida_gerencia: idaId,
      propuesta_vuelta_gerencia: vueltaId,
      fecha_seleccion_gerencia: new Date().toISOString(),
    }, {
      onConflict: 'solicitud_codigo'
    });

  if (selError) {
    console.error("Error seleccionarPropuestasGerencia (seleccion)", selError);
    return false;
  }

  // Actualizar estado de la solicitud a "Gerencia aprobado"
  const { error: estadoError } = await supabase
    .from("solicitudes_pyh")
    .update({
      estado: "Gerencia aprobado",
    })
    .eq("codigo", id);

  if (estadoError) {
    console.error("Error seleccionarPropuestasGerencia (estado)", estadoError);
    return false;
  }

  // Actualizar estado local
  let seleccion = state.propuestasSeleccion.find(ps => ps.solicitudCodigo === id);
  if (seleccion) {
    seleccion.propuestaIdaGerencia = idaId;
    seleccion.propuestaVueltaGerencia = vueltaId;
    seleccion.fechaSeleccionGerencia = new Date();
  } else {
    state.propuestasSeleccion.push({
      solicitudCodigo: id,
      propuestaIdaGerencia: idaId,
      propuestaVueltaGerencia: vueltaId,
      fechaSeleccionGerencia: new Date(),
      propuestaIdaAdmin: null,
      propuestaVueltaAdmin: null,
      fechaSeleccionAdmin: null,
    });
  }

  s.estado = "Gerencia aprobado";
  emit();
  return true;
}

export async function seleccionarPropuestasAdmin(
  id: string,
  idaId: number | null,
  vueltaId: number | null,
  datosCompra: {
    costo: number;
    aerolinea: string;
    vuelo: string;
    salida: Date;
    retorno: Date;
    tarifa: string;
  }
): Promise<boolean> {
  const s = state.solicitudes.find((x) => x.id === id);
  if (!s) return false;

  // 1. Upsert en la tabla propuestas_aereas_seleccion
  console.log("🔵 Intentando upsert en propuestas_aereas_seleccion:", {
    solicitud_codigo: id,
    propuesta_ida_admin: idaId,
    propuesta_vuelta_admin: vueltaId,
  });

  const { error: selError } = await supabase
    .from("propuestas_aereas_seleccion")
    .upsert({
      solicitud_codigo: id,
      propuesta_ida_admin: idaId,
      propuesta_vuelta_admin: vueltaId,
      fecha_seleccion_admin: new Date().toISOString(),
    }, {
      onConflict: 'solicitud_codigo'
    });

  if (selError) {
    console.error("❌ Error seleccionarPropuestasAdmin (seleccion)", selError);
    console.error("❌ Error details:", JSON.stringify(selError, null, 2));
    return false;
  }

  console.log("✅ Upsert exitoso en propuestas_aereas_seleccion");

  // 2. Actualizar solicitud con datos de compra
  const { error } = await supabase
    .from("solicitudes_pyh")
    .update({
      pase_compra: true,
      estado: "Pendiente de compra",
      costo: datosCompra.costo,
      codigo_viaje: datosCompra.aerolinea + " " + datosCompra.vuelo,
      clase: datosCompra.tarifa,
      tarifa: datosCompra.tarifa,
      salida: datosCompra.salida.toISOString(),
      retorno: datosCompra.retorno.toISOString(),
    })
    .eq("codigo", id);

  if (error) {
    console.error("Error seleccionarPropuestasAdmin (solicitud)", error);
    return false;
  }

  // 3. Actualizar estado local de selecciones
  let seleccion = state.propuestasSeleccion.find(ps => ps.solicitudCodigo === id);
  if (seleccion) {
    seleccion.propuestaIdaAdmin = idaId;
    seleccion.propuestaVueltaAdmin = vueltaId;
    seleccion.fechaSeleccionAdmin = new Date();
  } else {
    state.propuestasSeleccion.push({
      solicitudCodigo: id,
      propuestaIdaGerencia: null,
      propuestaVueltaGerencia: null,
      fechaSeleccionGerencia: null,
      propuestaIdaAdmin: idaId,
      propuestaVueltaAdmin: vueltaId,
      fechaSeleccionAdmin: new Date(),
    });
  }

  // 4. Actualizar estado local de solicitud
  s.paseCompra = true;
  s.estado = "Pendiente de compra";
  s.costo = datosCompra.costo;
  s.codigoViaje = datosCompra.aerolinea + " " + datosCompra.vuelo;
  s.clase = datosCompra.tarifa;
  s.tarifa = datosCompra.tarifa;
  s.salida = datosCompra.salida;
  s.retorno = datosCompra.retorno;

  emit();
  return true;
}

/* ----------------------------------
   subirFactura / cerrar
---------------------------------- */

export async function subirFactura(
  index: number,
  facturaRef: string
): Promise<boolean> {
  const s = state.solicitudes[index];
  if (!s) return false;
  if (!s.paseCompra || s.estado === "Cerrado") return false;

  const { error } = await supabase
    .from("solicitudes_pyh")
    .update({
      factura: facturaRef,
      estado: "Facturado",
    })
    .eq("codigo", s.id);

  if (error) {
    console.error("Error subirFactura", error);
    return false;
  }

  s.factura = facturaRef;
  s.estado = "Facturado";
  emit();
  return true;
}

export async function cerrar(index: number): Promise<boolean> {
  const s = state.solicitudes[index];
  if (!s) return false;
  if (!s.factura || s.estado === "Cerrado") return false;

  const now = new Date();

  const { error } = await supabase
    .from("solicitudes_pyh")
    .update({
      estado: "Cerrado",
      cerrado_en: now.toISOString(),
    })
    .eq("codigo", s.id);

  if (error) {
    console.error("Error cerrar", error);
    return false;
  }

  s.estado = "Cerrado";
  s.cerradoEn = now;
  emit();
  return true;
}

/* ----------------------------------
   Proveedores activos (en memoria)
---------------------------------- */
export function getProveedoresActivos(
  tipo: "Pasaje" | "Hospedaje"
): string[] {
  const set = new Set<string>();
  for (const s of state.solicitudes) {
    if (s.tipo === tipo && s.proveedor) {
      set.add(s.proveedor);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
export async function registrarCompraUnificada({
  index,
  costo,
  detalle,
  factura,
}: {
  index: number;
  costo: number;
  detalle?: string;
  factura?: string;
}) {
  const s = state.solicitudes[index];
  if (!s) return false;

  try {
    // Actualizamos en Supabase
    // Mapeamos 'detalle' a 'detalle_servicios' para aprovechar el campo existente
    const updatePayload: any = {
      costo: costo,
      detalle_servicios: detalle ?? null,
      factura: factura ?? null,
      estado: "Compra realizada",
    };

    const { error } = await supabase
      .from("solicitudes_pyh")
      .update(updatePayload)
      .eq("codigo", s.id);

    if (error) throw error;

    // Actualizar local
    s.costo = costo;
    s.detalleServicios = detalle ?? null;
    s.factura = factura ?? null;
    s.estado = "Compra realizada";

    emit();
    return true;
  } catch (err) {
    console.error("Error en registrarCompraUnificada:", err);
    return false;
  }
}
