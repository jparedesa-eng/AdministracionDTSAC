import React, { useState, useEffect, useMemo } from 'react';
import { Edit2, Trash2, Plus, Search, Loader2, X, Save, Truck, User, Smartphone, CreditCard } from 'lucide-react';
import type { MMPPTransportista } from '../../store/monitoreoMMPPStore';
import { getMMPPState, subscribeMMPP, fetchMMPPTransportistas, saveMMPPTransportista, deleteMMPPTransportista } from '../../store/monitoreoMMPPStore';

export const TransportistasMMPP: React.FC = () => {
    const [mmppState, setMmppState] = useState(getMMPPState());
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransportista, setEditingTransportista] = useState<Partial<MMPPTransportista> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeMMPP(() => setMmppState({ ...getMMPPState() }));
        fetchMMPPTransportistas();
        return () => unsubscribe();
    }, []);

    const filteredTransportistas = useMemo(() => {
        return mmppState.transportistas.filter(t => 
            t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.conductor.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [mmppState.transportistas, searchTerm]);

    const handleOpenModal = (t?: MMPPTransportista) => {
        setEditingTransportista(t || { nombre: '', placa: '', conductor: '', celular: '' });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTransportista) return;
        setIsSaving(true);
        try {
            await saveMMPPTransportista(editingTransportista as MMPPTransportista);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving transportista:", error);
            alert("Error al guardar transportista");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Está seguro de eliminar este transportista?')) return;
        try {
            await deleteMMPPTransportista(id);
        } catch (error) {
            console.error("Error deleting transportista:", error);
            alert("Error al eliminar transportista");
        }
    };

    return (
        <div className="p-8 min-h-screen bg-gray-50/50">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-2">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Catálogo de Transportistas</h1>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Mantenimiento de Vehículos y Conductores MMPP</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 focus-within:text-[#ff0000] transition-colors" />
                        <input 
                            type="text"
                            placeholder="Buscar transportista, placa..."
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
                        Nuevo Transportista
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Transportista</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Vehículo / Placa</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Conductor</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTransportistas.length > 0 ? (
                                filteredTransportistas.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{t.nombre}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="w-4 h-4 text-slate-400" />
                                                <span className="font-mono text-sm font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600 tracking-wider">
                                                    {t.placa}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3 h-3 text-slate-400" />
                                                    <span className="text-sm font-bold text-slate-700 uppercase leading-tight">{t.conductor}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Smartphone className="w-3 h-3 text-green-500/60" />
                                                    <span className="text-[10px] font-black text-slate-400 tracking-wider">{t.celular}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleOpenModal(t)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(t.id)}
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
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 bg-white">
                                        {mmppState.loading ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                                                <span className="text-sm font-medium">Cargando transportistas...</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <Truck className="w-12 h-12 text-slate-200" />
                                                <span className="text-sm uppercase tracking-wider">No se encontraron transportistas</span>
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
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">
                                {editingTransportista?.id ? 'Editar Transportista' : 'Nuevo Transportista'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest leading-none">Nombre del Transportista (Empresa)</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase font-bold text-sm"
                                        value={editingTransportista?.nombre || ''}
                                        onChange={(e) => setEditingTransportista({...editingTransportista!, nombre: e.target.value.toUpperCase()})}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest leading-none">Placa de Vehículo</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase font-bold text-sm"
                                            value={editingTransportista?.placa || ''}
                                            onChange={(e) => setEditingTransportista({...editingTransportista!, placa: e.target.value.toUpperCase()})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest leading-none">Celular del Conductor</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-bold text-sm"
                                            value={editingTransportista?.celular || ''}
                                            onChange={(e) => setEditingTransportista({...editingTransportista!, celular: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest leading-none">Nombre del Conductor</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase font-bold text-sm"
                                        value={editingTransportista?.conductor || ''}
                                        onChange={(e) => setEditingTransportista({...editingTransportista!, conductor: e.target.value.toUpperCase()})}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-xs font-black text-slate-500 hover:bg-slate-50 rounded-xl transition-colors uppercase tracking-widest"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-6 py-2 bg-[#ff0000] text-white rounded-xl hover:bg-red-700 transition-all font-bold text-sm shadow-lg shadow-red-500/20 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Guardar Transportista
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
