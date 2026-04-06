import { useState, useEffect, useMemo } from 'react';
import {
    Truck, Plus, Search, MapPin, Clock,
    Edit2, Trash2, CheckCircle2,
    AlertCircle, X,
    ArrowRight, Map as MapIcon,
    Package, Flag, Phone, Shield
} from 'lucide-react';
import type { MMPPRecord } from '../../store/monitoreoMMPPStore';
import {
    getMMPPState, subscribeMMPP, fetchMMPPRecords,
    deleteMMPPRecord, fetchMMPPRouteTimes
} from '../../store/monitoreoMMPPStore';
import { MMPPFormModal } from './MMPPFormModal';
import { UbicacionModal } from './UbicacionModal';
import { FinalizarModal } from './FinalizarModal';
import { useAuth } from '../../auth/AuthContext';
import { Toast } from '../../components/ui/Toast';
import type { ToastState } from '../../components/ui/Toast';

export const MonitoreoMMPP: React.FC = () => {
    const { profile } = useAuth();
    const [toast, setToast] = useState<ToastState>(null);
    const [state, setState] = useState(getMMPPState());
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isUbicacionOpen, setIsUbicacionOpen] = useState(false);
    const [isFinalizarOpen, setIsFinalizarOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<MMPPRecord | null>(null);
    const [filterStatus, setFilterStatus] = useState('EN RUTA');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({ term: '', start: '', end: '' });
    const [hasAppliedHistory, setHasAppliedHistory] = useState(false);
    const [selectedTripDetails, setSelectedTripDetails] = useState<MMPPRecord | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeMMPP(() => {
            const newState = getMMPPState();
            setState({ ...newState });
            if (selectedTripDetails) {
                const updatedRecord = newState.records.find(r => r.id === selectedTripDetails.id);
                if (updatedRecord) setSelectedTripDetails(updatedRecord);
            }
        });
        fetchMMPPRecords();
        fetchMMPPRouteTimes();
        return () => unsubscribe();
    }, [selectedTripDetails]);

    const parseLocalTime = (dateStr: string) => {
        if (!dateStr) return new Date();
        return new Date(dateStr.replace(/(Z|\+00:00)$/, ''));
    };

    const filteredRecords = useMemo(() => {
        if (!state.records) return [];

        return state.records.filter((r) => {
            if (filterStatus === 'ALL') {
                if (!hasAppliedHistory || (!appliedFilters.start && !appliedFilters.end)) return false;
            }

            const searchT = appliedFilters.term.toLowerCase();
            const matchesSearch = !searchT ||
                r.placa.toLowerCase().includes(searchT) ||
                r.conductor.toLowerCase().includes(searchT) ||
                r.materia_prima.toLowerCase().includes(searchT) ||
                r.origen.toLowerCase().includes(searchT) ||
                r.destino.toLowerCase().includes(searchT);

            const matchesStatus = filterStatus === 'ALL' || r.estado === filterStatus;

            let matchesDate = true;
            if (filterStatus === 'ALL' && (appliedFilters.start || appliedFilters.end)) {
                if (r.fecha_hora_origen) {
                    const rDate = parseLocalTime(r.fecha_hora_origen).getTime();
                    const sDate = appliedFilters.start ? new Date(`${appliedFilters.start}T00:00:00`).getTime() : 0;

                    let eDate = Infinity;
                    if (appliedFilters.end) {
                        const endObj = new Date(`${appliedFilters.end}T23:59:59.999`);
                        eDate = endObj.getTime();
                    }
                    matchesDate = rDate >= sDate && rDate <= eDate;
                } else {
                    matchesDate = false;
                }
            }

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [state.records, filterStatus, appliedFilters, hasAppliedHistory]);

    const handleEdit = (e: React.MouseEvent, record: MMPPRecord) => {
        e.stopPropagation();
        setSelectedRecord(record);
        setIsFormOpen(true);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('¿Está seguro de eliminar este registro de monitoreo?')) return;
        try {
            await deleteMMPPRecord(id);
            if (selectedTripDetails?.id === id) setSelectedTripDetails(null);
            setToast({ type: 'success', message: 'Registro eliminado exitosamente.' });
        } catch (error) {
            console.error("Error deleting record:", error);
            setToast({ type: 'error', message: 'Error al eliminar el registro.' });
        }
    };

    const calculateTimeDiff = (start: string, end: string) => {
        if (!start || !end) return '-';
        const s = parseLocalTime(start);
        const e = end.endsWith('Z') || end.includes('+') ? parseLocalTime(end) : new Date(end);
        const diffMs = e.getTime() - s.getTime();
        if (diffMs < 0) return 'Error';

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}H ${minutes}M`;
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

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = parseLocalTime(dateStr);
        return date.toLocaleString('es-PE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    };

    const isDelayed = (record: MMPPRecord) => {
        if (record.estado !== 'EN RUTA') return false;
        const routeInfo = state.routeTimes.find(rt => rt.origen === record.origen && rt.destino === record.destino);
        if (!routeInfo || !routeInfo.tiempo_max) return false;

        const start = parseLocalTime(record.fecha_hora_origen).getTime();
        const now = new Date().getTime();
        const diffMinutes = (now - start) / (1000 * 60);
        return diffMinutes > routeInfo.tiempo_max;
    };

    return (
        <div className="p-3 min-h-screen bg-gray-50/50 relative">
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
                        className="group flex items-center gap-2 px-4 py-2 bg-[#ff0000] text-white text-sm font-bold rounded-xl hover:bg-[#cc0000] transition-all active:scale-95 border border-red-600"
                    >
                        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                        Nuevo Registro
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 mb-6 bg-white p-3 rounded-xl border border-gray-200 items-end lg:items-center flex-wrap">
                <div className="bg-slate-100 p-1 rounded-lg flex w-full lg:w-auto min-w-[200px] shrink-0">
                    {['EN RUTA', 'ALL'].map((s) => (
                        <button
                            key={s}
                            onClick={() => {
                                setFilterStatus(s);
                                if (s === 'ALL') {
                                    setHasAppliedHistory(false);
                                    const now = new Date();
                                    const end = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                                    const start = new Date(now.getTime() - (now.getTimezoneOffset() * 60000) - (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
                                    setStartDate(start);
                                    setEndDate(end);
                                } else {
                                    setStartDate('');
                                    setEndDate('');
                                    setAppliedFilters({ term: appliedFilters.term, start: '', end: '' });
                                }
                            }}
                            className={`flex-1 py-1.5 px-3 rounded text-[10px] font-bold transition-all uppercase ${filterStatus === s
                                ? 'bg-[#ff0000] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                }`}
                        >
                            {s === 'ALL' ? 'HISTORIAL' : s}
                        </button>
                    ))}
                </div>

                <div className="relative flex-1 min-w-[200px] w-full lg:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-600" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por placa, conductor..."
                        className="block w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500/10 focus:border-red-500 transition-all text-sm h-[38px] placeholder-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setAppliedFilters({ term: searchTerm, start: startDate, end: endDate });
                                if (filterStatus === 'ALL') setHasAppliedHistory(true);
                            }
                        }}
                    />
                </div>

                {filterStatus === 'ALL' && (
                    <div className="w-full lg:w-auto flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden h-[38px] shadow-sm shrink-0">
                        <input
                            type="date"
                            className="w-full lg:w-[140px] px-3 py-2 bg-transparent text-sm font-medium text-gray-600 focus:outline-none focus:bg-white transition-colors"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            title="Fecha Origen (Desde)"
                        />
                        <div className="w-px h-6 bg-gray-300"></div>
                        <input
                            type="date"
                            className="w-full lg:w-[140px] px-3 py-2 bg-transparent text-sm font-medium text-gray-600 focus:outline-none focus:bg-white transition-colors"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            title="Fecha Origen (Hasta)"
                        />
                        <button
                            onClick={() => {
                                setAppliedFilters({ term: searchTerm, start: startDate, end: endDate });
                                setHasAppliedHistory(true);
                            }}
                            className="h-full px-4 bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center cursor-pointer ml-auto border-l border-red-600"
                            title="Buscar en rango de fechas"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                    </div>
                )}

            </div>

            <div className="space-y-4">
                {filteredRecords.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
                        <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <span className="text-sm font-medium uppercase tracking-wider">No se encontraron registros</span>
                    </div>
                ) : (
                    filteredRecords.map((record) => (
                        <div
                            key={record.id}
                            onClick={() => setSelectedTripDetails(record)}
                            className={`relative overflow-hidden bg-white rounded-2xl border transition-all duration-200 flex flex-col lg:flex-row items-center gap-6 group cursor-pointer ${isDelayed(record) ? 'border-red-400 bg-red-50/20 pl-12 py-4 pr-4' : 'border-gray-200 hover:border-[#ff0000]/30 p-4'}`}
                        >
                            {isDelayed(record) && (
                                <div className="absolute left-0 top-0 h-full w-8 bg-[#ff0000] z-20 flex flex-col items-center justify-center text-white">
                                    <div className="flex flex-row items-center justify-center absolute rotate-[-90deg]">
                                        <AlertCircle className="w-3.5 h-3.5 mb-0.5 rotate-90" />
                                        <span className="text-[9px] font-bold tracking-[0.2em] ml-2 uppercase whitespace-nowrap">
                                            RETRASADO
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-4 w-full lg:w-1/4">
                                <div className="w-20 h-14 bg-emerald-800 rounded-xl flex items-center justify-center font-bold text-white text-[13px] tracking-widest border border-slate-700 px-1 shrink-0 shadow-sm">
                                    {record.placa}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-slate-800 truncate capitalize">{record.conductor.toLowerCase()}</h3>
                                    {record.celular_conductor && (
                                        <div className="flex items-center gap-1.5 mt-0.5 mb-1.5">
                                            <Phone className="w-3 h-3 text-slate-400" />
                                            <p className="text-[11px] font-medium text-slate-500 truncate">{record.celular_conductor}</p>
                                        </div>
                                    )}
                                    <div className="flex items-center flex-wrap gap-2 mt-1">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest border uppercase ${getStatusColor(record.estado)}`}>
                                            {getStatusIcon(record.estado)}
                                            {record.estado}
                                        </span>
                                        {record.resguardo && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest border border-amber-200 bg-amber-50 text-amber-600 uppercase">
                                                <Shield className="w-3 h-3" />
                                                Resguardo: {record.nombre_resguardo}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={`flex items-center gap-6 w-full lg:flex-1 p-3 rounded-xl border ${isDelayed(record) ? 'bg-red-50/50 border-red-100' : 'bg-gray-50/50 border-gray-100'}`}>
                                <div className="flex-1 text-center">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Origen</p>
                                    <p className="text-sm font-bold text-slate-700 capitalize">{record.origen.toLowerCase()}</p>
                                    <p className="text-[9px] font-semibold text-slate-400 mt-1">{formatDate(record.fecha_hora_origen)}</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <ArrowRight className="w-4 h-4 text-red-400" />
                                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-tighter mt-1">
                                        {record.estado === 'LLEGADO' || record.estado === 'FINALIZADO'
                                            ? calculateTimeDiff(record.fecha_hora_origen, record.fecha_hora_llegada)
                                            : calculateTimeDiff(record.fecha_hora_origen, new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16))
                                        }
                                    </span>
                                    <span className="text-[9px] font-semibold text-gray-400">
                                        {(record.estado === 'LLEGADO' || record.estado === 'FINALIZADO') ? 'Tiempo Total' : 'Estimado'}
                                    </span>
                                </div>
                                <div className="flex-1 text-center">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Destino</p>
                                    <p className="text-sm font-bold text-slate-700 capitalize">{record.destino.toLowerCase()}</p>
                                    {record.fecha_hora_llegada && record.estado === 'FINALIZADO' && (
                                        <p className="text-[9px] font-semibold text-slate-400 mt-1">{formatDate(record.fecha_hora_llegada)}</p>
                                    )}
                                </div>

                                {record.estado !== 'FINALIZADO' && (
                                    <>
                                        <div className="hidden lg:block w-px h-8 bg-gray-200 mx-2"></div>

                                        <div className="flex flex-col items-center shrink-0">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Ubicación</p>
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-100 rounded-xl">
                                                <MapPin className="w-4 h-4 text-[#ff0000]" />
                                                <span className="text-[11px] font-bold text-gray-700 max-w-[120px] truncate capitalize">
                                                    {record.ubicaciones && record.ubicaciones.length > 0
                                                        ? record.ubicaciones[record.ubicaciones.length - 1].ubicacion.toLowerCase()
                                                        : (record.estado === 'FINALIZADO' ? record.destino.toLowerCase() : 'Origen')}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto shrink-0">
                                <div className="flex flex-col items-start lg:items-end shrink-0">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Materia Prima</p>
                                    <div className="flex items-center gap-1.5">
                                        <Package className="w-3.5 h-3.5 text-gray-400" />
                                        <p className="text-sm font-bold text-slate-700 capitalize">{record.materia_prima.toLowerCase()}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                    {record.usuario_creacion_id === profile?.id ? (
                                        <>
                                            {record.estado !== 'FINALIZADO' && (
                                                <button
                                                    onClick={(e) => handleEdit(e, record)}
                                                    title="Editar Registro"
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleDelete(e, record.id)}
                                                title="Eliminar Registro"
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-[9px] font-bold text-slate-300 uppercase px-2">Lectura</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {selectedTripDetails && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
                        onClick={() => setSelectedTripDetails(null)}
                    />
                    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-0 border-l border-gray-200">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-slate-50 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                                    <Truck className="w-6 h-6 text-[#ff0000]" />
                                    {selectedTripDetails.placa}
                                </h2>
                                <p className="text-base font-semibold text-slate-600 mt-1 truncate max-w-[280px] capitalize">
                                    {selectedTripDetails.conductor.toLowerCase()}
                                </p>
                                {selectedTripDetails.celular_conductor && (
                                    <div className="flex items-center gap-2 mt-1.5 mb-1">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        <p className="text-sm font-medium text-slate-500 truncate">{selectedTripDetails.celular_conductor}</p>
                                    </div>
                                )}
                                {selectedTripDetails.resguardo && (
                                    <div className="flex items-center gap-2 mt-1.5 mb-1">
                                        <Shield className="w-4 h-4 text-amber-500" />
                                        <p className="text-sm font-bold text-amber-600 truncate uppercase tracking-widest">Resguardo: {selectedTripDetails.nombre_resguardo}</p>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedTripDetails(null)}
                                className="p-2 text-slate-400 hover:bg-white hover:text-slate-600 rounded-lg transition-all border border-transparent hover:border-gray-200 shadow-sm"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 relative">
                                <div className="absolute top-4 right-4">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border uppercase ${getStatusColor(selectedTripDetails.estado)}`}>
                                        {getStatusIcon(selectedTripDetails.estado)}
                                        {selectedTripDetails.estado}
                                    </span>
                                </div>

                                <h3 className="text-sm font-bold text-slate-700 mb-4">Ruta</h3>
                                <div className="flex items-start gap-4">
                                    <div className="flex flex-col items-center mt-1">
                                        <div className="w-3 h-3 rounded-full bg-slate-300 border-[3px] border-white shadow-md z-10" />
                                        <div className="w-0.5 h-12 bg-slate-200 my-1" />
                                        <div className="w-3 h-3 rounded-full bg-[#ff0000] border-[3px] border-white shadow-md z-10" />
                                    </div>
                                    <div className="flex-1 space-y-5">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 capitalize">{selectedTripDetails.origen.toLowerCase()}</p>
                                            <p className="text-xs text-slate-500 font-medium">{formatDate(selectedTripDetails.fecha_hora_origen)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 capitalize">{selectedTripDetails.destino.toLowerCase()}</p>
                                            <p className="text-xs text-slate-500 font-medium">{selectedTripDetails.fecha_hora_llegada ? formatDate(selectedTripDetails.fecha_hora_llegada) : 'Pendiente'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-[#ff0000]" />
                                    Carga
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white border border-gray-200 rounded-xl p-3">
                                        <p className="text-xs font-medium text-slate-500">Materia Prima</p>
                                        <p className="text-sm font-semibold text-slate-800 capitalize mt-0.5">{selectedTripDetails.materia_prima.toLowerCase()}</p>
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded-xl p-3">
                                        <p className="text-xs font-medium text-slate-500">Peso Neto/Bruto</p>
                                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedTripDetails.peso_neto_bruto.toLocaleString()} KG</p>
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded-xl p-3">
                                        <p className="text-xs font-medium text-slate-500">Parihuelas/Pallets</p>
                                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedTripDetails.parihuelas_pallets || 0}</p>
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded-xl p-3">
                                        <p className="text-xs font-medium text-slate-500">Jabas/Bines</p>
                                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedTripDetails.jabas_bines || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <MapIcon className="w-4 h-4 text-[#ff0000]" />
                                    Historial de Ubicaciones
                                </h3>

                                {(!selectedTripDetails.ubicaciones || selectedTripDetails.ubicaciones.length === 0) ? (
                                    <div className="text-center p-6 bg-white rounded-xl border border-slate-200 border-dashed">
                                        <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-slate-500">No hay reportes registrados</p>
                                    </div>
                                ) : (
                                    <div className="relative ml-[5px] border-l-[2px] border-slate-200 space-y-5">
                                        {[...selectedTripDetails.ubicaciones]
                                            .sort((a, b) => parseLocalTime(b.timestamp).getTime() - parseLocalTime(a.timestamp).getTime())
                                            .map((ub, idx) => (
                                                <div key={ub.id || idx} className="relative pl-6">
                                                    <div className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-[3px] border-white shadow-md z-10 ${idx === 0 ? 'bg-blue-500' : 'bg-slate-300'}`} />
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800 capitalize leading-snug">{ub.ubicacion.toLowerCase()}</p>
                                                        <p className="text-xs text-slate-500 font-medium">{formatDate(ub.timestamp)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 bg-white space-y-3">
                            {selectedTripDetails.usuario_creacion_id === profile?.id ? (
                                <>
                                    <button
                                        onClick={() => { setSelectedRecord(selectedTripDetails); setIsUbicacionOpen(true); }}
                                        disabled={selectedTripDetails.estado === 'FINALIZADO'}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-[#ff0000] font-semibold text-sm rounded-xl hover:bg-[#ff0000] hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:hover:bg-red-50 disabled:hover:text-[#ff0000] border border-red-100 cursor-pointer"
                                    >
                                        <MapPin className="w-5 h-5" />
                                        Nuevo Reporte de Ubicación
                                    </button>
                                    {selectedTripDetails.estado === 'EN RUTA' && (
                                        <button
                                            onClick={() => setIsFinalizarOpen(true)}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 font-semibold text-sm rounded-xl hover:bg-green-600 hover:text-white transition-all active:scale-[0.98] border border-green-200 cursor-pointer shadow-sm"
                                        >
                                            <Flag className="w-5 h-5" />
                                            Finalizar Viaje
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                    <span className="text-sm font-medium text-slate-500">
                                        Modo Solo Lectura
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            <MMPPFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                record={selectedRecord}
                onShowToast={(type, msg) => setToast({ type, message: msg })}
            />
            <UbicacionModal
                isOpen={isUbicacionOpen}
                onClose={() => setIsUbicacionOpen(false)}
                recordId={selectedRecord?.id || null}
                onShowToast={(type, msg) => setToast({ type, message: msg })}
            />
            <FinalizarModal
                isOpen={isFinalizarOpen}
                onClose={() => setIsFinalizarOpen(false)}
                record={selectedTripDetails}
                onShowToast={(type, msg) => setToast({ type, message: msg })}
            />

            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
        </div>
    );
};
