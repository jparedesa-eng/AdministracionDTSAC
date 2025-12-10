// src/store/propuestasStore.ts
import { supabase } from "../supabase/supabaseClient";

/* ----------------------------------
   Tipos
---------------------------------- */

export type PropuestaTramo = {
  id?: number;
  solicitudCodigo: string;
  proveedor: string | null;
  nroPropuesta: number;
  nroTramo: number;

  origenCiudad: string;
  origenCodigo: string | null;

  destinoCiudad: string;
  destinoCodigo: string | null;

  salida: Date;
  llegada: Date;

  aerolinea: string | null;
  vuelo: string | null;
  tarifa: string | null;

  equipajeCabina: boolean;
  equipajeBodega: boolean;

  notas: string | null;

  // Campos nativos nuevos
  sentido?: "IDA" | "VUELTA" | "AMBOS";
  moneda?: string;

  // costo total de la propuesta (se repite en todos los tramos de esa propuesta)
  costoTotal: number | null;
};

export type PropuestaAerea = {
  solicitudCodigo: string;
  nroPropuesta: number;
  proveedor: string | null;
  costoTotal: number | null;
  moneda: string; // "PEN" | "USD"
  observaciones: string | null;
  sentido?: "IDA" | "VUELTA" | "AMBOS";
  tramos: PropuestaTramo[];
};

type PropuestaTramoRow = {
  id: number;
  solicitud_codigo: string;
  proveedor: string | null;
  nro_propuesta: number;
  nro_tramo: number;

  origen_ciudad: string;
  origen_codigo: string | null;

  destino_ciudad: string;
  destino_codigo: string | null;

  salida: string; // ISO
  llegada: string; // ISO

  aerolinea: string | null;
  vuelo: string | null;
  tarifa: string | null;

  equipaje_cabina: boolean | null;
  equipaje_bodega: boolean | null;

  notas: string | null;

  // Nuevas columnas en DB
  sentido: string | null;
  moneda: string | null;

  costo_total: number | null;
};

/* ----------------------------------
   Estado en memoria
---------------------------------- */

type Listener = () => void;

const listeners = new Set<Listener>();

const state = {
  tramos: [] as PropuestaTramo[],
};

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

/* ----------------------------------
   Helpers
---------------------------------- */

function asDate(v: any): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!Number.isNaN(+d)) return d;
  }
  return new Date();
}

function rowToTramo(r: PropuestaTramoRow): PropuestaTramo {
  return {
    id: r.id,
    solicitudCodigo: r.solicitud_codigo,
    proveedor: r.proveedor,
    nroPropuesta: r.nro_propuesta,
    nroTramo: r.nro_tramo,

    origenCiudad: r.origen_ciudad,
    origenCodigo: r.origen_codigo,

    destinoCiudad: r.destino_ciudad,
    destinoCodigo: r.destino_codigo,

    salida: asDate(r.salida),
    llegada: asDate(r.llegada),

    aerolinea: r.aerolinea,
    vuelo: r.vuelo,
    tarifa: r.tarifa,

    equipajeCabina: !!r.equipaje_cabina,
    equipajeBodega: !!r.equipaje_bodega,

    notas: r.notas,

    // Mapeo directo de columnas
    sentido: (r.sentido as "IDA" | "VUELTA" | "AMBOS") || undefined,
    moneda: r.moneda || undefined,

    costoTotal: r.costo_total,
  };
}

/* ----------------------------------
   Carga por solicitud
---------------------------------- */

export async function loadPropuestasBySolicitud(
  solicitudCodigo: string
): Promise<void> {
  const { data, error } = await supabase
    .from("propuestas_tramos_aereo")
    .select("*")
    .eq("solicitud_codigo", solicitudCodigo)
    .order("nro_propuesta", { ascending: true })
    .order("nro_tramo", { ascending: true });

  if (error) {
    console.error("Error cargando propuestas aéreas", error);
    throw error;
  }

  const rows = (data || []) as PropuestaTramoRow[];

  // limpiamos tramos anteriores de esta solicitud
  state.tramos = state.tramos.filter(
    (t) => t.solicitudCodigo !== solicitudCodigo
  );

  // agregamos los nuevos
  state.tramos.push(...rows.map(rowToTramo));
  emit();
}

/* ----------------------------------
   Obtener propuestas agrupadas por solicitud
---------------------------------- */

