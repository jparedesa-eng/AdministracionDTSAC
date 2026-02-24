import { useEffect, useState, useRef } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { Solicitud } from "../../store/telefoniaStore";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import {
    Truck,
    Search,
    Calendar,
    Eraser,
    FileDown,
    XCircle
} from "lucide-react";
import { generateTicketPDF } from "../../utils/pdfGeneratorTelefonia";
import { Html5QrcodeScanner } from "html5-qrcode";
import { TicketDetailContent } from "../../components/telefonia/TicketDetailContent.tsx";

// STANDARD_MODELS removed in favor of telefoniaStore.modelos

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

    const [toast, setToast] = useState<ToastState>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Selected ticket for handling
    const [selectedTicket, setSelectedTicket] = useState<Solicitud | null>(null);
    const [submitting, setSubmitting] = useState(false); // Prevents double click
    // Multi-assignment state
    const [selectedItems, setSelectedItems] = useState<{ index: number; equipoId: string; chipId?: string; type: "EQUIPO" | "CHIP"; asignacionId?: string }[]>([]);

    // NEW: Unified Scanner State
    const [imeiInput, setImeiInput] = useState("");
    const [showCamera, setShowCamera] = useState(false);

    // Unified Search Logic (Equipment OR Chips)
    const isSoloChip = selectedTicket?.tipo_solicitud === "Solicitar Chip";

    // Filtered Items (Either Equipos or Chips)
    const filteredOptions = isSoloChip
        ? telefoniaStore.chips
            .filter(c => c.estado === "Disponible" && !c.equipo_id && !selectedItems.some(i => i.chipId === c.id))
            .filter(c => {
                if (!imeiInput) return false;
                return c.numero_linea.includes(imeiInput);
            })
        : telefoniaStore.equipos
            .filter(e => e.estado === "Disponible" && !selectedItems.some(i => i.equipoId === e.id))
            .filter(e => {
                if (!imeiInput) return false;
                const search = imeiInput.toLowerCase();
                return e.imei.includes(search) || e.modelo.toLowerCase().includes(search) || e.marca.toLowerCase().includes(search);
            });

    const assignItemToSlot = (id: string, type: "EQUIPO" | "CHIP") => {
        // Find first slot where main ID is missing
        const slotIdx = selectedItems.findIndex(i => type === "EQUIPO" ? !i.equipoId : !i.chipId);

        if (slotIdx === -1) {
            setToast({ type: "info", message: "Todos los espacios ya están completos." });
            return;
        }

        if (type === "EQUIPO") {
            const eq = telefoniaStore.equipos.find(item => item.id === id);
            if (!eq) return;
            setSelectedItems(prev => prev.map(item => item.index === slotIdx ? { ...item, equipoId: eq.id, type: "EQUIPO" } : item));
            setToast({ type: "success", message: `Equipo agregado: ${eq.modelo}` });
        } else {
            const chip = telefoniaStore.chips.find(c => c.id === id);
            if (!chip) return;
            setSelectedItems(prev => prev.map(item => item.index === slotIdx ? { ...item, chipId: chip.id, equipoId: "", type: "CHIP" } : item)); // equipoId empty
            setToast({ type: "success", message: `Chip agregado: ${chip.numero_linea}` });
        }

        setImeiInput("");
        setShowCamera(false);
    };

    const handleImeiScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const imei = imeiInput.trim();
            if (!imei) return;

            // 1. Try exact match
            if (isSoloChip) {
                // Chip Search
                const exact = telefoniaStore.chips.find(c => c.numero_linea === imei && c.estado === "Disponible");
                if (exact) {
                    assignItemToSlot(exact.id, "CHIP");
                    return;
                }
            } else {
                // Equipo Search
                const exact = telefoniaStore.equipos.find(eq => eq.imei === imei && eq.estado === "Disponible");
                if (exact) {
                    assignItemToSlot(exact.id, "EQUIPO");
                    return;
                }
            }

            // 2. Try single filtered match? (Optional, maybe risky)
            // If only 1 result stays in filter, maybe select it? Nah, better safe.

            setToast({ type: "error", message: `IMEI ${imei} no encontrado o no disponible.` });
        }
    };

    // Camera Handler
    useEffect(() => {
        if (showCamera) {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );

            scanner.render((decodedText) => {
                // Success
                console.log("Scanned:", decodedText);
                const imei = decodedText;

                // Find equipment by IMEI
                const eq = telefoniaStore.equipos.find(item => item.imei === imei && item.estado === "Disponible");

                if (eq) {
                    assignItemToSlot(eq.id, "EQUIPO");
                    scanner.clear();
                    setShowCamera(false);
                } else {
                    setToast({ type: "error", message: `IMEI ${imei} escaneado no encontrado disponible.` });
                    // Don't close immediately so they can try again? Or close?
                    // Let's pause or let them retry.
                }
            }, (_err) => {
                // ignore
            });

            return () => {
                scanner.clear().catch(err => console.error("Failed to clear scanner", err));
            };
        }
    }, [showCamera]);

    const handleRemoveSlot = (index: number) => {
        setSelectedItems(prev => prev.map(item => item.index === index ? { ...item, equipoId: "", chipId: undefined } : item));
    };

    // Legacy support or extra fields
    const [entregaData, setEntregaData] = useState({ recibidoPor: "", costoEquipo: 0, montoDescuento: 0, cuotaMensual: 0, suggestedModel: "", gr: "" });
    const sig = useSignaturePad();

    // Clear signature when modal opens
    useEffect(() => {
        if (selectedTicket) {
            // Reset state when opening a ticket
            setEntregaData(prev => ({ ...prev, recibidoPor: "", costoEquipo: 0, montoDescuento: 0, cuotaMensual: 0, suggestedModel: "", gr: "" }));
            setSelectedItems([]);

            if (selectedTicket.estado === "Programar Entrega") {
                // Initialize slots based on quantity (default 1 if null)
                // Initialize slots based on asignaciones (if exist) or quantity
                let initialSlots: any[] = [];

                if (selectedTicket.asignaciones && selectedTicket.asignaciones.length > 0) {
                    // Use existing pending assignments
                    initialSlots = selectedTicket.asignaciones.map((asig, i) => ({
                        index: i,
                        equipoId: asig.equipo_id || "",
                        asignacionId: asig.id,
                        // Optional: Pre-fill beneficiary info if we want to show who this slot is for (future improvement)
                    }));
                } else {
                    // Fallback to quantity based (Legacy behavior or if asignaciones missing)
                    const qty = selectedTicket.cantidad_lineas || 1;
                    initialSlots = Array.from({ length: qty }).map((_, i) => ({ index: i, equipoId: "" }));
                }

                // If legacy assignment exists (single column), pre-fill slot 0 if still empty
                // (Legacy assignment check removed)

                // Ensure type is set for initialized slots
                initialSlots = initialSlots.map(s => ({ ...s, type: s.equipoId ? "EQUIPO" : (isSoloChip ? "CHIP" : "EQUIPO") }));

                setSelectedItems(initialSlots);

                setTimeout(() => sig.clear(), 100);
            }
        }
    }, [selectedTicket]);

    const loadData = async () => {
        try {
            await telefoniaStore.fetchSolicitudes();
            await telefoniaStore.fetchEquipos();
            await telefoniaStore.fetchChips();
        } catch (e: any) {
            setToast({ type: "error", message: "Error cargando datos" });
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const submitEntrega = async () => {
        if (!selectedTicket) return;
        if (submitting) return; // Prevent double click

        const firma = sig.toDataURL();

        if (!firma) {
            alert("Error al obtener firma.");
            return;
        }

        // Validate all slots filled
        const filled = selectedItems.filter(i => (i.type === "EQUIPO" ? i.equipoId : i.chipId));
        const qty = selectedTicket.cantidad_lineas || 1;

        if (filled.length !== qty) {
            alert(`Debe seleccionar ${qty} items para completar la entrega.`);
            return;
        }

        try {
            // Check for devices without chips
            const devicesWithoutChip = filled.filter(i => {
                if (i.type === "EQUIPO" && i.equipoId) {
                    const eq = telefoniaStore.equipos.find(e => e.id === i.equipoId);
                    return !eq?.chip_id;
                }
                return false;
            });

            if (devicesWithoutChip.length > 0) {
                const confirmed = window.confirm(
                    `Advertencia: Hay ${devicesWithoutChip.length} equipo(s) seleccionados sin chip vinculado.\n\n¿Estás seguro de que deseas continuar con la entrega sin chip?`
                );
                if (!confirmed) return;
            }

            setSubmitting(true);
            // Map to store format
            const itemsToAssign = filled.map(i => {
                let eqId = i.equipoId;
                let chId: string | null | undefined = i.chipId;

                // If Standard Flow (Equipo), Chip comes attached to Equipment
                if (i.type === "EQUIPO" && eqId) {
                    const eq = telefoniaStore.equipos.find(e => e.id === eqId);
                    chId = eq?.chip_id || null;
                }

                // If Solo Chip, eqId is null? But AssignEquipos might need it? 
                // We checked Store: It filters empty strings. So we can send eqId="" for Solo Chip.

                return {
                    equipoId: eqId || "",
                    chipId: chId || null,
                    asignacionId: i.asignacionId // Pass ID to update
                };
            });

            await telefoniaStore.asignarEquipos(selectedTicket.id, itemsToAssign, firma, entregaData.gr);

            setToast({ type: "success", message: "Entrega registrada correctamente" });
            setSelectedTicket(null);
            loadData();
        } catch (e: any) {
            setToast({ type: "error", message: e.message || "Error al registrar entrega" });
        } finally {
            setSubmitting(false);
        }
    };

    // --- FILTERING & GROUPING ---
    const getFilteredTickets = () => {
        const search = searchTerm.toLowerCase();
        return telefoniaStore.solicitudes.filter(t => {
            if (!search) return true;

            // 1. Search Text (Safe check)
            const name = t.beneficiario_nombre || "";
            const dni = t.beneficiario_dni || "";
            const area = t.beneficiario_area || "";
            const id = t.id || "";

            return (
                name.toLowerCase().includes(search) ||
                dni.toLowerCase().includes(search) ||
                area.toLowerCase().includes(search) ||
                id.toLowerCase().includes(search)
            );
        });
    };

    const tickets = getFilteredTickets();

    const columns = {
        revisionAdmin: tickets.filter(t => t.estado === "Revisión Admin"),
        approvals: tickets.filter(t => ["Pendiente Gerencia", "Pendiente Admin"].includes(t.estado)),
        delivery: tickets.filter(t => t.estado === "Programar Entrega"),
        history: tickets.filter(t => ["Entregado", "Rechazada", "Cancelada"].includes(t.estado)).slice(0, 5)
    };

    const StatusBadge = ({ estado }: { estado: string }) => {
        let color = "bg-gray-100 text-gray-800";
        if (estado === "Revisión Admin") color = "bg-purple-100 text-purple-800";
        if (estado.includes("Gerencia")) color = "bg-blue-100 text-blue-800";
        if (estado === "Pendiente Admin") color = "bg-amber-100 text-amber-800";
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
                    <span className="text-gray-500">Solicitud:</span>
                    <span className="font-medium text-blue-700">{ticket.tipo_solicitud || "Línea Nueva"}</span>
                </div>
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

    // Removed early return for LoadingScreen to avoid "page reload" feel
    // if (loading && telefoniaStore.solicitudes.length === 0) {
    //     return <LoadingScreen text="Cargando solicitudes..." />;
    // }

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Solicitudes</h1>
                    <p className="text-gray-500 text-sm">Monitoreo global del ciclo de vida de solicitudes</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative w-full md:w-64">
                        <input
                            type="text"
                            placeholder="Buscar ticket..."
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                </div>
            </div>

            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            {/* KANBAN BOARD */}
            <div className="flex-1 overflow-x-auto min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-w-[1000px] h-full pb-4">
                    {/* COLUMN 1: Revision Admin */}
                    <div className="flex flex-col h-full bg-gray-50/50 rounded-xl border border-gray-200/50">
                        <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-xl flex justify-between items-center sticky top-0">
                            <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span> Revisión Administración
                            </h3>
                            <span className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200 font-medium">{columns.revisionAdmin.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {columns.revisionAdmin.map(t => <TicketCard key={t.id} ticket={t} onClick={() => setSelectedTicket(t)} />)}
                            {columns.revisionAdmin.length === 0 && <p className="text-center text-xs text-gray-400 italic py-4">No hay tickets pendientes</p>}
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
                    <div className="space-y-6 pr-2">
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

                                {/* UNIFIED ASSIGNMENT TOOLS */}
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                        <Search className="w-4 h-4 text-indigo-500" />
                                        Buscar y Agregar Equipo
                                    </h4>

                                    <div className="relative">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder={isSoloChip ? "Buscar por Número de Celular..." : "Escanear IMEI o Buscar por Modelo..."}
                                                    className="pl-9 pr-4 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
                                                    value={imeiInput}
                                                    onChange={(e) => setImeiInput(e.target.value)}
                                                    onKeyDown={handleImeiScan}
                                                    autoFocus
                                                />
                                            </div>
                                            <button
                                                onClick={() => setShowCamera(!showCamera)}
                                                className={`px-3 py-2 rounded-lg border flex items-center gap-2 transition-colors ${showCamera ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                                                title="Abrir Cámara"
                                            >
                                                📷 <span className="hidden sm:inline text-xs font-medium">{showCamera ? "Cerrar" : "Escanear"}</span>
                                            </button>
                                        </div>

                                        {/* CAMERA CONTAINER */}
                                        {showCamera && (
                                            <div className="mt-4 p-4 bg-black rounded-lg">
                                                <div id="reader" className="w-full bg-white rounded-lg overflow-hidden"></div>
                                                <p className="text-center text-white text-xs mt-2">Apunte la cámara al código de barras del IMEI</p>
                                            </div>
                                        )}

                                        {/* DROPDOWN RESULTS (Like Typeahead) */}
                                        {imeiInput && !showCamera && filteredOptions.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                                                {filteredOptions.map((opt: any) => (
                                                    <div
                                                        key={opt.id}
                                                        onClick={() => assignItemToSlot(opt.id, isSoloChip ? "CHIP" : "EQUIPO")}
                                                        className="p-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-0 flex justify-between items-center"
                                                    >
                                                        {isSoloChip ? (
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-800">Chip: {opt.numero_linea}</p>
                                                                <p className="text-xs text-gray-500">Operador: <span className="font-medium">{opt.operador}</span></p>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-800">{opt.marca} {opt.modelo}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    IMEI: <span className="font-mono text-gray-700">{opt.imei}</span>
                                                                    <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600 border border-gray-200">
                                                                        {(() => {
                                                                            const linkedChip = telefoniaStore.chips.find(c => c.id === opt.chip_id);
                                                                            return linkedChip ? `Chip: ${linkedChip.numero_linea}` : "Sin Chip";
                                                                        })()}
                                                                    </span>
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Status/Condition Badge */}
                                                        {isSoloChip ? (
                                                            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-green-100 text-green-800">Disponible</span>
                                                        ) : (
                                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${opt.condicion === 'Nuevo' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                                                                {opt.condicion || "Estado ?"}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {imeiInput && filteredOptions.length === 0 && !showCamera && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 p-3 text-center text-xs text-gray-500">
                                                No se encontraron equipos disponibles con ese criterio.
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400">
                                        Use el escáner o la lista manual para agregar equipos a la lista de entrega.
                                    </p>
                                </div>

                                {/* ASSIGNED LIST */}
                                <div>
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <label className="block text-sm font-bold text-gray-700">
                                            Lista de {isSoloChip ? "Chips" : "Equipos"} a Entregar ({selectedItems.filter(i => i.equipoId || i.chipId).length} / {selectedTicket.cantidad_lineas || 1})
                                        </label>
                                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                            Pendientes: {selectedItems.filter(i => (!i.equipoId && !i.chipId)).length}
                                        </span>
                                    </div>

                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                        {selectedItems.map((slot) => {
                                            const eq = slot.equipoId ? telefoniaStore.equipos.find(e => e.id === slot.equipoId) : null;
                                            const chip = slot.chipId ? telefoniaStore.chips.find(c => c.id === slot.chipId) : null;
                                            const isFilled = !!eq || !!chip;

                                            // RENDER FILLED SLOT
                                            if (isFilled) {
                                                return (
                                                    <div key={slot.index} className="flex items-center justify-between p-3 bg-white border border-green-200 rounded-lg shadow-sm group hover:border-green-300 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-xs ring-4 ring-green-50">
                                                                #{slot.index + 1}
                                                            </div>
                                                            <div>
                                                                {eq ? (
                                                                    <>
                                                                        <p className="text-sm font-bold text-gray-800">{eq.marca} {eq.modelo}</p>
                                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                            <span className="font-mono bg-gray-100 px-1 rounded">IMEI: {eq.imei}</span>
                                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${eq.condicion === 'Nuevo' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                                                                                {eq.condicion || "Estado ?"}
                                                                            </span>
                                                                        </div>
                                                                    </>
                                                                ) : chip ? (
                                                                    <>
                                                                        <p className="text-sm font-bold text-gray-800">Chip: {chip.numero_linea}</p>
                                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                            <span className="font-mono bg-gray-100 px-1 rounded">{chip.operador}</span>
                                                                        </div>
                                                                    </>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveSlot(slot.index)}
                                                            className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                                            title="Remover item"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            // RENDER EMPTY SLOT
                                            return (
                                                <div key={slot.index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 border-dashed rounded-lg opacity-70">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs">
                                                            #{slot.index + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-400 italic">Espacio Vacio</p>
                                                            <p className="text-[10px] text-gray-400">Escanee o seleccione un {isSoloChip ? "chip" : "equipo"} para asignar aquí.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Guía de Remisión (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ingrese el Nro de Guía"
                                        className="w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 shadow-sm p-2 mb-3 border"
                                        value={entregaData.gr}
                                        onChange={(e) => setEntregaData({ ...entregaData, gr: e.target.value })}
                                    />
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
                                        disabled={selectedItems.some(i => !i.equipoId && !i.chipId) || submitting}
                                        className="w-full bg-green-600 text-white rounded-lg py-2.5 font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        {submitting ? "Procesando..." : "Confirmar Entrega"}
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
                                {/* REVISION ADMIN (Pendiente IT -> Revisión Admin) */}
                                {selectedTicket.estado === "Revisión Admin" && (
                                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-4 space-y-4">
                                        <div className="flex items-center gap-2 text-purple-800 font-bold border-b border-purple-200 pb-2">
                                            <div className="p-1 bg-purple-100 rounded">
                                                <span className="text-lg">🛠️</span>
                                            </div>
                                            Revisión Administración (IT)
                                        </div>

                                        {/* 1. SUGERENCIA DE MODELO */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Sugerir Modelo (Catálogo)</label>
                                            <select
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm border p-2"
                                                value={entregaData.suggestedModel || ""}
                                                onChange={(e) => setEntregaData({ ...entregaData, suggestedModel: e.target.value })}
                                            >
                                                <option value="">
                                                    {selectedTicket.alternativa_modelo
                                                        ? `-- ${selectedTicket.alternativa_modelo} (Actual) --`
                                                        : "-- Seleccionar Modelo Sugerido --"}
                                                </option>
                                                {/* From DB Catalog */}
                                                {telefoniaStore.modelos
                                                    .map(m => `${m.marca} ${m.nombre}`)
                                                    .sort()
                                                    .map(modelName => (
                                                        <option key={modelName} value={modelName}>
                                                            {modelName}
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Seleccione el modelo sugerido para atender esta solicitud.
                                            </p>
                                        </div>

                                        {/* 2. COST ASSIGNMENT (Only for Reposicion) */}
                                        {((selectedTicket.detalle_reposicion) || (selectedTicket.tipo_servicio === "REPOSICIÓN") || (selectedTicket.tipo_solicitud === "Reposición")) && (
                                            <div className="bg-white p-3 rounded-lg border border-purple-200 mt-2">
                                                <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                                                    💰 Asignación de Costos (Reposición)
                                                </h4>
                                                <p className="text-xs text-gray-500 mb-3 block p-2 bg-yellow-50 text-yellow-800 rounded border border-yellow-100">
                                                    <strong>Nota:</strong> El usuario asume el 100% del costo de reposición.
                                                </p>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Costo Total Equipo (S/)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-purple-500 focus:ring-purple-500"
                                                            placeholder="0.00"
                                                            value={entregaData.costoEquipo || ""}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                if (!isNaN(val)) {
                                                                    // 100% Cost to User
                                                                    const descuento = val; // Full cost
                                                                    const cuotas = selectedTicket.detalle_reposicion?.cuotas || 1;
                                                                    const mensual = descuento / cuotas;
                                                                    setEntregaData(prev => ({ ...prev, costoEquipo: val, montoDescuento: descuento, cuotaMensual: mensual }));
                                                                } else {
                                                                    setEntregaData(prev => ({ ...prev, costoEquipo: 0, montoDescuento: 0, cuotaMensual: 0 }));
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-xs text-gray-500">A Pagar (100%):</span>
                                                            <span className="font-bold text-red-600">S/ {entregaData.montoDescuento ? entregaData.montoDescuento.toFixed(2) : "0.00"}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center border-t border-gray-200 pt-1">
                                                            <span className="text-xs text-gray-500">Cuota Mensual:</span>
                                                            <span className="font-bold text-gray-900">S/ {entregaData.cuotaMensual ? entregaData.cuotaMensual.toFixed(2) : "0.00"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={async () => {
                                                // Validate Cost if Reposition
                                                const isReposicion = (selectedTicket.detalle_reposicion) || (selectedTicket.tipo_servicio === "REPOSICIÓN") || (selectedTicket.tipo_solicitud === "Reposición");
                                                if (isReposicion && (!entregaData.costoEquipo || entregaData.costoEquipo <= 0)) {
                                                    alert("Por favor ingrese el Costo del Equipo para continuar.");
                                                    return;
                                                }

                                                try {
                                                    const updates: any = {
                                                        estado: "Pendiente Gerencia",
                                                        // Update model suggestion if provided
                                                        ...(entregaData.suggestedModel && { alternativa_modelo: entregaData.suggestedModel })
                                                    };

                                                    // Add simulation data if Reposition
                                                    if (isReposicion) {
                                                        updates.simulacion_descuento = {
                                                            costoEquipo: entregaData.costoEquipo.toFixed(2),
                                                            montoDescuento: entregaData.montoDescuento ? entregaData.montoDescuento.toFixed(2) : "0.00",
                                                            cuotas: selectedTicket.detalle_reposicion?.cuotas || 1,
                                                            cuotaMensual: entregaData.cuotaMensual ? entregaData.cuotaMensual.toFixed(2) : "0.00",
                                                            periodo: `Mes 1 a ${selectedTicket.detalle_reposicion?.cuotas || 1}`,
                                                            concepto: 'Rep. Equipo (Costo 100%)',
                                                            descuento: `${(100 / (selectedTicket.detalle_reposicion?.cuotas || 1)).toFixed(2)}% / mes`
                                                        };
                                                    }

                                                    await telefoniaStore.updateSolicitud(selectedTicket.id, updates);
                                                    setToast({ type: "success", message: "Ticket Revisado. Enviado a Gerencia." });
                                                    setSelectedTicket(null);
                                                    loadData();
                                                } catch (e: any) {
                                                    setToast({ type: "error", message: "Error al guardar revisión" });
                                                }
                                            }}
                                            className="w-full bg-purple-600 text-white rounded-lg py-2.5 font-medium hover:bg-purple-700 shadow-sm transition-all flex justify-center items-center gap-2"
                                        >
                                            <span className="text-lg">✅</span> Guardar Revisión y Enviar a Gerencia
                                        </button>
                                    </div>
                                )}

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
                                                onClick={async () => {
                                                    try {
                                                        const fullTicket = await telefoniaStore.fetchSolicitudById(selectedTicket.id);
                                                        if (fullTicket) {
                                                            await generateTicketPDF(fullTicket);
                                                        } else {
                                                            alert("No se pudo cargar el detalle del ticket");
                                                        }
                                                    } catch (e) {
                                                        alert("Error generando PDF");
                                                        console.error(e);
                                                    }
                                                }}
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

