// src/store/incidentesStore.ts
import { supabase } from "../supabase/supabaseClient";

export type TipoIncidente = "Incidente" | "Papeleta" | "Daño" | "Otros";
export type Categoria = "Correctivo" | "Devolucion" | "Infraccion";
export type Criticidad = "Leve" | "Moderado" | "Grave";
export type TipoActualizado =
  | "Robo"
  | "Cambio"
  | "Reparacion"
  | "Devolucion"
  | "Duplicados"
  | "Papeleta";
export type EstadoNuevo = "Pendiente" | "Notificado" | "Facturado" | "Desestimado";
export type Moneda = "PEN" | "USD";

export type Incidente = {
  id: string;
  fecha: string;                     // ISO yyyy-mm-dd
  tipo: TipoIncidente;               // campo existente
  vehiculo: string;                  // placa
  descripcion: string;
  responsable?: string | null;

  // Flujo
  estado: EstadoNuevo;               // Pendiente | Notificado | Facturado | Desestimado
  fechaSolucion?: string | null;

  // Compat (no usado en UI actual)
  descuentoAplicado: boolean;
  fechaDescuento?: string | null;

  // Costeo
  monto?: number | null;
  moneda?: Moneda | null;

  // Clasificación
  categoria?: Categoria | null;
  criticidad?: Criticidad | null;
  tipoActualizado?: TipoActualizado | null;
  subTipo?: string | null;

  // Facturación
  nroFactura?: string | null;

  createdAt?: string | null;
};

/* ---------------- Mapeos BD <-> App ---------------- */
type IncidenteRow = {
  id: string;
  fecha: string;                     // 'yyyy-mm-dd'
  tipo: TipoIncidente;
  vehiculo: string;
  descripcion: string;
  responsable: string | null;

  estado: EstadoNuevo;
  fecha_solucion: string | null;

  descuento_aplicado: boolean;
  fecha_descuento: string | null;

  monto: number | null;
  moneda: Moneda | null;

  categoria: Categoria | null;
  criticidad: Criticidad | null;
  tipo_actualizado: TipoActualizado | null;
  sub_tipo: string | null;

  nro_factura: string | null;

  created_at: string | null;
};

function iFromRow(r: IncidenteRow): Incidente {
  return {
    id: r.id,
    fecha: r.fecha,
    tipo: r.tipo,
    vehiculo: r.vehiculo,
    descripcion: r.descripcion,
    responsable: r.responsable,

    estado: r.estado,
    fechaSolucion: r.fecha_solucion,

    descuentoAplicado: r.descuento_aplicado,
    fechaDescuento: r.fecha_descuento,

    monto: r.monto ?? null,
    moneda: r.moneda ?? null,

    categoria: r.categoria ?? null,
    criticidad: r.criticidad ?? null,
    tipoActualizado: r.tipo_actualizado ?? null,
    subTipo: r.sub_tipo ?? null,

    nroFactura: r.nro_factura ?? null,

    createdAt: r.created_at,
  };
}

function iToInsertRowNoId(i: Partial<Incidente> & {
  fecha: string;
  tipo: TipoIncidente;
  vehiculo: string;
  descripcion: string;
}): Omit<IncidenteRow, "id" | "created_at"> {
  return {
    fecha: i.fecha,
    tipo: i.tipo!,
    vehiculo: i.vehiculo!,
    descripcion: i.descripcion!,
    responsable: (i.responsable ?? null) as string | null,

    estado: (i.estado ?? "Pendiente") as EstadoNuevo,
    fecha_solucion: (i.fechaSolucion ?? null) as string | null,

    descuento_aplicado: !!i.descuentoAplicado,
    fecha_descuento: (i.fechaDescuento ?? null) as string | null,

    monto: (i.monto ?? null) as number | null,
    moneda: (i.moneda ?? null) as Moneda | null,

    categoria: (i.categoria ?? null) as Categoria | null,
    criticidad: (i.criticidad ?? null) as Criticidad | null,
    tipo_actualizado: (i.tipoActualizado ?? null) as TipoActualizado | null,
    sub_tipo: (i.subTipo ?? null) as string | null,

    nro_factura: (i.nroFactura ?? null) as string | null,
  };
}

