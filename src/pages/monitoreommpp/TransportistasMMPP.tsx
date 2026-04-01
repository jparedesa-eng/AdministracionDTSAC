import React, { useState, useEffect, useMemo } from 'react';
import { Edit2, Trash2, Plus, Search, Loader2, X, Save, Truck, User, Smartphone, Building2 } from 'lucide-react';
import type { MMPPEmpresa, MMPPVehiculo, MMPPConductor } from '../../store/monitoreoMMPPStore';
import { getMMPPState, subscribeMMPP, fetchMMPPCatalogs, saveMMPPEmpresa, deleteMMPPEmpresa, saveMMPPVehiculo, deleteMMPPVehiculo, saveMMPPConductor, deleteMMPPConductor } from '../../store/monitoreoMMPPStore';

export const TransportistasMMPP: React.FC = () => {
    const [mmppState, setMmppState] = useState(getMMPPState());
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'empresas' | 'vehiculos' | 'conductores'>('empresas');

    // Modals state
    const [isEmpresaModalOpen, setIsEmpresaModalOpen] = useState(false);
    const [editingEmpresa, setEditingEmpresa] = useState<Partial<MMPPEmpresa> | null>(null);

    const [isVehiculoModalOpen, setIsVehiculoModalOpen] = useState(false);
    const [editingVehiculo, setEditingVehiculo] = useState<Partial<MMPPVehiculo> | null>(null);

    const [isConductorModalOpen, setIsConductorModalOpen] = useState(false);
    const [editingConductor, setEditingConductor] = useState<Partial<MMPPConductor> | null>(null);

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeMMPP(() => setMmppState({ ...getMMPPState() }));
        fetchMMPPCatalogs();
        return () => unsubscribe();
    }, []);

    // Derived Lookups
    const getEmpresaNombre = (id: string) => mmppState.empresas.find(e => e.id === id)?.nombre || 'Desconocida';

    // Filters
    const filteredEmpresas = useMemo(() => {
        return mmppState.empresas.filter(e => e.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [mmppState.empresas, searchTerm]);

    const filteredVehiculos = useMemo(() => {
        return mmppState.vehiculos.filter(v => v.placa.toLowerCase().includes(searchTerm.toLowerCase()) || getEmpresaNombre(v.empresa_id).toLowerCase().includes(searchTerm.toLowerCase()));
    }, [mmppState.vehiculos, mmppState.empresas, searchTerm]);

    const filteredConductores = useMemo(() => {
        return mmppState.conductores.filter(c => c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || c.celular.includes(searchTerm) || getEmpresaNombre(c.empresa_id).toLowerCase().includes(searchTerm.toLowerCase()));
    }, [mmppState.conductores, mmppState.empresas, searchTerm]);

    // Handlers
    const handleSaveEmpresa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEmpresa) return;
        setIsSaving(true);
        try {
            await saveMMPPEmpresa(editingEmpresa);
            setIsEmpresaModalOpen(false);
        } catch (error) { alert("Error al guardar empresa"); } 
        finally { setIsSaving(false); }
    };

    const handleSaveVehiculo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVehiculo) return;
        setIsSaving(true);
        try {
            await saveMMPPVehiculo(editingVehiculo);
            setIsVehiculoModalOpen(false);
        } catch (error) { alert("Error al guardar vehiculo"); } 
        finally { setIsSaving(false); }
    };

    const handleSaveConductor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingConductor) return;
        setIsSaving(true);
        try {
            await saveMMPPConductor(editingConductor);
            setIsConductorModalOpen(false);
        } catch (error) { alert("Error al guardar conductor"); } 
        finally { setIsSaving(false); }
    };

    const handleDelete = async (id: string, type: 'empresa' | 'vehiculo' | 'conductor') => {
        if (!confirm(`¿Está seguro de eliminar este registro?`)) return;
        try {
            if (type === 'empresa') await deleteMMPPEmpresa(id);
            if (type === 'vehiculo') await deleteMMPPVehiculo(id);
            if (type === 'conductor') await deleteMMPPConductor(id);
        } catch (error) {
            alert("Error al eliminar. Verifique que no esté siendo usado en otros lugares.");
        }
    };

    return (
        <div className="p-8 min-h-screen bg-gray-50/50 space-y-6">
            {/* HEADER */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Catálogo de Transportistas</h1>
                <p className="mt-1 text-sm text-gray-500">Mantenimiento de Empresas, Vehículos y Conductores MMPP</p>
            </div>

            {/* TABS */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {(['empresas', 'vehiculos', 'conductores'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all capitalize ${
                                activeTab === tab 
                                    ? 'border-red-500 text-red-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab === 'empresas' && <Building2 className="h-5 w-5" />}
                            {tab === 'vehiculos' && <Truck className="h-5 w-5" />}
                            {tab === 'conductores' && <User className="h-5 w-5" />}
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-xs shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={`Buscar ${activeTab}...`}
                        className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-20 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold pointer-events-none uppercase">
                        {activeTab === 'empresas' ? filteredEmpresas.length : activeTab === 'vehiculos' ? filteredVehiculos.length : filteredConductores.length} Res.
                    </div>
                </div>

                <button
                    onClick={() => {
                        if (activeTab === 'empresas') { setEditingEmpresa({ nombre: '' }); setIsEmpresaModalOpen(true); }
                        if (activeTab === 'vehiculos') { setEditingVehiculo({ placa: '', empresa_id: mmppState.empresas[0]?.id || '' }); setIsVehiculoModalOpen(true); }
                        if (activeTab === 'conductores') { setEditingConductor({ nombre: '', celular: '', empresa_id: mmppState.empresas[0]?.id || '' }); setIsConductorModalOpen(true); }
                    }}
                    className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors w-full sm:w-auto justify-center shadow-sm active:scale-95"
                >
                    <Plus className="h-4 w-4" />
                    Añadir {activeTab === 'empresas' ? 'Empresa' : activeTab === 'vehiculos' ? 'Vehículo' : 'Conductor'}
                </button>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                {activeTab === 'empresas' && (
                                    <>
                                        <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">Nombre de Empresa</th>
                                        <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                                    </>
                                )}
                                {activeTab === 'vehiculos' && (
                                    <>
                                        <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">Placa</th>
                                        <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">Empresa Asignada</th>
                                        <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                                    </>
                                )}
                                {activeTab === 'conductores' && (
                                    <>
                                        <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">Conductor</th>
                                        <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">Celular</th>
                                        <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">Empresa Asignada</th>
                                        <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {/* EMPRESAS TAB */}
                            {activeTab === 'empresas' && filteredEmpresas.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4 font-semibold text-gray-900 uppercase">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-gray-400" />
                                            {t.nombre}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => { setEditingEmpresa(t); setIsEmpresaModalOpen(true); }} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(t.id, 'empresa')} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {/* VEHICULOS TAB */}
                            {activeTab === 'vehiculos' && filteredVehiculos.map((v) => (
                                <tr key={v.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="font-mono font-bold bg-gray-100 px-2 py-1 rounded text-gray-700 tracking-wider">
                                            {v.placa}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-600 uppercase">
                                        {getEmpresaNombre(v.empresa_id)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => { setEditingVehiculo(v); setIsVehiculoModalOpen(true); }} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(v.id, 'vehiculo')} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {/* CONDUCTORES TAB */}
                            {activeTab === 'conductores' && filteredConductores.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span className="font-semibold text-gray-900 uppercase">{c.nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Smartphone className="w-4 h-4 text-emerald-500" />
                                            <span className="font-medium text-gray-600">{c.celular}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-600 uppercase">
                                        {getEmpresaNombre(c.empresa_id)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => { setEditingConductor(c); setIsConductorModalOpen(true); }} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(c.id, 'conductor')} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {/* Empty State */}
                            {((activeTab === 'empresas' && filteredEmpresas.length === 0) || 
                              (activeTab === 'vehiculos' && filteredVehiculos.length === 0) || 
                              (activeTab === 'conductores' && filteredConductores.length === 0)) && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 bg-white">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-gray-50 rounded-full">
                                                <Truck className="w-10 h-10 text-gray-200" />
                                            </div>
                                            <span className="text-sm font-medium uppercase tracking-wider">No se encontraron registros</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals from before (Keep them consistent) */}
            {/* Modal: EMPRESAS */}
            {isEmpresaModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-200 shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                {editingEmpresa?.id ? 'Editar Empresa' : 'Nueva Empresa'}
                            </h2>
                            <button onClick={() => setIsEmpresaModalOpen(false)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleSaveEmpresa} className="p-5 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 tracking-wide">Nombre de la Empresa</label>
                                <input type="text" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase font-semibold text-sm" value={editingEmpresa?.nombre || ''} onChange={(e) => setEditingEmpresa({ ...editingEmpresa!, nombre: e.target.value.toUpperCase() })} />
                            </div>
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsEmpresaModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors uppercase">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold text-sm border border-red-700 disabled:opacity-50">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: VEHICULO */}
            {isVehiculoModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-200 shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                {editingVehiculo?.id ? 'Editar Vehículo' : 'Nuevo Vehículo'}
                            </h2>
                            <button onClick={() => setIsVehiculoModalOpen(false)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleSaveVehiculo} className="p-5 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 tracking-wide">Placa</label>
                                <input type="text" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase font-semibold text-sm" value={editingVehiculo?.placa || ''} onChange={(e) => setEditingVehiculo({ ...editingVehiculo!, placa: e.target.value.toUpperCase() })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 tracking-wide">Empresa</label>
                                <select required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase font-semibold text-sm" value={editingVehiculo?.empresa_id || ''} onChange={(e) => setEditingVehiculo({ ...editingVehiculo!, empresa_id: e.target.value })}>
                                    <option value="" disabled>SELECCIONAR EMPRESA...</option>
                                    {mmppState.empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsVehiculoModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors uppercase">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold text-sm border border-red-700 disabled:opacity-50">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: CONDUCTOR */}
            {isConductorModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-200 shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                {editingConductor?.id ? 'Editar Conductor' : 'Nuevo Conductor'}
                            </h2>
                            <button onClick={() => setIsConductorModalOpen(false)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleSaveConductor} className="p-5 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 tracking-wide">Nombre (Nombre Apellidos)</label>
                                <input type="text" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase font-semibold text-sm" value={editingConductor?.nombre || ''} onChange={(e) => setEditingConductor({ ...editingConductor!, nombre: e.target.value.toUpperCase() })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 tracking-wide">Celular</label>
                                <input type="text" required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-semibold text-sm" value={editingConductor?.celular || ''} onChange={(e) => setEditingConductor({ ...editingConductor!, celular: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 tracking-wide">Empresa</label>
                                <select required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase font-semibold text-sm" value={editingConductor?.empresa_id || ''} onChange={(e) => setEditingConductor({ ...editingConductor!, empresa_id: e.target.value })}>
                                    <option value="" disabled>SELECCIONAR EMPRESA...</option>
                                    {mmppState.empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsConductorModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors uppercase">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold text-sm border border-red-700 disabled:opacity-50">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
