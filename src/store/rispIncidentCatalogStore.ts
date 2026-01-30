import { supabase } from '../supabase/supabaseClient';

export interface RispIncidentCatalogItem {
    id: number;
    tipo: string;
    subtipo: string;
    categoria: string;
    gravedad: 'MODERADO' | 'GRAVE' | string;
    plazo: 'CORTO' | 'INMEDIATO' | 'MUY CORTO' | 'MEDIANO' | string;
    active: boolean;
}

export const rispIncidentCatalogStore = {
    items: [] as RispIncidentCatalogItem[],

    async fetchCatalog() {
        const { data, error } = await supabase
            .from('risp_incident_catalog')
            .select('*')
            .order('tipo', { ascending: true })
            .order('subtipo', { ascending: true });

        if (error) throw error;
        this.items = data as RispIncidentCatalogItem[];
        return this.items; // Return for convenience
    },

    async addItem(item: Omit<RispIncidentCatalogItem, 'id' | 'active'>) {
        const { error } = await supabase
            .from('risp_incident_catalog')
            .insert([item]);

        if (error) throw error;
        await this.fetchCatalog();
    },

    async updateItem(id: number, item: Partial<RispIncidentCatalogItem>) {
        const { error } = await supabase
            .from('risp_incident_catalog')
            .update(item)
            .eq('id', id);

        if (error) throw error;
        await this.fetchCatalog();
    },

    async deleteItem(id: number) {
        const { error } = await supabase
            .from('risp_incident_catalog')
            .delete()
            .eq('id', id);

        if (error) throw error;
        await this.fetchCatalog();
    }
};
