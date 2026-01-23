import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, PencilLine, Power } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import type { ToastState } from '../../components/ui/Toast';
import {
    getDestinationsState,
    subscribeDestinations,
    createDestination,
    updateDestination,
    fetchDestinations,
    type Destination
} from '../../store/destinationStore';
import { getTravelTimesState, subscribeTravelTimes, fetchTravelTimes } from '../../store/travelTimesStore';

export const DestinationsTable: React.FC = () => {
    // Subscription State
    const [, setVersion] = useState(0);
    useEffect(() => {
        fetchDestinations().catch(console.error);
        fetchTravelTimes().catch(console.error);
        const unsub1 = subscribeDestinations(() => setVersion(v => v + 1));
        const unsub2 = subscribeTravelTimes(() => setVersion(v => v + 1));
        return () => { unsub1(); unsub2(); };
    }, []);

    const { destinations } = getDestinationsState();
    const { travelTimes } = getTravelTimesState();

    // Get unique Cities/Zones from TravelMatrix to populate dropdown
    const availableZones = useMemo(() => {
        const zones = new Set<string>();
        travelTimes.forEach(t => {
            if (t.active) zones.add(t.destino);
        });
        return Array.from(zones).sort();
    }, [travelTimes]);

    // Local UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<ToastState>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<Destination | null>(null);

    // Status Modal
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [statusItem, setStatusItem] = useState<Destination | null>(null);

    // Form Data
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        type: 'DESCARGA',
        city_zone: '',
        lat: '',
        lng: ''
    });

    // Filtering
    const filteredItems = useMemo(() => {
        return destinations.filter(d =>
            d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.city_zone.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [destinations, searchTerm]);

    const handleOpen = (item?: Destination) => {
        if (item) {
            setEditItem(item);
            setFormData({
                name: item.name,
                address: item.address || '',
                type: item.type,
                city_zone: item.city_zone,
                lat: item.lat || '',
                lng: item.lng || ''
            });
        } else {
            setEditItem(null);
            setFormData({
                name: '',
                address: '',
                type: 'DESCARGA',
                city_zone: '',
                lat: '',
                lng: ''
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.type || !formData.city_zone) {
            setToast({ type: 'error', message: 'Completa los campos obligatorios.' });
            return;
        }

        try {
            if (editItem) {
                await updateDestination(editItem.id, {
                    ...formData,
                    type: formData.type as 'DESCARGA' | 'MUESTRAS',
                    active: editItem.active
                });
                setToast({ type: 'success', message: 'Destino actualizado.' });
            } else {
                await createDestination({
                    ...formData,
                    type: formData.type as 'DESCARGA' | 'MUESTRAS',
                    active: true
                });
                setToast({ type: 'success', message: 'Destino creado.' });
            }
            setModalOpen(false);
        } catch (err: any) {
            setToast({ type: 'error', message: err.message || 'Error al guardar.' });
        }
    };

    const handleStatusClick = (item: Destination) => {
        setStatusItem(item);
        setStatusModalOpen(true);
    };

    const handleConfirmStatus = async () => {
        if (!statusItem) return;
        try {
            await updateDestination(statusItem.id, { active: !statusItem.active });
            setToast({ type: 'success', message: `Destino ${statusItem.active ? 'desactivado' : 'activado'}.` });
        } catch (err: any) {
            setToast({ type: 'error', message: err.message || 'Error al cambiar estado.' });
        } finally {
            setStatusModalOpen(false);
            setStatusItem(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-20">
            <Toast toast={toast} onClose={() => setToast(null)} />

            <div className="flex items-center justify-between gap-4 px-1">
                <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuración</p>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Lugares de Destino</h2>
                </div>
                <button
                    onClick={() => handleOpen()}
                    className="flex items-center gap-2 bg-[#ff0000] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Lugar
                </button>
            </div>

            <div className="flex flex-col gap-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o zona..."
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
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre Lugar</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Zona / Ciudad</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Dirección</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">GPS</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Estado</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-3 align-middle text-xs font-bold text-slate-700 uppercase">{item.name}</td>
                                        <td className="px-4 py-3 align-middle">
                                            <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wider whitespace-nowrap ${item.type === 'DESCARGA' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-xs font-bold text-slate-600 uppercase">{item.city_zone}</td>
                                        <td className="px-4 py-3 align-middle text-[10px] text-slate-500 uppercase max-w-[200px] truncate" title={item.address}>{item.address || '-'}</td>
                                        <td className="px-4 py-3 align-middle text-[10px] font-mono text-slate-400 whitespace-nowrap">
                                            {item.lat && item.lng ? `${item.lat}, ${item.lng}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tighter ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                                {item.active ? "ACTIVO" : "INACTIVO"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => handleStatusClick(item)}
                                                    className={`p-1 rounded transition-colors ${item.active ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                                    title={item.active ? "Desactivar" : "Activar"}
                                                >
                                                    <Power className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpen(item)}
                                                    className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                    title="Editar"
                                                >
                                                    <PencilLine className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-400 text-xs italic">
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
                title={editItem ? "Editar Lugar" : "Nuevo Lugar"}
                size="md"
            >
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Zona / Ciudad (Ruta) *</label>
                        <select
                            className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none uppercase"
                            value={formData.city_zone}
                            onChange={e => setFormData({ ...formData, city_zone: e.target.value })}
                        >
                            <option value="">Seleccionar Zona...</option>
                            {availableZones.map(z => (
                                <option key={z} value={z}>{z}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">
                            Solo aparecen zonas activas en la Matriz de Tiempos.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del Lugar *</label>
                        <input
                            type="text"
                            className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none uppercase"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                            placeholder="EJ: ALMACÉN FRIGORÍFICO..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo *</label>
                        <select
                            className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none"
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="DESCARGA">Descarga</option>
                            <option value="MUESTRAS">Muestras</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Dirección</label>
                        <input
                            type="text"
                            className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Dirección física opcional"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Latitud</label>
                            <input
                                type="text"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none"
                                value={formData.lat}
                                onChange={e => setFormData({ ...formData, lat: e.target.value })}
                                placeholder="-12.34..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Longitud</label>
                            <input
                                type="text"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 text-sm px-3 outline-none"
                                value={formData.lng}
                                onChange={e => setFormData({ ...formData, lng: e.target.value })}
                                placeholder="-77.12..."
                            />
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
                title={statusItem?.active ? "Desactivar Lugar" : "Activar Lugar"}
                size="sm"
            >
                <div>
                    <p className="text-sm text-gray-500 mt-2">
                        ¿Estás seguro que deseas {statusItem?.active ? "desactivar" : "activar"} el lugar <strong>{statusItem?.name}</strong>?
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
