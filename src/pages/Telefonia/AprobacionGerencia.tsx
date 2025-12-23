import { useEffect, useState } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { Solicitud } from "../../store/telefoniaStore";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { UserCheck, Check, X, AlertCircle } from "lucide-react";

export default function AprobacionGerencia() {
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

    const pendingTickets = telefoniaStore.solicitudes.filter(t => t.estado === "Pendiente Gerencia");

    const handleOpenTicket = (ticket: Solicitud) => {
        setSelectedTicket(ticket);
    };

    const handleDecision = async (approved: boolean) => {
        if (!selectedTicket) return;

        try {
            await telefoniaStore.updateSolicitud(selectedTicket.id, {
                aprobacion_gerencia: approved,
                fecha_aprobacion_gerencia: new Date().toISOString(),
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
                    <h1 className="text-2xl font-bold text-gray-900">Aprobación Gerencia</h1>
                    <p className="text-gray-500 text-sm">Revisión y autorización de solicitudes de telefonía</p>
                </div>
                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
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
                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Equipo/Servicio</th>
                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Validación IT</th>
                            <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {pendingTickets.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <CheckCircleIcon className="w-12 h-12 text-blue-100 mb-2" />
                                        <p>No hay solicitudes pendientes de aprobación gerencial</p>
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
                                        <div className="text-xs text-gray-500">{t.beneficiario_puesto}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-900">{t.tipo_servicio}</div>
                                        <div className="text-xs text-gray-500">Justificación: {t.justificacion?.substring(0, 30)}...</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {t.alternativa_modelo || "Sin Obs. IT"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleOpenTicket(t)}
                                            className="text-blue-600 hover:text-blue-900 font-medium text-xs bg-blue-50 px-3 py-1 rounded-lg transition-colors border border-blue-100 hover:border-blue-200"
                                        >
                                            Decidir
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
                    title={`Autorización: ${selectedTicket.beneficiario_nombre}`}
                >
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2 border border-gray-100">
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-gray-500" /> Detalle de Solicitud
                            </h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                <p><span className="text-gray-500">Solicitante:</span> {selectedTicket.beneficiario_nombre}</p>
                                <p><span className="text-gray-500">Área:</span> {selectedTicket.beneficiario_area}</p>
                                <p><span className="text-gray-500">Puesto:</span> {selectedTicket.beneficiario_puesto}</p>
                                <p><span className="text-gray-500">Periodo:</span> {selectedTicket.periodo_uso}</p>
                            </div>
                            <div className="pt-2 border-t border-gray-200 mt-2">
                                <p className="mb-1"><span className="text-gray-500">Propuesta IT / Modelo:</span></p>
                                <div className="bg-white border border-gray-200 p-2 rounded text-gray-800 font-medium">
                                    {selectedTicket.alternativa_modelo || "Sin especificación técnica específica"}
                                </div>
                            </div>
                            <div className="pt-2 border-t border-gray-200 mt-2">
                                <p><span className="text-gray-500">Justificación del Usuario:</span></p>
                                <p className="text-gray-800 italic mt-1">{selectedTicket.justificacion}</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
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
                                    className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 shadow-md transition-all flex justify-center items-center gap-2"
                                >
                                    <Check className="w-5 h-5" />
                                    Aprobar
                                </button>
                            </div>
                            <p className="text-xs text-center text-gray-400">
                                Al aprobar, la solicitud pasará a Administración para compra o despacho.
                            </p>
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
