import React, { useEffect, useState } from "react";
import { telefoniaStore } from "../../../store/telefoniaStore";
import type { Proyecto } from "../../../store/telefoniaStore";
import { Toast } from "../../../components/ui/Toast";
import type { ToastState } from "../../../components/ui/Toast";
import { Plus, Search, Edit2, Ban, Folder, Save } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";

export default function ProyectosTelefonia() {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        nombre: "",
        codigo: "",
        active: true
    });

    const getNextCode = () => {
        // Find all codes starting with PY followed by numbers
        const codes = telefoniaStore.proyectos
            .map(p => p.codigo || "")
            .filter(c => /^PY\d+$/.test(c))
            .map(c => parseInt(c.replace("PY", ""), 10));

        const max = codes.length > 0 ? Math.max(...codes) : 0;
        const next = max + 1;
        // Pad with leading zeros, e.g. PY001
        return `PY${next.toString().padStart(3, '0')}`;
    };

    const loadData = async () => {
        setLoading(true);
        try {
            await telefoniaStore.fetchProyectos();
        } catch (error) {
            console.error(error);
            setToast({ type: "error", message: "Error al cargar proyectos" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredData = telefoniaStore.proyectos.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.codigo || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (proyecto: Proyecto) => {
        setFormData({
            nombre: proyecto.nombre,
            codigo: proyecto.codigo || "",
            active: proyecto.active
        });
        setEditingId(proyecto.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de desactivar este proyecto? El registro no se eliminará.")) return;
        try {
            await telefoniaStore.updateProyecto(id, { active: false });
            setToast({ type: "success", message: "Proyecto desactivado" });
        } catch (error) {
            setToast({ type: "error", message: "Error al desactivar" });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                nombre: formData.nombre,
                codigo: formData.codigo || null,
                active: formData.active
            };

            if (editingId) {
                await telefoniaStore.updateProyecto(editingId, payload);
                setToast({ type: "success", message: "Proyecto actualizado" });
            } else {
                await telefoniaStore.createProyecto(payload);
                setToast({ type: "success", message: "Proyecto creado" });
            }
            setIsModalOpen(false);
            setEditingId(null);
            setEditingId(null);
            setFormData({ nombre: "", codigo: "", active: true });
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
                        <Folder className="w-8 h-8 text-indigo-600" />
                        Catálogo de Proyectos
                    </h1>
                    <p className="text-gray-500 mt-1">Administra los proyectos disponibles para asignación</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        const nextCode = getNextCode();
                        setFormData({ nombre: "", codigo: nextCode, active: true });
                        setIsModalOpen(true);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-[#ff0000] text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nuevo Proyecto
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar proyecto..."
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
                                <th className="px-6 py-3">Código</th>
                                <th className="px-6 py-3">Nombre Proyecto</th>
                                <th className="px-6 py-3 w-32 text-center">Estado</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        Cargando proyectos...
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron proyectos registrados.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-3 text-gray-900 font-mono">{p.codigo || '-'}</td>
                                        <td className="px-6 py-3 font-medium text-gray-900">{p.nombre}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${p.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {p.active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex justify-end gap-2">
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
                                                    title="Desactivar"
                                                >
                                                    <Ban className="w-4 h-4" />
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
                title={editingId ? "Editar Proyecto" : "Nuevo Proyecto"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                Nombre del Proyecto
                            </label>
                            <input
                                type="text"
                                required
                                className="block w-full rounded-md border-gray-300 border p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                Código (Opcional)
                            </label>
                            <input
                                type="text"
                                className="block w-full rounded-md border-gray-300 border p-2 text-sm bg-gray-100 text-gray-500 cursor-not-allowed outline-none"
                                placeholder="Generado autom..."
                                value={formData.codigo}
                                readOnly
                            />
                        </div>
                        <div className="flex items-center pt-2">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.active ? 'bg-green-500' : 'bg-gray-200'}`}
                            >
                                <span className="sr-only">Estado activo</span>
                                <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.active ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                            </button>
                            <span className="ml-3 text-sm text-gray-700">
                                {formData.active ? 'Proyecto Activo' : 'Proyecto Inactivo'}
                            </span>
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
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Guardar Proyecto
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
