import { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { Modal } from "../../components/ui/Modal";
import { rispIncidentCatalogStore, type RispIncidentCatalogItem } from "../../store/rispIncidentCatalogStore";
import { LoadingScreen } from "../../components/ui/LoadingScreen";

export default function MantenedorIncidentes() {
    const [items, setItems] = useState<RispIncidentCatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [toast, setToast] = useState<ToastState>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<RispIncidentCatalogItem | null>(null);

    const [formData, setFormData] = useState({
        tipo: '',
        subtipo: '',
        categoria: '',
        gravedad: '',
        plazo: ''
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await rispIncidentCatalogStore.fetchCatalog();
            setItems(data);
        } catch (error) {
            setToast({ type: "error", message: "Error al cargar el catálogo" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filtered = items.filter(item =>
        item.tipo.toLowerCase().includes(search.toLowerCase()) ||
        item.subtipo.toLowerCase().includes(search.toLowerCase()) ||
        item.categoria.toLowerCase().includes(search.toLowerCase())
    );

    const handleOpenModal = (item?: RispIncidentCatalogItem) => {
        if (item) {
            setSelectedItem(item);
            setFormData({
                tipo: item.tipo,
                subtipo: item.subtipo,
                categoria: item.categoria,
                gravedad: item.gravedad || '',
                plazo: item.plazo || ''
            });
        } else {
            setSelectedItem(null);
            setFormData({ tipo: '', subtipo: '', categoria: '', gravedad: '', plazo: '' });
        }
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.tipo || !formData.subtipo || !formData.categoria || !formData.gravedad || !formData.plazo) {
            setToast({ type: "error", message: "Todos los campos son obligatorios" });
            return;
        }

        try {
            if (selectedItem) {
                await rispIncidentCatalogStore.updateItem(selectedItem.id, formData);
                setToast({ type: "success", message: "Actualizado correctamente" });
            } else {
                await rispIncidentCatalogStore.addItem(formData);
                setToast({ type: "success", message: "Creado correctamente" });
            }
            setModalOpen(false);
            loadData();
        } catch (error) {
            setToast({ type: "error", message: "Error al guardar" });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Está seguro de eliminar este registro?")) return;
        try {
            await rispIncidentCatalogStore.deleteItem(id);
            setToast({ type: "success", message: "Eliminado correctamente" });
            loadData();
        } catch (error) {
            setToast({ type: "error", message: "Error al eliminar" });
        }
    };

    if (loading && items.length === 0) return <LoadingScreen />;

    return (
        <div className="space-y-6 pb-20">
            <Toast toast={toast} onClose={() => setToast(null)} />

            <div className="flex items-center justify-between px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Catálogo de Incidentes</h1>
                    <p className="text-sm text-gray-500 mt-1">Gestión de Tipos, Subtipos y Categorías RISP</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Tipo
                </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Tipo</th>
                                <th className="px-4 py-3">Subtipo</th>
                                <th className="px-4 py-3">Categoría</th>
                                <th className="px-4 py-3">Gravedad</th>
                                <th className="px-4 py-3">Plazo</th>
                                <th className="px-4 py-3 rounded-r-lg text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No se encontraron registros.</td></tr>
                            ) : (
                                filtered.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.tipo}</td>
                                        <td className="px-4 py-3 text-gray-600">{item.subtipo}</td>
                                        <td className="px-4 py-3 text-gray-600">{item.categoria}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                                ${item.gravedad === 'GRAVE' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {item.gravedad}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{item.plazo}</td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenModal(item)}
                                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                                title="Editar"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
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
                title={selectedItem ? "Editar Tipo Incidente" : "Nuevo Tipo Incidente"}
                size="md"
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Tipo Incidente</label>
                        <input
                            type="text"
                            placeholder="Ej. Patrimonial"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                            value={formData.tipo}
                            onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Sub-Tipo Incidente</label>
                        <input
                            type="text"
                            placeholder="Ej. Robo"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                            value={formData.subtipo}
                            onChange={e => setFormData({ ...formData, subtipo: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Categoría</label>
                        <select
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                            value={formData.categoria}
                            onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                        >
                            <option value="">-- Seleccione --</option>
                            <option value="ACTIVIDADES SOSPECHOSAS">ACTIVIDADES SOSPECHOSAS</option>
                            <option value="SEGURIDAD ALIMENTARIA">SEGURIDAD ALIMENTARIA</option>
                            <option value="DEFENSA ALIMENTARIA">DEFENSA ALIMENTARIA</option>
                            <option value="BASC">BASC</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Gravedad</label>
                            <select
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.gravedad}
                                onChange={e => setFormData({ ...formData, gravedad: e.target.value })}
                            >
                                <option value="">-- Seleccione --</option>
                                <option value="MODERADO">MODERADO</option>
                                <option value="GRAVE">GRAVE</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Plazo</label>
                            <select
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.plazo}
                                onChange={e => setFormData({ ...formData, plazo: e.target.value })}
                            >
                                <option value="">-- Seleccione --</option>
                                <option value="MUY CORTO">MUY CORTO</option>
                                <option value="CORTO">CORTO</option>
                                <option value="MEDIANO">MEDIANO</option>
                                <option value="INMEDIATO">INMEDIATO</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
