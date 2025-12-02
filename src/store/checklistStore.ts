// src/store/checklistStore.ts
import { supabase } from "../supabase/supabaseClient"; // o tu cliente

export type CkItem = { name: string; ok: boolean; nota?: string };
export type CkGroup = { title: string; items: CkItem[] };

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
