import { supabase } from "../supabase/supabaseClient";

export interface HechoRisp {
    id: string;
    created_at: string;
    n_risp?: string;
    categoria_risp: 'AGENTE' | 'CCTV' | string;
    unidad?: string;
    fecha_incidente?: string;
    dni_agente?: string;
    nombre_agente?: string;
    macrozona?: string;
    area_involucrada?: string;
    asignado_a?: string;
    personal_involucrado?: string;
    categoria?: string;
    tipo_incidente?: string;
    sub_tipo_incidente?: string;
    descripcion_incidente?: string;
    tipo_reporte?: string;
    tipo_accion_inmediata?: string;
    tipo_observacion?: string;
    descripcion_acciones_tomadas?: string;
    estado_cumplimiento?: string;
    fecha_cumplimiento?: string;
    intensidad?: string;
    usuario_reportante?: string;
    nombre_usuario_reportante?: string;
    fotos?: string[]; // URLs
}

export const rispStore = {
    risps: [] as HechoRisp[],

    async fetchRisps() {
        const { data, error } = await supabase
            .from("hecho_risp")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        this.risps = data as HechoRisp[];
    },

    async createRisp(risp: Omit<HechoRisp, "id" | "created_at" | "n_risp">) {
        const { data, error } = await supabase
            .from("hecho_risp")
            .insert([risp])
            .select()
            .single();

        if (error) throw error;
        // Prepend to list
        this.risps = [data as HechoRisp, ...this.risps];
        return data as HechoRisp;
    },

    async updateRisp(id: string, updates: Partial<HechoRisp>) {
        const { data, error } = await supabase
            .from("hecho_risp")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        this.risps = this.risps.map(r => r.id === id ? (data as HechoRisp) : r);
        return data as HechoRisp;
    },

    async deleteRisp(id: string) {
        const { error } = await supabase
            .from("hecho_risp")
            .delete()
            .eq("id", id);

        if (error) throw error;
        this.risps = this.risps.filter(r => r.id !== id);
    },

    // Helper to upload photo
    async uploadPhoto(file: File, folder: string = "risp") {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('evidencias') // Assuming a bucket named 'evidencias' exists, or we might need to create it or use 'avatars' etc.
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('evidencias').getPublicUrl(filePath);
        return data.publicUrl;
    }
};
