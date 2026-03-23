
import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, CheckCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, Eye } from "lucide-react";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { Modal } from "../../components/ui/Modal";
import { getEventosState, subscribeEventos, upsertEvento, fetchEventos } from "../../store/eventosMayoresStore";
import { getCentralesState, subscribeCentrales } from "../../store/cctvCentralesStore";
import { getSedesState, subscribeSedes } from "../../store/sedesStore";
import { useAuth } from "../../auth/AuthContext";

export default function RegistroEventosMayores() {
    const [, setVersion] = useState(0);

    useEffect(() => {
        const unsubEventos = subscribeEventos(() => setVersion(prev => prev + 1));
        const unsubCentrales = subscribeCentrales(() => setVersion(prev => prev + 1));
        const unsubSedes = subscribeSedes(() => setVersion(prev => prev + 1));
        return () => {
            unsubEventos();
            unsubCentrales();
            unsubSedes();
        };
    }, []);

    const { eventos } = getEventosState();
    const { centrales } = getCentralesState();
    const { sedes } = getSedesState();
    const { profile } = useAuth();

    const allowedCentrales = useMemo(() => {
        if (!profile || profile.rol === "admin" || !profile.gestion) return centrales;
        return centrales.filter(c => c.nombre.toLowerCase() === profile.gestion?.toLowerCase());
    }, [centrales, profile]);
    const [toast, setToast] = useState<ToastState>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT_GENERAL' | 'FINALIZE' | 'VIEW'>('CREATE');

    // Initial state for form
    const initialFormState = {
        id: "",
        cctv_id: "",
        sede_id: "",
        fecha_evento: "",
        fecha_hora_inicio: "",
        fecha_hora_fin: "",
        tipo_evento: "",
        descripcion: "",
        impacto: "PARCIAL",
        solucion: "",
        fecha_ejecucion: "",
        usuario_ejecucion: "",
        requiere_atencion: true,
        estado: "PENDIENTE"
    };

    const [formData, setFormData] = useState(initialFormState);
    const [errors, setErrors] = useState({
        fecha_hora_inicio: "",
        fecha_hora_fin: ""
    });

    // Default range: Start of month to Today
    const dNow = new Date();
    const localToday = new Date(dNow.getTime() - dNow.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const localStartOfMonth = new Date(dNow.getFullYear(), dNow.getMonth(), 1);
    const startOfMonth = new Date(localStartOfMonth.getTime() - localStartOfMonth.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    const [filters, setFilters] = useState({
        sede_id: "",
        cctv_id: allowedCentrales.length > 0 ? allowedCentrales[0].id : "",
        estado: "TODOS",
        fecha_inicio: startOfMonth,
        fecha_fin: localToday
    });

    // Determine filtered events
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Determine filtered events
    const filteredEventos = eventos.filter(e => {
        if (filters.sede_id && e.sede_id !== filters.sede_id) return false;
        if (filters.cctv_id && e.cctv_id !== filters.cctv_id) return false;
        if (filters.estado !== "TODOS" && e.estado !== filters.estado) return false;
        if (filters.fecha_inicio && e.fecha_evento < filters.fecha_inicio) return false;
        if (filters.fecha_fin && e.fecha_evento > filters.fecha_fin) return false;
        return true;
    });

    // Pagination Logic
    const totalPages = itemsPerPage === 9999 ? 1 : Math.ceil(filteredEventos.length / itemsPerPage);
    const paginatedEventos = itemsPerPage === 9999 ? filteredEventos : filteredEventos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters, itemsPerPage]);

    // Auto-uncheck "requiere_atencion" for Power Outages
    useEffect(() => {
        if (modalOpen && (modalMode === 'CREATE' || modalMode === 'EDIT_GENERAL')) {
            if (formData.tipo_evento.includes("CORTE DE LUZ")) {
                setFormData(prev => ({ ...prev, requiere_atencion: false }));
            }
        }
    }, [formData.tipo_evento, modalOpen]);


    const getSedeName = (id: string) => sedes.find(s => s.id === id)?.nombre || "---";
    const getCentralName = (id: string) => centrales.find(c => c.id === id)?.nombre || "---";

    // Helper to get sedes for a specific central
    const getFilteredSedes = (centralId: string) => {
        if (!centralId) return sedes;
        const central = centrales.find(c => c.id === centralId);
        if (!central || !central.sedes) return [];
        return sedes.filter(s => central.sedes!.includes(s.id));
    };

    const handleOpenModal = (evento?: any, mode?: 'CREATE' | 'EDIT_GENERAL' | 'FINALIZE' | 'VIEW') => {
        if (evento) {
            setFormData({
                id: evento.id,
                cctv_id: evento.cctv_id || "",
                sede_id: evento.sede_id || "",
                fecha_evento: evento.fecha_evento,
                fecha_hora_inicio: evento.fecha_hora_inicio ? new Date(evento.fecha_hora_inicio).toISOString().slice(0, 16) : "",
                fecha_hora_fin: evento.fecha_hora_fin ? new Date(evento.fecha_hora_fin).toISOString().slice(0, 16) : "",
                tipo_evento: evento.tipo_evento,
                descripcion: evento.descripcion || "",
                impacto: evento.impacto || "PARCIAL",
                solucion: evento.solucion || "",
                fecha_ejecucion: evento.fecha_ejecucion ? new Date(evento.fecha_ejecucion).toISOString().slice(0, 16) : "",
                usuario_ejecucion: evento.usuario_ejecucion || "",
                requiere_atencion: evento.requiere_atencion !== undefined ? evento.requiere_atencion : true,
                estado: evento.estado || "PENDIENTE"
            });
            setModalMode(mode || 'VIEW');
        } else {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            const today = now.toISOString().slice(0, 10);
            const currentTime = now.toISOString().slice(0, 16);

            setFormData({
                ...initialFormState,
                fecha_evento: today,
                fecha_hora_inicio: currentTime,
            });
            setModalMode('CREATE');
        }
        setErrors({ fecha_hora_inicio: "", fecha_hora_fin: "" });
        setModalOpen(true);
    };

    const validateForm = (data: typeof formData) => {
        const newErrors = { fecha_hora_inicio: "", fecha_hora_fin: "" };
        let isValid = true;

        const dateEvento = data.fecha_evento ? new Date(data.fecha_evento + "T00:00:00") : null;
        const dateInicio = data.fecha_hora_inicio ? new Date(data.fecha_hora_inicio) : null;
        const dateFin = data.fecha_hora_fin ? new Date(data.fecha_hora_fin) : null;

        // Rule 1: Start Time >= Event Date
        if (dateEvento && dateInicio && dateInicio < dateEvento) {
            newErrors.fecha_hora_inicio = "La hora de inicio no puede ser anterior a la fecha del evento.";
            isValid = false;
        }

        // Rule 2: End Time >= Start Time
        if (dateInicio && dateFin && dateFin < dateInicio) {
            newErrors.fecha_hora_fin = "La hora fin no puede ser anterior a la hora de inicio.";
            isValid = false;
        }

        // Rule 3: End Time >= Event Date (redundant if Rule 2 & 1 passed, but explicit check requested)
        if (dateEvento && dateFin && dateFin < dateEvento) {
            newErrors.fecha_hora_fin = "La hora fin no puede ser anterior a la fecha del evento.";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };



    const handleSave = async () => {
        // Basic required fields check
        if (!formData.sede_id || !formData.cctv_id || !formData.fecha_evento || !formData.fecha_hora_inicio || !formData.tipo_evento) {
            setToast({ type: "error", message: "Complete los campos obligatorios (*)" });
            return;
        }

        // Run logic validation
        if (!validateForm(formData)) {
            setToast({ type: "error", message: "Por favor corrija los errores de fecha." });
            return;
        }

        let payload: any = {
            cctv_id: formData.cctv_id,
            sede_id: formData.sede_id,
            fecha_evento: formData.fecha_evento, // DATE string YYYY-MM-DD
            fecha_hora_inicio: new Date(formData.fecha_hora_inicio).toISOString(),
            tipo_evento: formData.tipo_evento,
            descripcion: formData.descripcion,
            impacto: formData.impacto,
        };

        if (formData.id) {
            payload.id = formData.id;
        }

        // Handle End Date & Status using verified dates
        if (formData.fecha_hora_fin) {
            payload.fecha_hora_fin = new Date(formData.fecha_hora_fin).toISOString();
        } else {
            payload.fecha_hora_fin = null;
        }

        // Tracking fields
        payload.solucion = formData.solucion;
        payload.fecha_ejecucion = formData.fecha_ejecucion ? new Date(formData.fecha_ejecucion).toISOString() : null;
        payload.requiere_atencion = formData.requiere_atencion;

        // Validation: Execution Date cannot be in the future
        if (formData.fecha_ejecucion) {
            const execDate = new Date(formData.fecha_ejecucion);
            if (execDate > new Date()) {
                setToast({ type: "error", message: "La fecha de ejecución no puede ser futura." });
                return;
            }
        }

        // Finalization Logic
        const isSolutionCompleted = formData.solucion && formData.fecha_ejecucion;
        
        if (formData.requiere_atencion) {
            // Needs Solution + End Date
            if (isSolutionCompleted && formData.fecha_hora_fin) {
                payload.estado = "FINALIZADO";
                if (!formData.usuario_ejecucion) payload.usuario_ejecucion = profile?.nombre || "Sistema";
            } else {
                payload.estado = "PENDIENTE";
            }
        } else {
            // Only needs End Date
            if (formData.fecha_hora_fin) {
                payload.estado = "FINALIZADO";
                payload.usuario_ejecucion = formData.usuario_ejecucion || profile?.nombre || "Sistema";
            } else {
                payload.estado = "PENDIENTE";
            }
        }

        try {
            await upsertEvento(payload);
            setToast({ type: "success", message: formData.id ? "Evento actualizado." : "Evento registrado." });
            setModalOpen(false);
        } catch (error: any) {
            setToast({ type: "error", message: error.message || "Error al guardar." });
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="flex items-center justify-between gap-4 px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Registro de Eventos Mayores
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Bitácora de incidentes críticos del sistema (Caídas, Cortes de Energía, etc.)
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal(null, 'CREATE')}
                    className="flex items-center gap-2 bg-[#ff0000] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Registrar Evento
                </button>
            </div>

            {/* Filters Bar */}
            {/* Unified Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-none flex flex-wrap items-end gap-4">

                {/* Date Group */}
                <div className="flex items-end gap-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                        <input
                            type="date"
                            className="h-9 text-sm border border-gray-200 rounded-lg px-2 focus:ring-2 focus:ring-red-50 focus:border-blue-500 outline-none transition-all"
                            value={filters.fecha_inicio}
                            onChange={e => setFilters({ ...filters, fecha_inicio: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                        <input
                            type="date"
                            className="h-9 text-sm border border-gray-200 rounded-lg px-2 focus:ring-2 focus:ring-red-50 focus:border-red-500 outline-none transition-all"
                            value={filters.fecha_fin}
                            onChange={e => setFilters({ ...filters, fecha_fin: e.target.value })}
                        />
                    </div>
                    <button
                        onClick={() => fetchEventos(filters.fecha_inicio, filters.fecha_fin)}
                        className="h-9 px-3 bg-[#ff0000] hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                        title="Buscar en rango de fechas"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                </div>

                {/* Divider */}
                <div className="hidden md:block h-8 w-px bg-gray-200 mx-2"></div>

                {/* Secondary Filters */}
                <div className="flex flex-wrap items-end gap-4 flex-1">
                    <div className="min-w-[150px] flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Central CCTV</label>
                        <select
                            className="w-full h-9 text-sm border border-gray-200 rounded-lg px-2 focus:ring-2 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                            value={filters.cctv_id}
                            onChange={e => setFilters({ ...filters, cctv_id: e.target.value, sede_id: "" })}
                        >
                            <option value="">Todas</option>
                            {allowedCentrales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>
                    <div className="min-w-[150px] flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Sede</label>
                        <select
                            className="w-full h-9 text-sm border border-gray-200 rounded-lg px-2 focus:ring-2 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                            value={filters.sede_id}
                            onChange={e => setFilters({ ...filters, sede_id: e.target.value })}
                        >
                            <option value="">Todas</option>
                            {getFilteredSedes(filters.cctv_id).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </div>
                    <div className="w-[120px]">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                        <select
                            className="w-full h-9 text-sm border border-gray-200 rounded-lg px-2 focus:ring-2 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                            value={filters.estado}
                            onChange={e => setFilters({ ...filters, estado: e.target.value })}
                        >
                            <option value="TODOS">Todos</option>
                            <option value="PENDIENTE">Pendientes</option>
                            <option value="FINALIZADO">Finalizados</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table and Pagination Container */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-none overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Central / Sede</th>
                                <th className="px-4 py-3">Evento</th>
                                <th className="px-4 py-3">Horario</th>
                                <th className="px-4 py-3">Control / Seguimiento</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedEventos.map(e => (
                                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${e.estado === 'FINALIZADO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {e.estado}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                        {e.fecha_evento}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-800">{getCentralName(e.cctv_id)}</span>
                                            <span className="text-xs text-gray-500">{getSedeName(e.sede_id)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">{e.tipo_evento}</span>
                                                {e.impacto === 'TOTAL' && (
                                                    <span className="bg-red-100 text-red-600 text-[10px] px-1.5 rounded border border-red-200">TOTAL</span>
                                                )}
                                                {e.requiere_atencion === false && (
                                                    <span className="bg-blue-50 text-blue-600 text-[10px] px-1.5 rounded border border-blue-100 flex items-center gap-1" title="Solo Observación">
                                                        <Eye className="h-3 w-3" />
                                                        OBS
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-500 line-clamp-1" title={e.descripcion}>{e.descripcion}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        <div className="flex flex-col gap-0.5">
                                            <span>Ini: {new Date(e.fecha_hora_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {e.fecha_hora_fin ? (
                                                <span>Fin: {new Date(e.fecha_hora_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            ) : (
                                                <span className="text-orange-400 italic">--:--</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {e.requiere_atencion !== false ? (
                                            e.solucion ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium text-gray-700 line-clamp-1" title={e.solucion}>{e.solucion}</span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {e.fecha_ejecucion ? new Date(e.fecha_ejecucion).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '--'} 
                                                        {e.usuario_ejecucion && ` | ${e.usuario_ejecucion}`}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="italic text-gray-400">Sin seguimiento</span>
                                            )
                                        ) : (
                                            <span className="text-gray-400 italic">No requiere atención</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {e.estado === 'PENDIENTE' && e.requiere_atencion !== false && (profile?.rol === 'admin' || profile?.rol === 'Supervisor') && (
                                                <button
                                                    onClick={() => handleOpenModal(e, 'FINALIZE')}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Finalizar Evento"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleOpenModal(e, e.estado === 'FINALIZADO' ? 'VIEW' : 'EDIT_GENERAL')}
                                                className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                title={e.estado === 'FINALIZADO' ? "Ver Detalles" : "Editar / Ver Detalles"}
                                            >
                                                {e.estado === 'FINALIZADO' ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {paginatedEventos.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-gray-400">
                                        No hay datos que mostrar. Seleccione un rango de fechas y aplique filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-500 uppercase text-xs">Filas:</span>
                        <select
                            className="h-8 border border-gray-200 rounded-lg px-2 text-xs bg-gray-50 focus:bg-white transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-blue-100"
                            value={itemsPerPage}
                            onChange={e => setItemsPerPage(Number(e.target.value))}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={9999}>Todos</option>
                        </select>
                        <span className="text-gray-400 text-xs ml-2">
                            Total: {filteredEventos.length} registros
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 mr-2">
                            {currentPage} / {totalPages}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={
                    modalMode === 'FINALIZE' ? "Finalizar Seguimiento de Evento" :
                        modalMode === 'VIEW' ? "Detalle de Evento (Cerrado)" :
                            (formData.id ? "Editar Información General" : "Registrar Evento Mayor")
                }
                size="md"
            >
                <div className="space-y-4 mt-4">
                    {(modalMode === 'CREATE' || modalMode === 'EDIT_GENERAL' || modalMode === 'VIEW') && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Central CCTV <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full h-11 rounded-lg border px-3 disabled:bg-gray-50 disabled:text-gray-500 border-b border-gray-300"
                                        value={formData.cctv_id}
                                        disabled={modalMode === 'VIEW'}
                                        onChange={e => setFormData({ ...formData, cctv_id: e.target.value, sede_id: "" })}
                                    >
                                        <option value="">-- Seleccionar Central --</option>
                                        {allowedCentrales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sede <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full h-11 rounded-lg border px-3 disabled:bg-gray-50 disabled:text-gray-500 border-b border-gray-300"
                                        value={formData.sede_id}
                                        disabled={modalMode === 'VIEW'}
                                        onChange={e => setFormData({ ...formData, sede_id: e.target.value })}
                                    >
                                        <option value="">-- Seleccionar Sede --</option>
                                        {getFilteredSedes(formData.cctv_id).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Evento <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        className="w-full h-11 rounded-lg border px-3 disabled:bg-gray-50 disabled:text-gray-500 border-b border-gray-300"
                                        value={formData.fecha_evento}
                                        disabled={modalMode === 'VIEW'}
                                        onChange={e => {
                                            const newData = { ...formData, fecha_evento: e.target.value };
                                            setFormData(newData);
                                            validateForm(newData);
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio <span className="text-red-500">*</span></label>
                                    <input
                                        type="datetime-local"
                                        className="w-full h-11 rounded-lg border px-3 disabled:bg-gray-50 disabled:text-gray-500 border-b border-gray-300"
                                        value={formData.fecha_hora_inicio}
                                        disabled={modalMode === 'VIEW'}
                                        onChange={e => {
                                            const newData = { ...formData, fecha_hora_inicio: e.target.value };
                                            setFormData(newData);
                                            validateForm(newData);
                                        }}
                                    />
                                    {errors.fecha_hora_inicio && <p className="text-red-500 text-xs mt-1">{errors.fecha_hora_inicio}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin (Opcional)</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full h-11 rounded-lg border px-3 disabled:bg-gray-50 disabled:text-gray-500 border-b border-gray-300"
                                        value={formData.fecha_hora_fin}
                                        disabled={modalMode === 'VIEW'}
                                        onChange={e => {
                                            const newData = { ...formData, fecha_hora_fin: e.target.value };
                                            setFormData(newData);
                                            validateForm(newData);
                                        }}
                                    />
                                    {errors.fecha_hora_fin && <p className="text-red-500 text-xs mt-1">{errors.fecha_hora_fin}</p>}
                                    <p className="text-[10px] text-gray-500 mt-1">Si se deja vacío, quedará como PENDIENTE.</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Evento <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full h-11 rounded-lg border px-3 disabled:bg-gray-50 disabled:text-gray-500 border-b border-gray-300"
                                    value={formData.tipo_evento}
                                    disabled={modalMode === 'VIEW'}
                                    onChange={e => setFormData({ ...formData, tipo_evento: e.target.value })}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    <option value="CAIDA DEL SERVIDOR">CAIDA DEL SERVIDOR</option>
                                    <option value="CORTE DE LUZ PROGRAMADO">CORTE DE LUZ PROGRAMADO</option>
                                    <option value="CORTE DE LUZ NO PROGRAMADO">CORTE DE LUZ NO PROGRAMADO</option>
                                    <option value="FALLA DE ENLACE DE DATOS">FALLA DE ENLACE DE DATOS</option>
                                    <option value="OTRO">OTRO</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Impacto <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full h-11 rounded-lg border px-3 disabled:bg-gray-50 disabled:text-gray-500 border-b border-gray-300"
                                    value={formData.impacto}
                                    disabled={modalMode === 'VIEW'}
                                    onChange={e => setFormData({ ...formData, impacto: e.target.value })}
                                >
                                    <option value="PARCIAL">PARCIAL (Afecta algunos servicios)</option>
                                    <option value="TOTAL">TOTAL (Caída completa)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    className="w-full h-24 rounded-lg border p-3 resize-none disabled:bg-gray-50 disabled:text-gray-500 border-b border-gray-300"
                                    placeholder="Detalles adicionales del evento..."
                                    value={formData.descripcion}
                                    disabled={modalMode === 'VIEW'}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <input
                                    type="checkbox"
                                    id="requiere_atencion"
                                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
                                    checked={formData.requiere_atencion}
                                    disabled={modalMode === 'VIEW' || (profile?.rol !== 'admin' && profile?.rol !== 'Supervisor')}
                                    onChange={e => setFormData({ ...formData, requiere_atencion: e.target.checked })}
                                />
                                <label htmlFor="requiere_atencion" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                    Requiere Seguimiento de Atención (Solución Técnica)
                                </label>
                                {(profile?.rol !== 'admin' && profile?.rol !== 'Supervisor') && (
                                    <span className="text-[10px] text-gray-400 italic font-normal ml-auto">Solo Supervisores</span>
                                )}
                            </div>
                        </>
                    )}

                    {(modalMode === 'FINALIZE' || modalMode === 'VIEW') && (
                        <div className="border-t pt-4 space-y-4">
                            <h3 className="font-semibold text-gray-900 border-l-4 border-blue-500 pl-3">Seguimiento de Control</h3>
                            {modalMode === 'FINALIZE' && (
                                <div className="bg-blue-50 p-3 rounded-lg flex flex-col gap-1 mb-4">
                                    <span className="text-xs font-bold text-blue-700 uppercase">Referencia del Evento:</span>
                                    <span className="text-xs text-blue-600">{getCentralName(formData.cctv_id)} | {getSedeName(formData.sede_id)}</span>
                                    <span className="text-xs text-blue-800 font-semibold">{formData.tipo_evento} ({formData.fecha_evento})</span>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">¿Qué solución se le dio?</label>
                                    <textarea
                                        className="w-full h-20 rounded-lg border p-3 resize-none disabled:bg-gray-50 disabled:text-gray-500 border-b border-gray-300"
                                        placeholder="Describa la solución técnica..."
                                        value={formData.solucion}
                                        disabled={modalMode === 'VIEW'}
                                        onChange={e => setFormData({ ...formData, solucion: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Ejecución</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full h-11 rounded-lg border px-3 disabled:bg-gray-50 disabled:text-gray-500 border-b border-gray-300"
                                        value={formData.fecha_ejecucion}
                                        disabled={modalMode === 'VIEW'}
                                        onChange={e => setFormData({ ...formData, fecha_ejecucion: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuario Ejecutor</label>
                                    <input
                                        type="text"
                                        className="w-full h-11 rounded-lg border px-3 bg-gray-50 text-gray-500 border-b border-gray-300"
                                        value={formData.usuario_ejecucion || profile?.nombre || ""}
                                        disabled={true}
                                    />
                                </div>
                            </div>
                            {modalMode === 'FINALIZE' && (
                                <p className="text-[10px] text-blue-600 font-medium italic">
                                    * Al completar la solución y fecha de ejecución, el evento pasará a estado FINALIZADO y ya no se podrá editar.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                            {modalMode === 'VIEW' ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {modalMode !== 'VIEW' && (
                            <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg">
                                {modalMode === 'FINALIZE' ? 'Finalizar Evento' : (formData.id ? 'Guardar Cambios' : 'Registrar')}
                            </button>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
