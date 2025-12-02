// src/store/MantenimientoStore.ts
import { supabase } from "../supabase/supabaseClient";

/* =========================
 * Tipos
 * ========================= */
export type Naturaleza = "preventivo" | "correctivo";

export type Vehiculo = {
  id: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  responsable?: string | null;
  proveedor?: string | null;
};

export type Programa = {
  id: string;
  vehiculo_id: string;
  tipo: string; // General | Aceite | Frenos | Neumáticos
  periodicidad_meses: number;
  ultima_fecha: string | null;
  proxima_fecha: string | null;
  notas: string | null;
};

export type Mantenimiento = {
  id: string;
  vehiculo_id: string;
  tipo: string;
  fecha: string; // YYYY-MM-DD
  notas: string | null;
  costo: number | null;
  km: number | null;
};

export type Programacion = {
  id: string;
  vehiculo_id: string;
  placa: string | null;
  tipo: string;
  naturaleza: Naturaleza;
  fecha: string; // YYYY-MM-DD
  notas: string | null;
  created_at: string;
};

/* =========================
 * Fechas
 * ========================= */
const ymd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

/* =========================
 * Mapeos
 * ========================= */
const mapVeh = (r: any): Vehiculo => ({
  id: r.id,
  placa: r.placa,
  marca: r.marca ?? null,
  modelo: r.modelo ?? null,
  responsable: r.responsable ?? null,
  proveedor: r.proveedor ?? null,
});
const mapProg = (r: any): Programa => ({
  id: r.id,
  vehiculo_id: r.vehiculo_id,
  tipo: r.tipo,
  periodicidad_meses: r.periodicidad_meses,
  ultima_fecha: r.ultima_fecha,
  proxima_fecha: r.proxima_fecha,
  notas: r.notas,
});
const mapMant = (r: any): Mantenimiento => ({
  id: r.id,
  vehiculo_id: r.vehiculo_id,
  tipo: r.tipo,
  fecha: r.fecha,
  notas: r.notas,
  costo: r.costo ?? null,
  km: r.km ?? null,
});

/* =========================
 * Store ligero
 * ========================= */
export const mantenimientoStore = {
  vehiculos: [] as Vehiculo[],

  async syncVehiculos(q: string): Promise<void> {
    let query = supabase.from("vehiculos").select("*").order("placa", { ascending: true });
    if (q.trim()) {
      const term = q.trim();
      query = query.or(
        `placa.ilike.%${term}%,marca.ilike.%${term}%,modelo.ilike.%${term}%,responsable.ilike.%${term}%,proveedor.ilike.%${term}%`
      );
    }
    const { data, error } = await query;
    if (error) throw error;
    this.vehiculos = (data ?? []).map(mapVeh);
  },

  async fetchProgramas(vehiculoIds: string[], tipo: string): Promise<Programa[]> {
    if (vehiculoIds.length === 0) return [];
    const { data, error } = await supabase
      .from("mantenimiento_programa")
      .select("*")
      .in("vehiculo_id", vehiculoIds)
      .eq("tipo", tipo);
    if (error) throw error;
    return (data ?? []).map(mapProg);
  },

  async fetchProgramasPorTipo(tipo: string): Promise<Programa[]> {
    const { data, error } = await supabase.from("mantenimiento_programa").select("*").eq("tipo", tipo);
    if (error) throw error;
    return (data ?? []).map(mapProg);
  },

  async bulkInsertProgramaciones(
    rows: Array<Omit<Programacion, "id" | "created_at">>
  ): Promise<void> {
    const { error } = await supabase.from("mantenimientos_programados").insert(rows as any[]);
    if (error) throw error;
  },
};

/* =========================
 * API dominio
 * ========================= */
export async function createProgramacion(args: {
  vehiculo_id: string;
  placa: string;
  tipo: string;
  fecha: string;
  naturaleza?: Naturaleza;
  notas?: string | null;
}): Promise<Programacion> {
  const { vehiculo_id, placa, tipo, fecha, naturaleza = "preventivo", notas = null } = args;
  const { data, error } = await supabase
    .from("mantenimientos_programados")
    .insert([{ vehiculo_id, placa, tipo, naturaleza, fecha, notas }])
    .select("*")
    .single();
  if (error) throw error;
  return data as Programacion;
}

export async function updateProgramacion(
  id: string,
  patch: Partial<Programacion>
): Promise<Programacion> {
  const { data, error } = await supabase
    .from("mantenimientos_programados")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Programacion;
}

export async function deleteProgramacion(id: string): Promise<void> {
  const { error } = await supabase.from("mantenimientos_programados").delete().eq("id", id);
  if (error) throw error;
}

export async function createMantenimiento(args: {
  vehiculo_id: string;
  tipo: string;
  fecha: string;
  notas?: string | null;
  km?: number | null;
  costo?: number | null;
}): Promise<Mantenimiento> {
  const { data, error } = await supabase
    .from("mantenimientos")
    .insert([
      {
        vehiculo_id: args.vehiculo_id,
        tipo: args.tipo,
        fecha: args.fecha,
        notas: args.notas ?? null,
        km: args.km ?? null,
        costo: args.costo ?? null,
      },
    ])
    .select("*")
    .single();
  if (error) throw error;
  return mapMant(data);
}

export async function upsertProgramaMaestro(args: {
  vehiculo_id: string;
  tipo: string;
  periodicidad_meses: number;
  proxima_fecha: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from("mantenimiento_programa")
    .upsert(
      [
        {
          vehiculo_id: args.vehiculo_id,
          tipo: args.tipo,
          periodicidad_meses: args.periodicidad_meses,
          proxima_fecha: args.proxima_fecha,
        },
      ],
      { onConflict: "vehiculo_id,tipo" }
    );
  if (error) throw error;
}

export async function fetchProgramacionesMes(
  viewDate: Date,
  tipo: string
): Promise<Programacion[]> {
  const desde = ymd(startOfMonth(viewDate));
  const hasta = ymd(endOfMonth(viewDate));
  const { data, error } = await supabase
    .from("mantenimientos_programados")
    .select("*")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .eq("tipo", tipo)
    .order("fecha", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Programacion[];
}

export async function fetchMantenimientosMes(
  viewDate: Date,
  tipo: string
): Promise<Mantenimiento[]> {
  const desde = ymd(startOfMonth(viewDate));
  const hasta = ymd(endOfMonth(viewDate));
  const { data, error } = await supabase
    .from("mantenimientos")
    .select("*")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .eq("tipo", tipo);
  if (error) throw error;
  return (data ?? []).map(mapMant);
}

export async function fetchProgramasPorTipo(tipo: string): Promise<Programa[]> {
  return mantenimientoStore.fetchProgramasPorTipo(tipo);
}
