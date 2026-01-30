import { supabase } from "../supabase/supabaseClient";

export type CargoJefatura = 'GERENTE' | 'SUBGERENTE' | 'RESPONSABLE';

export interface RispJefatura {
    id: string;
    created_at?: string;
    nombre: string;
    email: string;
    cargo: CargoJefatura;
    jefe_id?: string | null;
    jefe?: RispJefatura; // Joined data
}

interface RispJefaturasState {
    jefaturas: RispJefatura[];
    loading: boolean;
    error: string | null;
}

const state: RispJefaturasState = {
    jefaturas: [],
    loading: false,
    error: null,
};

const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((cb) => cb());
}

export function getRispJefaturasState() {
    return state;
}

export function subscribeRispJefaturas(cb: () => void) {
    listeners.add(cb);
    if (!state.loading && state.jefaturas.length === 0) {
        void fetchRispJefaturas();
    }
    return () => { listeners.delete(cb); };
}

export async function fetchRispJefaturas() {
    state.loading = true;
    state.error = null;
    notify();

    try {
        const { data, error } = await supabase
            .from('risp_jefaturas_dim')
            .select(`
                *,
                jefe:risp_jefaturas_dim!jefe_id (
                    id, nombre, email, cargo
                )
            `)
            .order('nombre');

        if (error) throw error;

        state.jefaturas = (data as RispJefatura[]) || [];
    } catch (err: any) {
        state.error = err.message || 'Error al cargar jefaturas';
    } finally {
        state.loading = false;
        notify();
    }
}

export async function createRispJefatura(jefatura: Omit<RispJefatura, 'id' | 'created_at' | 'jefe'>) {
    const { data, error } = await supabase
        .from('risp_jefaturas_dim')
        .insert([jefatura])
        .select()
        .single();

    if (error) throw error;
    await fetchRispJefaturas();
    return data;
}

export async function updateRispJefatura(id: string, updates: Partial<RispJefatura>) {
    // Remove expanded fields if present
    const { jefe, ...cleanUpdates } = updates;

    const { data, error } = await supabase
        .from('risp_jefaturas_dim')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    await fetchRispJefaturas();
    return data;
}

export async function deleteRispJefatura(id: string) {
    const { error } = await supabase
        .from('risp_jefaturas_dim')
        .delete()
        .eq('id', id);

    if (error) throw error;
    state.jefaturas = state.jefaturas.filter(j => j.id !== id);
    notify();
}
