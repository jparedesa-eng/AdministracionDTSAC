import { useState, useMemo, useEffect } from 'react';
import {
    Building2,
    MapPin,
    Clock,
    FileText,
    CheckCircle2,
    AlertCircle,
    Search,
    Plus,
    Pencil,
    PlayCircle,
    DollarSign,
    Filter,
    X,
    Sun,
    Moon,
    Sunset
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import type { ToastState } from '../../components/ui/Toast';

// Stores
import { getSedesState, subscribeSedes } from '../../store/sedesStore';
import { getPuestosState, subscribePuestos } from '../../store/puestosStore';

// Tipos base
interface ServicioTercero {
    id: string;
    sede: string; // ID de la sede o nombre (legacy/mock)
    puesto: string; // ID del puesto o nombre (legacy/mock)
    modalidad: '24h' | '12h';
    jornada: 'Dia' | 'Noche' | 'Dia y Noche'; // [MOD] Added 'Dia y Noche'
    anio: number;
    mes: string;
    fechaInicio: string;
    fechaFin: string;
    observacion: string;
    estado: 'Ejecutado' | 'Pendiente';
    tarifa: number;
    monto: number;
}

// Datos de prueba iniciales (Mock data maintained for demo)
const MOCK_DATA: ServicioTercero[] = [
    {
        id: '1',
        sede: 'Planta Industrial', // Mock data uses names directly. Real data will use IDs.
        puesto: 'Garita Principal',
        modalidad: '24h',
        jornada: 'Dia',
        anio: 2024,
        mes: 'Febrero',
        fechaInicio: '2024-02-01',
        fechaFin: '2024-02-29',
        observacion: 'Servicio regular',
        estado: 'Ejecutado',
        tarifa: 3500,
        monto: 3500
    },
    {
        id: '2',
        sede: 'Fundo Santa Rosa',
        puesto: 'Ronda Perimetral',
        modalidad: '12h',
        jornada: 'Noche',
        anio: 2024,
        mes: 'Febrero',
        fechaInicio: '',
        fechaFin: '',
        observacion: '',
        estado: 'Pendiente',
        tarifa: 1800,
        monto: 0
    }
];

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function ControlServicios() {
    const [servicios, setServicios] = useState<ServicioTercero[]>(MOCK_DATA);
    const [toast, setToast] = useState<ToastState>(null);

    // --- Real Data Stores ---
    const [sedesVersion, setSedesVersion] = useState(0);
    const [puestosVersion, setPuestosVersion] = useState(0);

    useEffect(() => {
        const unsubSedes = subscribeSedes(() => setSedesVersion(v => v + 1));
        const unsubPuestos = subscribePuestos(() => setPuestosVersion(v => v + 1));
        return () => {
            unsubSedes();
            unsubPuestos();
        };
    }, []);

    const { sedes } = getSedesState();
    const { puestos } = getPuestosState();

    // Helper to get name from ID (or return original if not found - supports mock data)
    const getSedeName = (idOrName: string) => {
        const found = sedes.find(s => s.id === idOrName);
        return found ? found.nombre : idOrName;
    };

    const getPuestoName = (idOrName: string) => {
        const found = puestos.find(p => p.id === idOrName);
        return found ? found.nombre : idOrName;
    };


    // --- Filtros ---
    const currentYear = new Date().getFullYear();
    const [filters, setFilters] = useState({
        term: '',
        year: currentYear,
        month: '',
        status: '',
        sede: ''
    });

    // Unique lists for Selects (using resolved names)
    const uniqueSedes = useMemo(() => Array.from(new Set(servicios.map(s => getSedeName(s.sede)))), [servicios, sedesVersion]); // Depend on sedesVersion to re-resolve if needed
    const uniqueYears = useMemo(() => {
        const years = Array.from(new Set(servicios.map(s => s.anio)));
        if (!years.includes(currentYear)) years.push(currentYear);
        return years.sort((a, b) => b - a);
    }, [servicios, currentYear]);


    // Filtrado
    const filteredServicios = useMemo(() => {
        return servicios.filter(s => {
            const sedeName = getSedeName(s.sede);
            const puestoName = getPuestoName(s.puesto);

            const matchesTerm = filters.term === '' ||
                sedeName.toLowerCase().includes(filters.term.toLowerCase()) ||
                puestoName.toLowerCase().includes(filters.term.toLowerCase());

            const matchesYear = s.anio === filters.year;
            const matchesMonth = filters.month === '' || s.mes === filters.month;
            const matchesStatus = filters.status === '' || s.estado === filters.status;
            const matchesSede = filters.sede === '' || sedeName === filters.sede;

            return matchesTerm && matchesYear && matchesMonth && matchesStatus && matchesSede;
        });
    }, [servicios, filters, sedesVersion, puestosVersion]); // Re-calc if data changes

    // Totales
    const totalEjecutado = useMemo(() => {
        return filteredServicios
            .filter(s => s.estado === 'Ejecutado')
            .reduce((acc, curr) => acc + curr.monto, 0);
    }, [filteredServicios]);


    // --- Estados del Modal CREAR/EDITAR ---
    const [openFormModal, setOpenFormModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<ServicioTercero>>({
        sede: '',
        puesto: '',
        modalidad: '12h',
        jornada: 'Dia',
        anio: currentYear,
        mes: '',
        fechaInicio: '',
        fechaFin: '',
        observacion: '',
        estado: 'Pendiente',
        tarifa: 0
    });

    // Puestos filtrados para el formulario
    const formPuestos = useMemo(() => {
        if (!formData.sede) return [];
        return puestos.filter(p => p.sede_id === formData.sede && p.activo);
    }, [formData.sede, puestos]);


    // --- Estados del Modal EJECUTAR ---
    const [openExecuteModal, setOpenExecuteModal] = useState(false);
    const [executeData, setExecuteData] = useState({
        id: '',
        fechaInicio: '',
        fechaFin: '',
        observacion: ''
    });

    // Utility: Calcular días en el mes del servicio
    const getDaysInMonth = (year: number, monthName: string) => {
        const monthIndex = MONTHS.indexOf(monthName);
        if (monthIndex === -1) return 30; // Fallback
        return new Date(year, monthIndex + 1, 0).getDate();
    };

    // Utility: Calcular monto
    const calculateAmount = (tarifa: number, start: string, end: string, year: number, month: string) => {
        if (!start || !end || !tarifa) return 0;

        const dStart = new Date(start);
        const dEnd = new Date(end);

        // Diferencia en días + 1 (inclusivo)
        const diffTime = Math.abs(dEnd.getTime() - dStart.getTime());
        const daysParams = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const totalDaysInMonth = getDaysInMonth(year, month);

        // Monto proporcional
        const dailyRate = tarifa / totalDaysInMonth;
        return Number((dailyRate * daysParams).toFixed(2));
    };


    // --- Handlers: CREAR / EDITAR ---
    const handleOpenNew = () => {
        setIsEditing(false);
        setFormData({
            sede: '', // Will store ID
            puesto: '', // Will store ID
            modalidad: '12h',
            jornada: 'Dia',
            anio: currentYear,
            mes: '',
            fechaInicio: '',
            fechaFin: '',
            observacion: '',
            estado: 'Pendiente',
            tarifa: 0
        });
        setOpenFormModal(true);
    };

    const handleOpenEdit = (servicio: ServicioTercero) => {
        setIsEditing(true);
        setFormData({ ...servicio });
        setOpenFormModal(true);
    };

    const handleSaveService = () => {
        // Validaciones básicas
        if (!formData.sede || !formData.puesto || !formData.mes || !formData.tarifa) {
            setToast({ type: 'error', message: 'Complete los campos obligatorios: Sede, Puesto, Mes, Tarifa.' });
            return;
        }

        if (isEditing && formData.id) {
            // Actualizar
            setServicios(prev => prev.map(s => s.id === formData.id ? { ...s, ...formData } as ServicioTercero : s));
            setToast({ type: 'success', message: 'Servicio actualizado correctamente.' });
        } else {
            // Crear
            const newService: ServicioTercero = {
                ...formData,
                id: Math.random().toString(36).substr(2, 9),
                estado: 'Pendiente', // Siempre nace pendiente
                fechaInicio: '', // Limpiar fechas al crear
                fechaFin: '',
                observacion: '',
                monto: 0
            } as ServicioTercero;
            setServicios(prev => [newService, ...prev]);
            setToast({ type: 'success', message: 'Servicio creado correctamente.' });
        }
        setOpenFormModal(false);
    };

    // --- Handlers: EJECUTAR ---
    const handleOpenExecute = (servicio: ServicioTercero) => {
        // Calcular fechas por defecto basadas en Año y Mes del servicio
        let defaultInicio = '';
        let defaultFin = '';

        const monthIndex = MONTHS.indexOf(servicio.mes);

        if (servicio.anio && monthIndex !== -1) {
            // Primer día del mes
            const firstDay = new Date(servicio.anio, monthIndex, 1);
            // Último día del mes
            const lastDay = new Date(servicio.anio, monthIndex + 1, 0);

            // Formato YYYY-MM-DD local (evitar problemas de zona horaria con toISOString)
            const format = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            defaultInicio = format(firstDay);
            defaultFin = format(lastDay);
        }

        setExecuteData({
            id: servicio.id,
            fechaInicio: defaultInicio,
            fechaFin: defaultFin,
            observacion: ''
        });
        setOpenExecuteModal(true);
    };

    const handleExecuteService = () => {
        if (!executeData.fechaInicio || !executeData.fechaFin) {
            setToast({ type: 'error', message: 'Debe indicar el rango de fechas.' });
            return;
        }

        setServicios(prev => prev.map(s => {
            if (s.id === executeData.id) {
                // Calcular monto final basado en fechas reales
                const finalMonto = calculateAmount(s.tarifa, executeData.fechaInicio, executeData.fechaFin, s.anio, s.mes);

                return {
                    ...s,
                    estado: 'Ejecutado',
                    fechaInicio: executeData.fechaInicio,
                    fechaFin: executeData.fechaFin,
                    observacion: executeData.observacion,
                    monto: finalMonto
                };
            }
            return s;
        }));

        setToast({ type: 'success', message: 'Servicio marcado como EJECUTADO.' });
        setOpenExecuteModal(false);
    };


    return (
        <div className="space-y-6">
            {/* Toast Notification */}
            <Toast toast={toast} onClose={() => setToast(null)} />

            {/* Header Section */}
            <section className="bg-white p-6 rounded-2xl shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Control de Servicios Terceros</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Gestión y seguimiento de servicios de seguridad externos.
                        </p>
                    </div>
                    <button
                        onClick={handleOpenNew}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Servicio</span>
                    </button>
                </div>
            </section>

            {/* Filters & Summary Section */}
            <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters Card */}
                <div className="lg:col-span-3 bg-white p-5 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                        <Filter className="w-4 h-4" />
                        <span>Filtros de Búsqueda</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search Term */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar sede / puesto..."
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-red-100 transition-all"
                                value={filters.term}
                                onChange={(e) => setFilters({ ...filters, term: e.target.value })}
                            />
                        </div>

                        {/* Año */}
                        <select
                            className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-red-100 transition-all cursor-pointer"
                            value={filters.year}
                            onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                        >
                            {uniqueYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>

                        {/* Mes */}
                        <select
                            className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-red-100 transition-all cursor-pointer"
                            value={filters.month}
                            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                        >
                            <option value="">Todos los Meses</option>
                            {MONTHS.map(month => (
                                <option key={month} value={month}>{month}</option>
                            ))}
                        </select>

                        {/* Estado */}
                        <select
                            className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-red-100 transition-all cursor-pointer"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">Todos los Estados</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Ejecutado">Ejecutado</option>
                        </select>

                        {/* Sede */}
                        <select
                            className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-red-100 transition-all cursor-pointer"
                            value={filters.sede}
                            onChange={(e) => setFilters({ ...filters, sede: e.target.value })}
                        >
                            <option value="">Todas las Sedes</option>
                            {uniqueSedes.map(sede => (
                                <option key={sede} value={sede}>{sede}</option>
                            ))}
                        </select>

                        {/* Clear Filters Button */}
                        {(filters.term || filters.month || filters.status || filters.sede || filters.year !== currentYear) && (
                            <button
                                onClick={() => setFilters({ term: '', year: currentYear, month: '', status: '', sede: '' })}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors col-span-1 md:col-start-2 lg:col-start-4"
                            >
                                <X className="w-3.5 h-3.5" />
                                Limpiar Filtros
                            </button>
                        )}
                    </div>
                </div>

                {/* Summary Card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-5 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <DollarSign className="w-24 h-24" />
                    </div>

                    <div>
                        <p className="text-gray-400 text-sm font-medium">Total Ejecutado</p>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-2xl font-bold">S/</span>
                            <span className="text-4xl font-bold tracking-tight">
                                {totalEjecutado.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center gap-2 text-xs text-gray-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        <span>Solo servicios "Ejecutados"</span>
                    </div>
                </div>
            </section>

            {/* Table Section */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-normal">Sede / Puesto</th>
                                <th className="px-6 py-4 font-normal">Modalidad</th>
                                <th className="px-6 py-4 font-normal">Periodo</th>
                                <th className="px-6 py-4 font-normal">Fechas</th>
                                <th className="px-6 py-4 font-normal">Finanzas</th>
                                <th className="px-6 py-4 font-normal">Observación</th>
                                <th className="px-6 py-4 font-normal">Estado</th>
                                <th className="px-6 py-4 font-normal text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredServicios.map((servicio) => (
                                <tr key={servicio.id} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                {/* Display resolved names */}
                                                <div className="font-semibold text-gray-800">{getSedeName(servicio.sede)}</div>
                                                <div className="text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <MapPin className="w-3 h-3" />
                                                    <span>{getPuestoName(servicio.puesto)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium">{servicio.modalidad}</span>
                                            </div>

                                            {/* Jornada Badge Logic */}
                                            {servicio.jornada === 'Dia' && (
                                                <div className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                                                    <Sun className="w-3 h-3" />
                                                    <span>Día</span>
                                                </div>
                                            )}
                                            {servicio.jornada === 'Noche' && (
                                                <div className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
                                                    <Moon className="w-3 h-3" />
                                                    <span>Noche</span>
                                                </div>
                                            )}
                                            {servicio.jornada === 'Dia y Noche' && (
                                                <div className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                                                    <Sunset className="w-3 h-3" />
                                                    <span>24 Horas</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-800">{servicio.anio}</div>
                                        <div className="text-gray-500 text-xs uppercase tracking-wide">{servicio.mes}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {servicio.fechaInicio ? (
                                            <div className="flex flex-col gap-1 text-gray-500 font-mono text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                    <span>{servicio.fechaInicio}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                    <span>{servicio.fechaFin}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between items-center gap-4 text-gray-400 text-xs">
                                                <span>Tarifa</span>
                                                <span>S/ {servicio.tarifa.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between items-center gap-4 font-semibold text-gray-800">
                                                <span>Monto</span>
                                                <span>S/ {servicio.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        {servicio.observacion ? (
                                            <div className="flex items-start gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg text-xs">
                                                <FileText className="w-3 h-3 shrink-0 mt-0.5 opacity-50" />
                                                <span className="line-clamp-2">{servicio.observacion}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-300 text-xs italic">Sin observaciones</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${servicio.estado === 'Ejecutado'
                                            ? 'bg-green-50 text-green-700'
                                            : 'bg-amber-50 text-amber-700'
                                            }`}>
                                            {servicio.estado === 'Ejecutado'
                                                ? <CheckCircle2 className="w-3.5 h-3.5" />
                                                : <Clock className="w-3.5 h-3.5" />
                                            }
                                            {servicio.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {servicio.estado === 'Pendiente' && (
                                                <>
                                                    <button
                                                        onClick={() => handleOpenExecute(servicio)}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Marcar como Ejecutado"
                                                    >
                                                        <PlayCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenEdit(servicio)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            {servicio.estado === 'Ejecutado' && (
                                                <div className="p-1.5 text-gray-300 cursor-not-allowed">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredServicios.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-24 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-gray-50 rounded-full">
                                                <Search className="w-8 h-8 text-gray-300" />
                                            </div>
                                            <p className="font-medium text-gray-500">No se encontraron servicios</p>
                                            <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL: Crear / Editar Servicio */}
            <Modal
                open={openFormModal}
                onClose={() => setOpenFormModal(false)}
                title={isEditing ? "Editar Servicio" : "Nuevo Servicio"}
                size="md"
                footer={
                    <div className="flex gap-2">
                        <button
                            onClick={() => setOpenFormModal(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveService}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm shadow-red-200"
                        >
                            Guardar
                        </button>
                    </div>
                }
            >
                <div className="grid gap-5 py-2">

                    {/* Sede Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Sede</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all outline-none"
                            value={formData.sede}
                            onChange={(e) => setFormData({ ...formData, sede: e.target.value, puesto: '' })} // Reset puesto when sede changes
                        >
                            <option value="">Seleccionar Sede</option>
                            {sedes.map(sede => (
                                <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* Puesto Dropdown (Filtered) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Puesto</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all outline-none"
                            value={formData.puesto}
                            onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                            disabled={!formData.sede}
                        >
                            <option value="">{formData.sede ? 'Seleccionar Puesto' : 'Seleccione Sede primero'}</option>
                            {formPuestos.map(puesto => (
                                <option key={puesto.id} value={puesto.id}>{puesto.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Modalidad</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all outline-none"
                                value={formData.modalidad}
                                onChange={(e) => setFormData({ ...formData, modalidad: e.target.value as any })}
                            >
                                <option value="12h">12 Horas</option>
                                <option value="24h">24 Horas</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Jornada</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all outline-none"
                                value={formData.jornada}
                                onChange={(e) => setFormData({ ...formData, jornada: e.target.value as any })}
                            >
                                <option value="Dia">Día</option>
                                <option value="Noche">Noche</option>
                                <option value="Dia y Noche">Día y Noche</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mes</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all outline-none"
                                value={formData.mes}
                                onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
                            >
                                <option value="">Seleccionar</option>
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Año</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all outline-none"
                                value={formData.anio}
                                onChange={(e) => setFormData({ ...formData, anio: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tarifa Mensual (S/)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="number"
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-100 focus:border-green-400 transition-all outline-none font-medium text-gray-900"
                                value={formData.tarifa}
                                onChange={(e) => setFormData({ ...formData, tarifa: parseFloat(e.target.value) })}
                                placeholder="0.00"
                                step="0.01"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Costo base por el periodo completo (mes). El monto ejecutado se calculará proporcionalmente a los días trabajados.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* MODAL: Ejecutar Servicio */}
            <Modal
                open={openExecuteModal}
                onClose={() => setOpenExecuteModal(false)}
                title="Ejecutar Servicio"
                size="md"
                footer={
                    <div className="flex gap-2">
                        <button
                            onClick={() => setOpenExecuteModal(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleExecuteService}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-sm shadow-green-200"
                        >
                            Confirmar Ejecución
                        </button>
                    </div>
                }
            >
                <div className="grid gap-5 py-2">
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 items-start">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-amber-800">Confirmación de Ejecución</p>
                            <p className="text-xs text-amber-700 mt-1">
                                El servicio pasará a estado <strong>Ejecutado</strong>. Asegúrese de ingresar las fechas reales, ya que esto afectará el cálculo del monto final.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha Inicio</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-100 focus:border-green-400 transition-all outline-none"
                                value={executeData.fechaInicio}
                                onChange={(e) => setExecuteData({ ...executeData, fechaInicio: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha Fin</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-100 focus:border-green-400 transition-all outline-none"
                                value={executeData.fechaFin}
                                onChange={(e) => setExecuteData({ ...executeData, fechaFin: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Observaciones</label>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-100 focus:border-gray-400 transition-all outline-none resize-none"
                            rows={3}
                            value={executeData.observacion}
                            onChange={(e) => setExecuteData({ ...executeData, observacion: e.target.value })}
                            placeholder="Ingrese observaciones sobre la ejecución del servicio..."
                        />
                    </div>
                </div>
            </Modal>

        </div>
    );
}
