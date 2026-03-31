import React, { useState, useEffect, useMemo } from 'react';
import { Edit2, Trash2, Plus, Search, Loader2, X, Save, Clock } from 'lucide-react';
import type { MMPPRouteTime } from '../../store/monitoreoMMPPStore';
import { getMMPPState, subscribeMMPP, fetchMMPPRouteTimes, saveMMPPRouteTime, deleteMMPPRouteTime } from '../../store/monitoreoMMPPStore';

export const TiemposRutaMMPP: React.FC = () => {
    const [state, setState] = useState(getMMPPState());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState<Partial<MMPPRouteTime> | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeMMPP(() => setState({ ...getMMPPState() }));
        fetchMMPPRouteTimes();
        return () => unsubscribe();
    }, []);

    const filteredRoutes = useMemo(() => {
        return state.routeTimes.filter(r => 
            r.origen.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.destino.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.empresa.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [state.routeTimes, searchTerm]);

    const handleOpenModal = (route?: MMPPRouteTime | null) => {
        setEditingRoute(route || { 
            empresa: 'DANPER', 
            origen: '', 
            destino: '', 
            tiempo_min: 0, 
            tiempo_max: 0,
            tipo_ruta: 'CAMPO' 
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRoute) return;
        setIsSaving(true);
        try {
            await saveMMPPRouteTime(editingRoute as MMPPRouteTime);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving route:", error);
            alert("Error al guardar la ruta");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Está seguro de eliminar este tiempo de ruta?')) return;
        try {
            await deleteMMPPRouteTime(id);
        } catch (error) {
            console.error("Error deleting route:", error);
            alert("Error al eliminar la ruta");
        }
    };

    return (
        <div className="p-8 min-h-screen bg-gray-50/50">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-2">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Configuración de Tiempos de Ruta</h1>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Mantenimiento de Trayectorias y Tiempos Estimados</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-red-500" />
                        <input 
                            type="text"
                            placeholder="Buscar origen, destino o empresa..."
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none w-full sm:w-80 transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#ff0000] text-white rounded-xl hover:bg-red-700 transition-all font-bold text-sm shadow-lg shadow-red-500/20 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Ruta
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Empresa</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Trayectoria</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-center">Tiempos (Min/Max)</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRoutes.length > 0 ? (
                                filteredRoutes.map((route) => (
                                    <tr key={route.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{route.empresa}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-slate-700 uppercase">{route.origen}</span>
                                                <Clock className="w-4 h-4 text-slate-300" />
                                                <span className="font-bold text-slate-700 uppercase">{route.destino}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider border bg-slate-100 text-slate-600 border-slate-200 uppercase">
                                                {route.tipo_ruta}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">{route.tiempo_min}m</span>
                                                <span className="text-slate-300">/</span>
                                                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{route.tiempo_max}m</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleOpenModal(route)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(route.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 bg-white">
                                        {state.loading ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                                                <span className="text-sm font-medium">Cargando rutas...</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <Clock className="w-12 h-12 text-slate-200" />
                                                <span className="text-sm">No se encontraron rutas configuradas</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                {editingRoute?.id ? 'Editar Ruta' : 'Nueva Ruta'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Empresa</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase font-bold text-sm"
                                        value={editingRoute?.empresa || ''}
                                        onChange={(e) => setEditingRoute({...editingRoute!, empresa: e.target.value.toUpperCase()})}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Origen</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase font-bold text-sm"
                                            value={editingRoute?.origen || ''}
                                            onChange={(e) => setEditingRoute({...editingRoute!, origen: e.target.value.toUpperCase()})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Destino</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase font-bold text-sm"
                                            value={editingRoute?.destino || ''}
                                            onChange={(e) => setEditingRoute({...editingRoute!, destino: e.target.value.toUpperCase()})}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Estado Ruta</label>
                                        <select 
                                            required
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-bold text-sm"
                                            value={editingRoute?.tipo_ruta || ''}
                                            onChange={(e) => setEditingRoute({...editingRoute!, tipo_ruta: e.target.value})}
                                        >
                                            <option value="CAMPO">CAMPO</option>
                                            <option value="TALLER">TALLER</option>
                                            <option value="ADMINISTRATIVA">ADMINISTRATIVA</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wide">T. Min (m)</label>
                                            <input 
                                                type="number" 
                                                required
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-bold text-sm"
                                                value={editingRoute?.tiempo_min || 0}
                                                onChange={(e) => setEditingRoute({...editingRoute!, tiempo_min: parseInt(e.target.value)})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wide">T. Max (m)</label>
                                            <input 
                                                type="number" 
                                                required
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-bold text-sm"
                                                value={editingRoute?.tiempo_max || 0}
                                                onChange={(e) => setEditingRoute({...editingRoute!, tiempo_max: parseInt(e.target.value)})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-6 py-2 bg-[#ff0000] text-white rounded-xl hover:bg-red-700 transition-all font-bold text-sm shadow-lg shadow-red-500/20 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Guardar Configuración
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
