
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client (Same as other stores)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ================= TYPES ================= */

export interface LogisticOperator {
    id: string; // BIGSERIAL treated as string
    name: string;
    ruc: string;
    contact?: string;
    active: boolean;
}

export interface TransportProvider {
    id: string;
    operator_id: string; // FK to LogisticOperator
    name: string;
    ruc: string;
    address?: string;
    contact?: string;
    active: boolean;
}

export interface TransportUnitCatalog {
    id: string;
    provider_id: string; // FK to TransportProvider
    plate: string;
    type: 'TRACTO' | 'SEMIREMOLQUE'; // Simplified types
    brand?: string;
    model?: string;
    year?: number;
    active: boolean;
}

export interface TransportDriver {
    id: string;
    provider_id: string; // FK to TransportProvider
    name: string; // Full Name
    dni: string;
    license: string; // License Number
    phone?: string;
    active: boolean;
}

/* ================= STATE ================= */

type Listener = () => void;
const listeners = new Set<Listener>();

const state = {
    operators: [] as LogisticOperator[],
    providers: [] as TransportProvider[],
    units: [] as TransportUnitCatalog[],
    drivers: [] as TransportDriver[],
    loading: false,
    error: null as string | null,
    loaded: false,
};

function emit() {
    listeners.forEach((l) => l());
}

export function subscribeTransportEntities(listener: Listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getTransportEntitiesState() {
    return state;
}

/* ================= FETCHING ================= */

export async function fetchAllEntities() {
    state.loading = true;
    state.error = null;
    emit();

    try {
        // Parallel fetching
        const [opsRes, prosRes, unitsRes, driversRes] = await Promise.all([
            supabase.from('dim_logistic_operators').select('*').order('name'),
            supabase.from('dim_transport_providers').select('*').order('name'),
            supabase.from('dim_transport_units_catalog').select('*').order('plate'),
            supabase.from('dim_transport_drivers').select('*').order('name'),
        ]);

        if (opsRes.error) throw opsRes.error;
        if (prosRes.error) throw prosRes.error;
        if (unitsRes.error) throw unitsRes.error;
        if (driversRes.error) throw driversRes.error;

        // Map snake_case DB to camelCase Types (if needed, but assuming DB matches for now or simple mapping)
        // Adjust mapping if DB columns are specific (e.g. created_at, phone vs telefono etc)
        // For efficiency, assuming DB columns match these for this new feature 
        // OR performing simple mapping below.

        state.operators = opsRes.data.map((r: any) => ({
            id: r.id.toString(),
            name: r.name,
            ruc: r.ruc,
            contact: r.contact,
            active: r.active !== false // Default true if null/undefined
        }));

        state.providers = prosRes.data.map((r: any) => ({
            id: r.id.toString(),
            operator_id: r.operator_id.toString(),
            name: r.name,
            ruc: r.ruc,
            address: r.address,
            contact: r.contact,
            active: r.active !== false
        }));

        state.units = unitsRes.data.map((r: any) => ({
            id: r.id.toString(),
            provider_id: r.provider_id.toString(),
            plate: r.plate,
            type: r.type,
            brand: r.brand,
            model: r.model,
            year: r.year,
            active: r.active !== false
        }));

        state.drivers = driversRes.data.map((r: any) => ({
            id: r.id.toString(),
            provider_id: r.provider_id.toString(),
            name: r.name,
            dni: r.dni,
            license: r.license,
            phone: r.phone,
            active: r.active !== false
        }));

        state.loaded = true;

    } catch (err: any) {
        console.error("Error fetching transport entities:", err);
        state.error = err.message;
    } finally {
        state.loading = false;
        emit();
    }
}

/* ================= CRUD ACTIONS ================= */

// --- OPERATORS ---
export async function createOperator(data: Omit<LogisticOperator, 'id'>) {
    const { error } = await supabase.from('dim_logistic_operators').insert(data);
    if (error) throw error;
    await fetchAllEntities();
}

export async function updateOperator(id: string, updates: Partial<LogisticOperator>) {
    const { error } = await supabase.from('dim_logistic_operators').update(updates).eq('id', id);
    if (error) throw error;
    await fetchAllEntities();
}

export async function deleteOperator(id: string) {
    const { error } = await supabase.from('dim_logistic_operators').delete().eq('id', id);
    if (error) throw error;
    await fetchAllEntities();
}

// --- PROVIDERS ---
export async function createProvider(data: Omit<TransportProvider, 'id'>) {
    const { error } = await supabase.from('dim_transport_providers').insert(data);
    if (error) throw error;
    await fetchAllEntities();
}

export async function updateProvider(id: string, updates: Partial<TransportProvider>) {
    const { error } = await supabase.from('dim_transport_providers').update(updates).eq('id', id);
    if (error) throw error;
    await fetchAllEntities();
}

export async function deleteProvider(id: string) {
    const { error } = await supabase.from('dim_transport_providers').delete().eq('id', id);
    if (error) throw error;
    await fetchAllEntities();
}

// --- UNITS ---
export async function createUnitCatalog(data: Omit<TransportUnitCatalog, 'id'>) {
    const { error } = await supabase.from('dim_transport_units_catalog').insert(data);
    if (error) throw error;
    await fetchAllEntities();
}

export async function updateUnitCatalog(id: string, updates: Partial<TransportUnitCatalog>) {
    const { error } = await supabase.from('dim_transport_units_catalog').update(updates).eq('id', id);
    if (error) throw error;
    await fetchAllEntities();
}

export async function deleteUnitCatalog(id: string) {
    const { error } = await supabase.from('dim_transport_units_catalog').delete().eq('id', id);
    if (error) throw error;
    await fetchAllEntities();
}

// --- DRIVERS ---
export async function createDriver(data: Omit<TransportDriver, 'id'>) {
    const { error } = await supabase.from('dim_transport_drivers').insert(data);
    if (error) throw error;
    await fetchAllEntities();
}

export async function updateDriver(id: string, updates: Partial<TransportDriver>) {
    const { error } = await supabase.from('dim_transport_drivers').update(updates).eq('id', id);
    if (error) throw error;
    await fetchAllEntities();
}

export async function deleteDriver(id: string) {
    const { error } = await supabase.from('dim_transport_drivers').delete().eq('id', id);
    if (error) throw error;
    await fetchAllEntities();
}
