import { useState, useEffect, useMemo } from "react";
import { Plus, Search, PencilLine, Trash2, MapPin, User } from "lucide-react";
import {
    getRispAreasState,
    subscribeRispAreas,
    createRispArea,
    updateRispArea,
    deleteRispArea,
    type RispArea
} from "../../store/rispAreasStore";
import { subscribeSedes, getSedesState } from "../../store/sedesStore";
import { subscribeRispJefaturas, getRispJefaturasState } from "../../store/rispJefaturasStore";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";

export default function MantenedorAreas() {
    // Subscriptions
    const [, setVersion] = useState(0);
    useEffect(() => {
        const u1 = subscribeRispAreas(() => setVersion(p => p + 1));
        const u2 = subscribeSedes(() => setVersion(p => p + 1));
        const u3 = subscribeRispJefaturas(() => setVersion(p => p + 1));
        return () => { u1(); u2(); u3(); };
    }, []);

    const { areas, loading } = getRispAreasState();
    const { sedes } = getSedesState();
    const { jefaturas } = getRispJefaturasState();

    // Local State
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastState>(null);
    const [saving, setSaving] = useState(false);

    // Form
    const [formData, setFormData] = useState({
        nombre: "",
        sede_id: "",
        responsable_id: ""
    });

    // Filtered Responsables (Only those with cargo 'RESPONSABLE')
    const responsables = useMemo(() =>
        jefaturas.filter(j => j.cargo === 'RESPONSABLE'),
        [jefaturas]
    );

    // Filtering
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return areas.filter(a =>
            a.nombre.toLowerCase().includes(q) ||
            a.sede?.nombre.toLowerCase().includes(q) ||
            a.responsable?.nombre.toLowerCase().includes(q)
        );
    }, [areas, search]);

    // Handlers
    const handleOpenModal = (item?: RispArea) => {
        if (item) {
            setEditingId(item.id);
            setFormData({
                nombre: item.nombre,
                sede_id: item.sede_id,
                responsable_id: item.responsable_id || ""
            });
        } else {
            setEditingId(null);
            setFormData({
                nombre: "",
                sede_id: "",
                responsable_id: ""
            });
        }
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nombre.trim() || !formData.sede_id || !formData.responsable_id) {
            setToast({ type: "error", message: "Todos los campos son obligatorios" });
            return;
        }

        const payload = {
            ...formData,
            responsable_id: formData.responsable_id
        };

        setSaving(true);
        try {
            if (editingId) {
                await updateRispArea(editingId, payload);
                setToast({ type: "success", message: "Área actualizada" });
            } else {
                await createRispArea(payload);
                setToast({ type: "success", message: "Nueva área creada" });
            }
            setModalOpen(false);
        } catch (error: any) {
            console.error(error);
            setToast({ type: "error", message: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, nombre: string) => {
        if (!confirm(`¿Eliminar área ${nombre}?`)) return;

        try {
            await deleteRispArea(id);
            setToast({ type: "success", message: "Área eliminada" });
        } catch (error: any) {
            setToast({ type: "error", message: "Error al eliminar: " + error.message });
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <Toast toast={toast} onClose={() => setToast(null)} />

            <div className="flex items-center justify-between px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Áreas RISP</h1>
                    <p className="text-sm text-gray-500 mt-1">Vinculación de Áreas a Sedes y Responsables</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nueva Área
                </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, sede o responsable..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Sede</th>
                                <th className="px-4 py-3">Área</th>
                                <th className="px-4 py-3">Responsable</th>
                                <th className="px-4 py-3">Reporta A (Subgerente)</th>
                                <th className="px-4 py-3 rounded-r-lg text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No se encontraron registros.</td></tr>
                            ) : (
                                filtered.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-gray-400" />
                                                {item.sede?.nombre}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-gray-900">{item.nombre}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <User className="w-3 h-3 text-gray-400" />
                                                {item.responsable?.nombre || '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">
                                            {item.responsable?.jefe?.nombre ? (
                                                <div className="flex flex-col">
                                                    <span className="text-gray-600">{item.responsable.jefe.nombre}</span>
                                                    <span className="text-[10px]">{item.responsable.jefe.jefe?.nombre ? `(Gerente: ${item.responsable.jefe.jefe.nombre})` : ''}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(item)}
                                                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <PencilLine className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id, item.nombre)}
                                                    className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingId ? "Editar Área" : "Nueva Área"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Sede (Unidad)</label>
                        <select
                            required
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
                            value={formData.sede_id}
                            onChange={e => setFormData({ ...formData, sede_id: e.target.value })}
                        >
                            <option value="">-- Seleccionar Sede --</option>
                            {sedes.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Nombre del Área</label>
                        <input
                            required
                            type="text"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                            value={formData.nombre}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            placeholder="Ej. Almacén Central"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Responsable de Área</label>
                        <select
                            required
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
                            value={formData.responsable_id}
                            onChange={e => setFormData({ ...formData, responsable_id: e.target.value })}
                        >
                            <option value="">-- Seleccionar Responsable --</option>
                            {responsables.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.nombre} (Jefe: {r.jefe?.nombre || 'NiN'})
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">
                            Solo se muestran Jefaturas con cargo 'RESPONSABLE'.
                            El Subgerente y Gerente se asignan automáticamente según la jerarquía del responsable.
                        </p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
