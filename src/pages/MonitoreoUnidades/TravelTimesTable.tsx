import React, { useState, useEffect, useMemo } from 'react';
import { Search, Truck, Ship, Plane, Navigation2, Plus, PencilLine, Power } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import type { ToastState } from '../../components/ui/Toast';
import {
    getTravelTimesState,
    subscribeTravelTimes,
    createTravelTime,
    updateTravelTime,
    fetchTravelTimes,
    type TravelTime
} from '../../store/travelTimesStore';

export const TravelTimesTable: React.FC = () => {
    // Subscription State
    const [, setVersion] = useState(0);
    useEffect(() => {
        fetchTravelTimes().catch(console.error); // Initial fetch
        const unsubscribe = subscribeTravelTimes(() => setVersion(v => v + 1));
        return () => { unsubscribe(); };
    }, []);
    const { travelTimes } = getTravelTimesState();

    // Local UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<ToastState>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<TravelTime | null>(null);

    // Status Modal
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [statusItem, setStatusItem] = useState<TravelTime | null>(null);

    // Form Data
    const [formData, setFormData] = useState({
        proceso: 'CONSERVA',
        origen: '',
        destino: '',
        origen_lat: '',
        origen_lng: '',
        destino_lat: '',
        destino_lng: '',
        min_time: '',
        max_time: '',
        tipo_envio: 'TERRESTRE',
        tipo_viaje: 'REGULAR',
    });

    // Filtering
    const filteredRoutes = useMemo(() => {
        return travelTimes.filter(r =>
            r.origen.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.destino.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.proceso.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [travelTimes, searchTerm]);

    const handleOpen = (item?: TravelTime) => {
        if (item) {
            setEditItem(item);
            setFormData({
                proceso: item.proceso,
                origen: item.origen,
                destino: item.destino,
                origen_lat: item.origen_lat || '',
                origen_lng: item.origen_lng || '',
                destino_lat: item.destino_lat || '',
                destino_lng: item.destino_lng || '',
                min_time: item.min_time,
                max_time: item.max_time,
                tipo_envio: item.tipo_envio,
                tipo_viaje: item.tipo_viaje,
            });
        } else {
            setEditItem(null);
            setFormData({
                proceso: 'CONSERVA',
                origen: '',
                destino: '',
                origen_lat: '',
                origen_lng: '',
                destino_lat: '',
                destino_lng: '',
                min_time: '',
                max_time: '',
                tipo_envio: 'TERRESTRE',
                tipo_viaje: 'REGULAR',
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.proceso || !formData.origen || !formData.destino) {
            setToast({ type: 'error', message: 'Completa los campos obligatorios.' });
            return;
        }

        try {
            if (editItem) {
                await updateTravelTime(editItem.id, {
                    ...formData,
                    active: editItem.active
                });
                setToast({ type: 'success', message: 'Registro actualizado.' });
            } else {
                await createTravelTime({
                    ...formData,
                    active: true
                });
                setToast({ type: 'success', message: 'Registro creado.' });
            }
            setModalOpen(false);
        } catch (err: any) {
            setToast({ type: 'error', message: err.message || 'Error al guardar.' });
        }
    };

    const handleStatusClick = (item: TravelTime) => {
        setStatusItem(item);
        setStatusModalOpen(true);
    };

    const handleConfirmStatus = async () => {
        if (!statusItem) return;
        try {
            await updateTravelTime(statusItem.id, { active: !statusItem.active });
            setToast({ type: 'success', message: `Registro ${statusItem.active ? 'desactivado' : 'activado'}.` });
        } catch (err: any) {
            setToast({ type: 'error', message: err.message || 'Error al cambiar estado.' });
        } finally {
            setStatusModalOpen(false);
            setStatusItem(null);
        }
    };

    const handlePasteGPS = (e: React.ClipboardEvent<HTMLInputElement>, field: 'origen' | 'destino') => {
        const text = e.clipboardData.getData('text');
        // Regex to match "lat, lng" flexible with spaces
        // Example: -8.1307, -79.0205
        const match = text.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);

        if (match) {
            e.preventDefault();
            const [_, lat, __, lng] = match;
            setFormData(prev => ({
                ...prev,
                [`${field}_lat`]: lat,
                [`${field}_lng`]: lng
            }));
            // setToast removed as per user request
        }
    };

    const ORIGIN_OPTIONS = [
        "PLANTA CONSERVA Y CONGELADO",
        "PLANTA FRESCO MUCHIK",
        "PLANTA CONSERVA PEDREGAL"
    ];

    const DESTINATION_OPTIONS = [
        "CALLAO",
        "CHANCAY",
        "PAITA",
        "TUMBES",
        "SALAVERRY",
        "TACNA"
    ];

    const handleTimeInput = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        // Allow only numbers
        const input = e.target.value.replace(/\D/g, '');
        let formatted = input;

        if (input.length > 4) {
            // Maximum 4 digits (HHmm -> HH:mm) + colon = 5 chars
            // But raw input is just digits, so we limit to 4 digits
            formatted = input.slice(0, 4);
        } else {
            formatted = input;
        }

        // Auto-insert colon
        if (formatted.length > 2) {
            formatted = formatted.slice(0, 2) + ':' + formatted.slice(2);
        }

        setFormData({ ...formData, [field]: formatted });
    };

    const handleCoordInput = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const value = e.target.value;
        if (/^-?[0-9.]*$/.test(value)) {
            setFormData({ ...formData, [field]: value });
        }
    };

    const getEnvioIcon = (tipo: string) => {
        switch (tipo) {
            case 'MARITIMO': return <Ship size={14} className="text-blue-500" />;
            case 'AEREO': return <Plane size={14} className="text-sky-400" />;
            case 'BIMODAL': return <Navigation2 size={14} className="text-purple-500" />;
            default: return <Truck size={14} className="text-slate-500" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-20">
            <Toast toast={toast} onClose={() => setToast(null)} />

            <div className="flex items-center justify-between gap-4 px-1">
                <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estándares Operativos</p>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Tiempos de Viaje</h2>
                </div>
                <button
                    onClick={() => handleOpen()}
                    className="flex items-center gap-2 bg-[#ff0000] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Registro
                </button>
            </div>

            <div className="flex flex-col gap-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por origen, destino o proceso..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-slate-400 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Proceso</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Punto Origen</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Punto Destino</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Min (HH:mm)</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Max (HH:mm)</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Transporte</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Prioridad</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRoutes.map((route) => (
                                    <tr key={route.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-3 align-middle">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-black rounded uppercase tracking-wider whitespace-nowrap">{route.proceso}</span>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-xs font-bold text-slate-600 uppercase whitespace-nowrap">{route.origen}</td>
                                        <td className="px-4 py-3 align-middle text-xs font-bold text-slate-600 uppercase whitespace-nowrap">{route.destino}</td>
                                        <td className="px-4 py-3 align-middle text-xs font-black text-slate-900 whitespace-nowrap">{route.min_time}</td>
                                        <td className="px-4 py-3 align-middle text-xs font-black text-red-600 whitespace-nowrap">{route.max_time}</td>
                                        <td className="px-4 py-3 align-middle">
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                {getEnvioIcon(route.tipo_envio)}
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">{route.tipo_envio}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-[10px] font-black uppercase text-slate-400 whitespace-nowrap">
                                            {route.tipo_viaje === 'EXPRESS' ? <span className="text-amber-600">EXPRESS</span> : 'REGULAR'}
                                        </td>
                                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tighter ${route.active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                                {route.active ? "ACTIVO" : "INACTIVO"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => handleStatusClick(route)}
                                                    className={`p-1 rounded transition-colors ${route.active ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                                    title={route.active ? "Desactivar" : "Activar"}
                                                >
                                                    <Power className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpen(route)}
                                                    className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                    title="Editar"
                                                >
                                                    <PencilLine className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRoutes.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-8 text-center text-gray-400 text-xs italic">
                                            No se encontraron registros.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editItem ? "Editar Ruta" : "Nueva Ruta"}
                size="lg"
            >
                <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Proceso *</label>
                            <select
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none"
                                value={formData.proceso}
                                onChange={e => setFormData({ ...formData, proceso: e.target.value })}
                            >
                                <option value="CONSERVA">Conserva</option>
                                <option value="CONGELADO">Congelado</option>
                                <option value="FRESCO">Fresco</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo Envío</label>
                            <select
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none"
                                value={formData.tipo_envio}
                                onChange={e => setFormData({ ...formData, tipo_envio: e.target.value })}
                            >
                                <option value="TERRESTRE">Terrestre</option>
                                <option value="MARITIMO">Marítimo</option>
                                <option value="AEREO">Aéreo</option>
                                <option value="BIMODAL">Bimodal</option>
                            </select>
                        </div>
                    </div>

                    {/* Origen Section */}
                    <div className="space-y-2 pb-2 border-b border-gray-100">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mt-2">Origen</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Nombre Punto Origen *</label>
                                <select
                                    className="w-full h-10 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none"
                                    value={formData.origen}
                                    onChange={e => setFormData({ ...formData, origen: e.target.value })}
                                >
                                    <option value="">Seleccionar Origen...</option>
                                    {ORIGIN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Latitud Origin</label>
                                    <input
                                        type="text"
                                        className="w-full h-10 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none"
                                        value={formData.origen_lat}
                                        onChange={e => handleCoordInput(e, 'origen_lat')}
                                        onPaste={(e) => handlePasteGPS(e, 'origen')}
                                        placeholder="-8.13..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Longitud Origin</label>
                                    <input
                                        type="text"
                                        className="w-full h-10 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none"
                                        value={formData.origen_lng}
                                        onChange={e => handleCoordInput(e, 'origen_lng')}
                                        onPaste={(e) => handlePasteGPS(e, 'origen')}
                                        placeholder="-79.01..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Destino Section */}
                    <div className="space-y-2 pb-2 border-b border-gray-100">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mt-2">Destino</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Nombre Punto Destino *</label>
                                <input
                                    list="destination-options"
                                    type="text"
                                    className="w-full h-10 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none"
                                    value={formData.destino}
                                    onChange={e => setFormData({ ...formData, destino: e.target.value })}
                                    placeholder="Seleccionar o escribir..."
                                />
                                <datalist id="destination-options">
                                    {DESTINATION_OPTIONS.map(opt => <option key={opt} value={opt} />)}
                                </datalist>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Latitud Destino</label>
                                    <input
                                        type="text"
                                        className="w-full h-10 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none"
                                        value={formData.destino_lat}
                                        onChange={e => handleCoordInput(e, 'destino_lat')}
                                        onPaste={(e) => handlePasteGPS(e, 'destino')}
                                        placeholder="-11.94..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Longitud Destino</label>
                                    <input
                                        type="text"
                                        className="w-full h-10 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none"
                                        value={formData.destino_lng}
                                        onChange={e => handleCoordInput(e, 'destino_lng')}
                                        onPaste={(e) => handlePasteGPS(e, 'destino')}
                                        placeholder="-77.13..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Min Time (HH:mm)</label>
                            <input
                                type="text"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none"
                                value={formData.min_time}
                                onChange={e => handleTimeInput(e, 'min_time')}
                                placeholder="24:00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Time (HH:mm)</label>
                            <input
                                type="text"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none"
                                value={formData.max_time}
                                onChange={e => handleTimeInput(e, 'max_time')}
                                placeholder="26:00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo Viaje</label>
                            <select
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none"
                                value={formData.tipo_viaje}
                                onChange={e => setFormData({ ...formData, tipo_viaje: e.target.value })}
                            >
                                <option value="REGULAR">Regular</option>
                                <option value="EXPRESS">Express</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
                        <button onClick={handleSubmit} className="px-4 py-2 text-sm text-white bg-slate-900 hover:bg-slate-800 rounded-lg">Guardar</button>
                    </div>
                </div>
            </Modal>

            {/* Status Modal */}
            <Modal
                open={statusModalOpen}
                onClose={() => setStatusModalOpen(false)}
                title={statusItem?.active ? "Desactivar Ruta" : "Activar Ruta"}
                size="sm"
            >
                <div>
                    <p className="text-sm text-gray-500 mt-2">
                        ¿Estás seguro que deseas {statusItem?.active ? "desactivar" : "activar"} la ruta <strong>{statusItem?.origen} - {statusItem?.destino}</strong>?
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={() => setStatusModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirmStatus}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${statusItem?.active ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};


