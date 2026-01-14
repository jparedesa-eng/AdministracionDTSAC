import { useEffect, useState } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { Solicitud } from "../../store/telefoniaStore";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { UserCheck, Check, X, FileDown } from "lucide-react";
import { generateTicketPDF } from "../../utils/pdfGeneratorTelefonia";
import { TicketDetailContent } from "../../components/telefonia/TicketDetailContent.tsx";

import { useAuth } from "../../auth/AuthContext";

export default function AprobacionGerencia() {
    const { profile } = useAuth();
    const [toast, setToast] = useState<ToastState>(null);
    const [selectedTicket, setSelectedTicket] = useState<Solicitud | null>(null);
    const [viewMode, setViewMode] = useState<"pending" | "history">("pending");

    const loadData = async () => {
        try {
            await telefoniaStore.fetchSolicitudes();
        } catch (e: any) {
            setToast({ type: "error", message: "Error cargando datos" });
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const pendingTickets = telefoniaStore.solicitudes.filter(t => t.estado === "Pendiente Gerencia");
    const historyTickets = telefoniaStore.solicitudes.filter(t => t.estado !== "Pendiente Gerencia");

    const displayedTickets = viewMode === "pending" ? pendingTickets : historyTickets;

    const handleOpenTicket = (ticket: Solicitud) => {
        setSelectedTicket(ticket);
    };

    const handleDecision = async (approved: boolean) => {
        if (!selectedTicket) return;

        try {
            await telefoniaStore.updateSolicitud(selectedTicket.id, {
                aprobacion_gerencia: approved,
                fecha_aprobacion_gerencia: new Date().toISOString(),
                aprobacion_gerencia_nombre: approved ? (profile?.nombre || "Gerencia") : null,
                estado: approved ? "Pendiente Admin" : "Rechazada"
            });

            setToast({ type: "success", message: approved ? "Solicitud Aprobada" : "Solicitud Rechazada" });
            setSelectedTicket(null);
            loadData();
        } catch (e: any) {
            setToast({ type: "error", message: e.message || "Error al procesar" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Aprobación Gerencia Área Usuaria</h1>
                    <p className="text-gray-500 text-sm">Validación por parte del área solicitante</p>
                </div>
                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    {pendingTickets.length} Pendientes
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex justify-center">
                <div className="bg-gray-100 p-1 rounded-lg inline-flex">
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
            </div>

            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            {/* CARD VIEW (FULL WIDTH ROW STYLE) */}
            <div className="flex flex-col gap-3">
                {displayedTickets.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                            <CheckCircleIcon className="w-12 h-12 text-blue-100 mb-2" />
                            <p>No hay solicitudes {viewMode === "pending" ? "pendientes de aprobación" : "en el historial"}</p>
                        </div>
                    </div>
                ) : (
                    displayedTickets.map(t => (
                        <div
                            key={t.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-all group"
                        >
                            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                                {/* LEFT: Solicitante */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                            {new Date(t.created_at).toLocaleDateString()}
                                        </span>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                            {t.alternativa_modelo || "Sin Obs. IT"}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900 truncate" title={t.beneficiario_nombre || ""}>
                                        {t.beneficiario_nombre}
                                    </h3>
                                    <p className="text-sm text-gray-500">{t.beneficiario_puesto}</p>
                                    {viewMode === "history" && (
                                        <div className="mt-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${t.estado === "Rechazada" ? "bg-red-50 text-red-700 border-red-100" :
                                                t.estado === "Pendiente Admin" ? "bg-green-50 text-green-700 border-green-100" :
                                                    "bg-gray-50 text-gray-700 border-gray-100"
                                                }`}>
                                                {t.estado}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* MIDDLE: Detalle */}
                                <div className="md:w-2/5 md:border-l md:border-r border-gray-100 md:px-6 py-2 md:py-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="text-xs text-gray-500 uppercase tracking-wide">Solicitud</span>
                                        <span className="text-sm font-bold text-blue-700">{t.beneficiario_n_linea_ref || "Línea Nueva"}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="text-xs text-gray-500 uppercase tracking-wide">Servicio Solicitado</span>
                                        <span className="text-sm font-semibold text-gray-900">{t.tipo_servicio}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 italic bg-gray-50 p-2 rounded border border-gray-100 line-clamp-1" title={t.justificacion || ""}>
                                        {t.justificacion}
                                    </p>
                                </div>

                                {/* RIGHT: Action */}
                                <div className="w-full md:w-auto">
                                    <button
                                        onClick={() => handleOpenTicket(t)}
                                        className="w-full md:w-auto px-6 py-2.5 bg-white text-blue-700 font-medium text-sm rounded-lg border border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center gap-2"
                                    >
                                        <UserCheck className="w-4 h-4" />
                                        {viewMode === "pending" ? "Decidir Aprobación" : "Ver Detalle"}
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
                    title={`Autorización: ${selectedTicket.beneficiario_nombre}`}
                    size="lg"
                >
                    <div className="space-y-6 pr-2">
                        <div className="pt-2">
                            <TicketDetailContent ticket={selectedTicket} />
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-gray-100 sticky bottom-0 bg-white">
                            {viewMode === "pending" ? (
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => handleDecision(false)}
                                            className="flex-1 bg-white border-2 border-red-100 text-red-600 rounded-xl py-2.5 font-medium hover:bg-red-50 hover:border-red-200 transition-all flex justify-center items-center gap-2"
                                        >
                                            <X className="w-5 h-5" />
                                            Rechazar
                                        </button>
                                        <button
                                            onClick={() => handleDecision(true)}
                                            className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 font-medium hover:bg-blue-700 shadow-sm transition-all flex justify-center items-center gap-2"
                                        >
                                            <Check className="w-5 h-5" />
                                            Aprobar Solicitud
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setSelectedTicket(null)}
                                        className="w-full py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {selectedTicket.estado === "Entregado" && (
                                        <button
                                            onClick={() => generateTicketPDF(selectedTicket)}
                                            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
                                        >
                                            <FileDown className="w-5 h-5" />
                                            Exportar Ticket PDF
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSelectedTicket(null)}
                                        className="w-full py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Cerrar Detalle
                                    </button>
                                </div>
                            )}

                            {viewMode === "pending" && (
                                <p className="text-xs text-center text-gray-400 mt-2">
                                    Al aprobar, la solicitud pasará a Administración para gestión.
                                </p>
                            )}
                        </div>
                    </div>
                </Modal>
            )
            }
        </div >
    );
}

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}
