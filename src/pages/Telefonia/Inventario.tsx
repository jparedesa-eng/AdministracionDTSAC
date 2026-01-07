import React, { useEffect, useState } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { Equipo, Chip, PlanTelefonico } from "../../store/telefoniaStore";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import {
    Smartphone,
    Cpu,
    Plus,
    Pencil,
    Loader2,
    Search,
    History,
    Calendar,
    Link,
    Unlink,
    Wifi,
    Trash2,
    ArrowLeftRight,
    UserPlus,
    AlertTriangle,
    CheckCircle
} from "lucide-react";

export default function InventarioTelefonia() {
    const [activeTab, setActiveTab] = useState<"equipos" | "chips" | "planes">("equipos");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);

    // Search
    const [q, setQ] = useState("");

    // Modals CRUD
    const [openEquipo, setOpenEquipo] = useState(false);
    const [openChip, setOpenChip] = useState(false);
    const [openPlan, setOpenPlan] = useState(false);

    // Modals Actions
    const [openDevolucion, setOpenDevolucion] = useState(false);
    const [openAsignacion, setOpenAsignacion] = useState(false);
    const [openBaja, setOpenBaja] = useState(false);
    const [modalActionItem, setModalActionItem] = useState<Equipo | null>(null);

    // Action Form States
    const [devolucionData, setDevolucionData] = useState({ estado: "Bueno", observaciones: "" });
    const [asignacionData, setAsignacionData] = useState({ dni: "", nombre: "", area: "", puesto: "" });
    const [bajaData, setBajaData] = useState({ motivo: "" });

    // Drafts
    const [draftEquipo, setDraftEquipo] = useState<Partial<Equipo>>({ estado: "Disponible", condicion: "Nuevo" });
    const [draftChip, setDraftChip] = useState<Partial<Chip>>({ estado: "Disponible" });
    const [draftPlan, setDraftPlan] = useState<Partial<PlanTelefonico>>({
        operador: "CLARO",
        active: true,
        costo: 0,
        gigas: "Ilimitado",
        llamadas: "Ilimitadas",
        sms: "Ilimitados"
    });

    // History View
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Linking View
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkTarget, setLinkTarget] = useState<{ type: 'equipo' | 'chip', item: any } | null>(null);
    const [selectedLinkOption, setSelectedLinkOption] = useState("");

    // Linking Plan View
    const [openLinkPlan, setOpenLinkPlan] = useState(false);
    const [selectedChipLink, setSelectedChipLink] = useState<Chip | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string>("");

    // eSIM / New Line flow
    const [includeEsim, setIncludeEsim] = useState(false);
    const [esimData, setEsimData] = useState({ numero: "", operador: "" });

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                telefoniaStore.fetchEquipos(),
                telefoniaStore.fetchChips(),
                telefoniaStore.fetchPlanes(),
            ]);
        } catch (e: any) {
            setToast({ type: "error", message: e.message || "Error cargando datos" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // --- ACCIONES DE EQUIPO (Devolución, Asignación, Baja) ---

    const handleOpenDevolucion = (eq: Equipo) => {
        setModalActionItem(eq);
        setDevolucionData({ estado: "Bueno", observaciones: "" });
        setOpenDevolucion(true);
    };

    const submitDevolucion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalActionItem?.asignacion_activa) return;
        try {
            await telefoniaStore.registrarDevolucion(
                modalActionItem.asignacion_activa.id,
                devolucionData.estado,
                devolucionData.observaciones
            );
            setToast({ type: "success", message: "Devolución registrada correctamente" });
            setOpenDevolucion(false);
        } catch (error: any) {
            setToast({ type: "error", message: error.message || "Error al registrar devolución" });
        }
    };

    const handleOpenAsignacion = (eq: Equipo) => {
        setModalActionItem(eq);
        setAsignacionData({ dni: "", nombre: "", area: "", puesto: "" });
        setOpenAsignacion(true);
    };

    const submitAsignacion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalActionItem) return;
        try {
            await telefoniaStore.asignarDirectamente(modalActionItem.id, asignacionData);
            setToast({ type: "success", message: "Equipo asignado correctamente" });
            setOpenAsignacion(false);
        } catch (error: any) {
            setToast({ type: "error", message: error.message || "Error al asignar equipo" });
        }
    };

    const handleOpenBaja = (eq: Equipo) => {
        setModalActionItem(eq);
        setBajaData({ motivo: "" });
        setOpenBaja(true);
    };

    const submitBajaSolicitud = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalActionItem) return;
        try {
            await telefoniaStore.solicitarBajaDirecta(modalActionItem.id, bajaData.motivo);
            setToast({ type: "success", message: "Solicitud de baja creada. Equipo en Mantenimiento." });
            setOpenBaja(false);
        } catch (error: any) {
            setToast({ type: "error", message: error.message || "Error al solicitar baja" });
        }
    };

    const handleProcesarBaja = async (eq: Equipo, accion: 'APROBAR' | 'REPARADO') => {
        if (!confirm(accion === 'APROBAR' ? "¿Confirmar baja definitiva?" : "¿Confirmar que el equipo ha sido reparado?")) return;
        try {
            await telefoniaStore.procesarBaja(eq.id, accion);
            setToast({ type: "success", message: "Estado actualizado" });
        } catch (error: any) {
            setToast({ type: "error", message: "Error al procesar baja" });
        }
    };


    // --- EQUIPOS HANDLERS ---
    const handleEditEquipo = (eq: Equipo) => {
        setDraftEquipo({ ...eq });
        setOpenEquipo(true);
    };

    const handleNewEquipo = () => {
        setDraftEquipo({ estado: "Disponible", marca: "", modelo: "", imei: "", color: "", condicion: "Nuevo" });
        setIncludeEsim(false);
        setEsimData({ numero: "", operador: "" });
        setOpenEquipo(true);
    };

    const saveEquipo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let newChipId = null;

            if (!draftEquipo.id && includeEsim) {
                if (!esimData.numero || !esimData.operador) {
                    setToast({ type: "error", message: "Complete los datos de la eSIM" });
                    return;
                }
                const newChip = await telefoniaStore.createChip({
                    numero_linea: esimData.numero,
                    operador: esimData.operador,
                    estado: "Disponible"
                });
                newChipId = newChip.id;
            }

            if (draftEquipo.id) {
                await telefoniaStore.updateEquipo(draftEquipo.id, draftEquipo);
                setToast({ type: "success", message: "Equipo actualizado" });
            } else {
                const payload = { ...draftEquipo };
                const newEquipo = await telefoniaStore.createEquipo(payload as any);

                if (newChipId) {
                    await telefoniaStore.vincular(newEquipo.id, newChipId);
                }

                setToast({ type: "success", message: "Equipo creado" });
            }
            setOpenEquipo(false);
        } catch (err: any) {
            let msg = err.message || "Error al guardar equipo";
            if (msg.includes("telefonia_chips_numero_linea_key") || msg.includes("duplicate key")) {
                msg = "El número de línea ya se encuentra registrado.";
            }
            setToast({ type: "error", message: msg });
        }
    };

    // --- CHIPS HANDLERS ---
    const handleEditChip = (chip: Chip) => {
        setDraftChip({ ...chip });
        setOpenChip(true);
    };

    const handleNewChip = () => {
        setDraftChip({ estado: "Disponible", numero_linea: "", operador: "" });
        setOpenChip(true);
    };

    const saveChip = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (draftChip.id) {
                await telefoniaStore.updateChip(draftChip.id, draftChip);
                setToast({ type: "success", message: "Chip actualizado" });
            } else {
                await telefoniaStore.createChip(draftChip as any);
                setToast({ type: "success", message: "Chip creado" });
            }
            setOpenChip(false);
        } catch (err: any) {
            let msg = err.message || "Error al guardar chip";
            if (msg.includes("telefonia_chips_numero_linea_key") || msg.includes("duplicate key")) {
                msg = "El número de línea ya se encuentra registrado.";
            }
            setToast({ type: "error", message: msg });
        }
    };

    // --- PLANES HANDLERS ---
    const handleEditPlan = (plan: PlanTelefonico) => {
        setDraftPlan({ ...plan });
        setOpenPlan(true);
    };

    const handleNewPlan = () => {
        setDraftPlan({
            operador: "CLARO",
            active: true,
            costo: 0,
            gigas: "Ilimitado",
            llamadas: "Ilimitadas",
            sms: "Ilimitados",
            nombre: ""
        });
        setOpenPlan(true);
    };

    const savePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!draftPlan.nombre) {
                draftPlan.nombre = `S/ ${draftPlan.costo}`;
            }

            if (draftPlan.id) {
                await telefoniaStore.updatePlan(draftPlan.id, draftPlan);
                setToast({ type: "success", message: "Plan actualizado" });
            } else {
                await telefoniaStore.createPlan(draftPlan as any);
                setToast({ type: "success", message: "Plan creado" });
            }
            setOpenPlan(false);
        } catch (err: any) {
            setToast({ type: "error", message: err.message || "Error al guardar plan" });
        }
    };

    const handleDeletePlan = async (id: string) => {
        if (!confirm("¿Seguro que desea eliminar este plan?")) return;
        try {
            await telefoniaStore.deletePlan(id);
            setToast({ type: "success", message: "Plan eliminado" });
        } catch (error) {
            setToast({ type: "error", message: "Error al eliminar plan" });
        }
    };

    const handleViewHistory = async (equipoId: string) => {
        setHistoryLoading(true);
        setShowHistory(true);
        setHistoryData([]);
        try {
            const data = await telefoniaStore.fetchHistorialEquipo(equipoId);
            setHistoryData(data);
        } catch (e) {
            setToast({ type: "error", message: "Error cargando historial" });
        } finally {
            setHistoryLoading(false);
        }
    };

    // --- LINKING HANDLERS ---
    const handleOpenLink = (type: 'equipo' | 'chip', item: any) => {
        setLinkTarget({ type, item });
        setSelectedLinkOption("");
        setShowLinkModal(true);
    };

    const handleUnlink = async (type: 'equipo' | 'chip', item: any) => {
        if (!confirm("¿Seguro que deseas desvincular?")) return;
        try {
            if (type === 'equipo') {
                await telefoniaStore.desvincular(item.id, item.chip_id);
            } else {
                await telefoniaStore.desvincular(item.equipo_id, item.id);
            }
            setToast({ type: "success", message: "Desvinculado correctamente" });
            loadData();
        } catch (e: any) {
            setToast({ type: "error", message: "Error al desvincular" });
        }
    };

    const handleSaveLink = async () => {
        if (!linkTarget || !selectedLinkOption) return;
        try {
            setLoading(true);
            if (linkTarget.type === 'equipo') {
                await telefoniaStore.vincular(linkTarget.item.id, selectedLinkOption);
            } else {
                await telefoniaStore.vincular(selectedLinkOption, linkTarget.item.id);
            }
            setToast({ type: "success", message: "Vinculado correctamente" });
            setShowLinkModal(false);
            loadData();
        } catch (e) {
            setToast({ type: "error", message: "Error al vincular" });
        } finally {
            setLoading(false);
        }
    };

    // --- PLAN LINKING HANDLERS ---
    const handleOpenLinkPlan = (chip: Chip) => {
        setSelectedChipLink(chip);
        setSelectedPlanId(chip.plan_id || "");
        setOpenLinkPlan(true);
    };

    const submitLinkPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChipLink) return;
        try {
            await telefoniaStore.updateChip(selectedChipLink.id, { plan_id: selectedPlanId || null });
            setToast({ type: "success", message: "Plan actualizado" });
            setOpenLinkPlan(false);
            loadData();
        } catch (error) {
            setToast({ type: "error", message: "Error al vincular plan" });
        }
    };

    // --- RENDER HELPERS ---
    const EstadoBadge = ({ estado }: { estado: string }) => {
        let color = "bg-gray-100 text-gray-800";
        if (estado === "Disponible") color = "bg-emerald-100 text-emerald-800";
        if (estado === "Asignado") color = "bg-blue-100 text-blue-800";
        if (estado === "Mantenimiento") color = "bg-amber-100 text-amber-800";
        if (estado === "Baja") color = "bg-rose-100 text-rose-800";

        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
                {estado}
            </span>
        );
    };

    const filteredEquipos = telefoniaStore.equipos.filter((e) => {
        const term = q.toLowerCase();
        return (
            e.marca.toLowerCase().includes(term) ||
            e.modelo.toLowerCase().includes(term) ||
            e.imei.toLowerCase().includes(term) ||
            (e.asignacion_activa?.beneficiario_nombre?.toLowerCase() || "").includes(term)
        );
    });

    const filteredChips = telefoniaStore.chips.filter((c) => {
        const term = q.toLowerCase();
        return (
            c.numero_linea.toLowerCase().includes(term) ||
            c.operador.toLowerCase().includes(term)
        );
    });

    const filteredPlanes = telefoniaStore.planes?.filter((p) => {
        const term = q.toLowerCase();
        return (
            p.nombre.toLowerCase().includes(term) ||
            p.operador.toLowerCase().includes(term)
        );
    }) || [];

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                    Inventario de Telefonía
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Gestiona los equipos celulares y chips telefónicos.
                </p>
            </div>

            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            {/* TABS */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab("equipos")}
                        className={`${activeTab === "equipos" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <Smartphone className="h-5 w-5" />
                        Equipos
                    </button>
                    <button
                        onClick={() => setActiveTab("chips")}
                        className={`${activeTab === "chips" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <Cpu className="h-5 w-5" />
                        Chips
                    </button>
                    <button
                        onClick={() => setActiveTab("planes")}
                        className={`${activeTab === "planes" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <Wifi className="h-5 w-5" />
                        Planes
                    </button>
                </nav>
            </div>

            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        placeholder={
                            activeTab === "equipos" ? "Buscar por marca, IMEI, responsable..." :
                                activeTab === "chips" ? "Buscar por número, operador..." :
                                    "Buscar por nombre, operador..."
                        }
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </div>
                <button
                    onClick={
                        activeTab === "equipos" ? handleNewEquipo :
                            activeTab === "chips" ? handleNewChip :
                                handleNewPlan
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-gray-800 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo {
                        activeTab === "equipos" ? "Equipo" :
                            activeTab === "chips" ? "Chip" : "Plan"
                    }
                </button>
            </div>

            {/* CONTENT */}
            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            ) : (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden text-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                {activeTab === "equipos" && (
                                    <tr>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Equipo</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Estado / Condición</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Línea</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Plan</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Asignado A</th>
                                        <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                )}
                                {activeTab === "chips" && (
                                    <tr>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Número</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Operador</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Plan</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Equipo Vinculado</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Estado</th>
                                        <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                )}
                                {activeTab === "planes" && (
                                    <tr>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Operador</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Plan (Costo)</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Detalles</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Estado</th>
                                        <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {activeTab === "equipos" ? filteredEquipos.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{item.marca} {item.modelo}</div>
                                            <div className="text-gray-500 font-mono text-xs mt-0.5">IMEI: {item.imei}</div>
                                            <div className="text-gray-400 text-xs mt-0.5">{item.color || "Sin color"}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <EstadoBadge estado={item.estado} />
                                                <span className="text-xs text-gray-400 px-1 border rounded bg-gray-50">
                                                    {item.condicion || "Nuevo"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.chip ? (
                                                <div className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 w-fit">
                                                    <Cpu className="w-3 h-3" />
                                                    <span className="font-mono font-medium">{item.chip.numero_linea}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">Sin vincular</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.chip ? (
                                                item.chip.plan ? (
                                                    <div className="text-xs">
                                                        <div className="font-semibold text-gray-800">{item.chip.plan.nombre}</div>
                                                        <div className="text-gray-500 text-[10px]">S/ {item.chip.plan.costo} - {item.chip.plan.gigas}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">Sin Plan</span>
                                                )
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.estado === "Asignado" && item.asignacion_activa ? (
                                                <div>
                                                    <div className="font-medium text-gray-900">{item.asignacion_activa.beneficiario_nombre}</div>
                                                    <div className="text-xs text-gray-500">{item.asignacion_activa.beneficiario_area}</div>
                                                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(item.asignacion_activa.fecha_entrega || '').toLocaleDateString()}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Botones de acción principales */}
                                                {item.estado === "Asignado" && (
                                                    <button
                                                        onClick={() => handleOpenDevolucion(item)}
                                                        className="p-1.5 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 transition-colors"
                                                        title="Registrar Devolución"
                                                    >
                                                        <ArrowLeftRight className="h-4 w-4" />
                                                    </button>
                                                )}

                                                {item.estado === "Disponible" && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenAsignacion(item)}
                                                            className="p-1.5 rounded-md bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-colors"
                                                            title="Asignar Manualmente"
                                                        >
                                                            <UserPlus className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenBaja(item)}
                                                            className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors"
                                                            title="Solicitar Baja (Dañado/Obsoleto)"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}

                                                {item.estado === "Mantenimiento" && (
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleProcesarBaja(item, 'APROBAR')}
                                                            className="p-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                                            title="Confirmar Baja Definitiva"
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleProcesarBaja(item, 'REPARADO')}
                                                            className="p-1.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                                            title="Marcar como Reparado (Disponible)"
                                                        >
                                                            <div className="text-[10px] font-bold">R</div>
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Tools */}
                                                <div className="h-4 w-px bg-gray-200 mx-1"></div>

                                                <button onClick={() => handleEditEquipo(item)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" title="Editar">
                                                    <Pencil className="h-4 w-4" />
                                                </button>

                                                <button onClick={() => handleViewHistory(item.id)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" title="Historial">
                                                    <History className="h-4 w-4" />
                                                </button>

                                                {!item.chip ? (
                                                    <button onClick={() => handleOpenLink('equipo', item)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" title="Vincular Línea">
                                                        <Link className="h-4 w-4" />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleUnlink('equipo', item)} className="p-1.5 rounded-md hover:bg-red-50 text-red-500" title="Desvincular Línea">
                                                        <Unlink className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : null}

                                {activeTab === "chips" ? filteredChips.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{item.numero_linea}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.operador}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {item.plan ? (
                                                    <div className="text-xs">
                                                        <div className="font-semibold text-gray-800">{item.plan.nombre}</div>
                                                        <div className="text-gray-500 text-[10px]">{item.plan.gigas} - S/ {item.plan.costo}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">Sin Plan</span>
                                                )}
                                                <button
                                                    onClick={() => handleOpenLinkPlan(item)}
                                                    className="p-1 rounded bg-gray-100 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 transition-colors"
                                                    title="Vincular/Cambiar Plan"
                                                >
                                                    <Wifi className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.equipo ? (
                                                <div className="flex items-center gap-1 text-gray-700 text-xs">
                                                    <Smartphone className="w-3 h-3" />
                                                    {item.equipo.marca} {item.equipo.modelo}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">Sin vincular</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4"><EstadoBadge estado={item.estado} /></td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleEditChip(item)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"><Pencil className="h-4 w-4" /></button>
                                                {!item.equipo ? (
                                                    <button onClick={() => handleOpenLink('chip', item)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"><Link className="h-4 w-4" /></button>
                                                ) : (
                                                    <button onClick={() => handleUnlink('chip', item)} className="p-1.5 rounded-md hover:bg-red-50 text-red-500"><Unlink className="h-4 w-4" /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : null}

                                {activeTab === "planes" && filteredPlanes.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${item.operador === 'CLARO' ? 'bg-red-100 text-red-800' :
                                                item.operador === 'MOVISTAR' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-orange-100 text-orange-800'
                                                }`}>
                                                {item.operador}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-bold text-gray-900">{item.nombre}</div>
                                            <div className="text-xs text-gray-500">S/ {item.costo.toFixed(2)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            <div className="flex flex-col">
                                                <span>Datos: {item.gigas}</span>
                                                <span className="text-xs text-gray-400">Min: {item.llamadas} | SMS: {item.sms}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.active ? (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Activo</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold">Inactivo</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditPlan(item)}
                                                    className="p-1.5 rounded-md bg-gray-50 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePlan(item.id)}
                                                    className="p-1.5 rounded-md bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- MODALS DE ACCIÓN --- */}

            {/* 1. Modal Devolución */}
            <Modal
                open={openDevolucion}
                onClose={() => setOpenDevolucion(false)}
                title="Registrar Devolución"
            >
                <form onSubmit={submitDevolucion} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Equipo: <strong>{modalActionItem?.marca} {modalActionItem?.modelo}</strong>
                        <br />
                        Responsable: {modalActionItem?.asignacion_activa?.beneficiario_nombre}
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Estado del Equipo al Retorno</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={devolucionData.estado}
                            onChange={(e) => setDevolucionData({ ...devolucionData, estado: e.target.value })}
                        >
                            <option value="Bueno">Bueno (Operativo)</option>
                            <option value="Dañado">Dañado (Pasará a Mantenimiento)</option>
                            <option value="Robado">Robado (Pasará a Mantenimiento)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                        <textarea
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            rows={3}
                            value={devolucionData.observaciones}
                            onChange={(e) => setDevolucionData({ ...devolucionData, observaciones: e.target.value })}
                            placeholder="Detalles sobre el estado, accesorios faltantes, etc."
                        />
                    </div>
                    {devolucionData.estado !== "Bueno" && (
                        <div className="bg-amber-50 p-3 rounded-md text-sm text-amber-800 flex gap-2">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <p>Este equipo quedará en estado <strong>Mantenimiento</strong> hasta que un administrador apruebe la baja o confirme la reparación.</p>
                        </div>
                    )}
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
                            Confirmar Devolución
                        </button>
                    </div>
                </form>
            </Modal>

            {/* 2. Modal Asignación Directa */}
            <Modal
                open={openAsignacion}
                onClose={() => setOpenAsignacion(false)}
                title="Asignación Manual (Sin Ticket)"
            >
                <form onSubmit={submitAsignacion} className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-800 mb-4">
                        Esta acción creará un ticket interno para mantener el historial. Úsala para asignar equipos rápidamente.
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">DNI Beneficiario</label>
                        <input
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={asignacionData.dni}
                            onChange={(e) => setAsignacionData({ ...asignacionData, dni: e.target.value })}
                            placeholder="DNI"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                        <input
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={asignacionData.nombre}
                            onChange={(e) => setAsignacionData({ ...asignacionData, nombre: e.target.value })}
                            placeholder="Nombre Apellido"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Área</label>
                            <input
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={asignacionData.area}
                                onChange={(e) => setAsignacionData({ ...asignacionData, area: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Puesto</label>
                            <input
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={asignacionData.puesto}
                                onChange={(e) => setAsignacionData({ ...asignacionData, puesto: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium">
                            Asignar Equipo
                        </button>
                    </div>
                </form>
            </Modal>

            {/* 3. Modal Solicitud Baja */}
            <Modal
                open={openBaja}
                onClose={() => setOpenBaja(false)}
                title="Solicitar Baja de Equipo"
            >
                <form onSubmit={submitBajaSolicitud} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Equipo: <strong>{modalActionItem?.marca} {modalActionItem?.modelo}</strong> (IMEI: {modalActionItem?.imei})
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Motivo de la Baja</label>
                        <textarea
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            rows={3}
                            value={bajaData.motivo}
                            onChange={(e) => setBajaData({ ...bajaData, motivo: e.target.value })}
                            placeholder="Ej: Pantalla rota irreparable, equipo obsoleto..."
                        />
                    </div>
                    <div className="bg-red-50 p-3 rounded-md text-sm text-red-800 flex gap-2">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <p>El equipo pasará a estado <strong>Mantenimiento</strong>. Un administrador deberá aprobar la baja definitiva.</p>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium">
                            Solicitar Baja
                        </button>
                    </div>
                </form>
            </Modal>


            {/* MODAL EQUIPO (CRUD) */}
            <Modal
                open={openEquipo}
                onClose={() => setOpenEquipo(false)}
                title={draftEquipo.id ? "Editar Equipo" : "Nuevo Equipo"}
            >
                <form onSubmit={saveEquipo} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Marca</label>
                            <select
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftEquipo.marca || ""}
                                onChange={(e) => setDraftEquipo({ ...draftEquipo, marca: e.target.value })}
                            >
                                <option value="">Seleccione...</option>
                                <option value="SAMSUNG">SAMSUNG</option>
                                <option value="APPLE">APPLE</option>
                                <option value="ZTE">ZTE</option>
                                <option value="HONOR">HONOR</option>
                                <option value="XIAOMI">XIAOMI</option>
                                <option value="OTROS">OTROS</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Modelo</label>
                            <input
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftEquipo.modelo || ""}
                                onChange={(e) => setDraftEquipo({ ...draftEquipo, modelo: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* SPECS */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 uppercase">RAM</label>
                            <input
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftEquipo.ram || ""}
                                onChange={(e) => setDraftEquipo({ ...draftEquipo, ram: e.target.value })}
                                placeholder="Ej: 8GB"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 uppercase">Almacenamiento</label>
                            <input
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftEquipo.almacenamiento || ""}
                                onChange={(e) => setDraftEquipo({ ...draftEquipo, almacenamiento: e.target.value })}
                                placeholder="Ej: 128GB"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 uppercase">Pantalla</label>
                            <input
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftEquipo.pantalla || ""}
                                onChange={(e) => setDraftEquipo({ ...draftEquipo, pantalla: e.target.value })}
                                placeholder="Ej: 6.5''"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">IMEI</label>
                        <input
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 font-mono"
                            value={draftEquipo.imei || ""}
                            onChange={(e) => setDraftEquipo({ ...draftEquipo, imei: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Color</label>
                            <input
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftEquipo.color || ""}
                                onChange={(e) => setDraftEquipo({ ...draftEquipo, color: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Condición Inicial</label>
                            <select
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftEquipo.condicion || "Nuevo"}
                                onChange={(e) => setDraftEquipo({ ...draftEquipo, condicion: e.target.value as any })}
                            >
                                <option value="Nuevo">Nuevo</option>
                                <option value="Segundo Uso">Segundo Uso</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Estado</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={draftEquipo.estado}
                            onChange={(e) => setDraftEquipo({ ...draftEquipo, estado: e.target.value as any })}
                        >
                            <option value="Disponible">Disponible</option>
                            <option value="Asignado">Asignado</option>
                            <option value="Mantenimiento">Mantenimiento</option>
                            <option value="Baja">Baja</option>
                        </select>
                    </div>

                    {!draftEquipo.id && (
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    id="esimToggle"
                                    checked={includeEsim}
                                    onChange={(e) => setIncludeEsim(e.target.checked)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor="esimToggle" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                                    Incluir eSIM / Número de Línea
                                </label>
                            </div>

                            {includeEsim && (
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Número</label>
                                        <input
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-white"
                                            value={esimData.numero}
                                            onChange={(e) => setEsimData({ ...esimData, numero: e.target.value })}
                                            placeholder="999..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Operador</label>
                                        <select
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-white"
                                            value={esimData.operador}
                                            onChange={(e) => setEsimData({ ...esimData, operador: e.target.value })}
                                        >
                                            <option value="">Seleccione...</option>
                                            <option value="MOVISTAR">MOVISTAR</option>
                                            <option value="CLARO">CLARO</option>
                                            <option value="ENTEL">ENTEL</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL CHIP */}
            <Modal
                open={openChip}
                onClose={() => setOpenChip(false)}
                title={draftChip.id ? "Editar Chip" : "Nuevo Chip"}
            >
                <form onSubmit={saveChip} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Número de Línea</label>
                        <input
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={draftChip.numero_linea || ""}
                            onChange={(e) => setDraftChip({ ...draftChip, numero_linea: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Operador</label>
                        <select
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={draftChip.operador || ""}
                            onChange={(e) => setDraftChip({ ...draftChip, operador: e.target.value })}
                        >
                            <option value="">Seleccione...</option>
                            <option value="MOVISTAR">MOVISTAR</option>
                            <option value="CLARO">CLARO</option>
                            <option value="ENTEL">ENTEL</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Estado</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={draftChip.estado}
                            onChange={(e) => setDraftChip({ ...draftChip, estado: e.target.value as any })}
                        >
                            <option value="Disponible">Disponible</option>
                            <option value="Asignado">Asignado</option>
                            <option value="Baja">Baja</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Plan Asignado</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={draftChip.plan_id || ""}
                            onChange={(e) => setDraftChip({ ...draftChip, plan_id: e.target.value || null })}
                        >
                            <option value="">-- Sin Plan --</option>
                            {telefoniaStore.planes
                                .filter(p => !draftChip.operador || p.operador === draftChip.operador)
                                .map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nombre} (S/ {p.costo.toFixed(2)}) - {p.gigas}
                                    </option>
                                ))
                            }
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Se muestran solo los planes de {draftChip.operador || "todos los operadores"}.
                        </p>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>


            {/* MODAL PLAN */}
            <Modal
                open={openPlan}
                onClose={() => setOpenPlan(false)}
                title={draftPlan.id ? "Editar Plan" : "Nuevo Plan"}
            >
                <form onSubmit={savePlan} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Operador</label>
                        <select
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={draftPlan.operador}
                            onChange={(e) => setDraftPlan({ ...draftPlan, operador: e.target.value as any })}
                        >
                            <option value="CLARO">CLARO</option>
                            <option value="MOVISTAR">MOVISTAR</option>
                            <option value="ENTEL">ENTEL</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Costo (S/)</label>
                            <input
                                type="number"
                                step="0.10"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftPlan.costo}
                                onChange={(e) => setDraftPlan({ ...draftPlan, costo: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Gigas (Datos)</label>
                            <input
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftPlan.gigas}
                                onChange={(e) => setDraftPlan({ ...draftPlan, gigas: e.target.value })}
                                placeholder="Ej: 10GB o Ilimitado"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Minutos</label>
                            <input
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftPlan.llamadas}
                                onChange={(e) => setDraftPlan({ ...draftPlan, llamadas: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">SMS</label>
                            <input
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftPlan.sms}
                                onChange={(e) => setDraftPlan({ ...draftPlan, sms: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nombre Visible (Opcional)</label>
                        <input
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={draftPlan.nombre || ""}
                            onChange={(e) => setDraftPlan({ ...draftPlan, nombre: e.target.value })}
                            placeholder={`Ej: Plan ${draftPlan.costo || 0}`}
                        />
                        <p className="text-xs text-gray-500 mt-1">Si se deja vacío se usará "S/ [Costo]"</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="planActive"
                            checked={draftPlan.active}
                            onChange={(e) => setDraftPlan({ ...draftPlan, active: e.target.checked })}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="planActive" className="block text-sm text-gray-900">
                            Plan Activo (Visible en solicitudes)
                        </label>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>


            {/* MODAL HISTORY */}
            <Modal
                open={showHistory}
                onClose={() => setShowHistory(false)}
                title="Historial de Equipo"
            >
                <div>
                    {historyLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : historyData.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">
                            <p>Este equipo no tiene historial de asignaciones registrado.</p>
                        </div>

                    ) : (
                        <div className="space-y-4 text-sm">
                            {historyData.map((req: any) => (
                                <div key={req.id} className="flex flex-col border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-gray-900 flex items-center gap-2">
                                                {req.beneficiario_nombre || "Usuario Desconocido"}
                                                <span className="text-xs font-normal text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                                    Ticket #{req.id.substring(0, 8)}
                                                </span>
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">{req.beneficiario_puesto}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${req.estado === 'Entregado' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {req.estado}
                                            </span>
                                            {req.tipo_servicio === 'ASIGNACION_DIRECTA' && (
                                                <span className="text-[10px] bg-blue-50 text-blue-700 px-1 rounded border border-blue-100">Directa</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span className="font-medium">
                                                Entrega: {req.fecha_entrega ? new Date(req.fecha_entrega).toLocaleDateString() : <span className="text-gray-400 italic">Pendiente</span>}
                                            </span>
                                        </div>
                                        {req.fecha_devolucion && (
                                            <div className="flex items-center gap-2 text-amber-600">
                                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                                <span className="font-medium">
                                                    Devolución: {new Date(req.fecha_devolucion).toLocaleDateString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {req.observaciones_retorno && (
                                        <div className="mt-2 bg-gray-50 p-2 rounded text-xs text-gray-600 italic">
                                            "{req.observaciones_retorno}"
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            {/* MODAL LINKING */}
            <Modal
                open={showLinkModal}
                onClose={() => setShowLinkModal(false)}
                title={linkTarget?.type === 'equipo' ? 'Vincular Línea' : 'Vincular Equipo'}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Seleccione el {linkTarget?.type === 'equipo' ? 'chip/línea' : 'equipo'} que desea asociar.
                        Solo se muestran los ítems disponibles (sin asignar).
                    </p>

                    <select
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        value={selectedLinkOption}
                        onChange={(e) => setSelectedLinkOption(e.target.value)}
                    >
                        <option value="">Seleccione...</option>
                        {linkTarget?.type === 'equipo'
                            ? telefoniaStore.chips
                                .filter(c => !c.equipo_id) // Only available chips
                                .map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.numero_linea} - {c.operador}
                                    </option>
                                ))
                            : telefoniaStore.equipos
                                .filter(e => !e.chip_id) // Only available equipos
                                .map(e => (
                                    <option key={e.id} value={e.id}>
                                        {e.marca} {e.modelo} (IMEI: {e.imei})
                                    </option>
                                ))
                        }
                    </select>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setShowLinkModal(false)}
                            className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 border border-gray-200"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveLink}
                            disabled={!selectedLinkOption || loading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Vincular'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODAL LINK PLAN */}
            <Modal
                open={openLinkPlan}
                onClose={() => setOpenLinkPlan(false)}
                title="Vincular Plan Telefónico"
            >
                <form onSubmit={submitLinkPlan} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Selecciona el plan para el chip <strong>{selectedChipLink?.numero_linea}</strong> ({selectedChipLink?.operador})
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Plan</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                        >
                            <option value="">-- Sin Plan --</option>
                            {telefoniaStore.planes
                                .filter(p => !selectedChipLink?.operador || p.operador === selectedChipLink.operador)
                                .map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nombre} (S/ {p.costo.toFixed(2)}) - {p.gigas}
                                    </option>
                                ))
                            }
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Mostrando planes de {selectedChipLink?.operador}.
                        </p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                        >
                            Guardar Vinculación
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