/* ---------------- Store ---------------- */
export const incidentesStore = {
  cache: [] as Incidente[],

  async sync(params?: {
    desde?: string; // yyyy-mm-dd
    hasta?: string; // yyyy-mm-dd
    placa?: string;
    estado?: EstadoNuevo;
    tipo?: TipoIncidente;
    texto?: string;
  }): Promise<Incidente[]> {
    let q = supabase.from("incidentes").select("*").order("fecha", { ascending: false });

    if (params?.desde) q = q.gte("fecha", params.desde);
    if (params?.hasta) q = q.lte("fecha", params.hasta);
    if (params?.placa && params.placa !== "Todas") q = q.eq("vehiculo", params.placa);
    if (params?.estado) q = q.eq("estado", params.estado);
    if (params?.tipo && params.tipo !== ("Todos" as any)) q = q.eq("tipo", params.tipo);

    const { data, error } = await q;
    if (error) throw error;

    let rows = (data as IncidenteRow[]).map(iFromRow);

    // Filtro de texto (cliente)
    if (params?.texto) {
      const s = params.texto.toLowerCase();
      rows = rows.filter((it) =>
        `${it.vehiculo} ${it.descripcion} ${it.responsable ?? ""}`.toLowerCase().includes(s)
      );
    }

    this.cache = rows;
    return rows;
  },

  async crear(i: Omit<Incidente, "id" | "createdAt">): Promise<Incidente> {
    const insertRow = iToInsertRowNoId({
      fecha: i.fecha,
      tipo: i.tipo,
      vehiculo: i.vehiculo,
      descripcion: i.descripcion,

      responsable: i.responsable ?? null,

      estado: (i.estado as EstadoNuevo) ?? "Pendiente",
      fechaSolucion: i.fechaSolucion ?? null,

      descuentoAplicado: i.descuentoAplicado,
      fechaDescuento: i.fechaDescuento ?? null,

      monto: i.monto ?? null,
      moneda: i.moneda ?? null,

      categoria: i.categoria ?? null,
      criticidad: i.criticidad ?? null,
      tipoActualizado: i.tipoActualizado ?? null,
      subTipo: i.subTipo ?? null,

      nroFactura: i.nroFactura ?? null,
    });

    const { data, error } = await supabase
      .from("incidentes")
      .insert([insertRow])
      .select("*")
      .single();

    if (error) throw error;

    const inserted = iFromRow(data as IncidenteRow);
    this.cache = [inserted, ...this.cache];
    return inserted;
  },

  async asignarResponsable(id: string, responsable: string | null): Promise<Incidente> {
    const { data, error } = await supabase
      .from("incidentes")
      .update({ responsable })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    const upd = iFromRow(data as IncidenteRow);
    this.cache = this.cache.map((x) => (x.id === id ? upd : x));
    return upd;
  },

  /** asignar/editar costo (monto) y moneda */
  async asignarCosto(id: string, monto: number | string | null, moneda: Moneda | null): Promise<Incidente> {
    let val: number | null = null;
    if (monto !== null && monto !== undefined && String(monto).trim() !== "") {
      const txt = String(monto).trim().replace(",", ".");
      const num = Number(txt);
      val = Number.isNaN(num) ? null : num;
    }

    const { data, error } = await supabase
      .from("incidentes")
      .update({ monto: val, moneda: moneda ?? null })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    const upd = iFromRow(data as any);
    this.cache = this.cache.map((x) => (x.id === id ? upd : x));
    return upd;
  },

  /** Clasificar */
  async clasificar(
    id: string,
    payload: {
      categoria: Categoria | null;
      criticidad: Criticidad | null;
      tipo_actualizado: TipoActualizado | null;
      sub_tipo: string | null;
    }
  ): Promise<Incidente> {
    const { data, error } = await supabase
      .from("incidentes")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    const upd = iFromRow(data as IncidenteRow);
    this.cache = this.cache.map((x) => (x.id === id ? upd : x));
    return upd;
  },

  /** Cambiar estado genérico */
  async cambiarEstado(
    id: string,
    estado: EstadoNuevo,
    extras?: Partial<{ nro_factura: string | null }>
  ): Promise<Incidente> {
    const update: Record<string, any> = { estado };
    if (extras && "nro_factura" in extras) update.nro_factura = extras.nro_factura ?? null;

    const { data, error } = await supabase
      .from("incidentes")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;

    const upd = iFromRow(data as IncidenteRow);
    this.cache = this.cache.map((x) => (x.id === id ? upd : x));
    return upd;
  },

  /** actualización flexible de columnas nativas en BD */
  async actualizarCampos(
    id: string,
    changes: Partial<IncidenteRow>
  ): Promise<Incidente> {
    const { data, error } = await supabase
      .from("incidentes")
      .update(changes)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    const upd = iFromRow(data as IncidenteRow);
    this.cache = this.cache.map((x) => (x.id === id ? upd : x));
    return upd;
  },

  // opcional: marcar solucionado
  async marcarSolucionado(id: string, fechaSolucion: string | null): Promise<Incidente> {
    const { data, error } = await supabase
      .from("incidentes")
      .update({ fecha_solucion: fechaSolucion })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    const upd = iFromRow(data as IncidenteRow);
    this.cache = this.cache.map((x) => (x.id === id ? upd : x));
    return upd;
  },

  // opcional: ejecutar descuento
  async ejecutarDescuento(id: string, fechaDDMMYYYY: string): Promise<Incidente> {
    const [dd, mm, yy] = fechaDDMMYYYY.split("/");
    const iso = `${yy}-${mm}-${dd}`;
    const { data, error } = await supabase
      .from("incidentes")
      .update({ descuento_aplicado: true, fecha_descuento: iso })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    const upd = iFromRow(data as IncidenteRow);
    this.cache = this.cache.map((x) => (x.id === id ? upd : x));
    return upd;
  },

  async eliminar(id: string): Promise<void> {
    const { error } = await supabase.from("incidentes").delete().eq("id", id);
    if (error) throw error;
    this.cache = this.cache.filter((x) => x.id !== id);
  },
};
