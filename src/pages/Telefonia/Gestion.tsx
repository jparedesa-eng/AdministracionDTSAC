import { useEffect, useState, useRef } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { Solicitud } from "../../store/telefoniaStore";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { LoadingScreen } from "../../components/ui/LoadingScreen";
import {
    Truck,
    Search,
    Calendar,
    Eraser,
    FileDown
} from "lucide-react";
import { generateTicketPDF } from "../../utils/pdfGeneratorTelefonia";
import { TicketDetailContent } from "../../components/telefonia/TicketDetailContent.tsx";

// --- SIGNATURE PAD HOOK ---
function useSignaturePad() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const getPoint = (ev: MouseEvent | TouchEvent) => {
        const c = canvasRef.current;
        if (!c) return null;
        const rect = c.getBoundingClientRect();
        let clientX, clientY;
        if ("touches" in ev && ev.touches.length) {
            clientX = ev.touches[0].clientX;
            clientY = ev.touches[0].clientY;
        } else {
            // @ts-ignore
            clientX = ev.clientX;
            // @ts-ignore
            clientY = ev.clientY;
        }
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e: React.MouseEvent | React.TouchEvent) => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        e.preventDefault();
        const c = canvasRef.current;
        if (!c) return;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        const ev = (e as any).nativeEvent || e;
        const p = getPoint(ev);
        if (!p) return;
        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    };

    const move = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const c = canvasRef.current;
        const ctx = c?.getContext("2d");
        if (!c || !ctx) return;
        const ev = (e as any).nativeEvent || e;
        const p = getPoint(ev);
        if (!p) return;
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    };

    const end = (e?: React.MouseEvent | React.TouchEvent) => {
        if (e) e.preventDefault();
        setIsDrawing(false);
    };

    const clear = () => {
        const c = canvasRef.current;
        if (!c) return;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
    };

    const toDataURL = () => {
        if (!canvasRef.current) return null;
        return canvasRef.current.toDataURL("image/png");
    };

    return { canvasRef, start, move, end, clear, toDataURL };
}

