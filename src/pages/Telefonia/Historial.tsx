
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
    ChevronsRight,
    Calendar
} from "lucide-react";
import { utils, writeFile } from "xlsx";

export default function HistorialTelefonia() {
    const [searchTerm, setSearchTerm] = useState("");

    // Filters
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        telefoniaStore.fetchSolicitudes();
    }, []);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, startDate, endDate]);

    // Filter Logic
    const getFilteredTickets = () => {
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

            // 3. Date Range Filter
            if (startDate || endDate) {
                const ticketDate = new Date(t.created_at).setHours(0, 0, 0, 0);

                if (startDate) {
                    const start = new Date(startDate).setHours(0, 0, 0, 0);
                    if (ticketDate < start) return false;
                }

                if (endDate) {
                    const end = new Date(endDate).setHours(23, 59, 59, 999);
                    if (ticketDate > end) return false;
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
            await generateTicketPDF(ticket);
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
            "Fundo/Planta", "Cultivo", "Centro Costo", "Categoría",
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
            "DNI Beneficiario": t.beneficiario_dni || "",
            "Nombre Beneficiario": t.beneficiario_nombre || "",
            "Área": t.beneficiario_area || "",
            "Puesto": t.beneficiario_puesto || "",
            "Motivo Solicitud": t.tipo_solicitud || "Línea Nueva",
            "Tipo Servicio": t.tipo_servicio || "",
            "Justificación": t.justificacion || "",
            "Fundo/Planta": t.fundo_planta || "",
            "Cultivo": t.cultivo || "",
            "Centro Costo": t.ceco || "",
            "Categoría": t.categoria || "",
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
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-300">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Historial de Solicitudes</h1>
                    <p className="text-gray-500 text-sm">Registro histórico y descarga de reportes</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                    {/* Excel Export Button */}
                    <button
                        onClick={handleDownloadExcel}
                        disabled={tickets.length === 0}
                        className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Exportar Excel
                    </button>

                    <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                    {/* Date Range Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-300 p-1">
                            <span className="text-xs font-medium text-gray-500 px-2 uppercase tracking-wide flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Desde
                            </span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-white border-l border-gray-300 text-sm py-1 px-2 focus:outline-none focus:ring-0 rounded-r-none h-8 w-32"
                            />
                        </div>

                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-300 p-1">
                            <span className="text-xs font-medium text-gray-500 px-2 uppercase tracking-wide flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Hasta
                            </span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-white border-l border-gray-300 text-sm py-1 px-2 focus:outline-none focus:ring-0 rounded-r-none h-8 w-32"
                            />
                        </div>

                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(""); setEndDate(""); }}
                                className="text-xs text-red-500 hover:text-red-700 underline px-1"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>

                    <div className="relative w-full md:w-64">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>
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
                                <th className="px-4 py-3">Beneficiario</th>
                                <th className="px-4 py-3">Área / Puesto</th>
                                <th className="px-4 py-3">Detalle</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {displayedTickets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 italic">
                                        No se encontraron registros
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
                                        <td className="px-4 py-3 text-gray-600">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-blue-600">{t.tipo_solicitud || "Línea Nueva"}</span>
                                                <span className="text-xs">{t.tipo_servicio}</span>
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
