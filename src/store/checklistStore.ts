// src/store/checklistStore.ts
import { supabase } from "../supabase/supabaseClient"; // o tu cliente

export type CkItem = { name: string; ok: boolean; status?: string; nota?: string };
export type CkGroup = { titulo: string; items: CkItem[] };

export type SaveChecklistInput = {
  // 👇 YA NO HAY solicitud_id
  placa: string;
  fecha: string; // del input datetime-local
  sede: string | null;
  kilometraje: number | null;
  responsable_inspeccion: string;
  usuario_dni: string;
  usuario_nombre: string;
  /** opcional */
  usuario_correo?: string | null;
  firma_base64: string | null;
  grupos: CkGroup[];
  aprobado: boolean;
  tipo: "entrega" | "regular"; // NUEVO CAMPO
  observaciones?: string | null; // NUEVO CAMPO
  fecha_ingreso?: string | null; // NUEVO: Fecha de ingreso de la unidad (antigüedad)
};

export async function guardarChecklist(input: SaveChecklistInput) {
  // Armamos el payload para la tabla 'checklists'
  const basePayload: any = {
    // 👇 quitado solicitud_id
    placa: input.placa,
    fecha: input.fecha,
    sede: input.sede,
    kilometraje: input.kilometraje,
    responsable_inspeccion: input.responsable_inspeccion,
    usuario_dni: input.usuario_dni,
    usuario_nombre: input.usuario_nombre,
    firma_base64: input.firma_base64,
    grupos: input.grupos, // jsonb en la BD
    aprobado: input.aprobado,
    tipo: input.tipo, // Guardamos el tipo
    observaciones: input.observaciones, // Guardamos observaciones
    fecha_ingreso: input.fecha_ingreso, // Guardamos fecha de ingreso
  };

  if (input.usuario_correo) {
    // usa el mismo nombre que la columna real en tu tabla (usuario_correo)
    basePayload.usuario_correo = input.usuario_correo;
  }

  const { data, error } = await supabase
    .from("checklists")
    .insert([basePayload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function actualizarChecklist(id: string, input: SaveChecklistInput) {
  const payload: any = {
    placa: input.placa,
    fecha: input.fecha,
    sede: input.sede,
    kilometraje: input.kilometraje,
    responsable_inspeccion: input.responsable_inspeccion,
    usuario_dni: input.usuario_dni,
    usuario_nombre: input.usuario_nombre,
    grupos: input.grupos,
    aprobado: input.aprobado,
    tipo: input.tipo,
    observaciones: input.observaciones,
    fecha_ingreso: input.fecha_ingreso,
  };

  if (input.firma_base64) {
    payload.firma_base64 = input.firma_base64;
  }

  if (input.usuario_correo) {
    payload.usuario_correo = input.usuario_correo;
  }

  console.log("Actualizando checklist con ID:", id, "Payload:", payload);

  const { data, error } = await supabase
    .from("checklists")
    .update(payload)
    .eq("id", id)
    .select();

  if (error) {
    console.error("Error en actualizarChecklist:", error);
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    console.warn("No se encontró el registro para actualizar o no hubo cambios aplicados.");
    throw new Error("No se pudo actualizar el registro: El ID no fue encontrado o no tienes permisos (RLS).");
  }

  return data[0];
}