export function getPropuestasBySolicitud(
  solicitudCodigo: string
): PropuestaAerea[] {
  const propios = state.tramos.filter(
    (t) => t.solicitudCodigo === solicitudCodigo
  );

  const map = new Map<number, PropuestaAerea>();

  for (const tramo of propios) {
    let prop = map.get(tramo.nroPropuesta);
    if (!prop) {
      // 1. Intentar usar valores nativos de columna
      let moneda = tramo.moneda || "PEN";
      let sentido = tramo.sentido;
      let obs = tramo.notas;

      // 2. Fallback: Parsear notas si NO hay columnas nativas (migración)
      if (!tramo.moneda && !tramo.sentido && tramo.notas) {
        let text = tramo.notas;

        // Extraer Moneda
        const matchMoneda = /\[MONEDA:\s*(\w+)\]/.exec(text);
        if (matchMoneda) {
          moneda = matchMoneda[1];
          text = text.replace(matchMoneda[0], "");
        }

        // Extraer Sentido
        const matchSentido = /\[SENTIDO:\s*(\w+)\]/.exec(text);
        if (matchSentido) {
          const val = matchSentido[1];
          if (val === "IDA" || val === "VUELTA" || val === "AMBOS") {
            sentido = val;
          }
          text = text.replace(matchSentido[0], "");
        }

        obs = text.trim() || null;
      }

      prop = {
        solicitudCodigo,
        nroPropuesta: tramo.nroPropuesta,
        proveedor: tramo.proveedor,
        costoTotal: tramo.costoTotal,
        moneda,
        observaciones: obs,
        sentido,
        tramos: [],
      };
      map.set(tramo.nroPropuesta, prop);
    }
    prop.tramos.push(tramo);
  }

  return Array.from(map.values()).sort(
    (a, b) => a.nroPropuesta - b.nroPropuesta
  );
}

/* ----------------------------------
   Crear nueva propuesta para una solicitud
   (Solo agrega, no edita propuestas existentes)
   FORMATO "LEGACY" (fechas Date, muchos campos)
---------------------------------- */

export async function createPropuestaAerea(params: {
  solicitudCodigo: string;
  proveedor: string | null;
  costoTotal: number | null;
  // Nuevos parametros opcionales para la insercion directa
  moneda?: string;
  sentido?: string;
  tramos: {
    origenCiudad: string;
    origenCodigo?: string | null;
    destinoCiudad: string;
    destinoCodigo?: string | null;
    salida: Date;
    llegada: Date;
    aerolinea?: string | null;
    vuelo?: string | null;
    tarifa?: string | null;
    equipajeCabina?: boolean;
    equipajeBodega?: boolean;
    notas?: string | null;
  }[];
}): Promise<number | null> {
  // Retorna el nro_propuesta creado o null
  if (!params.tramos.length) return null;

  // Siguiente nro_propuesta para esa solicitud
  const existentes = state.tramos.filter(
    (t) => t.solicitudCodigo === params.solicitudCodigo
  );
  let maxN = 0;
  for (const t of existentes) {
    if (t.nroPropuesta > maxN) maxN = t.nroPropuesta;
  }
  const nroPropuestaNuevo = maxN + 1;

  const rowsToInsert: Omit<PropuestaTramoRow, "id">[] = params.tramos.map(
    (t, idx) => ({
      solicitud_codigo: params.solicitudCodigo,
      proveedor: params.proveedor,
      nro_propuesta: nroPropuestaNuevo,
      nro_tramo: idx + 1,
      origen_ciudad: t.origenCiudad,
      origen_codigo: t.origenCodigo ?? null,
      destino_ciudad: t.destinoCiudad,
      destino_codigo: t.destinoCodigo ?? null,
      salida: t.salida.toISOString(),
      llegada: t.llegada.toISOString(),
      aerolinea: t.aerolinea ?? null,
      vuelo: t.vuelo ?? null,
      tarifa: t.tarifa ?? null,
      equipaje_cabina: t.equipajeCabina ?? false,
      equipaje_bodega: t.equipajeBodega ?? false,
      notas: t.notas ?? null,
      costo_total: params.costoTotal,
      // Insertamos en columnas nuevas
      moneda: params.moneda ?? "PEN",
      sentido: params.sentido ?? null,
    })
  );

  const { data, error } = await supabase
    .from("propuestas_tramos_aereo")
    .insert(rowsToInsert)
    .select("*");

  if (error) {
    console.error("Error creando propuesta aérea", error);
    return null;
  }

  const inserted = (data || []) as PropuestaTramoRow[];
  state.tramos.push(...inserted.map(rowToTramo));
  emit();
  return nroPropuestaNuevo;
}

