// src/store/personalStore.ts
import { supabase } from "../supabase/supabaseClient"; // Ajusta esta ruta si es necesario

export type EstadoTrabajador = "ACTIVO" | "CESADO";

export interface Personal {
  id: string;
  dni: string;
  nombre: string;
  gerenciaId: string; // FK a gerencias.id
  estado: EstadoTrabajador;
  created_at?: string;
}

interface PersonalState {
  personal: Personal[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

let state: PersonalState = {
  personal: [],
  loaded: false,
  loading: false,
  error: null,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

export function getPersonalState(): PersonalState {
  return state;
}

export function subscribePersonal(listener: () => void) {
  listeners.add(listener);

  // Carga perezosa al primer subscribe
  if (!state.loaded && !state.loading) {
    void fetchPersonal();
  }

  return () => {
    listeners.delete(listener);
  };
}

async function fetchPersonal() {
  state = { ...state, loading: true, error: null };
  notify();

  // Ojo: usamos gerencia_id en BD y lo mapeamos a gerenciaId en el front
  const { data, error } = await supabase
    .from("personal")
    .select(
      "id, dni, nombre, gerencia_id, estado, created_at"
    )
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error cargando personal", error);
    state = { ...state, loading: false, error: error.message };
    notify();
    return;
  }

  const mapped: Personal[] =
    (data || []).map((row: any) => ({
      id: row.id,
      dni: row.dni,
      nombre: row.nombre,
      gerenciaId: row.gerencia_id,
      estado: row.estado as EstadoTrabajador,
      created_at: row.created_at,
    })) ?? [];

  state = {
    ...state,
    loading: false,
    loaded: true,
    personal: mapped,
    error: null,
  };
  notify();
}

export async function reloadPersonal() {
  await fetchPersonal();
}

/**
 * Crea o actualiza un trabajador.
 * - Si trae id → actualiza
 * - Si id es undefined → inserta
 */
export async function upsertPersonal(input: {
  id?: string;
  dni: string;
  nombre: string;
  gerenciaId: string;
  estado: EstadoTrabajador;
}) {
  const payload = {
    id: input.id, // undefined → nuevo
    dni: input.dni.trim(),
    nombre: input.nombre.trim(),
    gerencia_id: input.gerenciaId,
    estado: input.estado,
  };

  const { error } = await supabase
    .from("personal")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    console.error("Error upsert personal", error);
    throw error;
  }

  await fetchPersonal();
}
