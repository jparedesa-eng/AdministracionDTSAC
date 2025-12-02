// src/store/providersStore.ts
// Store de proveedores conectado a Supabase

import { createClient } from "@supabase/supabase-js";

// ⚠️ Ajusta esto a tu forma real de crear el cliente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ---------- Tipos ---------- */

export type Provider = {
  id: string; // viene de Supabase (BIGSERIAL) pero lo manejamos como string
  ruc: string;
  nombre: string;
  kind: "Pasaje" | "Hospedaje";
  traslado: boolean;
  alimentacion: boolean;
  contacto?: string | null;
  telefono?: string | null;
  nota?: string | null;
  activo: boolean; // mapeado desde columna estado ('Activo' / 'Desactivado')
};

type ProviderRow = {
  id: number;
  ruc: string;
  nombre: string;
  tipo: "Pasaje" | "Hospedaje";
  traslado: boolean;
  alimentacion: boolean;
  contacto: string | null;
  telefono: string | null;
  nota: string | null;
  estado: string; // 'Activo' | 'Desactivado'
  creado_en: string;
};

/* ---------- Estado in-memory + pub/sub ---------- */

type Listener = () => void;

const listeners = new Set<Listener>();

const state = {
  providers: [] as Provider[],
  loaded: false,
};

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeProviders(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProvidersState() {
  return state;
}

/* ---------- Helpers de mapeo ---------- */

function rowToProvider(row: ProviderRow): Provider {
  return {
    id: String(row.id),
    ruc: row.ruc,
    nombre: row.nombre,
    kind: row.tipo,
    traslado: !!row.traslado,
    alimentacion: !!row.alimentacion,
    contacto: row.contacto,
    telefono: row.telefono,
    nota: row.nota,
    activo: row.estado === "Activo",
  };
}

function providerToRowInput(p: {
  id?: string;
  ruc: string;
  nombre: string;
  kind: "Pasaje" | "Hospedaje";
  traslado: boolean;
  alimentacion: boolean;
  contacto?: string | null;
  telefono?: string | null;
  nota?: string | null;
  activo?: boolean;
}): Omit<ProviderRow, "id" | "creado_en"> {
  return {
    ruc: p.ruc,
    nombre: p.nombre,
    tipo: p.kind,
    traslado: !!p.traslado,
    alimentacion: !!p.alimentacion,
    contacto: p.contacto ?? null,
    telefono: p.telefono ?? null,
    nota: p.nota ?? null,
    estado: p.activo ?? true ? "Activo" : "Desactivado",
  } as any;
}

/* ---------- Carga desde Supabase ---------- */

export async function loadProviders() {
  const { data, error } = await supabase
    .from("proveedores")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error cargando proveedores", error);
    throw error;
  }

  state.providers = (data as ProviderRow[]).map(rowToProvider);
  state.loaded = true;
  emit();
}

/**
 * seedIfEmpty:
 * - solo se asegura de que cargues proveedores al entrar
 * - si la tabla ya tiene datos, no hace nada extra
 */
export async function seedIfEmpty() {
  if (!state.loaded) {
    await loadProviders();
  }
  // Si quieres insertar demo cuando está vacío, puedes hacerlo aquí:
  // if (state.providers.length === 0) { ... }
}

/* ---------- Upsert (insert / update) ---------- */

export async function upsertProvider(p: {
  id?: string;
  kind: "Pasaje" | "Hospedaje";
  nombre: string;
  ruc: string;
  traslado: boolean;
  alimentacion: boolean;
  contacto?: string | null;
  telefono?: string | null;
  nota?: string | null;
  activo?: boolean;
}): Promise<void> {
  const rowInput = providerToRowInput(p);

  if (p.id) {
    // UPDATE
    const idNum = Number(p.id);
    const { error } = await supabase
      .from("proveedores")
      .update(rowInput)
      .eq("id", idNum);

    if (error) {
      console.error("Error actualizando proveedor", error);
      throw error;
    }
  } else {
    // INSERT
    const { data, error } = await supabase
      .from("proveedores")
      .insert(rowInput)
      .select("*")
      .single();

    if (error) {
      console.error("Error creando proveedor", error);
      throw error;
    }

    // añadimos el creado directamente al estado
    const prov = rowToProvider(data as ProviderRow);
    state.providers.push(prov);
    emit();
    return;
  }

  // tras update, recargamos para mantener todo consistente
  await loadProviders();
}

/* ---------- Cambiar estado Activo / Desactivado ---------- */

export async function setProviderActive(
  id: string,
  active: boolean
): Promise<void> {
  const idNum = Number(id);

  const { error } = await supabase
    .from("proveedores")
    .update({
      estado: active ? "Activo" : "Desactivado",
    })
    .eq("id", idNum);

  if (error) {
    console.error("Error cambiando estado de proveedor", error);
    throw error;
  }

  // Actualizamos en memoria
  const p = state.providers.find((pr) => pr.id === id);
  if (p) {
    p.activo = active;
  }
  emit();
}
