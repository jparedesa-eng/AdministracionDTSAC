import { useEffect, useState } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { Solicitud } from "../../store/telefoniaStore";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { CheckCircle2, ShoppingCart, X, AlertCircle } from "lucide-react";

export default function AprobacionAdmin() {
    const [toast, setToast] = useState<ToastState>(null);
    const [selectedTicket, setSelectedTicket] = useState<Solicitud | null>(null);

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

    const pendingTickets = telefoniaStore.solicitudes.filter(t => t.estado === "Pendiente Admin");

    const handleOpenTicket = (ticket: Solicitud) => {
        setSelectedTicket(ticket);
    };

    const handleDecision = async (approved: boolean) => {
        if (!selectedTicket) return;

        try {
            await telefoniaStore.updateSolicitud(selectedTicket.id, {
                aprobacion_admin: approved,
                fecha_aprobacion_admin: new Date().toISOString(),
                estado: approved ? "Programar Entrega" : "Rechazada"
            });

            setToast({ type: "success", message: approved ? "Aprobado para Entrega" : "Rechazado" });
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
                    <h1 className="text-2xl font-bold text-gray-900">Aprobación Administrativa</h1>
                    <p className="text-gray-500 text-sm">Validación final y autorización de compra/despacho</p>
                </div>
                <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
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
                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Recurso Aprobado IT</th>
                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Gerencia V°B°</th>
                            <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {pendingTickets.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <ShoppingCart className="w-12 h-12 text-amber-100 mb-2" />
                                        <p>No hay tickets pendientes de administración</p>
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
                                        <div className="text-xs text-gray-500">{t.beneficiario_area}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-900 font-medium">{t.alternativa_modelo || "No especificado"}</div>
                                        <div className="text-xs text-gray-500">{t.tipo_servicio}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {t.aprobacion_gerencia ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Aprobado {new Date(t.fecha_aprobacion_gerencia!).toLocaleDateString()}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleOpenTicket(t)}
                                            className="text-amber-600 hover:text-amber-900 font-medium text-xs bg-amber-50 px-3 py-1 rounded-lg transition-colors border border-amber-100 hover:border-amber-200"
                                        >
                                            Procesar
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
                    title={`Gestión Administrativa: ${selectedTicket.beneficiario_nombre}`}
                >
                    <div className="space-y-6">
                        <div className="bg-amber-50 p-4 rounded-lg text-sm space-y-2 border border-amber-100">
                            <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600" /> Resumen de Aprobaciones
                            </h4>
                            <div className="space-y-1">
                                <p className="flex justify-between border-b border-amber-200 pb-1">
                                    <span className="text-amber-700">Validación IT:</span>
                                    <span className="font-medium text-amber-900">{selectedTicket.alternativa_modelo}</span>
                                </p>
                                <p className="flex justify-between pt-1">
                                    <span className="text-amber-700">V°B° Gerencia:</span>
                                    <span className="font-medium text-green-700">Autorizado</span>
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="text-sm text-gray-600">
                                <p className="mb-2">¿Confirma que se cuenta con el presupuesto/stock para proceder con la entrega de:</p>
                                <ul className="list-disc pl-5 space-y-1 bg-gray-50 p-3 rounded">
                                    <li><strong>Servicio:</strong> {selectedTicket.tipo_servicio}</li>
                                    <li><strong>Equipo/Módelo:</strong> {selectedTicket.alternativa_modelo}</li>
                                    <li><strong>Cantidad:</strong> {selectedTicket.cantidad_lineas} Línea(s)</li>
                                </ul>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button
                                    onClick={() => handleDecision(false)}
                                    className="flex-1 bg-white border-2 border-red-100 text-red-600 rounded-xl py-3 font-medium hover:bg-red-50 hover:border-red-200 transition-all flex justify-center items-center gap-2"
                                >
                                    <X className="w-5 h-5" />
                                    Rechazar
                                </button>
                                <button
                                    onClick={() => handleDecision(true)}
                                    className="flex-1 bg-amber-600 text-white rounded-xl py-3 font-medium hover:bg-amber-700 shadow-md transition-all flex justify-center items-center gap-2"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Autorizar Entrega
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
