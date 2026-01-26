import { useEffect, useState } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { Solicitud } from "../../store/telefoniaStore";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { CheckCircle2, ShoppingCart, X, FileDown, Calendar, AlertTriangle } from "lucide-react";
import { generateTicketPDF } from "../../utils/pdfGeneratorTelefonia";
import { TicketDetailContent } from "../../components/telefonia/TicketDetailContent.tsx";

import { useAuth } from "../../auth/AuthContext";

export default function AprobacionAdmin() {
    const { profile, user } = useAuth();
    const [toast, setToast] = useState<ToastState>(null);
    const [selectedTicket, setSelectedTicket] = useState<Solicitud | null>(null);
    const [selectedBaja, setSelectedBaja] = useState<any | null>(null); // Type 'Baja' if imported
    const [viewMode, setViewMode] = useState<"pending" | "history" | "bajas">("pending");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showHistory, setShowHistory] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            await telefoniaStore.fetchSolicitudes();
            await telefoniaStore.fetchBajas();
        } catch (e: any) {
            setToast({ type: "error", message: "Error cargando datos" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Logic: Pending shows all. History requires filter.
    const getDisplayedTickets = () => {
        if (viewMode === "pending") {
            return telefoniaStore.solicitudes.filter(t => t.estado === "Pendiente Admin");
        }
        if (viewMode === "bajas") {
            return []; // Handled separately
        }

        // History Mode
        if (!showHistory) return [];

        return telefoniaStore.solicitudes.filter(t => {
            if (t.estado === "Pendiente Admin") return false;

            // Date Filter
            if (!startDate || !endDate) return false;

            const ticketDate = new Date(t.created_at);
            // Normalize dates to ignore time for inclusive comparison
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);

            return ticketDate >= start && ticketDate <= end;
        });
    };

    const displayedTickets = getDisplayedTickets();
    const displayedBajas = viewMode === "bajas"
        ? telefoniaStore.bajas.filter(b => b.estado === 'Pendiente')
        : [];

    const handleFilter = () => {
        if (!startDate || !endDate) {
            setToast({ type: "warning", message: "Seleccione fecha inicial y final" });
            return;
        }
        setShowHistory(true);
    };

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

    const handleBajaDecision = async (approved: boolean) => {
        if (!selectedBaja) return;
        try {
            if (!user?.id) throw new Error("Usuario no identificado");

            await telefoniaStore.procesarBaja(
                selectedBaja.id,
                selectedBaja.equipo_id,
                approved ? 'APROBAR' : 'RECHAZAR',
                {
                    id: user.id,
                    dni: profile?.dni || "",
                    nombre: profile?.nombre || "Admin"
                }
            );
            setToast({ type: "success", message: approved ? "Baja Aprobada" : "Solicitud Rechazada" });
            setSelectedBaja(null);
            await loadData();
        } catch (error: any) {
            setToast({ type: "error", message: error.message || "Error al procesar baja" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Aprobación Gerencia Administración</h1>
                    <p className="text-gray-500 text-sm">Validación final y autorización de despacho / bajas</p>
                </div>
                <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {viewMode === "pending" ? `${displayedTickets.length} Solicitudes Pendientes` :
                        viewMode === "bajas" ? `${displayedBajas.length} Bajas Pendientes` :
                            "Historial de Aprobaciones"}
                </div>
            </div>

            {/* View Toggle & Filter */}
            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => { setViewMode("pending"); setShowHistory(false); }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "pending"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Solicitudes
                    </button>
                    <button
                        onClick={() => { setViewMode("bajas"); setShowHistory(false); }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === "bajas"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Bajas
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

                {viewMode === "history" && (
                    <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-300 p-1">
                            <span className="text-xs font-medium text-gray-500 px-2">DESDE</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setShowHistory(false); }}
                                className="bg-white border-l border-gray-300 text-sm py-1 px-2 focus:outline-none focus:ring-0 rounded-r-none h-8"
                            />
                        </div>
                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-300 p-1">
                            <span className="text-xs font-medium text-gray-500 px-2">HASTA</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setShowHistory(false); }}
                                className="bg-white border-l border-gray-300 text-sm py-1 px-2 focus:outline-none focus:ring-0 rounded-r-none h-8"
                            />
                        </div>
                        <button
                            onClick={handleFilter}
                            className="px-4 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Filtrar
                        </button>
                    </div>
                )}
            </div>

            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            {/* CARD VIEW */}
            <div className="flex flex-col gap-3">
                {loading ? (
                    <div className="py-12 text-center text-gray-500">
                        <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                            <span className="ml-2">Cargando solicitudes...</span>
                        </div>
                    </div>
                ) : (viewMode === "history" && !showHistory) ? (
                    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-500">
                        <p>Seleccione un rango de fechas y haga clic en "Filtrar" para ver el historial.</p>
                    </div>
                ) : (viewMode === 'bajas' ? displayedBajas.length === 0 : displayedTickets.length === 0) ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                            <ShoppingCart className="w-12 h-12 text-gray-200 mb-2" />
                            <p>No se encontraron registros {viewMode === "pending" || viewMode === 'bajas' ? "pendientes" : "en este periodo"}</p>
                        </div>
                    </div>
                ) : viewMode === 'bajas' ? (
                    // BAJAS LIST
                    displayedBajas.map(b => (
                        <div key={b.id} className="bg-white border border-red-100 rounded-xl p-4 hover:border-red-300 transition-colors shadow-sm">
                            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                                            BAJA DE EQUIPO
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(b.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900">{b.equipo?.marca} {b.equipo?.modelo}</h3>
                                    <p className="text-sm text-gray-500">IMEI: {b.equipo?.imei}</p>

                                    <div className="mt-2 text-sm bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        <span className="font-semibold text-gray-700 block text-xs mb-1">MOTIVO:</span>
                                        {b.motivo}
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400">
                                        Solicitado por: <b>{b.nombre_solicitante || "Usuario"}</b> (DNI: {b.dni_solicitante || "-"})
                                    </div>
                                </div>
                                <div className="w-full md:w-auto">
                                    <button
                                        onClick={() => setSelectedBaja(b)}
                                        className="w-full md:w-auto px-6 py-2.5 bg-red-50 text-red-700 font-medium text-sm rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                                    >
                                        Revisar Baja
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    // SOLICITUDES LIST
                    displayedTickets.map(t => (
                        <div
                            key={t.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-amber-300 transition-colors"
                        >
                            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                                {/* LEFT: Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-gray-400" />
                                                {new Date(t.created_at).toLocaleDateString()}</span>
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
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-xs text-gray-400">RESPONSABLE DEL LA SOLICITUD</p>
                                    </div>
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
                                        <span className="font-bold text-blue-700">{t.tipo_solicitud || "Línea Nueva"}</span>
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
                                        className="w-full md:w-auto px-6 py-2.5 bg-amber-50 text-amber-700 font-medium text-sm rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
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

            {selectedBaja && (
                <Modal
                    open={!!selectedBaja}
                    onClose={() => setSelectedBaja(null)}
                    title="Aprobar Baja de Equipo"
                    size="md"
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-red-800">
                            <AlertTriangle className="w-8 h-8 mb-2 mx-auto" />
                            <p className="text-center font-medium">¿Está seguro de aprobar la baja definitiva?</p>
                            <p className="text-center text-sm mt-1">El equipo pasará a estado <b>BAJA</b> y saldrà del inventario activo.</p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-bold text-gray-900 mb-2">{selectedBaja.equipo?.marca} {selectedBaja.equipo?.modelo}</h4>
                            <p className="text-sm"><b>IMEI:</b> {selectedBaja.equipo?.imei}</p>
                            <p className="text-sm mt-2"><b>Motivo:</b> {selectedBaja.motivo}</p>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => handleBajaDecision(false)}
                                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                            >
                                Rechazar (Restaurar)
                            </button>
                            <button
                                onClick={() => handleBajaDecision(true)}
                                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-bold shadow-lg"
                            >
                                APROBAR BAJA
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
