import { useEffect, useState } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { Solicitud } from "../../store/telefoniaStore";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { Settings, Smartphone, Save, AlertCircle, CheckCircleIcon as CheckCircle, UserCheck } from "lucide-react";
export default function AprobacionIT() {
    const [toast, setToast] = useState<ToastState>(null);
    const [selectedTicket, setSelectedTicket] = useState<Solicitud | null>(null);
    const [viewMode, setViewMode] = useState<"pending" | "history">("pending");

    // Action Form Data
    const [actionData, setActionData] = useState({
        alternativa: "",
        equipoId: "",
    });

    const loadData = async () => {
        try {
            await telefoniaStore.fetchSolicitudes();
            await telefoniaStore.fetchEquipos(); // Keep fetching equipments if needed elsewhere, or remove if unused. 
            await telefoniaStore.fetchModelos(); // Fetch Catalog
        } catch (e: any) {
            setToast({ type: "error", message: "Error cargando datos" });
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // FILTER: Only show "Línea Nueva" for IT Approval, per user request.
    const pendingTickets = telefoniaStore.solicitudes.filter(t => t.estado === "Pendiente IT" && t.tipo_solicitud === "Línea Nueva");
    const historyTickets = telefoniaStore.solicitudes.filter(t => t.estado !== "Pendiente IT" && t.tipo_solicitud === "Línea Nueva");

    const displayedTickets = viewMode === "pending" ? pendingTickets : historyTickets;

    const handleOpenTicket = (ticket: Solicitud) => {
        setSelectedTicket(ticket);
        setActionData({
            alternativa: ticket.alternativa_modelo || "",
            equipoId: ticket.equipo_asignado_id || "",
        });
    };

    const handleSubmit = async () => {
        if (!selectedTicket) return;

        try {
            // Update Ticket
            await telefoniaStore.updateSolicitud(selectedTicket.id, {
                alternativa_modelo: actionData.alternativa,
                estado: "Pendiente Gerencia"
            });

            setToast({ type: "success", message: "Ticket derivado a Gerencia correctamente" });
            setSelectedTicket(null);
            loadData(); // Reload to refresh lists
        } catch (e: any) {
            setToast({ type: "error", message: e.message || "Error al procesar" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Aprobación IT</h1>
                    <p className="text-gray-500 text-sm">Gestionar asignación de equipos y especificaciones técnicas</p>
                </div>
                <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4" />
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
                            <CheckCircle className="w-12 h-12 text-blue-100 mb-2" />
                            <p>No hay tickets {viewMode === "pending" ? "pendientes de revisión" : "en el historial"}</p>
                        </div>
                    </div>
                ) : (
                    displayedTickets.map(t => (
                        <div
                            key={t.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                                {/* LEFT: Info Principal */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">
                                            {new Date(t.created_at).toLocaleDateString()}
                                        </span>
                                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                            {t.tipo_servicio}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900 truncate" title={t.beneficiario_nombre || ""}>
                                        {t.beneficiario_nombre}
                                    </h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-2">
                                        <span title={t.beneficiario_dni || ""}>DNI: {t.beneficiario_dni}</span>
                                        <span className="text-gray-300">|</span>
                                        <span className="truncate">{t.beneficiario_area}</span>
                                    </p>
                                    {viewMode === "history" && (
                                        <div className="mt-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${t.estado === "Rechazada" ? "bg-red-50 text-red-700 border-red-100" :
                                                t.estado === "Entregado" ? "bg-green-50 text-green-700 border-green-100" :
                                                    "bg-gray-50 text-gray-700 border-gray-100"
                                                }`}>
                                                {t.estado}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* MIDDLE: Context */}
                                <div className="md:w-1/3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Justificación</p>
                                    <p className="text-sm text-gray-700 italic line-clamp-2" title={t.justificacion || ""}>
                                        "{t.justificacion}"
                                    </p>
                                </div>

                                {/* RIGHT: Actions */}
                                <div className="w-full md:w-auto flex flex-col items-end gap-2">
                                    <button
                                        onClick={() => handleOpenTicket(t)}
                                        className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        <UserCheck className="w-4 h-4" />
                                        {viewMode === "pending" ? "Revisar Solicitud" : "Ver Detalle"}
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
                    title={`Revisión IT: ${selectedTicket.beneficiario_nombre}`}
                >
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2 border border-gray-100">
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-gray-500" /> Detalle de Solicitud
                            </h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                <p><span className="text-gray-500">Puesto:</span> {selectedTicket.beneficiario_puesto}</p>
                                <p><span className="text-gray-500">Línea Ref:</span> {selectedTicket.tipo_solicitud || "N/A"}</p>
                                <p><span className="text-gray-500">Periodo:</span> {selectedTicket.periodo_uso}</p>
                                <p><span className="text-gray-500">Fundo/Planta:</span> {selectedTicket.fundo_planta}</p>
                                <p><span className="text-gray-500">Cultivo:</span> {selectedTicket.cultivo}</p>
                            </div>
                            <div className="pt-2 border-t border-gray-200 mt-2">
                                <p><span className="text-gray-500">Justificación:</span> <span className="text-gray-800 italic">{selectedTicket.justificacion}</span></p>
                            </div>
                            <div className="pt-2 border-t border-gray-200 mt-2">
                                <p><span className="text-gray-500">Aplicativos:</span> {selectedTicket.aplicativos?.join(", ") || "Ninguno"}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-purple-600" /> Asignación de Recursos
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo / Equipo Sugerido</label>
                                <div className="space-y-2">
                                    <select
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm border p-2"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                // Directly set the selected model name
                                                setActionData({
                                                    ...actionData,
                                                    alternativa: e.target.value
                                                });
                                            }
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="">-- Seleccionar del Catálogo de Modelos --</option>
                                        {telefoniaStore.modelos.map(m => (
                                            <option key={m.id} value={`${m.marca} ${m.nombre}`}>
                                                {m.marca} {m.nombre}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="text"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm border p-2"
                                        placeholder="Especifique el modelo a comprar o asignar..."
                                        value={actionData.alternativa}
                                        onChange={(e) => setActionData({ ...actionData, alternativa: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500">
                                        Esta acción solo sugiere el equipo. La asignación física real se realizará en el momento de la entrega.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t flex justify-end gap-3">
                            {viewMode === "pending" ? (
                                <>
                                    <button
                                        onClick={() => setSelectedTicket(null)}
                                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center gap-2 shadow-sm"
                                    >
                                        <Save className="w-4 h-4" />
                                        Guardar y Derivar
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
                                >
                                    Cerrar
                                </button>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
