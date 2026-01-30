import { useState, useEffect, useMemo } from "react";
import { Plus, Search, PencilLine, Trash2, Users } from "lucide-react";
import {
    getRispJefaturasState,
    subscribeRispJefaturas,
    createRispJefatura,
    updateRispJefatura,
    deleteRispJefatura,
    type RispJefatura,
    type CargoJefatura
} from "../../store/rispJefaturasStore";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";

export default function MantenedorJefaturas() {
    // Subscription
    const [, setVersion] = useState(0);
    useEffect(() => subscribeRispJefaturas(() => setVersion(prev => prev + 1)), []);

    const { jefaturas, loading } = getRispJefaturasState();

    // Local state
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastState>(null);
    const [saving, setSaving] = useState(false);

    // Form
    const [formData, setFormData] = useState<{
        nombre: string;
        email: string;
        cargo: CargoJefatura;
        jefe_id: string;
    }>({
        nombre: "",
        email: "",
        cargo: "RESPONSABLE",
        jefe_id: ""
    });

    // Filtering
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return jefaturas.filter(j =>
            j.nombre.toLowerCase().includes(q) ||
            j.email.toLowerCase().includes(q) ||
            j.cargo.toLowerCase().includes(q)
        );
    }, [jefaturas, search]);

    // Role-based Boss Candidates
    const bossCandidates = useMemo(() => {
        if (formData.cargo === 'SUBGERENTE') {
            return jefaturas.filter(j => j.cargo === 'GERENTE');
        }
        if (formData.cargo === 'RESPONSABLE') {
            return jefaturas.filter(j => j.cargo === 'SUBGERENTE');
        }
        return [];
    }, [jefaturas, formData.cargo]);

    // Handlers
    const handleOpenModal = (item?: RispJefatura) => {
        if (item) {
            setEditingId(item.id);
            setFormData({
                nombre: item.nombre,
                email: item.email,
                cargo: item.cargo,
                jefe_id: item.jefe_id || ""
            });
        } else {
            setEditingId(null);
            setFormData({
                nombre: "",
                email: "",
                cargo: "RESPONSABLE",
                jefe_id: ""
            });
        }
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic Validation
        if (!formData.nombre.trim() || !formData.email.trim()) {
            setToast({ type: "error", message: "Nombre y Email son obligatorios" });
            return;
        }

        // Hierarchy Validation
        // Hierarchy Validation - Now optional per user request
        // if (formData.cargo === 'SUBGERENTE' && !formData.jefe_id) { ... }
        // if (formData.cargo === 'RESPONSABLE' && !formData.jefe_id) { ... }

        // Ensure Gerente has no boss
        const finalData = { ...formData };
        if (finalData.cargo === 'GERENTE') {
            finalData.jefe_id = null as any;
            // supabase accepts null for uuid foreign key? Yes if optional.
            // TypeScript assumes string, but usually null works or empty string needs handling
        }

        const payload = {
            ...finalData,
            jefe_id: finalData.jefe_id === "" ? null : finalData.jefe_id
        };

        setSaving(true);
        try {
            if (editingId) {
                await updateRispJefatura(editingId, payload);
                setToast({ type: "success", message: "Registro actualizado" });
            } else {
                await createRispJefatura(payload);
                setToast({ type: "success", message: "Nuevo registro creado" });
            }
            setModalOpen(false);
        } catch (error: any) {
            console.error(error);
            setToast({ type: "error", message: "Error al guardar: " + error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, nombre: string) => {
        if (!confirm(`¿Eliminar a ${nombre}? Esto podría afectar áreas vinculadas.`)) return;

        try {
            await deleteRispJefatura(id);
            setToast({ type: "success", message: "Registro eliminado" });
        } catch (error: any) {
            setToast({ type: "error", message: "No se pudo eliminar: " + error.message });
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <Toast toast={toast} onClose={() => setToast(null)} />

            <div className="flex items-center justify-between px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Jefaturas RISP</h1>
                    <p className="text-sm text-gray-500 mt-1">Gestión de Responsables, Subgerentes y Gerentes</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Registro
                </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email o cargo..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Nombre</th>
                                <th className="px-4 py-3">Cargo</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Reporta A (Jefe)</th>
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
                                        <td className="px-4 py-3 font-semibold text-gray-900">{item.nombre}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                                                ${item.cargo === 'GERENTE' ? 'bg-purple-100 text-purple-700' :
                                                    item.cargo === 'SUBGERENTE' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-green-100 text-green-700'}`}>
                                                {item.cargo}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{item.email}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {item.jefe?.nombre ? (
                                                <div className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {item.jefe.nombre}
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
                title={editingId ? "Editar Jefatura" : "Nueva Jefatura"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Cargo</label>
                        <div className="flex gap-2">
                            {(['GERENTE', 'SUBGERENTE', 'RESPONSABLE'] as CargoJefatura[]).map(role => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, cargo: role, jefe_id: "" })}
                                    className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg border transition-colors
                                        ${formData.cargo === role
                                            ? 'bg-gray-900 text-white border-gray-900'
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Nombre Completo</label>
                        <input
                            required
                            type="text"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                            value={formData.nombre}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            placeholder="Ej. Juan Pérez"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Correo Electrónico</label>
                        <input
                            required
                            type="email"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="jperez@danper.com"
                        />
                    </div>

                    {formData.cargo !== 'GERENTE' && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700">
                                {formData.cargo === 'SUBGERENTE' ? 'Reporta a (Gerente)' : 'Reporta a (Subgerente)'}
                            </label>
                            <select
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
                                value={formData.jefe_id}
                                onChange={e => setFormData({ ...formData, jefe_id: e.target.value })}
                            >
                                <option value="">-- Seleccionar Jefe --</option>
                                {bossCandidates.map(boss => (
                                    <option key={boss.id} value={boss.id}>
                                        {boss.nombre} ({boss.cargo})
                                    </option>
                                ))}
                            </select>
                            {bossCandidates.length === 0 && (
                                <p className="text-xs text-orange-600 mt-1">
                                    No hay {formData.cargo === 'SUBGERENTE' ? 'Gerentes' : 'Subgerentes'} registrados.
                                    Registre uno primero.
                                </p>
                            )}
                        </div>
                    )}

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
