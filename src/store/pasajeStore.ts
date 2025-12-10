// src/store/pasajeStore.ts
/* Store para Pasaje/Hospedaje conectado a Supabase.
   Mantiene un estado en memoria y lo sincroniza con la tabla "solicitudes_pyh".
*/

import { supabase } from '../supabase/supabaseClient';

/* ----------------------------------
   Tipos
---------------------------------- */

export type EstadoSolicitud =
  | 'Pendiente'
  | 'En proceso'
  | 'Costo aprobado'
  | 'Con pase'
  | 'Facturado'
  | 'Cerrado'
  | 'Rechazado';

export type Solicitud = {
  // Usamos el código legible (PYH00001) como id en el front
  id: string; // == codigo
  creado: Date;

  // Beneficiario
  dni: string;
  nombre: string;
  gerencia: string;

  // Tipo
  tipo: 'Pasaje' | 'Hospedaje';

  // Pasaje
  subtipo?: 'Aéreo' | 'Terrestre';
  salida?: Date | null;
  retorno?: Date | null;

  // Hospedaje
  lugar?: string | null;
  inicio?: Date | null;
  fin?: Date | null;

  // Adicionales
  traslado: boolean;
  alimentacion?: string | null;
  motivo: string;

  // Flujo
  estado: EstadoSolicitud;
  proveedor: string | null;
  paseCompra: boolean;

  // Costos
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

type Listener = () => void;

const listeners = new Set<Listener>();

const state = {
  solicitudes: [] as Solicitud[],
  loaded: false,
};

/* ----------------------------------
   Suscripción / estado
---------------------------------- */

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  // cleanup que espera React: () => void
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
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') {
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
  return 'PYH' + String(next).padStart(5, '0');
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

  tipo: 'Pasaje' | 'Hospedaje';
  subtipo: 'Aéreo' | 'Terrestre' | null;

  salida: string | null;
  retorno: string | null;

  lugar: string | null;
  inicio: string | null;
  fin: string | null;

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
  // Al leer, usamos el nombre exactamente como está en la BD.
  // Si es null, en la UI tú ya usas fallback: createdByName || createdByEmail.
  const nombreCreador = r.created_by_name;

  return {
    id: r.codigo, // usamos el código legible como id
    creado: asDate(r.creado) ?? new Date(),

    dni: r.dni,
    nombre: r.nombre,
    gerencia: r.gerencia,

    tipo: r.tipo,
    subtipo: (r.subtipo as any) ?? undefined,
    salida: asDate(r.salida),
    retorno: asDate(r.retorno),

    lugar: r.lugar,
    inicio: asDate(r.inicio),
    fin: asDate(r.fin),

    traslado: !!r.traslado,
    alimentacion: r.alimentacion,
    motivo: r.motivo,

    estado: (r.estado as EstadoSolicitud) ?? 'Pendiente',
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
    created_by_name: p.createdByName, // aquí va el nombre REAL sacado de profiles

    dni: p.dni,
    nombre: p.nombre,
    gerencia: p.gerencia,

    tipo: p.tipo,
    subtipo: p.subtipo ?? null,

    salida: p.salida ? p.salida.toISOString() : null,
    retorno: p.retorno ? p.retorno.toISOString() : null,

    lugar: p.lugar ?? null,
    inicio: p.inicio ? p.inicio.toISOString() : null,
    fin: p.fin ? p.fin.toISOString() : null,

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
    .from('solicitudes_pyh')
    .select('*')
    .order('creado', { ascending: true });

  if (error) {
    console.error('Error cargando tickets', error);
    throw error;
  }

  state.solicitudes = (data as SolicitudRow[]).map(rowToSolicitud);
  state.loaded = true;
  emit();
}

/* ----------------------------------
   Utilidades de estado
---------------------------------- */

export function indexById(codigo: string): number {
  return state.solicitudes.findIndex((s) => s.id === codigo);
}

/** Recalcula vigencia de costos SOLO en memoria (no toca BD) */
export function syncVigenciaCostos() {
  const now = new Date();
  for (const s of state.solicitudes) {
    if (!s.costo || !s.costoVenceEn) continue;
    if (
      now > s.costoVenceEn &&
      s.estado !== 'Cerrado' &&
      !s.factura &&
      s.costoAprobado !== true
    ) {
      s.costo = null;
      s.costoVenceEn = null;
      if (s.estado === 'Costo aprobado') s.estado = 'En proceso';
    }
  }
}

/* ----------------------------------
   Crear ticket
---------------------------------- */

export async function crear(
  payload: Partial<Solicitud>
): Promise<string> {
  // Aseguramos tener tickets en memoria para calcular el siguiente código
  if (!state.loaded) {
    await loadSolicitudes();
  }

  const { data: authData, error: authError } =
    await supabase.auth.getUser();
  if (authError || !authData?.user) {
    throw new Error('No hay usuario autenticado.');
  }

  const user = authData.user;
  const createdBy = user.id;
  const createdByEmail = user.email ?? null;

  // 🔎 Aquí buscamos el nombre en la tabla "profiles"
  // Asumimos que profiles.id = auth.users.id (uuid)
  let createdByName: string | null = null;
  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('nombre')
    .eq('id', user.id);

  if (!profileError && profileRows && profileRows.length > 0) {
    const rawNombre = (profileRows[0] as any).nombre;
    if (rawNombre && String(rawNombre).trim().length > 0) {
      createdByName = String(rawNombre).trim();
    }
  }
  // Si no hay fila en profiles o no tiene nombre, se queda como null
  // (la UI luego usa createdByName || createdByEmail)

  const now = new Date();
  const codigo = nextCodigo();

  const local: Solicitud = {
    id: codigo,
    creado: now,

    dni: String(payload.dni ?? ''),
    nombre: String(payload.nombre ?? ''),
    gerencia: String(payload.gerencia ?? ''),

    tipo: payload.tipo === 'Hospedaje' ? 'Hospedaje' : 'Pasaje',
    subtipo: payload.subtipo,
    salida: payload.salida ? asDate(payload.salida)! : null,
    retorno: payload.retorno ? asDate(payload.retorno)! : null,

    lugar: payload.lugar ?? null,
    inicio: payload.inicio ? asDate(payload.inicio)! : null,
    fin: payload.fin ? asDate(payload.fin)! : null,

    traslado: !!payload.traslado,
    alimentacion: payload.alimentacion ?? null,
    motivo: String(payload.motivo ?? ''),

    estado: 'Pendiente',
    proveedor: payload.proveedor ?? null,
    paseCompra: false,

    costo: null,
    costoVenceEn: null,
    costoAprobado: null,

    factura: null,
    cerradoEn: null,

    createdBy,
    createdByEmail,
    createdByName, // ahora viene desde profiles.nombre
  };

  const row = solicitudToInsert(local);

  const { error } = await supabase
    .from('solicitudes_pyh')
    .insert(row);

  if (error) {
    console.error('Error creando ticket', error);
    throw error;
  }

  state.solicitudes.push(local);
  emit();
  return local.id;
}

/* ----------------------------------
   setProveedor
---------------------------------- */

export async function setProveedor(
  index: number,
  nombre: string
): Promise<boolean> {
  const s = state.solicitudes[index];
  if (!s) return false;
  if (s.estado === 'Cerrado' || s.factura) return false;

  const nuevoEstado: EstadoSolicitud =
    s.estado === 'Pendiente' ? 'En proceso' : s.estado;

  const { error } = await supabase
    .from('solicitudes_pyh')
    .update({
      proveedor: nombre,
      estado: nuevoEstado,
    })
    .eq('codigo', s.id);

  if (error) {
    console.error('Error setProveedor', error);
    return false;
  }

  s.proveedor = nombre;
  s.estado = nuevoEstado;
  emit();
  return true;
}

/* ----------------------------------
   setCostoConVigencia
---------------------------------- */

export async function setCostoConVigencia({
  index,
  monto,
  horasVigencia,
}: {
  index: number;
  monto: number;
  horasVigencia: number;
}): Promise<boolean> {
  syncVigenciaCostos();
  const s = state.solicitudes[index];
  if (!s) return false;

  const now = new Date();
  const cerrado = s.estado === 'Cerrado';
  const tieneFactura = !!s.factura;
  const aprobadoGerencia = s.costoAprobado === true;
  const costoVigente =
    !!s.costo && !!s.costoVenceEn && now < s.costoVenceEn;
  if (cerrado || tieneFactura || aprobadoGerencia || costoVigente)
    return false;

  const horas = Math.max(1, Math.min(horasVigencia, 24 * 30));
  const venceNuevo = new Date(now.getTime() + horas * 3600 * 1000);

  const { error } = await supabase
    .from('solicitudes_pyh')
    .update({
      costo: monto,
      costo_vence_en: venceNuevo.toISOString(),
      costo_aprobado: null,
      pase_compra: false,
      factura: null,
      estado: s.estado === 'Rechazado' ? 'En proceso' : s.estado,
    })
    .eq('codigo', s.id);

  if (error) {
    console.error('Error setCostoConVigencia', error);
    return false;
  }

  s.costo = monto;
  s.costoVenceEn = venceNuevo;
  s.costoAprobado = null;
  s.paseCompra = false;
  s.factura = null;
  if (s.estado === 'Rechazado') s.estado = 'En proceso';
  emit();
  return true;
}

/* ----------------------------------
   aprobarCosto
---------------------------------- */

export async function aprobarCosto(
  index: number,
  aprueba: boolean
): Promise<boolean> {
  syncVigenciaCostos();
  const s = state.solicitudes[index];
  if (!s) return false;
  if (s.factura || s.estado === 'Cerrado') return false;
  if (!s.costo) return false;

  const nuevoEstado: EstadoSolicitud = aprueba
    ? 'Costo aprobado'
    : 'Rechazado';
  const paseCompra = aprueba;

  const { error } = await supabase
    .from('solicitudes_pyh')
    .update({
      costo_aprobado: aprueba,
      estado: nuevoEstado,
      pase_compra: paseCompra,
    })
    .eq('codigo', s.id);

  if (error) {
    console.error('Error aprobarCosto', error);
    return false;
  }

  s.costoAprobado = aprueba;
  s.estado = nuevoEstado;
  s.paseCompra = paseCompra;
  emit();
  return true;
}

/* ----------------------------------
   subirFactura
---------------------------------- */

export async function subirFactura(
  index: number,
  facturaRef: string
): Promise<boolean> {
  const s = state.solicitudes[index];
  if (!s) return false;
  if (!s.paseCompra || s.estado === 'Cerrado') return false;

  const { error } = await supabase
    .from('solicitudes_pyh')
    .update({
      factura: facturaRef,
      estado: 'Facturado',
    })
    .eq('codigo', s.id);

  if (error) {
    console.error('Error subirFactura', error);
    return false;
  }

  s.factura = facturaRef;
  s.estado = 'Facturado';
  emit();
  return true;
}

/* ----------------------------------
   cerrar
---------------------------------- */

export async function cerrar(index: number): Promise<boolean> {
  const s = state.solicitudes[index];
  if (!s) return false;
  if (!s.factura || s.estado === 'Cerrado') return false;

  const now = new Date();

  const { error } = await supabase
    .from('solicitudes_pyh')
    .update({
      estado: 'Cerrado',
      cerrado_en: now.toISOString(),
    })
    .eq('codigo', s.id);

  if (error) {
    console.error('Error cerrar', error);
    return false;
  }

  s.estado = 'Cerrado';
  s.cerradoEn = now;
  emit();
  return true;
}

/* ----------------------------------
   Proveedores activos (en memoria)
---------------------------------- */
export function getProveedoresActivos(
  tipo: 'Pasaje' | 'Hospedaje'
): string[] {
  const set = new Set<string>();
  for (const s of state.solicitudes) {
    if (s.tipo === tipo && s.proveedor) {
      set.add(s.proveedor);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
