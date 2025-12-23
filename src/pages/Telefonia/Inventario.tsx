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
        setOpenEquipo(true);
    };

    const saveEquipo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (draftEquipo.id) {
                await telefoniaStore.updateEquipo(draftEquipo.id, draftEquipo);
                setToast({ type: "success", message: "Equipo actualizado" });
            } else {
                await telefoniaStore.createEquipo(draftEquipo as any);
                setToast({ type: "success", message: "Equipo creado" });
            }
            setOpenEquipo(false);
        } catch (err: any) {
            setToast({ type: "error", message: err.message || "Error al guardar equipo" });
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
            setToast({ type: "error", message: err.message || "Error al guardar chip" });
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
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Número</th>
                                        <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Operador</th>
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
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <EstadoBadge estado={item.estado} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => handleEditEquipo(item)}
                                                    className="text-gray-400 hover:text-indigo-600 transition-colors"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                    : filteredChips.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.numero_linea}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.operador}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <EstadoBadge estado={item.estado} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => handleEditChip(item)}
                                                    className="text-gray-400 hover:text-indigo-600 transition-colors"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
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
                            <input
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftEquipo.marca || ""}
                                onChange={(e) => setDraftEquipo({ ...draftEquipo, marca: e.target.value })}
                            />
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
                        <input
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            placeholder="Ej. Claro, Movistar, Entel"
                            value={draftChip.operador || ""}
                            onChange={(e) => setDraftChip({ ...draftChip, operador: e.target.value })}
                        />
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
        </div>
    );
}
