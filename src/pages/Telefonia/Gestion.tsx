import { useEffect, useState } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { Solicitud } from "../../store/telefoniaStore";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { LoadingScreen } from "../../components/ui/LoadingScreen";
import {
    Clock,
    Truck,
    Search,
    FileText,
    CheckCircle2,
    Calendar,
    User
} from "lucide-react";

export default function GestionTelefonia() {
    const [activeTab, setActiveTab] = useState("entrega"); // entrega, historial
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Selected ticket for handling
    const [selectedTicket, setSelectedTicket] = useState<Solicitud | null>(null);
    const [entregaData, setEntregaData] = useState({ recibidoPor: "" });

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

    const submitEntrega = async () => {
        if (!selectedTicket) return;
        try {
            await telefoniaStore.updateSolicitud(selectedTicket.id, {
                fecha_entrega: new Date().toISOString(),
                recibido_por: entregaData.recibidoPor,
                estado: "Entregado"
            });
            setToast({ type: "success", message: "Entrega registrada correctamente" });
            setSelectedTicket(null);
            loadData();
        } catch (e: any) {
            setToast({ type: "error", message: e.message });
        }
    };

    // --- FILTERING ---
    const filteredTickets = telefoniaStore.solicitudes.filter(t => {
        const matchesTab = activeTab === "entrega"
            ? t.estado === "Programar Entrega"
            : true; // Historial shows everything (or just finished ones, strictly usually history shows everything or processed ones)

        const search = searchTerm.toLowerCase();
        const matchesSearch =
            t.beneficiario_nombre?.toLowerCase().includes(search) ||
            t.beneficiario_dni?.toLowerCase().includes(search) ||
            t.beneficiario_area?.toLowerCase().includes(search);

        return matchesTab && matchesSearch;
    });

    const StatusBadge = ({ estado }: { estado: string }) => {
        let color = "bg-gray-100 text-gray-800";
        if (estado.includes("IT")) color = "bg-purple-100 text-purple-800";
        if (estado.includes("Gerencia")) color = "bg-blue-100 text-blue-800";
        if (estado.includes("Admin")) color = "bg-amber-100 text-amber-800";
        if (estado === "Programar Entrega") color = "bg-indigo-100 text-indigo-800";
        if (estado === "Entregado") color = "bg-emerald-100 text-emerald-800";
        if (estado === "Rechazada") color = "bg-rose-100 text-rose-800";

        return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{estado}</span>
    };

    if (loading && telefoniaStore.solicitudes.length === 0) {
        return <LoadingScreen text="Cargando solicitudes..." />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Entregas y Archivo</h1>
                    <p className="text-gray-500 text-sm">Control de entregas y consulta de historial general</p>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, DNI..."
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                </div>
            </div>

            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            {/* TABS */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab("entrega")}
                        className={`${activeTab === "entrega"
                            ? "border-indigo-500 text-indigo-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <Truck className="h-4 w-4" />
                        Entregas Pendientes
                        {telefoniaStore.solicitudes.filter(t => t.estado === "Programar Entrega").length > 0 && (
                            <span className="bg-indigo-100 text-indigo-600 py-0.5 px-2 rounded-full text-xs">
                                {telefoniaStore.solicitudes.filter(t => t.estado === "Programar Entrega").length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("historial")}
                        className={`${activeTab === "historial"
                            ? "border-indigo-500 text-indigo-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <Clock className="h-4 w-4" />
                        Historial Completo
                    </button>
                </nav>
            </div>

            {/* TABLE */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Solicitante</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Tipo Servicio</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Equipo Asignado</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Estado</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredTickets.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FileText className="w-12 h-12 text-gray-200 mb-2" />
                                            <p>No se encontraron registros</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTickets.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{t.beneficiario_nombre || "N/A"}</div>
                                            <div className="text-gray-500 text-xs">DNI: {t.beneficiario_dni}</div>
                                            <div className="text-gray-400 text-xs">{t.beneficiario_area}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-900">{t.tipo_servicio}</div>
                                            <div className="text-gray-500 text-xs">{t.cantidad_lineas} Línea(s)</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {t.equipo ? (
                                                <>
                                                    <div className="text-gray-900">{t.equipo.marca} {t.equipo.modelo}</div>
                                                    <div className="text-xs text-gray-500">IMEI: {t.equipo.imei}</div>
                                                </>
                                            ) : (
                                                <span className="text-gray-400 italic">No asignado</span>
                                            )}
                                            {t.alternativa_modelo && !t.equipo && (
                                                <div className="text-xs text-indigo-600 mt-1">Sugerido: {t.alternativa_modelo}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge estado={t.estado} />
                                            {t.fecha_entrega && (
                                                <div className="text-xs text-green-700 mt-1 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    {new Date(t.fecha_entrega).toLocaleDateString()}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {t.estado === "Programar Entrega" ? (
                                                <button
                                                    onClick={() => setSelectedTicket(t)}
                                                    className="text-white hover:bg-indigo-700 bg-indigo-600 font-medium text-xs px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                                                >
                                                    Entregar
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setSelectedTicket(t)}
                                                    className="text-gray-600 hover:text-gray-900 font-medium text-xs bg-gray-100 px-3 py-1 rounded-lg transition-colors hover:bg-gray-200"
                                                >
                                                    Ver Detalle
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DETALLE / ENTREGA */}
            {selectedTicket && (
                <Modal
                    open={!!selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    title={selectedTicket.estado === "Programar Entrega" ? "Confirmar Entrega" : "Detalle de Solicitud"}
                >
                    <div className="space-y-6">
                        {/* INFO HEADER */}
                        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                    {selectedTicket.beneficiario_nombre?.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">{selectedTicket.beneficiario_nombre}</h3>
                                    <p className="text-xs text-gray-500">{selectedTicket.beneficiario_puesto}</p>
                                </div>
                            </div>
                            <StatusBadge estado={selectedTicket.estado} />
                        </div>

                        {/* INFO GRID */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                                <p className="text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Periodo</p>
                                <p className="font-medium text-gray-900">{selectedTicket.periodo_uso}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-gray-500 flex items-center gap-1"><Truck className="w-3 h-3" /> Fundo / Planta</p>
                                <p className="font-medium text-gray-900">{selectedTicket.fundo_planta}</p>
                            </div>
                            <div className="col-span-2 space-y-1 pt-2">
                                <p className="text-gray-500">Justificación</p>
                                <p className="bg-gray-50 p-2 rounded text-gray-700 italic">{selectedTicket.justificacion}</p>
                            </div>
                            {selectedTicket.aplicativos && selectedTicket.aplicativos.length > 0 && (
                                <div className="col-span-2 space-y-1 pt-2">
                                    <p className="text-gray-500">Aplicativos Instalados</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedTicket.aplicativos.map(app => (
                                            <span key={app} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs border border-indigo-100">{app}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ENTREGA ACTION */}
                        {selectedTicket.estado === "Programar Entrega" ? (
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 space-y-4">
                                <div className="flex items-center gap-2 text-green-800 font-medium">
                                    <Truck className="w-5 h-5" />
                                    Registrar Entrega
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Entregado a / Recibido por:</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <input
                                            className="block w-full pl-9 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm border p-2"
                                            placeholder="Nombre completo o DNI"
                                            value={entregaData.recibidoPor}
                                            onChange={(e) => setEntregaData({ recibidoPor: e.target.value })}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Confirme quien recibe el equipo físico o chip.</p>
                                </div>
                                <button
                                    onClick={submitEntrega}
                                    disabled={!entregaData.recibidoPor}
                                    className="w-full bg-green-600 text-white rounded-lg py-2 font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                                >
                                    Confirmar y Finalizar
                                </button>
                            </div>
                        ) : (
                            selectedTicket.estado === "Entregado" && (
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-600">
                                    <p><strong className="text-gray-900">Entregado el:</strong> {new Date(selectedTicket.fecha_entrega!).toLocaleString()}</p>
                                    <p><strong className="text-gray-900">Recibido por:</strong> {selectedTicket.recibido_por}</p>
                                </div>
                            )
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}

