import { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import type { MMPPRecord } from '../../store/monitoreoMMPPStore';
import { createMMPPRecord, updateMMPPRecord, getMMPPState, fetchMMPPRouteTimes, fetchMMPPCatalogs, subscribeMMPP } from '../../store/monitoreoMMPPStore';
import { useAuth } from '../../auth/AuthContext';

interface MMPPFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    record?: MMPPRecord | null;
}

export const MMPPFormModal: React.FC<MMPPFormModalProps> = ({ isOpen, onClose, record }) => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [mmppState, setMmppState] = useState(getMMPPState());
    const [form, setForm] = useState({
        operador_cctv: '',
        empresa: 'DANPER',
        origen: '',
        destino: '',
        fecha_hora_origen: '',
        transportista: '',
        placa: '',
        conductor: '',
        celular_conductor: '',
        parihuelas_pallets: 0,
        jabas_bines: 0,
        materia_prima: '',
        peso_neto_bruto: 0,
        inicio_monitoreo: '',
        frecuencia: 'EN LINEA',
        resguardo: false,
        nombre_resguardo: '',
        fecha_hora_llegada: '',
        estado: 'EN RUTA'
    });

    useEffect(() => {
        const unsubscribe = subscribeMMPP(() => setMmppState({ ...getMMPPState() }));
        fetchMMPPRouteTimes();
        fetchMMPPCatalogs();
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (record) {
            setForm({
                operador_cctv: record.operador_cctv || '',
                empresa: record.empresa || 'DANPER',
                origen: record.origen || '',
                destino: record.destino || '',
                fecha_hora_origen: record.fecha_hora_origen ? record.fecha_hora_origen.slice(0, 16) : '',
                transportista: record.transportista || '',
                placa: record.placa || '',
                conductor: record.conductor || '',
                celular_conductor: record.celular_conductor || '',
                parihuelas_pallets: record.parihuelas_pallets || 0,
                jabas_bines: record.jabas_bines || 0,
                materia_prima: record.materia_prima || '',
                peso_neto_bruto: record.peso_neto_bruto || 0,
                inicio_monitoreo: record.inicio_monitoreo ? record.inicio_monitoreo.slice(0, 16) : '',
                frecuencia: record.frecuencia || 'EN LINEA',
                resguardo: record.resguardo || false,
                nombre_resguardo: record.nombre_resguardo || '',
                fecha_hora_llegada: record.fecha_hora_llegada ? record.fecha_hora_llegada.slice(0, 16) : '',
                estado: record.estado || 'EN RUTA'
            });
        } else {
            const now = new Date();
            const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            setForm(prev => ({
                ...prev,
                operador_cctv: profile?.nombre || '',
                fecha_hora_origen: localIso,
                inicio_monitoreo: localIso
            }));
        }
    }, [record, profile, isOpen]);

    // Unique options for dynamic selects
    const availableOrigins = useMemo(() => {
        const origins = mmppState.routeTimes
            .filter(r => r.empresa === form.empresa)
            .map(r => r.origen);
        return [...new Set(origins)].sort();
    }, [mmppState.routeTimes, form.empresa]);

    const availableDestinations = useMemo(() => {
        const destinations = mmppState.routeTimes
            .filter(r => r.empresa === form.empresa && (form.origen ? r.origen === form.origen : true))
            .map(r => r.destino);
        return [...new Set(destinations)].sort();
    }, [mmppState.routeTimes, form.empresa, form.origen]);

    const selectedEmpresaId = useMemo(() => {
        return mmppState.empresas.find(e => e.nombre === form.transportista)?.id || '';
    }, [form.transportista, mmppState.empresas]);

    const availablePlacas = useMemo(() => {
        if (!selectedEmpresaId) return [];
        return mmppState.vehiculos.filter(v => v.empresa_id === selectedEmpresaId).map(v => v.placa).sort();
    }, [selectedEmpresaId, mmppState.vehiculos]);

    const availableConductores = useMemo(() => {
        if (!selectedEmpresaId) return [];
        return mmppState.conductores.filter(c => c.empresa_id === selectedEmpresaId).sort((a,b) => a.nombre.localeCompare(b.nombre));
    }, [selectedEmpresaId, mmppState.conductores]);

    const handleTransportistaChange = (nombre: string) => {
        setForm(prev => ({
            ...prev,
            transportista: nombre,
            placa: '',
            conductor: '',
            celular_conductor: ''
        }));
    };

    const handleConductorChange = (nombre: string) => {
        const conductor = availableConductores.find(c => c.nombre === nombre);
        setForm(prev => ({
            ...prev,
            conductor: nombre,
            celular_conductor: conductor ? conductor.celular : ''
        }));
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...form,
                usuario_creacion_id: profile?.id
            };
            
            if (record) {
                await updateMMPPRecord(record.id, payload);
            } else {
                await createMMPPRecord(payload);
            }
            onClose();
        } catch (error) {
            console.error("Error saving MMPP record:", error);
            alert("Error al guardar el registro.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-auto overflow-hidden border border-gray-300">
                <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-slate-50">
                    <h2 className="text-lg font-semibold text-slate-800 uppercase tracking-tight">
                        {record ? 'Editar Registro MMPP' : 'Nuevo Registro MMPP'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors border border-transparent hover:border-gray-300 text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Operador CCTV</label>
                            <input 
                                type="text" 
                                value={form.operador_cctv}
                                onChange={(e) => setForm({...form, operador_cctv: e.target.value.toUpperCase()})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase font-semibold text-sm text-slate-600"
                                placeholder="NOMBRE DEL OPERADOR"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Empresa</label>
                            <select 
                                value={form.empresa}
                                onChange={(e) => setForm({...form, empresa: e.target.value, origen: '', destino: ''})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-semibold text-sm"
                            >
                                <option value="DANPER">DANPER</option>
                                <option value="ESCOSAC">ESCOSAC</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Materia Prima</label>
                            <select 
                                value={form.materia_prima}
                                onChange={(e) => setForm({...form, materia_prima: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-semibold text-sm"
                                required
                            >
                                <option value="">SELECCIONE...</option>
                                <option value="ARANDANO">ARANDANO</option>
                                <option value="PIMIENTO">PIMIENTO</option>
                                <option value="UVA">UVA</option>
                                <option value="ESPARRAGO">ESPARRAGO</option>
                            </select>
                        </div>

                        {/* Origin & Destination */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Origen</label>
                            <select 
                                value={form.origen}
                                onChange={(e) => setForm({...form, origen: e.target.value, destino: ''})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-semibold text-sm uppercase"
                                required
                            >
                                <option value="">SELECCIONE...</option>
                                {availableOrigins.map((o: string) => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Destino</label>
                            <select 
                                value={form.destino}
                                onChange={(e) => setForm({...form, destino: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-semibold text-sm uppercase"
                                required
                            >
                                <option value="">SELECCIONE...</option>
                                {availableDestinations.map((d: string) => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Frecuencia</label>
                            <select 
                                value={form.frecuencia}
                                onChange={(e) => setForm({...form, frecuencia: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-semibold text-sm"
                            >
                                <option value="EN LINEA">EN LINEA</option>
                                <option value="INTERMITENTE">INTERMITENTE</option>
                            </select>
                        </div>

                        {/* Timing */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Fecha/Hora Origen</label>
                            <input 
                                type="datetime-local" 
                                value={form.fecha_hora_origen}
                                onChange={(e) => setForm({...form, fecha_hora_origen: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-semibold text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Inicio Monitoreo</label>
                            <input 
                                type="datetime-local" 
                                value={form.inicio_monitoreo}
                                onChange={(e) => setForm({...form, inicio_monitoreo: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-semibold text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Transportista</label>
                            <select 
                                value={form.transportista}
                                onChange={(e) => handleTransportistaChange(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-semibold text-sm uppercase"
                                required
                            >
                                <option value="">SELECCIONE...</option>
                                {mmppState.empresas.map(e => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
                            </select>
                        </div>

                        {/* Driver Info */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Placa</label>
                            <select 
                                value={form.placa}
                                onChange={(e) => setForm({...form, placa: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase font-semibold text-sm text-slate-600"
                                required
                            >
                                <option value="">SELECCIONE...</option>
                                {availablePlacas.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Conductor</label>
                            <select 
                                value={form.conductor}
                                onChange={(e) => handleConductorChange(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase font-semibold text-sm text-slate-600"
                                required
                            >
                                <option value="">SELECCIONE...</option>
                                {availableConductores.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Celular Conductor</label>
                            <input 
                                type="text" 
                                value={form.celular_conductor}
                                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none font-semibold text-sm text-slate-600"
                                readOnly
                            />
                        </div>

                        {/* Quantities */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Parihuelas / Pallets</label>
                            <input 
                                type="number" 
                                value={form.parihuelas_pallets}
                                onChange={(e) => setForm({...form, parihuelas_pallets: parseInt(e.target.value) || 0})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-semibold text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Jabas / Bines</label>
                            <input 
                                type="number" 
                                value={form.jabas_bines}
                                onChange={(e) => setForm({...form, jabas_bines: parseInt(e.target.value) || 0})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-semibold text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Peso Neto/Bruto (KG)</label>
                            <input 
                                type="number" 
                                value={form.peso_neto_bruto}
                                onChange={(e) => setForm({...form, peso_neto_bruto: parseFloat(e.target.value) || 0})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-semibold text-sm"
                            />
                        </div>

                        {/* Resguardo & Status */}
                        <div className="flex items-center gap-2 pt-6">
                            <input 
                                type="checkbox" 
                                id="resguardo"
                                checked={form.resguardo}
                                onChange={(e) => setForm({...form, resguardo: e.target.checked})}
                                className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                            />
                            <label htmlFor="resguardo" className="text-xs font-semibold text-slate-700 uppercase tracking-wide cursor-pointer select-none">Resguardo (SI/NO)</label>
                        </div>

                        {form.resguardo && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Nombre Resguardo</label>
                                <input 
                                    type="text" 
                                    value={form.nombre_resguardo}
                                    onChange={(e) => setForm({...form, nombre_resguardo: e.target.value.toUpperCase()})}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase font-semibold text-sm"
                                />
                            </div>
                        )}

                        {record && (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Fecha/Hora Llegada</label>
                                    <input 
                                        type="datetime-local" 
                                        value={form.fecha_hora_llegada}
                                        onChange={(e) => setForm({
                                            ...form, 
                                            fecha_hora_llegada: e.target.value,
                                            estado: e.target.value ? 'FINALIZADO' : form.estado
                                        })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-semibold text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 tracking-wide">Estado</label>
                                    <select 
                                        value={form.estado}
                                        onChange={(e) => setForm({...form, estado: e.target.value})}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500/10 outline-none font-bold text-sm transition-colors ${
                                            form.estado === 'FINALIZADO' ? 'border-green-300 bg-green-50 text-green-700' :
                                            form.estado === 'EN RUTA' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                                            'border-red-300 bg-red-50 text-red-700'
                                        }`}
                                    >
                                        <option value="EN RUTA">EN RUTA</option>
                                        <option value="FINALIZADO">FINALIZADO</option>
                                        <option value="CANCELADO">CANCELADO</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-gray-200">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-5 py-2 text-slate-500 font-semibold text-[10px] uppercase tracking-widest hover:bg-gray-100 rounded-lg border border-transparent hover:border-gray-200 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-[#ff0000] text-white font-semibold text-[10px] uppercase tracking-widest rounded-lg hover:bg-[#cc0000] border border-red-600 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {record ? 'Guardar Cambios' : 'Registrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
