import { supabase } from "../supabase/supabaseClient";

export interface Aplicativo {
    id: string;
    nombre: string;
    created_at?: string;
}

export const aplicativosStore = {
    list: [] as Aplicativo[],

    async fetchAll() {
        const { data, error } = await supabase
            .from("telefonia_aplicativos")
            .select("*")
            .order("nombre", { ascending: true });

        if (error) throw error;
        this.list = data as Aplicativo[];
        return this.list;
    },

    async create(nombre: string) {
        const { data, error } = await supabase
            .from("telefonia_aplicativos")
            .insert([{ nombre }])
            .select()
            .single();

        if (error) throw error;
        this.list = [...this.list, data as Aplicativo].sort((a, b) => a.nombre.localeCompare(b.nombre));
        return data;
    },

    async delete(id: string) {
        const { error } = await supabase
            .from("telefonia_aplicativos")
            .delete()
            .eq("id", id);

        if (error) throw error;
        this.list = this.list.filter(item => item.id !== id);
    }
};
