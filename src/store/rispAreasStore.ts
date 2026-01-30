import { supabase } from "../supabase/supabaseClient";

export interface RispArea {
    id: string;
    created_at?: string;
    nombre: string;
    sede_id: string;
    responsable_id?: string;
    // Joined fields
    sede?: { nombre: string };
    responsable?: {
        nombre: string;
        email: string;
        jefe?: { // Subgerente
            nombre: string;
            email: string;
            jefe?: { // Gerente
                nombre: string;
                email: string;
            }
        }
    };
}

interface RispAreasState {
    areas: RispArea[];
    loading: boolean;
    error: string | null;
}

const state: RispAreasState = {
    areas: [],
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((cb) => cb());
}

export function getRispAreasState() {
    return state;
}

export function subscribeRispAreas(cb: () => void) {
    listeners.add(cb);
    if (!state.loading && state.areas.length === 0) {
        void fetchRispAreas();
    }
    return () => { listeners.delete(cb); };
}

export async function fetchRispAreas() {
    state.loading = true;
    state.error = null;
    notify();

    try {
        // Fetch areas with deep nesting for notification contacts
        // Area -> Responsable -> Jefe (Subgerente) -> Jefe (Gerente)
        const { data, error } = await supabase
            .from('risp_areas_dim')
            .select(`
                *,
                sede:sedes (nombre),
                responsable:risp_jefaturas_dim!responsable_id (
                    nombre, 
                    email,
                    jefe:risp_jefaturas_dim!jefe_id (
                        nombre,
                        email,
                        jefe:risp_jefaturas_dim!jefe_id (
                            nombre,
                            email
                        )
                    )
                )
            `)
            .order('nombre');

        if (error) throw error;

        state.areas = (data as any[]) || [];
    } catch (err: any) {
        state.error = err.message || 'Error al cargar areas';
    } finally {
        state.loading = false;
        notify();
    }
}

export async function createRispArea(area: Omit<RispArea, 'id' | 'created_at' | 'sede' | 'responsable'>) {
    const { data, error } = await supabase
        .from('risp_areas_dim')
        .insert([area])
        .select()
        .single();

    if (error) throw error;
    await fetchRispAreas();
    return data;
}

export async function updateRispArea(id: string, updates: Partial<RispArea>) {
    // Remove expanded fields
    const { sede, responsable, ...cleanUpdates } = updates;

    const { data, error } = await supabase
        .from('risp_areas_dim')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    await fetchRispAreas();
    return data;
}

export async function deleteRispArea(id: string) {
    const { error } = await supabase
        .from('risp_areas_dim')
        .delete()
        .eq('id', id);

    if (error) throw error;
    state.areas = state.areas.filter(a => a.id !== id);
    notify();
}
