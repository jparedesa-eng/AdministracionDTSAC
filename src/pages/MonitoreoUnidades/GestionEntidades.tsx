
import React, { useState, useEffect } from 'react';
import {
    getTransportEntitiesState,
    subscribeTransportEntities,
    fetchAllEntities,
    createOperator,
    updateOperator,
    deleteOperator,
    createProvider,
    updateProvider,
    deleteProvider,
    createUnitCatalog,
    updateUnitCatalog,
    deleteUnitCatalog,
    createDriver,
    updateDriver,
    deleteDriver
} from '../../store/transportEntitiesStore';

import { Toast } from '../../components/ui/Toast';
import type { ToastState } from '../../components/ui/Toast';
import {
    Plus,
    Edit2,
    Trash2,
    Search,
    Truck,
    Users,
    Building2,
    Save,
    X,
    Briefcase
} from 'lucide-react';

type TabType = 'OPERATORS' | 'PROVIDERS' | 'UNITS' | 'DRIVERS';

export default function GestionEntidades() {
    const [activeTab, setActiveTab] = useState<TabType>('OPERATORS');
    const [storeState, setStoreState] = useState(getTransportEntitiesState());
    const [toast, setToast] = useState<ToastState>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form States (One giant state or separate? Separate is cleaner for types)
    const [operatorForm, setOperatorForm] = useState({ name: '', ruc: '', contact: '', active: true });
    const [providerForm, setProviderForm] = useState({ operator_id: '', name: '', ruc: '', address: '', contact: '', active: true });
    const [unitForm, setUnitForm] = useState<{ provider_id: string, plate: string, type: 'TRACTO' | 'SEMIREMOLQUE', brand: string, model: string, year: string, active: boolean }>({ provider_id: '', plate: '', type: 'TRACTO', brand: '', model: '', year: '', active: true });
    const [driverForm, setDriverForm] = useState({ provider_id: '', name: '', dni: '', license: '', phone: '', active: true });

    useEffect(() => {
        fetchAllEntities();
        const unsub = subscribeTransportEntities(() => setStoreState({ ...getTransportEntitiesState() }));
        return () => unsub();
    }, []);

    const handleOpenModal = (editId: string | null = null) => {
        setEditingId(editId);
        setIsModalOpen(true);

        if (editId) {
            // Populate Form
            if (activeTab === 'OPERATORS') {
                const item = storeState.operators.find(i => i.id === editId);
                if (item) setOperatorForm({ name: item.name, ruc: item.ruc, contact: item.contact || '', active: item.active });
            } else if (activeTab === 'PROVIDERS') {
                const item = storeState.providers.find(i => i.id === editId);
                if (item) setProviderForm({ operator_id: item.operator_id, name: item.name, ruc: item.ruc, address: item.address || '', contact: item.contact || '', active: item.active });
            } else if (activeTab === 'UNITS') {
                const item = storeState.units.find(i => i.id === editId);
                if (item) setUnitForm({
                    provider_id: item.provider_id,
                    plate: item.plate,
                    type: item.type,
                    brand: item.brand || '',
                    model: item.model || '',
                    year: item.year?.toString() || '',
                    active: item.active
                });
            } else if (activeTab === 'DRIVERS') {
                const item = storeState.drivers.find(i => i.id === editId);
                if (item) setDriverForm({ provider_id: item.provider_id, name: item.name, dni: item.dni, license: item.license, phone: item.phone || '', active: item.active });
            }
        } else {
            // Reset Form (simpler to just reset all fields or intelligent reset based on tab)
            setOperatorForm({ name: '', ruc: '', contact: '', active: true });
            setProviderForm({ operator_id: '', name: '', ruc: '', address: '', contact: '', active: true });
            setUnitForm({ provider_id: '', plate: '', type: 'TRACTO', brand: '', model: '', year: '', active: true });
            setDriverForm({ provider_id: '', name: '', dni: '', license: '', phone: '', active: true });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (activeTab === 'OPERATORS') {
                if (editingId) await updateOperator(editingId, operatorForm);
                else await createOperator(operatorForm);
            } else if (activeTab === 'PROVIDERS') {
                if (editingId) await updateProvider(editingId, providerForm);
                else await createProvider(providerForm);
            } else if (activeTab === 'UNITS') {
                const payload = { ...unitForm, year: unitForm.year ? parseInt(unitForm.year) : undefined };
                if (editingId) await updateUnitCatalog(editingId, payload);
                else await createUnitCatalog(payload);
            } else if (activeTab === 'DRIVERS') {
                if (editingId) await updateDriver(editingId, driverForm);
                else await createDriver(driverForm);
            }
            setToast({ type: 'success', message: 'Guardado correctamente' });
            setIsModalOpen(false);
        } catch (error: any) {
            setToast({ type: 'error', message: error.message || 'Error al guardar' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este registro?')) return;
        try {
            if (activeTab === 'OPERATORS') await deleteOperator(id);
            else if (activeTab === 'PROVIDERS') await deleteProvider(id);
            else if (activeTab === 'UNITS') await deleteUnitCatalog(id);
            else if (activeTab === 'DRIVERS') await deleteDriver(id);
            setToast({ type: 'success', message: 'Eliminado correctamente' });
        } catch (error: any) {
            setToast({ type: 'error', message: error.message || 'Error al eliminar' });
        }
    };

    // --- Render Helpers ---

    const renderHeader = () => (
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Gestión de Entidades</h1>
                <p className="text-slate-500">Administración de Operadores, Proveedores y Unidades</p>
            </div>

            {/* Counters */}
            <div className="flex gap-4">
                <div className="text-center">
                    <span className="block text-2xl font-bold text-slate-700">{storeState.operators.length}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Operadores</span>
                </div>
                <div className="w-px bg-slate-200 h-8 self-center"></div>
                <div className="text-center">
                    <span className="block text-2xl font-bold text-slate-700">{storeState.providers.length}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Proveedores</span>
                </div>
                <div className="w-px bg-slate-200 h-8 self-center"></div>
                <div className="text-center">
                    <span className="block text-2xl font-bold text-slate-700">{storeState.units.length}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Unidades</span>
                </div>
                <div className="w-px bg-slate-200 h-8 self-center"></div>
                <div className="text-center">
                    <span className="block text-2xl font-bold text-slate-700">{storeState.drivers.length}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Conductores</span>
                </div>
            </div>
        </div>
    );

    const renderTabs = () => (
        <div className="flex gap-2 mb-6 border-b border-slate-200">
            {[
                { id: 'OPERATORS', label: 'Operadores Logísticos', icon: Briefcase },
                { id: 'PROVIDERS', label: 'Proveedores', icon: Building2 },
                { id: 'UNITS', label: 'Unidades', icon: Truck },
                { id: 'DRIVERS', label: 'Conductores', icon: Users },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as TabType); setSearchTerm(''); }}
                    className={`px-4 py-3 flex items-center gap-2 border-b-2 font-medium transition-colors ${activeTab === tab.id
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                </button>
            ))}
        </div>
    );

    const renderTable = () => {
        let columns: { header: string, accessor: (item: any) => React.ReactNode }[] = [];
        let data: any[] = [];

        const filteredFn = (item: any) => JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase());

        if (activeTab === 'OPERATORS') {
            columns = [
                { header: 'Nombre', accessor: (i) => <div className="font-semibold text-slate-900">{i.name}</div> },
                { header: 'RUC', accessor: (i) => i.ruc },
                { header: 'Contacto', accessor: (i) => i.contact || '-' },
                { header: 'Estado', accessor: (i) => i.active ? <span className="text-green-600 font-bold text-xs uppercase bg-green-50 px-2 py-1 rounded">Activo</span> : <span className="text-red-500 font-bold text-xs uppercase bg-red-50 px-2 py-1 rounded">Inactivo</span> }
            ];
            data = storeState.operators.filter(filteredFn);
        } else if (activeTab === 'PROVIDERS') {
            columns = [
                { header: 'Nombre', accessor: (i) => <div className="font-semibold text-slate-900">{i.name}</div> },
                { header: 'Operador', accessor: (i) => storeState.operators.find(o => o.id === i.operator_id)?.name || 'Unknown' },
                { header: 'RUC', accessor: (i) => i.ruc },
                { header: 'Contacto', accessor: (i) => i.contact || '-' },
                { header: 'Estado', accessor: (i) => i.active ? <span className="text-green-600 font-bold text-xs uppercase bg-green-50 px-2 py-1 rounded">Activo</span> : <span className="text-red-500 font-bold text-xs uppercase bg-red-50 px-2 py-1 rounded">Inactivo</span> }
            ];
            data = storeState.providers.filter(filteredFn);
        } else if (activeTab === 'UNITS') {
            columns = [
                { header: 'Placa', accessor: (i) => <div className="font-black text-slate-900">{i.plate}</div> },
                { header: 'Tipo', accessor: (i) => i.type },
                { header: 'Proveedor', accessor: (i) => storeState.providers.find(p => p.id === i.provider_id)?.name || 'Unknown' },
                { header: 'Marca/Modelo', accessor: (i) => `${i.brand || ''} ${i.model || ''}` },
                { header: 'Estado', accessor: (i) => i.active ? <span className="text-green-600 font-bold text-xs uppercase bg-green-50 px-2 py-1 rounded">Activo</span> : <span className="text-red-500 font-bold text-xs uppercase bg-red-50 px-2 py-1 rounded">Inactivo</span> }
            ];
            data = storeState.units.filter(filteredFn);
        } else if (activeTab === 'DRIVERS') {
            columns = [
                { header: 'Nombre', accessor: (i) => <div className="font-semibold text-slate-900">{i.name}</div> },
                { header: 'DNI', accessor: (i) => i.dni },
                { header: 'Licencia', accessor: (i) => i.license },
                { header: 'Proveedor', accessor: (i) => storeState.providers.find(p => p.id === i.provider_id)?.name || 'Unknown' },
                { header: 'Teléfono', accessor: (i) => i.phone || '-' },
                { header: 'Estado', accessor: (i) => i.active ? <span className="text-green-600 font-bold text-xs uppercase bg-green-50 px-2 py-1 rounded">Activo</span> : <span className="text-red-500 font-bold text-xs uppercase bg-red-50 px-2 py-1 rounded">Inactivo</span> }
            ];
            data = storeState.drivers.filter(filteredFn);
        }

        return (
            <div className="bg-white rounded-xl border border-slate-200  overflow-hidden">
                {/* Search Bar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4 justify-between items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        {activeTab === 'OPERATORS' && 'Nuevo Operador'}
                        {activeTab === 'PROVIDERS' && 'Nuevo Proveedor'}
                        {activeTab === 'UNITS' && 'Nueva Unidad'}
                        {activeTab === 'DRIVERS' && 'Nuevo Conductor'}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                {columns.map((c, idx) => (
                                    <th key={idx} className="px-4 py-3">{c.header}</th>
                                ))}
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-400 italic">
                                        No se encontraron registros.
                                    </td>
                                </tr>
                            ) : (
                                data.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                        {columns.map((c, idx) => (
                                            <td key={idx} className="px-4 py-3 align-middle">{c.accessor(item)}</td>
                                        ))}
                                        <td className="px-4 py-3 text-right align-middle">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleOpenModal(item.id)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // --- Modal Content ---

    const renderModalContent = () => {
        if (activeTab === 'OPERATORS') {
            return (
                <>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre</label>
                            <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={operatorForm.name} onChange={e => setOperatorForm({ ...operatorForm, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">RUC</label>
                            <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={operatorForm.ruc} onChange={e => setOperatorForm({ ...operatorForm, ruc: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Contacto</label>
                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={operatorForm.contact} onChange={e => setOperatorForm({ ...operatorForm, contact: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={operatorForm.active} onChange={e => setOperatorForm({ ...operatorForm, active: e.target.checked })} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                <span className="ml-3 text-sm font-medium text-slate-700">Activo</span>
                            </label>
                        </div>
                    </div>
                </>
            );
        } else if (activeTab === 'PROVIDERS') {
            return (
                <>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Operador Logístico</label>
                            <select required className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={providerForm.operator_id} onChange={e => setProviderForm({ ...providerForm, operator_id: e.target.value })}>
                                <option value="">Seleccione...</option>
                                {storeState.operators.filter(o => o.active).map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre</label>
                            <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={providerForm.name} onChange={e => setProviderForm({ ...providerForm, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">RUC</label>
                            <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={providerForm.ruc} onChange={e => setProviderForm({ ...providerForm, ruc: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Dirección</label>
                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={providerForm.address} onChange={e => setProviderForm({ ...providerForm, address: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Contacto</label>
                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={providerForm.contact} onChange={e => setProviderForm({ ...providerForm, contact: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={providerForm.active} onChange={e => setProviderForm({ ...providerForm, active: e.target.checked })} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                <span className="ml-3 text-sm font-medium text-slate-700">Activo</span>
                            </label>
                        </div>
                    </div>
                </>
            );
        } else if (activeTab === 'UNITS') {
            return (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">Proveedor</label>
                            <select required className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={unitForm.provider_id} onChange={e => setUnitForm({ ...unitForm, provider_id: e.target.value })}>
                                <option value="">Seleccione...</option>
                                {storeState.providers.filter(p => p.active).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Placa</label>
                            <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors uppercase" value={unitForm.plate} onChange={e => setUnitForm({ ...unitForm, plate: e.target.value.toUpperCase() })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Tipo</label>
                            <select required className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={unitForm.type} onChange={e => setUnitForm({ ...unitForm, type: e.target.value as any })}>
                                <option value="TRACTO">TRACTO</option>
                                <option value="SEMIREMOLQUE">SEMIREMOLQUE</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Marca</label>
                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={unitForm.brand} onChange={e => setUnitForm({ ...unitForm, brand: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Modelo</label>
                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={unitForm.model} onChange={e => setUnitForm({ ...unitForm, model: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Año</label>
                            <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={unitForm.year} onChange={e => setUnitForm({ ...unitForm, year: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={unitForm.active} onChange={e => setUnitForm({ ...unitForm, active: e.target.checked })} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                <span className="ml-3 text-sm font-medium text-slate-700">Activo</span>
                            </label>
                        </div>
                    </div>
                </>
            );
        } else if (activeTab === 'DRIVERS') {
            return (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">Proveedor</label>
                            <select required className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={driverForm.provider_id} onChange={e => setDriverForm({ ...driverForm, provider_id: e.target.value })}>
                                <option value="">Seleccione...</option>
                                {storeState.providers.filter(p => p.active).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                            <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={driverForm.name} onChange={e => setDriverForm({ ...driverForm, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">DNI</label>
                            <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={driverForm.dni} onChange={e => setDriverForm({ ...driverForm, dni: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Licencia</label>
                            <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={driverForm.license} onChange={e => setDriverForm({ ...driverForm, license: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono</label>
                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 transition-colors" value={driverForm.phone} onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={driverForm.active} onChange={e => setDriverForm({ ...driverForm, active: e.target.checked })} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                <span className="ml-3 text-sm font-medium text-slate-700">Activo</span>
                            </label>
                        </div>
                    </div>
                </>
            );
        }
    };


    return (
        <div className="p-6 max-w-7xl mx-auto">
            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
            {renderHeader()}
            {renderTabs()}



            {renderTable()}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">
                                {editingId ? 'Editar Registro' : 'Nuevo Registro'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6">
                            {renderModalContent()}

                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