export default function GestionTelefonia() {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Selected ticket for handling
    const [selectedTicket, setSelectedTicket] = useState<Solicitud | null>(null);
    const [entregaData, setEntregaData] = useState({ recibidoPor: "", equipoId: "" });
    const sig = useSignaturePad();

    // Clear signature when modal opens
    useEffect(() => {
        if (selectedTicket?.estado === "Programar Entrega") {
            setTimeout(() => sig.clear(), 100);
        }
    }, [selectedTicket]);

    const loadData = async () => {
        setLoading(true);
        try {
            await telefoniaStore.fetchSolicitudes();
            await telefoniaStore.fetchEquipos();
            await telefoniaStore.fetchChips();
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
        const firma = sig.toDataURL();

        // Basic check if empty (not perfect but prevents blank submits if canvas wasn't touched)
        // ideally we track "has drawn" state
        if (!firma) {
            alert("Error al obtener firma.");
            return;
        }

        try {
            await telefoniaStore.updateSolicitud(selectedTicket.id, {
                fecha_entrega: new Date().toISOString(),
                recibido_por: firma, // Save signature as Data URI
                equipo_asignado_id: entregaData.equipoId || selectedTicket.equipo_asignado_id,
                estado: "Entregado"
            });

            if (entregaData.equipoId) {
                await telefoniaStore.updateEquipo(entregaData.equipoId, { estado: "Asignado" });
            }
            setToast({ type: "success", message: "Entrega registrada correctamente" });
            setSelectedTicket(null);
            loadData();
        } catch (e: any) {
            setToast({ type: "error", message: e.message });
        }
    };

    // --- FILTERING & GROUPING ---
    const getFilteredTickets = () => {
        const search = searchTerm.toLowerCase();
        return telefoniaStore.solicitudes.filter(t =>
            t.beneficiario_nombre?.toLowerCase().includes(search) ||
            t.beneficiario_dni?.toLowerCase().includes(search) ||
            t.beneficiario_area?.toLowerCase().includes(search)
        );
    };

    const tickets = getFilteredTickets();

    const columns = {
        pendingIT: tickets.filter(t => t.estado === "Pendiente IT"),
        approvals: tickets.filter(t => ["Pendiente Gerencia", "Pendiente Admin"].includes(t.estado)),
        delivery: tickets.filter(t => t.estado === "Programar Entrega"),
        history: tickets.filter(t => ["Entregado", "Rechazada", "Cancelada"].includes(t.estado))
    };

    const StatusBadge = ({ estado }: { estado: string }) => {
        let color = "bg-gray-100 text-gray-800";
        if (estado.includes("IT")) color = "bg-purple-100 text-purple-800";
        if (estado.includes("Gerencia")) color = "bg-blue-100 text-blue-800";
        if (estado.includes("Admin")) color = "bg-amber-100 text-amber-800";
        if (estado === "Programar Entrega") color = "bg-indigo-100 text-indigo-800";
        if (estado === "Entregado") color = "bg-emerald-100 text-emerald-800";
        if (estado === "Rechazada") color = "bg-rose-100 text-rose-800";

        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color}`}>{estado}</span>
    };

    const TicketCard = ({ ticket, onClick }: { ticket: Solicitud, onClick: () => void }) => (
        <div
            onClick={onClick}
            className="bg-white border border-gray-200 rounded-xl p-3 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-gray-400 font-mono">{ticket.id.slice(0, 8)}</span>
                <StatusBadge estado={ticket.estado} />
            </div>

            <h4 className="font-bold text-gray-900 text-sm mb-1 truncate" title={ticket.beneficiario_nombre || ""}>
                {ticket.beneficiario_nombre || "Usuario Desconocido"}
            </h4>
            <p className="text-xs text-gray-500 mb-2 truncate">{ticket.beneficiario_puesto}</p>

            <div className="bg-gray-50 rounded p-2 text-xs border border-gray-100 mb-2 space-y-1">
                <div className="flex justify-between">
                    <span className="text-gray-500">Servicio:</span>
                    <span className="font-medium">{ticket.tipo_servicio}</span>
                </div>
                {ticket.alternativa_modelo && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">Modelo:</span>
                        <span className="font-medium text-emerald-700 truncate ml-1 max-w-[100px]" title={ticket.alternativa_modelo}>
                            {ticket.alternativa_modelo}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 border-t pt-2 mt-2">
                <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(ticket.created_at).toLocaleDateString()}
                </span>
                <span className="group-hover:text-indigo-600 font-medium transition-colors">
                    Ver Detalle &rarr;
                </span>
            </div>
        </div>
    );

    if (loading && telefoniaStore.solicitudes.length === 0) {
        return <LoadingScreen text="Cargando solicitudes..." />;
    }

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tablero de Gestión</h1>
                    <p className="text-gray-500 text-sm">Monitoreo global del ciclo de vida de solicitudes</p>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar ticket..."
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                </div>
            </div>

            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            {/* KANBAN BOARD */}
            <div className="flex-1 overflow-x-auto min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-w-[1000px] h-full pb-4">
                    {/* COLUMN 1: Pending IT */}
                    <div className="flex flex-col h-full bg-gray-50/50 rounded-xl border border-gray-200/50">
                        <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-xl flex justify-between items-center sticky top-0">
                            <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span> Validación IT
                            </h3>
                            <span className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200 font-medium">{columns.pendingIT.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {columns.pendingIT.map(t => <TicketCard key={t.id} ticket={t} onClick={() => setSelectedTicket(t)} />)}
                            {columns.pendingIT.length === 0 && <p className="text-center text-xs text-gray-400 italic py-4">No hay tickets pendientes</p>}
                        </div>
                    </div>

                    {/* COLUMN 2: Approvals */}
                    <div className="flex flex-col h-full bg-gray-50/50 rounded-xl border border-gray-200/50">
                        <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-xl flex justify-between items-center sticky top-0">
                            <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Aprobaciones
                            </h3>
                            <span className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200 font-medium">{columns.approvals.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {columns.approvals.map(t => <TicketCard key={t.id} ticket={t} onClick={() => setSelectedTicket(t)} />)}
                            {columns.approvals.length === 0 && <p className="text-center text-xs text-gray-400 italic py-4">Sin aprobaciones pendientes</p>}
                        </div>
                    </div>

                    {/* COLUMN 3: Delivery (Actionable) */}
                    <div className="flex flex-col h-full bg-indigo-50/30 rounded-xl border border-indigo-100">
                        <div className="p-3 border-b border-indigo-100 bg-indigo-50 rounded-t-xl flex justify-between items-center sticky top-0">
                            <h3 className="font-semibold text-indigo-900 text-sm flex items-center gap-2">
                                <Truck className="w-4 h-4" /> Por Entregar
                            </h3>
                            <span className="text-xs bg-white px-2 py-0.5 rounded border border-indigo-100 font-medium text-indigo-700">{columns.delivery.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {columns.delivery.map(t => <TicketCard key={t.id} ticket={t} onClick={() => setSelectedTicket(t)} />)}
                            {columns.delivery.length === 0 && <p className="text-center text-xs text-indigo-300 italic py-4">Todo entregado al día</p>}
                        </div>
                    </div>

                    {/* COLUMN 4: History */}
                    <div className="flex flex-col h-full bg-gray-50/50 rounded-xl border border-gray-200/50 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-xl flex justify-between items-center sticky top-0">
                            <h3 className="font-semibold text-gray-600 text-sm flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Finalizados
                            </h3>
                            <span className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200 font-medium">{columns.history.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {columns.history.map(t => <TicketCard key={t.id} ticket={t} onClick={() => setSelectedTicket(t)} />)}
                            {columns.history.length === 0 && <p className="text-center text-xs text-gray-400 italic py-4">Sin historial reciente</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DETALLE / ENTREGA */}
            {selectedTicket && (
                <Modal
                    open={!!selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    title={selectedTicket.estado === "Programar Entrega" ? "Confirmar y Asignar Entrega" : `Detalle: Ticket ${selectedTicket.id.slice(0, 8)}`}
                    size="lg"
                >
                    <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
                        <div className="pt-2">
                            <TicketDetailContent ticket={selectedTicket} />
                        </div>

                        {/* ENTREGA ACTION - Only available if ready for delivery */}
                        {selectedTicket.estado === "Programar Entrega" ? (
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 space-y-4">
                                <div className="flex items-center gap-2 text-green-800 font-medium">
                                    <Truck className="w-5 h-5" />
                                    Registrar Entrega y Asignación
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Equipo a Asignar / Entregar</label>
                                    <select
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                        value={entregaData.equipoId}
                                        onChange={(e) => setEntregaData({ ...entregaData, equipoId: e.target.value })}
                                        disabled={loading}
                                    >
                                        <option value="">
                                            {selectedTicket.equipo_asignado_id
                                                ? "-- Mantener asignación previa --"
                                                : "-- Seleccionar de Inventario --"}
                                        </option>
                                        {telefoniaStore.equipos
                                            .filter(e => e.estado === "Disponible" || e.id === selectedTicket.equipo_asignado_id)
                                            .map(e => (
                                                <option key={e.id} value={e.id}>
                                                    {e.marca} {e.modelo} | IMEI: {e.imei}
                                                </option>
                                            ))
                                        }
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Seleccione el equipo físico que se está entregando para asignarlo definitivamente.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Firma de Recepción</label>
                                    <div className="border border-gray-300 rounded-lg bg-white overflow-hidden relative touch-none">
                                        <canvas
                                            ref={sig.canvasRef}
                                            width={500}
                                            height={160}
                                            className="w-full h-40 cursor-crosshair block"
                                            onMouseDown={sig.start}
                                            onMouseMove={sig.move}
                                            onMouseUp={sig.end}
                                            onMouseLeave={sig.end}
                                            onTouchStart={sig.start}
                                            onTouchMove={sig.move}
                                            onTouchEnd={sig.end}
                                        />
                                        <button
                                            onClick={sig.clear}
                                            className="absolute top-2 right-2 p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-600 transition-colors shadow-sm border border-gray-200"
                                            title="Limpiar firma"
                                        >
                                            <Eraser className="w-4 h-4" />
                                        </button>
                                        <div className="pointer-events-none absolute bottom-2 left-2 text-[10px] text-gray-300 select-none">Espacio para firmar</div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">El beneficiario debe firmar en el recuadro para confirmar.</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={submitEntrega}
                                        disabled={!entregaData.equipoId && !selectedTicket.equipo_asignado_id}
                                        className="w-full bg-green-600 text-white rounded-lg py-2.5 font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                                    >
                                        Confirmar Entrega
                                    </button>
                                    <button
                                        onClick={() => setSelectedTicket(null)}
                                        className="w-full py-2 bg-white text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 border border-gray-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // READ ONLY VIEW FOR OTHER STATES
                            <div className="pt-2">
                                {selectedTicket.estado === "Entregado" && (
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-600 mb-4">
                                        <p><strong className="text-gray-900">Entregado el:</strong> {new Date(selectedTicket.fecha_entrega!).toLocaleString()}</p>
                                        <div className="mt-2">
                                            <strong className="text-gray-900 block mb-1">Recibido por (Firma):</strong>
                                            {selectedTicket.recibido_por?.startsWith("data:image") ? (
                                                <div className="border border-gray-300 bg-white rounded p-2 inline-block">
                                                    <img src={selectedTicket.recibido_por} alt="Firma" className="max-h-24" />
                                                </div>
                                            ) : (
                                                <span>{selectedTicket.recibido_por}</span>
                                            )}
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <button
                                                onClick={() => generateTicketPDF(selectedTicket)}
                                                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
                                            >
                                                <FileDown className="w-4 h-4" />
                                                Exportar Ticket PDF
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="w-full py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cerrar Detalle
                                </button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}

