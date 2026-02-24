
import { useState, useEffect } from "react";
import { telefoniaStore, type Solicitud } from "../../store/telefoniaStore";
import { generateTicketPDF } from "../../utils/pdfGeneratorTelefonia";
import {
    Search,
    FileText,
    FileSpreadsheet,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from "lucide-react";
import { utils, writeFile } from "xlsx";
import { DateRangePicker } from "../../components/ui/DateRangePicker";

export default function HistorialTelefonia() {
    const [searchTerm, setSearchTerm] = useState("");

    // Filters
    const [appliedStartDate, setAppliedStartDate] = useState<Date | null>(null);
    const [appliedEndDate, setAppliedEndDate] = useState<Date | null>(null);
    const [hasAppliedFilter, setHasAppliedFilter] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        telefoniaStore.fetchSolicitudes();
    }, []);

    // Reset pagination when filters change
    // Reset pagination when filters change (only when applied changes)
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, appliedStartDate, appliedEndDate]);

    const handleDateRangeApply = (range: { start: Date | null; end: Date | null }) => {
        if (range.start && range.end) {
            setAppliedStartDate(range.start);
            setAppliedEndDate(range.end);
            setHasAppliedFilter(true);
        } else {
            setAppliedStartDate(null);
            setAppliedEndDate(null);
            setHasAppliedFilter(false);
        }
    };

    // Filter Logic
    const getFilteredTickets = () => {
        if (!hasAppliedFilter) return [];

        return telefoniaStore.solicitudes.filter(t => {
            // 1. Status Filter (Only Finished)
            const isFinished = ["Entregado", "Rechazada", "Cancelada"].includes(t.estado);
            if (!isFinished) return false;

            // 2. Search Text
            const search = searchTerm.toLowerCase();
            const matchesSearch = !search || (
                (t.beneficiario_nombre || "").toLowerCase().includes(search) ||
                (t.id || "").toLowerCase().includes(search) ||
                (t.beneficiario_area || "").toLowerCase().includes(search)
            );
            if (!matchesSearch) return false;

            // 3. Date Range Filter using APPLIED dates
            if (appliedStartDate || appliedEndDate) {
                const ticketDateValue = new Date(t.created_at).getTime();

                if (appliedStartDate) {
                    const start = new Date(appliedStartDate).setHours(0, 0, 0, 0);
                    if (ticketDateValue < start) return false;
                }

                if (appliedEndDate) {
                    const end = new Date(appliedEndDate).setHours(23, 59, 59, 999);
                    if (ticketDateValue > end) return false;
                }
            }

            return true;
        });
    };

    const tickets = getFilteredTickets();

    // Pagination Logic
    const currentData = () => {
        if (itemsPerPage === 0) return tickets;
        const start = (currentPage - 1) * itemsPerPage;
        return tickets.slice(start, start + itemsPerPage);
    };

    const displayedTickets = currentData();
    const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(tickets.length / itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // PDF Download
    const handleDownloadPDF = async (ticket: Solicitud) => {
        try {
            const fullTicket = await telefoniaStore.fetchSolicitudById(ticket.id);
            if (fullTicket) {
                await generateTicketPDF(fullTicket);
            } else {
                alert("No se pudo cargar el detalle del ticket");
            }
        } catch (e) {
            alert("Error generando PDF");
            console.error(e);
        }
    };

    // Excel Download
    const handleDownloadExcel = () => {
        const headers = [
            "ID", "Fecha Creación", "Estado",
            "DNI Beneficiario", "Nombre Beneficiario", "Área", "Puesto",
            "Motivo Solicitud", "Tipo Servicio", "Justificación",
            "Fundo/Planta", "Cultivo", "Centro Costo", "Categoría", "Proyecto",
            "Paquete Asignado", "Costo Plan", "Datos Plan",
            "Modelo Alternativo", "Apps Solicitadas",
            "Aprobado Gerencia", "Fecha Aprob. Gerencia", "Gerente Aprobador",
            "Aprobado Admin", "Fecha Aprob. Admin", "Admin Aprobador",
            "Fecha Entrega", "Estado Firma"
        ];

        const data = tickets.map(t => ({ // Export displayed or filtered? Usually filtered (tickets), not just page. Let's use 'tickets' for export to be consistent with "Exportar Todo" label, or 'displayedTickets' if user wants WHAT THEY SEE? Usually export is ALL filtered.
            // Wait, previous code used 'displayedTickets' implicitly? No, previous code used 'tickets'.
            // User requested "exportable xml de excel" previously.
            // Let's keep using 'tickets' (ALL filtered records) for export, it makes more sense than just one page.

            "ID": t.id,
            "Fecha Creación": new Date(t.created_at).toLocaleDateString() + " " + new Date(t.created_at).toLocaleTimeString(),
            "Estado": t.estado,
            "DNI Responsable": t.beneficiario_dni || "",
            "Nombre Responsable": t.beneficiario_nombre || "",
            "Área": t.beneficiario_area || "",
            "Puesto": t.beneficiario_puesto || "",
            "Motivo Solicitud": t.tipo_solicitud || "Línea Nueva",
            "Tipo Servicio": t.tipo_servicio || "",
            "Justificación": t.justificacion || "",
            "Fundo/Planta": t.fundo_planta || "",
            "Cultivo": t.cultivo || "",
            "Centro Costo": t.ceco || "",
            "Categoría": t.categoria || "",
            "Proyecto": t.proyecto || "", // New
            "Paquete Asignado": t.paquete_asignado || "",
            "Costo Plan": t.plan_costo || "",
            "Datos Plan": t.plan_datos || "",
            "Modelo Alternativo": t.alternativa_modelo || "",
            "Apps Solicitadas": (t.aplicativos || []).join(", "),
            "Aprobado Gerencia": t.aprobacion_gerencia ? "SI" : "NO",
            "Fecha Aprob. Gerencia": t.fecha_aprobacion_gerencia ? new Date(t.fecha_aprobacion_gerencia).toLocaleDateString() : "",
            "Gerente Aprobador": t.aprobacion_gerencia_nombre || "",
            "Aprobado Admin": t.aprobacion_admin ? "SI" : "NO",
            "Fecha Aprob. Admin": t.fecha_aprobacion_admin ? new Date(t.fecha_aprobacion_admin).toLocaleDateString() : "",
            "Admin Aprobador": t.aprobacion_admin_nombre || "",
            "Fecha Entrega": t.fecha_entrega ? new Date(t.fecha_entrega).toLocaleDateString() : "",
            "Estado Firma": t.recibido_por ? "FIRMADO" : "PENDIENTE"
        }));

        const ws = utils.json_to_sheet(data, { header: headers });
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Historial Telefonia");

        writeFile(wb, `historial_telefonia_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Historial de Solicitudes</h1>
                    <p className="text-sm text-gray-500">Registro histórico y descarga de reportes</p>
                </div>
            </header>

            {/* Filters Container */}
            <div className="bg-white p-4 rounded-xl border border-gray-300 flex flex-col lg:flex-row items-end justify-between gap-4">

                <div className="flex flex-col md:flex-row items-end gap-4 w-full lg:w-auto flex-wrap">
                    {/* Date Range Picker */}
                    <div className="w-full md:w-auto">
                        <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Rango de Fechas</label>
                        <DateRangePicker
                            onChange={handleDateRangeApply}
                        />
                    </div>

                    {/* Search Bar */}
                    <div className="w-full md:w-64">
                        <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Buscar Solicitud</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="w-4 h-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full rounded-lg border border-gray-300 pl-9 p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="ID, Responsable, etc..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Right side controls */}
                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                    {/* Total Count */}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Registros:</span>
                        <span className="text-sm font-bold text-gray-900">{tickets.length}</span>
                    </div>

                    {/* Excel Export Button */}
                    <button
                        onClick={handleDownloadExcel}
                        disabled={tickets.length === 0}
                        className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        title="Exportar a Excel"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span className="hidden sm:inline">Exportar Excel</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white border border-gray-300 rounded-xl overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-300">
                            <tr>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Responsable</th>
                                <th className="px-4 py-3">Área / Puesto</th>
                                <th className="px-4 py-3">Tipo de Solicitud</th>
                                <th className="px-4 py-3">Justificacion</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {displayedTickets.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 italic">
                                        {hasAppliedFilter ? "No se encontraron registros" : "Aplique filtros para ver registros"}
                                    </td>
                                </tr>
                            ) : (
                                displayedTickets.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                            {new Date(t.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                            {t.id.slice(0, 8)}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {t.beneficiario_nombre || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <div className="flex flex-col">
                                                <span>{t.beneficiario_area}</span>
                                                <span className="text-xs text-gray-400">{t.beneficiario_puesto}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-blue-700 whitespace-nowrap">
                                            {t.tipo_solicitud || "Línea Nueva"}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <div className="flex flex-col">
                                                <span className="text-sm">{t.justificacion || "-"}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.estado === 'Entregado' ? 'bg-emerald-100 text-emerald-800' :
                                                t.estado === 'Rechazada' ? 'bg-rose-100 text-rose-800' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {t.estado}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleDownloadPDF(t)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-gray-600 hover:text-red-600 hover:border-red-300 transition-colors"
                                                title="Descargar PDF"
                                            >
                                                <FileText className="w-4 h-4" />
                                                <span className="hidden sm:inline">PDF</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {tickets.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 p-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-medium uppercase">Filas:</span>
                            <select
                                className="rounded border-none text-gray-500 py-1 pl-2 pr-6 text-sm focus:ring-0 bg-transparent cursor-pointer hover:text-gray-700"
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={0}>Todos</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handlePageChange(1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Primera Página"
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Página Anterior"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            <span className="text-xs font-medium px-4 text-gray-400">
                                {currentPage} / {totalPages}
                            </span>

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Página Siguiente"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => handlePageChange(totalPages)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Última Página"
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