/* ----------------------------------
   NUEVA API PARA EL FRONT:
   crearPropuestaAerea()
   (adaptador simple para el formato usado en ProveedorView)
---------------------------------- */

export async function crearPropuestaAerea(params: {
  solicitudCodigo: string;
  total: number;
  moneda: "PEN" | "USD";
  observaciones?: string;
  sentido?: "IDA" | "VUELTA" | "AMBOS"; // Nuevo param
  tramos: {
    orden: number;
    origen: string;
    destino: string;
    fechaSalida: string; // yyyy-mm-dd
    horaSalida: string; // HH:mm
    fechaLlegada: string;
    horaLlegada: string;
    aerolinea?: string;
    vuelo?: string;
    clase?: string;
  }[];
}): Promise<boolean> {
  if (!params.tramos.length) return false;

  // Convertimos fecha+hora a Date y mapeamos al formato legacy
  const tramosLegacy = params.tramos.map((t) => {
    const salida = new Date(`${t.fechaSalida}T${t.horaSalida}:00`);
    const llegada = new Date(`${t.fechaLlegada}T${t.horaLlegada}:00`);

    return {
      origenCiudad: t.origen,
      origenCodigo: null,
      destinoCiudad: t.destino,
      destinoCodigo: null,
      salida,
      llegada,
      aerolinea: t.aerolinea ?? null,
      vuelo: t.vuelo ?? null,
      // usamos "tarifa" para guardar la clase / tarifa del vuelo
      tarifa: t.clase ?? null,
      equipajeCabina: false,
      equipajeBodega: false,
      notas: params.observaciones || null, // Nota limpia, sin tags
    };
  });

  const res = await createPropuestaAerea({
    solicitudCodigo: params.solicitudCodigo,
    proveedor: null,
    costoTotal: params.total,
    moneda: params.moneda,
    sentido: params.sentido || "AMBOS",
    tramos: tramosLegacy,
  });

  if (res === null) return false;

  // Actualizar estado de la solicitud a "Propuesta realizada"
  try {
    const { error } = await supabase
      .from("solicitudes_pyh")
      .update({
        estado: "Propuesta realizada",
      })
      .eq("codigo", params.solicitudCodigo);

    if (error) {
      console.error("Error actualizando estado a Propuesta realizada", error);
      // No retornamos false porque la propuesta sí se creó
    }
  } catch (err) {
    console.error("Error actualizando estado:", err);
  }

  return true;
}

/**
 * Combina dos propuestas (una Ida y una Vuelta) en una nueva "Unificada".
 * Útil para seleccionar precios combinados.
 */
export async function crearPropuestaCombinada(
  solicitudId: string,
  idaId: number,
  vueltaId: number
): Promise<number | null> {
  const all = getPropuestasBySolicitud(solicitudId);
  const ida = all.find((p) => p.nroPropuesta === idaId);
  const vuelta = all.find((p) => p.nroPropuesta === vueltaId);

  if (!ida || !vuelta) return null;

  // Sumar costos
  const costoTotal = (ida.costoTotal ?? 0) + (vuelta.costoTotal ?? 0);
  const moneda = ida.moneda; // Asumimos misma moneda

  // Combinar tramos
  const tramosInsert = [
    ...ida.tramos,
    ...vuelta.tramos
  ].map(t => ({
    origenCiudad: t.origenCiudad,
    origenCodigo: t.origenCodigo,
    destinoCiudad: t.destinoCiudad,
    destinoCodigo: t.destinoCodigo,
    salida: t.salida,
    llegada: t.llegada,
    aerolinea: t.aerolinea,
    vuelo: t.vuelo,
    tarifa: t.tarifa,
    equipajeCabina: t.equipajeCabina,
    equipajeBodega: t.equipajeBodega,
    notas: null as string | null
  }));

  const obs = `Combinación de Propuesta #${idaId} y #${vueltaId}.`;
  // Agregamos la observación al primer tramo
  if (tramosInsert.length > 0) {
    tramosInsert[0].notas = obs;
  }

  return await createPropuestaAerea({
    solicitudCodigo: solicitudId,
    proveedor: ida.proveedor || vuelta.proveedor,
    costoTotal,
    moneda: moneda,
    sentido: "AMBOS",
    tramos: tramosInsert
  });
}
