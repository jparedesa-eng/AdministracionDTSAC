import React, { useEffect, useState } from "react";
import { telefoniaStore } from "../../../store/telefoniaStore";
import type { Puesto, Modelo, PlanTelefonico } from "../../../store/telefoniaStore";
import { Toast } from "../../../components/ui/Toast";
import type { ToastState } from "../../../components/ui/Toast";
import { Plus, Search, Edit2, Trash2, Briefcase, Save, Star, Smartphone, Wifi } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";

export default function PuestosTelefonia() {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Dependencies
    const [modelos, setModelos] = useState<Modelo[]>([]);
    const [planes, setPlanes] = useState<PlanTelefonico[]>([]);

    const [formData, setFormData] = useState({
        nombre: "",
        modelo_recomendado_id: "",
        plan_recomendado_id: ""
    });

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                telefoniaStore.fetchPuestos(),
                telefoniaStore.fetchModelos(),
                telefoniaStore.fetchPlanes()
            ]);
            setModelos(telefoniaStore.modelos);
            setPlanes(telefoniaStore.planes);
        } catch (error) {
            console.error(error);
            setToast({ type: "error", message: "Error al cargar datos" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredData = telefoniaStore.puestos.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (puesto: Puesto) => {
        setFormData({
            nombre: puesto.nombre,
            modelo_recomendado_id: puesto.modelo_recomendado_id || "",
            plan_recomendado_id: puesto.plan_recomendado_id || ""
        });
        setEditingId(puesto.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este puesto?")) return;
        try {
            await telefoniaStore.deletePuesto(id);
            setToast({ type: "success", message: "Puesto eliminado" });
        } catch (error) {
            setToast({ type: "error", message: "Error al eliminar" });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                nombre: formData.nombre,
                modelo_recomendado_id: formData.modelo_recomendado_id || null,
                plan_recomendado_id: formData.plan_recomendado_id || null
            };

            if (editingId) {
                await telefoniaStore.updatePuesto(editingId, payload);
                setToast({ type: "success", message: "Puesto actualizado" });
            } else {
                await telefoniaStore.createPuesto(payload);
                setToast({ type: "success", message: "Puesto creado" });
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ nombre: "", modelo_recomendado_id: "", plan_recomendado_id: "" });
        } catch (error) {
            setToast({ type: "error", message: "Error al guardar" });
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Briefcase className="w-8 h-8 text-indigo-600" />
                        Catálogo de Puestos y Recomendaciones
                    </h1>
                    <p className="text-gray-500 mt-1">Define los puestos y sus equipos/planes sugeridos</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ nombre: "", modelo_recomendado_id: "", plan_recomendado_id: "" });
                        setIsModalOpen(true);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nuevo Puesto
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar puesto..."
                            className="pl-9 w-full rounded-md border-gray-300 border py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Puesto</th>
                                <th className="px-6 py-3">Modelo Recomendado</th>
                                <th className="px-6 py-3">Plan Recomendado</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        Cargando puestos...
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron puestos registrados.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-3 font-medium text-gray-900">{p.nombre}</td>
                                        <td className="px-6 py-3">
                                            {p.modelo ? (
                                                <div className="flex items-center gap-2 text-indigo-700 bg-indigo-50 px-2 py-1 rounded w-fit">
                                                    <Smartphone className="w-3.5 h-3.5" />
                                                    {p.modelo.marca} {p.modelo.nombre}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Sin recomendación</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            {p.plan ? (
                                                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-2 py-1 rounded w-fit">
                                                    <Wifi className="w-3.5 h-3.5" />
                                                    {p.plan.operador} - {p.plan.nombre}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Sin recomendación</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(p)}
                                                    className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Editar Puesto" : "Nuevo Puesto"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Nombre del Puesto
                        </label>
                        <input
                            type="text"
                            required
                            className="block w-full rounded-md border-gray-300 border p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            placeholder="Ej: Gerente General, Analista, Asistente..."
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        />
                    </div>

                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-indigo-900 mb-3">
                            <Star className="w-4 h-4 text-indigo-600" />
                            Recomendaciones
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                    Modelo Sugerido
                                </label>
                                <select
                                    className="block w-full rounded-md border-indigo-200 border p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                                    value={formData.modelo_recomendado_id}
                                    onChange={(e) => setFormData({ ...formData, modelo_recomendado_id: e.target.value })}
                                >
                                    <option value="">-- Ninguno --</option>
                                    {modelos.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.marca} {m.nombre} ({m.almacenamiento})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                    Plan Sugerido
                                </label>
                                <select
                                    className="block w-full rounded-md border-indigo-200 border p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                                    value={formData.plan_recomendado_id}
                                    onChange={(e) => setFormData({ ...formData, plan_recomendado_id: e.target.value })}
                                >
                                    <option value="">-- Ninguno --</option>
                                    {planes
                                        .filter(p => p.active)
                                        .map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.operador} - {p.nombre} ({p.gigas})
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Guardar Puesto
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
