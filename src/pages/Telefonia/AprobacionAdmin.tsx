import { useEffect, useState } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { Solicitud } from "../../store/telefoniaStore";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { CheckCircle2, ShoppingCart, X, FileDown } from "lucide-react";
import { generateTicketPDF } from "../../utils/pdfGeneratorTelefonia";
import { TicketDetailContent } from "../../components/telefonia/TicketDetailContent.tsx";

import { useAuth } from "../../auth/AuthContext";

export default function AprobacionAdmin() {
    const { profile } = useAuth();
    const [toast, setToast] = useState<ToastState>(null);
    const [selectedTicket, setSelectedTicket] = useState<Solicitud | null>(null);
    const [viewMode, setViewMode] = useState<"pending" | "history">("pending");
    const [selectedMonth, setSelectedMonth] = useState<string>(""); // "YYYY-MM"
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            await telefoniaStore.fetchSolicitudes();
        } catch (e: any) {
            setToast({ type: "error", message: "Error cargando datos" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const tickets = viewMode === "pending"
        ? telefoniaStore.solicitudes.filter(t => t.estado === "Pendiente Admin")
        : telefoniaStore.solicitudes.filter(t => t.estado !== "Pendiente Admin");

    // Filter by month if selected
    const filteredTickets = tickets.filter(t => {
        if (!selectedMonth) return true;
        const d = new Date(t.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === selectedMonth;
    });

    const handleOpenTicket = (ticket: Solicitud) => {
        setSelectedTicket(ticket);
    };

    const handleDecision = async (approved: boolean) => {
        if (!selectedTicket) return;

        try {
            await telefoniaStore.updateSolicitud(selectedTicket.id, {
                aprobacion_admin: approved,
                fecha_aprobacion_admin: new Date().toISOString(),
                aprobacion_admin_nombre: approved ? (profile?.nombre || "Administracion") : null,
                estado: approved ? "Programar Entrega" : "Rechazada"
            });

            setToast({ type: "success", message: approved ? "Aprobado para Entrega" : "Rechazado" });
            setSelectedTicket(null);
            await loadData(); // Reload data to refresh list
        } catch (e: any) {
            setToast({ type: "error", message: e.message || "Error al procesar" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Aprobación Gerencia Administración</h1>
                    <p className="text-gray-500 text-sm">Validación final y autorización de despacho</p>
                </div>
                <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {tickets.length} {viewMode === "pending" ? "Pendientes" : "Registros"}
                </div>
            </div>

            {/* View Toggle & Filter */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="bg-gray-100 p-1 rounded-lg inline-flex order-2 sm:order-1">
                    <button
                        onClick={() => setViewMode("pending")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "pending"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Pendientes
                    </button>
                    <button
                        onClick={() => setViewMode("history")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "history"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Historial
                    </button>
                </div>

                <div className="flex items-center gap-2 order-1 sm:order-2">
                    <span className="text-sm text-gray-500">Filtrar:</span>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                    />
                    {selectedMonth && (
                        <button
                            onClick={() => setSelectedMonth("")}
                            className="text-xs text-amber-600 hover:underline"
                        >
                            Ver Todos
                        </button>
                    )}
                </div>
            </div>

            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            {/* CARD VIEW (FULL WIDTH ROW STYLE) */}
            <div className="flex flex-col gap-3">
                {loading ? (
                    <div className="py-12 text-center text-gray-500">
                        <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                            <span className="ml-2">Cargando solicitudes...</span>
                        </div>
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                            <ShoppingCart className="w-12 h-12 text-amber-100 mb-2" />
                            <p>No hay tickets {viewMode === "pending" ? "pendientes" : "en historial"}</p>
                        </div>
                    </div>
                ) : (
                    filteredTickets.map(t => (
                        <div
                            key={t.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-amber-300 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                                {/* LEFT: Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-gray-400 border border-gray-100 bg-gray-50 px-2 py-0.5 rounded">
                                            {new Date(t.created_at).toLocaleDateString()}
                                        </span>
                                        {t.aprobacion_gerencia ? (
                                            <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded">
                                                Gerencia OK
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-300">-</span>
                                        )}
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900 truncate" title={t.beneficiario_nombre || ""}>
                                        {t.beneficiario_nombre}
                                    </h3>
                                    <p className="text-sm text-gray-500">{t.beneficiario_area}</p>
                                    {viewMode === "history" && (
                                        <div className="mt-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${t.estado === "Rechazada" ? "bg-red-50 text-red-700 border-red-100" :
                                                t.estado === "Programar Entrega" ? "bg-green-50 text-green-700 border-green-100" :
                                                    "bg-gray-50 text-gray-700 border-gray-100"
                                                }`}>
                                                {t.estado}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* MIDDLE: Specs */}
                                <div className="md:w-1/3 md:border-l md:border-r border-gray-100 md:px-6 grid grid-cols-2 gap-2 text-sm bg-gray-50 p-3 rounded-lg">
                                    <div className="col-span-2 pb-1 border-b border-gray-200 mb-1">
                                        <span className="text-xs text-gray-400 block">Tipo Solicitud</span>
                                        <span className="font-bold text-blue-700">{t.beneficiario_n_linea_ref || "Línea Nueva"}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-400 block">Servicio</span>
                                        <span className="font-medium text-gray-900">{t.tipo_servicio}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-400 block">Modelo Ap.</span>
                                        <span className="font-medium text-amber-700 truncate" title={t.alternativa_modelo || ""}>{t.alternativa_modelo || "N/A"}</span>
                                    </div>
                                </div>

                                {/* RIGHT: Action */}
                                <div className="w-full md:w-auto">
                                    <button
                                        onClick={() => handleOpenTicket(t)}
                                        className="w-full md:w-auto px-6 py-2.5 bg-amber-50 text-amber-700 font-medium text-sm rounded-lg border border-amber-100 hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ShoppingCart className="w-4 h-4" />
                                        {viewMode === "pending" ? "Gestionar Compra" : "Ver Detalle"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {selectedTicket && (
                <Modal
                    open={!!selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    title={`Gestión Administrativa: ${selectedTicket.beneficiario_nombre}`}
                    size="lg"
                >
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                        <div className="pt-2">
                            <TicketDetailContent ticket={selectedTicket} />
                        </div>

                        {/* Actions remain below */}
                        <div className="pt-4 border-t border-gray-100 sticky bottom-0 bg-white">
                            {viewMode === "pending" ? (
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleDecision(false)}
                                        className="flex-1 bg-white border-2 border-red-100 text-red-600 rounded-xl py-3 font-medium hover:bg-red-50 hover:border-red-200 transition-all flex justify-center items-center gap-2"
                                    >
                                        <X className="w-5 h-5" />
                                        Rechazar
                                    </button>
                                    <button
                                        onClick={() => handleDecision(true)}
                                        className="flex-1 bg-amber-600 text-white rounded-xl py-3 font-medium hover:bg-amber-700 shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2"
                                    >
                                        <ShoppingCart className="w-5 h-5" />
                                        Autorizar Compra/Entrega
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {selectedTicket.estado === "Entregado" && (
                                        <button
                                            onClick={() => generateTicketPDF(selectedTicket)}
                                            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
                                        >
                                            <FileDown className="w-5 h-5" />
                                            Exportar Ticket PDF
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSelectedTicket(null)}
                                        className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Cerrar Detalle
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
