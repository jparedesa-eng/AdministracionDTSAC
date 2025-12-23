import { useEffect, useState } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { Solicitud, Equipo } from "../../store/telefoniaStore";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { Settings, Smartphone, Save, AlertCircle } from "lucide-react";

export default function AprobacionIT() {
    const [toast, setToast] = useState<ToastState>(null);
    const [selectedTicket, setSelectedTicket] = useState<Solicitud | null>(null);
    const [equiposDisponibles, setEquiposDisponibles] = useState<Equipo[]>([]);

    // Action Form Data
    const [actionData, setActionData] = useState({
        alternativa: "",
        equipoId: "",
    });

    const loadData = async () => {
        try {
            await telefoniaStore.fetchSolicitudes();
            await telefoniaStore.fetchEquipos();
            setEquiposDisponibles(telefoniaStore.equipos.filter(e => e.estado === "Disponible"));
        } catch (e: any) {
            setToast({ type: "error", message: "Error cargando datos" });
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const pendingTickets = telefoniaStore.solicitudes.filter(t => t.estado === "Pendiente IT");

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
                equipo_asignado_id: actionData.equipoId || null,
                estado: "Pendiente Gerencia"
            });

            // Update Equipment Status if assigned
            if (actionData.equipoId) {
                await telefoniaStore.updateEquipo(actionData.equipoId, { estado: "Asignado" });
            }

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

            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Fecha</th>
                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Solicitante</th>
                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Detalle</th>
                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Area</th>
                            <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {pendingTickets.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <CheckCircleIcon className="w-12 h-12 text-green-100 mb-2" />
                                        <p>No hay tickets pendientes de revisión IT</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            pendingTickets.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(t.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{t.beneficiario_nombre}</div>
                                        <div className="text-xs text-gray-500">DNI: {t.beneficiario_dni}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-900">{t.tipo_servicio}</div>
                                        <div className="text-xs text-gray-500">{t.cantidad_lineas} Línea(s)</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {t.beneficiario_area}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleOpenTicket(t)}
                                            className="text-purple-600 hover:text-purple-900 font-medium text-xs bg-purple-50 px-3 py-1 rounded-lg transition-colors border border-purple-100 hover:border-purple-200"
                                        >
                                            Revisar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Asignar Equipo (Inventario)</label>
                                <select
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm border p-2"
                                    value={actionData.equipoId}
                                    onChange={(e) => {
                                        const eq = equiposDisponibles.find(x => x.id === e.target.value);
                                        setActionData({
                                            ...actionData,
                                            equipoId: e.target.value,
                                            // Auto-fill alternativa if not manually set? Maybe better to keep separate.
                                            alternativa: eq ? `${eq.marca} ${eq.modelo}` : actionData.alternativa
                                        });
                                    }}
                                >
                                    <option value="">-- Sin asignar equipo físico aún --</option>
                                    {equiposDisponibles.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.marca} {e.modelo} | IMEI: {e.imei}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Seleccione un equipo disponible del inventario si corresponde.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Alternativa / Nota Técnica / Modelo Sugerido</label>
                                <input
                                    type="text"
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm border p-2"
                                    placeholder="Ej. Samsung Galaxy A54 5G"
                                    value={actionData.alternativa}
                                    onChange={(e) => setActionData({ ...actionData, alternativa: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Especifique el modelo sugerido para aprobación de gerencia si no hay stock.</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t flex justify-end gap-3">
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
                        </div>
                    </div>
                </Modal>
            )}
        </div>
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
