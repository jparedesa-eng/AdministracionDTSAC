import React, { useEffect, useState } from "react";
import { telefoniaStore } from "../../../store/telefoniaStore";
import type { Modelo } from "../../../store/telefoniaStore";
import { Toast } from "../../../components/ui/Toast";
import type { ToastState } from "../../../components/ui/Toast";
import { Plus, Search, Edit2, Trash2, Smartphone, Save } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";

export default function ModelosTelefonia() {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        nombre: "",
        marca: "",
        ram: "",
        almacenamiento: ""
    });

    const loadData = async () => {
        setLoading(true);
        try {
            await telefoniaStore.fetchModelos();
        } catch (error) {
            console.error(error);
            setToast({ type: "error", message: "Error al cargar modelos" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredData = telefoniaStore.modelos.filter(m =>
        m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.marca.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (modelo: Modelo) => {
        setFormData({
            nombre: modelo.nombre,
            marca: modelo.marca,
            ram: modelo.ram || "",
            almacenamiento: modelo.almacenamiento || ""
        });
        setEditingId(modelo.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este modelo?")) return;
        try {
            await telefoniaStore.deleteModelo(id);
            setToast({ type: "success", message: "Modelo eliminado" });
        } catch (error) {
            setToast({ type: "error", message: "Error al eliminar" });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await telefoniaStore.updateModelo(editingId, formData);
                setToast({ type: "success", message: "Modelo actualizado" });
            } else {
                await telefoniaStore.createModelo(formData);
                setToast({ type: "success", message: "Modelo creado" });
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ nombre: "", marca: "", ram: "", almacenamiento: "" });
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
                        <Smartphone className="w-8 h-8 text-indigo-600" />
                        Catálogo de Modelos
                    </h1>
                    <p className="text-gray-500 mt-1">Administra los modelos de equipos disponibles</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ nombre: "", marca: "", ram: "", almacenamiento: "" });
                        setIsModalOpen(true);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nuevo Modelo
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar modelo o marca..."
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
                                <th className="px-6 py-3">Marca</th>
                                <th className="px-6 py-3">Modelo</th>
                                <th className="px-6 py-3">RAM</th>
                                <th className="px-6 py-3">Almacenamiento</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        Cargando modelos...
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron modelos registrados.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((m) => (
                                    <tr key={m.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-3 font-medium text-gray-900">{m.marca}</td>
                                        <td className="px-6 py-3">{m.nombre}</td>
                                        <td className="px-6 py-3 text-gray-500">{m.ram || '-'}</td>
                                        <td className="px-6 py-3 text-gray-500">{m.almacenamiento || '-'}</td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(m)}
                                                    className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(m.id)}
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
                title={editingId ? "Editar Modelo" : "Nuevo Modelo"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                Marca
                            </label>
                            <input
                                type="text"
                                required
                                className="block w-full rounded-md border-gray-300 border p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="Apple, Samsung, Xiaomi..."
                                value={formData.marca}
                                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                Modelo
                            </label>
                            <input
                                type="text"
                                required
                                className="block w-full rounded-md border-gray-300 border p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="iPhone 15 Pro, Galaxy S24..."
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                RAM
                            </label>
                            <input
                                type="text"
                                className="block w-full rounded-md border-gray-300 border p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="8 GB"
                                value={formData.ram}
                                onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                Almacenamiento
                            </label>
                            <input
                                type="text"
                                className="block w-full rounded-md border-gray-300 border p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="256 GB"
                                value={formData.almacenamiento}
                                onChange={(e) => setFormData({ ...formData, almacenamiento: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
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
                            Guardar Modelo
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
