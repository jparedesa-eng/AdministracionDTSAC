import { useState, useEffect, useMemo } from 'react';
import {
    Truck, Plus, Search, MapPin, Clock,
    Edit2, Trash2, CheckCircle2,
    AlertCircle, Timer, Fuel, User,
    ArrowRight, Map as MapIcon, RotateCcw,
    LayoutGrid, List, Package
} from 'lucide-react';
import type { MMPPRecord } from '../../store/monitoreoMMPPStore';
import {
    getMMPPState, subscribeMMPP, fetchMMPPRecords,
    deleteMMPPRecord, fetchMMPPRouteTimes
} from '../../store/monitoreoMMPPStore';
import { MMPPFormModal } from './MMPPFormModal';
import { UbicacionModal } from './UbicacionModal';

export const MonitoreoMMPP: React.FC = () => {
    const [state, setState] = useState(getMMPPState());
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isUbicacionOpen, setIsUbicacionOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<MMPPRecord | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filterStatus, setFilterStatus] = useState('ALL');

    useEffect(() => {
        const unsubscribe = subscribeMMPP(() => setState({ ...getMMPPState() }));
        fetchMMPPRecords();
        fetchMMPPRouteTimes();
        return () => unsubscribe();
    }, []);

    const filteredRecords = useMemo(() => {
        return state.records.filter(r => {
            const matchesSearch =
                r.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.conductor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.materia_prima.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.origen.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.destino.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = filterStatus === 'ALL' || r.estado === filterStatus;

            return matchesSearch && matchesStatus;
        });
    }, [state.records, searchTerm, filterStatus]);

    const handleEdit = (record: MMPPRecord) => {
        setSelectedRecord(record);
        setIsFormOpen(true);
    };

    const handleReportLocation = (record: MMPPRecord) => {
        setSelectedRecord(record);
        setIsUbicacionOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Está seguro de eliminar este registro de monitoreo?')) return;
        try {
            await deleteMMPPRecord(id);
        } catch (error) {
            console.error("Error deleting record:", error);
        }
    };

    const calculateTimeDiff = (start: string, end: string) => {
        if (!start || !end) return '-';
        const s = new Date(start);
        const e = new Date(end);
        const diffMs = e.getTime() - s.getTime();
        if (diffMs < 0) return 'Error';

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'EN RUTA': return <Truck className="w-4 h-4 text-blue-600" />;
            case 'FINALIZADO': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
            case 'CANCELADO': return <AlertCircle className="w-4 h-4 text-red-600" />;
            default: return <Clock className="w-4 h-4 text-gray-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'EN RUTA': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'FINALIZADO': return 'bg-green-100 text-green-700 border-green-200';
            case 'CANCELADO': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="p-8 min-h-screen bg-gray-50/50">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-2">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Monitoreo de Materia Prima
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">Seguimiento en tiempo real de unidades de campo</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setSelectedRecord(null); setIsFormOpen(true); }}
                        className="group flex items-center gap-2 px-4 py-2 bg-[#ff0000] text-white text-sm font-bold rounded-xl hover:bg-[#cc0000] transition-all hover:-translate-y-0.5 active:scale-95 border border-red-600 shadow-sm"
                    >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                        Nuevo Registro
                    </button>
                    <button
                        onClick={() => fetchMMPPRecords()}
                        className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 shadow-sm transition-all active:scale-90"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Stats & Filters Row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                {/* Search Bar */}
                <div className="lg:col-span-2 relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400 group-focus-within:text-[#ff0000] transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Placa, conductor, origen o materia prima..."
                        className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl leading-5 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 shadow-sm transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Status Filter */}
                <div className="bg-white border border-slate-200 p-1 rounded-xl flex shadow-sm">
                    {['ALL', 'EN RUTA', 'FINALIZADO'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition-all ${filterStatus === s
                                ? 'bg-[#ff0000] text-white shadow-sm'
                                : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            {s === 'ALL' ? 'TODOS' : s}
                        </button>
                    ))}
                </div>

                {/* View Switcher */}
                <div className="bg-white border border-slate-200 p-1 rounded-xl flex shadow-sm lg:w-fit">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#ff0000] text-white shadow-xs' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#ff0000] text-white shadow-xs' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content Section */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredRecords.map((record) => (
                        <div key={record.id} className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-[#ff0000]/50 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full uppercase">
                            {/* Card Header */}
                            <div className="p-5 pb-3">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center font-bold text-white text-base tracking-wider border border-gray-700">
                                            {record.placa.slice(0, 3)}-{record.placa.slice(3)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider border uppercase ${getStatusColor(record.estado)}`}>
                                                    {getStatusIcon(record.estado)}
                                                    {record.estado}
                                                </span>
                                            </div>
                                            <p className="text-slate-400 text-[10px] font-medium mt-0.5 uppercase tracking-tight flex items-center gap-1">
                                                <User className="w-2.5 h-2.5" />
                                                {record.conductor.split(' ')[0]}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdit(record)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-[#ff0000] hover:text-white transition-all border border-gray-100">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(record.id)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-black hover:text-white transition-all border border-gray-100">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Route Info */}
                                    <div className="flex items-center justify-between gap-2 p-4 bg-slate-50 rounded-2xl border border-gray-200">
                                        <div className="text-center flex-1">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Origen</p>
                                            <p className="text-sm font-bold text-slate-700 truncate">{record.origen}</p>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <ArrowRight className="w-4 h-4 text-red-400" />
                                            <span className="text-[9px] font-bold text-red-400 uppercase tracking-tighter">TRANSITO</span>
                                        </div>
                                        <div className="text-center flex-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Destino</p>
                                            <p className="text-sm font-bold text-slate-700 truncate">{record.destino}</p>
                                        </div>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white border border-gray-200 p-3 rounded-xl flex items-center gap-3">
                                            <div className="w-8 h-8 bg-red-50 text-[#ff0000] rounded-lg flex items-center justify-center shrink-0 border border-red-100">
                                                <Package className="w-4 h-4" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">MATERIA PRIMA</p>
                                                <p className="text-xs font-bold text-slate-700 truncate">{record.materia_prima}</p>
                                            </div>
                                        </div>
                                        <div className="bg-white border border-gray-200 p-3 rounded-xl flex items-center gap-3">
                                            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0 border border-emerald-100">
                                                <Fuel className="w-4 h-4" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">PESO (KG)</p>
                                                <p className="text-xs font-bold text-slate-700">{record.peso_neto_bruto.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer */}
                            <div className="mt-auto p-4 bg-slate-50 border-t border-gray-200 space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-[11px] font-bold text-slate-500">
                                            {record.estado === 'LLEGADO'
                                                ? calculateTimeDiff(record.fecha_hora_origen, record.fecha_hora_llegada)
                                                : calculateTimeDiff(record.fecha_hora_origen, new Date().toISOString())
                                            }
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded-lg">
                                        <MapPin className="w-3 h-3 text-[#ff0000]" />
                                        <span className="text-[9px] font-bold text-slate-600 truncate max-w-[80px]">
                                            {record.ubicaciones && record.ubicaciones.length > 0
                                                ? record.ubicaciones[record.ubicaciones.length - 1].ubicacion
                                                : (record.estado === 'LLEGADO' ? record.destino : 'INICIO')}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleReportLocation(record)}
                                    disabled={record.estado === 'FINALIZADO' || record.estado === 'CANCELADO'}
                                    className="w-full py-2.5 bg-white border border-[#ff0000]/20 text-[#ff0000] font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#ff0000] hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-[#ff0000]"
                                >
                                    Reportar Ubicación
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-300 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 border-b border-slate-800">
                                <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest">Placa/Unidad</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest">Origen/Destino</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest">Materia Prima</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest text-center">T. Recorrido</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest text-right">Ubicación</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredRecords.map((record) => (
                                <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="px-3 py-1.5 bg-slate-900 text-white font-bold rounded-lg text-sm tracking-widest border border-gray-700">
                                                {record.placa}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">{record.conductor}</p>
                                                <p className="text-[10px] font-medium text-slate-400">{record.celular_conductor}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border uppercase ${getStatusColor(record.estado)}`}>
                                            {getStatusIcon(record.estado)}
                                            {record.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-slate-700">{record.origen}</span>
                                            <ArrowRight className="w-4 h-4 text-slate-300" />
                                            <span className="text-sm font-bold text-slate-700">{record.destino}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 uppercase">{record.materia_prima}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{record.peso_neto_bruto.toLocaleString()} KG</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 border border-gray-200">
                                            <Timer className="w-3.5 h-3.5" />
                                            {record.estado === 'LLEGADO'
                                                ? calculateTimeDiff(record.fecha_hora_origen, record.fecha_hora_llegada)
                                                : calculateTimeDiff(record.fecha_hora_origen, new Date().toISOString())
                                            }
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-[#ff0000] rounded-lg text-xs font-bold border border-red-100">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {record.ubicaciones && record.ubicaciones.length > 0
                                                ? record.ubicaciones[record.ubicaciones.length - 1].ubicacion
                                                : (record.estado === 'FINALIZADO' ? record.destino : 'ORIGEN')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => handleReportLocation(record)}
                                                disabled={record.estado === 'FINALIZADO'}
                                                className="p-2 text-[#ff0000] hover:bg-red-50 rounded-xl transition-all disabled:opacity-30 border border-transparent hover:border-red-100"
                                            >
                                                <MapIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleEdit(record)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-gray-200">
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDelete(record.id)} className="p-2 text-black hover:bg-gray-100 rounded-xl transition-all border border-transparent hover:border-gray-200">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modals */}
            <MMPPFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                record={selectedRecord}
            />
            <UbicacionModal
                isOpen={isUbicacionOpen}
                onClose={() => setIsUbicacionOpen(false)}
                recordId={selectedRecord?.id || null}
            />
        </div>
    );
};
