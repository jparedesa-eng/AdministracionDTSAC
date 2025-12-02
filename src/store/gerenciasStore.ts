// src/store/gerenciasStore.ts
import { supabase } from "../supabase/supabaseClient"; // ajusta la ruta si tu cliente está en otro sitio

export type Gerencia = {
  id: string;
  nombre: string;
  created_at?: string | null;
};

type GerenciasState = {
  gerencias: Gerencia[];
  loading: boolean;
  error: string | null;
};

const state: GerenciasState = {
  gerencias: [],
  loading: false,
  error: null,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function getGerenciasState(): GerenciasState {
  return state;
}

export function subscribeGerencias(cb: () => void): () => void {
  listeners.add(cb);

  // Primera carga perezosa
  if (!state.loading && state.gerencias.length === 0) {
    void refreshGerencias();
  }

  return () => {
    listeners.delete(cb);
  };
}

export async function refreshGerencias(): Promise<void> {
  state.loading = true;
  state.error = null;
  notify();

  const { data, error } = await supabase
    .from("gerencias")
    .select("id, nombre, created_at")
    .order("nombre", { ascending: true });

  if (error) {
    state.error = error.message;
    state.loading = false;
    notify();
    return;
  }

  state.gerencias = (data || []).map((row) => ({
    id: row.id as string,
    nombre: row.nombre as string,
    created_at: row.created_at,
  }));

  state.loading = false;
  notify();
}

export async function upsertGerencia(input: {
  id?: string;
  nombre: string;
}): Promise<void> {
  const payload = {
    nombre: input.nombre,
  };

  const { error } = await supabase
    .from("gerencias")
    .upsert(
      input.id
        ? { id: input.id, ...payload }
        : payload,
      { onConflict: "id" }
    );

  if (error) {
    throw new Error(error.message);
  }

  await refreshGerencias();
}
