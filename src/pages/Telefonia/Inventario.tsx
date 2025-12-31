import React, { useEffect, useState } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { Equipo, Chip } from "../../store/telefoniaStore";
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
    User,
    Link,
    Unlink,
} from "lucide-react";

export default function InventarioTelefonia() {
    const [activeTab, setActiveTab] = useState<"equipos" | "chips">("equipos");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);

    // Search
    const [q, setQ] = useState("");

    // Modals
    const [openEquipo, setOpenEquipo] = useState(false);
    const [openChip, setOpenChip] = useState(false);

    // Drafts
    const [draftEquipo, setDraftEquipo] = useState<Partial<Equipo>>({ estado: "Disponible" });
    const [draftChip, setDraftChip] = useState<Partial<Chip>>({ estado: "Disponible" });

    // History View
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Linking View
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkTarget, setLinkTarget] = useState<{ type: 'equipo' | 'chip', item: any } | null>(null);
    const [selectedLinkOption, setSelectedLinkOption] = useState("");

    // eSIM / New Line flow
    const [includeEsim, setIncludeEsim] = useState(false);
    const [esimData, setEsimData] = useState({ numero: "", operador: "" });

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                telefoniaStore.fetchEquipos(),
                telefoniaStore.fetchChips(),
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

    // --- EQUIPOS HANDLERS ---
    const handleEditEquipo = (eq: Equipo) => {
        setDraftEquipo({ ...eq });
        setOpenEquipo(true);
    };

    const handleNewEquipo = () => {
        setDraftEquipo({ estado: "Disponible", marca: "", modelo: "", imei: "", color: "" });
        setIncludeEsim(false);
        setEsimData({ numero: "", operador: "" });
        setOpenEquipo(true);
    };

    const saveEquipo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let newChipId = null;

            // Handle eSIM creation if enabled and new equipment
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
                // If eSIM created, we can set the FK immediately if supported, but linking checks circulars.
                // Best strategy: Create Equipo -> Link both.
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
            e.imei.toLowerCase().includes(term)
        );
    });

    const filteredChips = telefoniaStore.chips.filter((c) => {
        const term = q.toLowerCase();
        return (
            c.numero_linea.toLowerCase().includes(term) ||
            c.operador.toLowerCase().includes(term)
        );
    });

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
                        className={`${activeTab === "equipos"
                            ? "border-indigo-500 text-indigo-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <Smartphone className="h-5 w-5" />
                        Equipos
                    </button>
                    <button
                        onClick={() => setActiveTab("chips")}
                        className={`${activeTab === "chips"
                            ? "border-indigo-500 text-indigo-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <Cpu className="h-5 w-5" />
                        Chips
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
                            activeTab === "equipos" ? "Buscar por marca, modelo, IMEI..." : "Buscar por número, operador..."
                        }
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </div>
                <button
                    onClick={activeTab === "equipos" ? handleNewEquipo : handleNewChip}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-gray-800 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo {activeTab === "equipos" ? "Equipo" : "Chip"}
                </button>
            </div>

            {/* CONTENT */}
            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            ) : (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                {activeTab === "equipos" ? (
                                    <tr>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Marca/Modelo</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">IMEI</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Color</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Línea Vinculada</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Número</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Operador</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Equipo Vinculado</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {activeTab === "equipos"
                                    ? filteredEquipos.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{item.marca}</div>
                                                <div className="text-gray-500">{item.modelo}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono">{item.imei}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.color || "-"}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {item.chip ? (
                                                    <div className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 w-fit">
                                                        <Cpu className="w-3 h-3" />
                                                        <span className="font-mono font-medium">{item.chip.numero_linea}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">Sin vincular</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <EstadoBadge estado={item.estado} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditEquipo(item)}
                                                        className="p-1.5 rounded-md bg-gray-50 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewHistory(item.id)}
                                                        className="p-1.5 rounded-md bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                        title="Ver Historial"
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </button>
                                                    {item.chip ? (
                                                        <button
                                                            onClick={() => handleUnlink('equipo', item)}
                                                            className="p-1.5 rounded-md bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                            title="Desvincular Línea"
                                                        >
                                                            <Unlink className="h-4 w-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleOpenLink('equipo', item)}
                                                            className="p-1.5 rounded-md bg-gray-50 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                            title="Vincular Línea"
                                                        >
                                                            <Link className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                    : filteredChips.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.numero_linea}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.operador}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {item.equipo ? (
                                                    <div className="flex items-center gap-1 text-gray-700 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200 w-fit max-w-[150px] truncate" title={`${item.equipo.marca} ${item.equipo.modelo}`}>
                                                        <Smartphone className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">{item.equipo.marca} {item.equipo.modelo}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">Sin vincular</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <EstadoBadge estado={item.estado} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditChip(item)}
                                                        className="p-1.5 rounded-md bg-gray-50 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    {item.equipo ? (
                                                        <button
                                                            onClick={() => handleUnlink('chip', item)}
                                                            className="p-1.5 rounded-md bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                            title="Desvincular Equipo"
                                                        >
                                                            <Unlink className="h-4 w-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleOpenLink('chip', item)}
                                                            className="p-1.5 rounded-md bg-gray-50 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                            title="Vincular Equipo"
                                                        >
                                                            <Link className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                {((activeTab === "equipos" && filteredEquipos.length === 0) ||
                                    (activeTab === "chips" && filteredChips.length === 0)) && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                                No se encontraron registros.
                                            </td>
                                        </tr>
                                    )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL EQUIPO */}
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
                        <div className="space-y-4">
                            {historyData.map((req: any) => (
                                <div key={req.id} className="flex flex-col border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                                                {req.beneficiario_nombre || "Usuario Desconocido"}
                                                <span className="text-xs font-normal text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                                    Ticket #{req.id.substring(0, 8)}
                                                </span>
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">{req.beneficiario_puesto}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${req.estado === 'Entregado' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {req.estado}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span className="font-medium">
                                                Entrega: {req.fecha_entrega ? new Date(req.fecha_entrega).toLocaleDateString() : <span className="text-gray-400 italic">Pendiente</span>}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            Recibido: {req.recibido_por || "-"}
                                        </div>
                                    </div>
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
        </div >
    );
}
