import { useState, useEffect } from "react";
import { Plus, Search, X, Upload } from "lucide-react";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { Modal } from "../../components/ui/Modal";
import { rispStore, type HechoRisp } from "../../store/rispStore";

// Using a simple list layout similar to other pages
export default function Historial() {
    const [risps, setRisps] = useState<HechoRisp[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<ToastState>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<HechoRisp | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<HechoRisp>>({
        categoria_risp: 'AGENTE',
        unidad: '',
        fecha_incidente: new Date().toISOString().split('T')[0],
        dni_agente: '',
        nombre_agente: '',
        macrozona: '',
        area_involucrada: '',
        asignado_a: '',
        personal_involucrado: '',
        categoria: '',
        tipo_incidente: '',
        sub_tipo_incidente: '',
        descripcion_incidente: '',
        tipo_reporte: '',
        tipo_accion_inmediata: '',
        tipo_observacion: '',
        descripcion_acciones_tomadas: '',
        estado_cumplimiento: 'PENDIENTE',
        fecha_cumplimiento: '',
        intensidad: 'BAJA',
        usuario_reportante: '', // Can be filled from auth context if available
        nombre_usuario_reportante: '',
        fotos: []
    });

    const [uploading, setUploading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            await rispStore.fetchRisps();
            setRisps(rispStore.risps);
        } catch (error: any) {
            setToast({ type: "error", message: "Error al cargar historial." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filtered = risps.filter(r =>
        (r.n_risp?.toLowerCase().includes(search.toLowerCase())) ||
        (r.descripcion_incidente?.toLowerCase().includes(search.toLowerCase())) ||
        (r.nombre_agente?.toLowerCase().includes(search.toLowerCase()))
    );

    const handleSave = async () => {
        if (!formData.unidad || !formData.fecha_incidente) {
            setToast({ type: "error", message: "Complete los campos obligatorios (*)" });
            return;
        }

        try {
            if (selectedItem) {
                await rispStore.updateRisp(selectedItem.id, formData);
                setToast({ type: "success", message: "Registro actualizado." });
            } else {
                await rispStore.createRisp(formData as HechoRisp);
                setToast({ type: "success", message: "Nuevo RISP creado." });
            }
            setModalOpen(false);
            loadData();
        } catch (error: any) {
            console.error(error);
            setToast({ type: "error", message: "Error al guardar el registro." });
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        try {
            const file = e.target.files[0];
            const url = await rispStore.uploadPhoto(file);
            setFormData(prev => ({
                ...prev,
                fotos: [...(prev.fotos || []), url]
            }));
            setToast({ type: "success", message: "Foto subida correctamente" });
        } catch (error) {
            console.error(error);
            setToast({ type: "error", message: "Error al subir la foto" });
        } finally {
            setUploading(false);
        }
    };

    const handleOpenModal = (item?: HechoRisp) => {
        if (item) {
            setSelectedItem(item);
            setFormData({ ...item });
        } else {
            setSelectedItem(null);
            setFormData({
                categoria_risp: 'AGENTE',
                unidad: '',
                fecha_incidente: new Date().toISOString().split('T')[0],
                dni_agente: '',
                nombre_agente: '',
                macrozona: '',
                area_involucrada: '',
                asignado_a: '',
                personal_involucrado: '',
                categoria: '',
                tipo_incidente: '',
                sub_tipo_incidente: '',
                descripcion_incidente: '',
                tipo_reporte: '',
                tipo_accion_inmediata: '',
                tipo_observacion: '',
                descripcion_acciones_tomadas: '',
                estado_cumplimiento: 'PENDIENTE',
                fecha_cumplimiento: '',
                intensidad: 'BAJA',
                usuario_reportante: '',
                nombre_usuario_reportante: '',
                fotos: []
            });
        }
        setModalOpen(true);
    };

    return (
        <div className="space-y-6 pb-20">
            <Toast toast={toast} onClose={() => setToast(null)} />

            <div className="flex items-center justify-between px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Historial RISP</h1>
                    <p className="text-sm text-gray-500 mt-1">Reporte de Incidentes de Seguridad Patrimonial</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-[#ff0000] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
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
                        placeholder="Buscar por N° RISP, Agente o Descripción..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">N° RISP</th>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Cat.</th>
                                <th className="px-4 py-3">Unidad</th>
                                <th className="px-4 py-3">Incidente</th>
                                <th className="px-4 py-3">Reportante</th>
                                <th className="px-4 py-3 rounded-r-lg">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No se encontraron registros.</td></tr>
                            ) : (
                                filtered.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                        onClick={() => handleOpenModal(item)}
                                    >
                                        <td className="px-4 py-3 font-semibold text-gray-900">{item.n_risp}</td>
                                        <td className="px-4 py-3 text-gray-600">{item.fecha_incidente}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.categoria_risp === 'AGENTE' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                                                }`}>
                                                {item.categoria_risp}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{item.unidad}</td>
                                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{item.tipo_incidente}</td>
                                        <td className="px-4 py-3 text-gray-600">{item.nombre_usuario_reportante || item.usuario_reportante || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.estado_cumplimiento === 'CUMPLIDO' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                                                }`}>
                                                {item.estado_cumplimiento}
                                            </span>
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
                title={selectedItem ? "Editar RISP" : "Nuevo Registro RISP"}
                size="xl"
            >
                <div className="space-y-6">
                    {/* Section 1: Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Categoría RISP</label>
                            <select
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.categoria_risp}
                                onChange={e => setFormData({ ...formData, categoria_risp: e.target.value as any })}
                            >
                                <option value="AGENTE">AGENTE</option>
                                <option value="CCTV">CCTV</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Unidad *</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.unidad || ''}
                                onChange={e => setFormData({ ...formData, unidad: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Fecha Incidente *</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.fecha_incidente || ''}
                                onChange={e => setFormData({ ...formData, fecha_incidente: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">DNI Agente</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.dni_agente || ''}
                                onChange={e => setFormData({ ...formData, dni_agente: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-medium text-gray-700">Nombre Agente Reporta</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.nombre_agente || ''}
                                onChange={e => setFormData({ ...formData, nombre_agente: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Macrozona</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.macrozona || ''}
                                onChange={e => setFormData({ ...formData, macrozona: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Área Involucrada</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.area_involucrada || ''}
                                onChange={e => setFormData({ ...formData, area_involucrada: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Asignado A</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.asignado_a || ''}
                                onChange={e => setFormData({ ...formData, asignado_a: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Personal Involucrado</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.personal_involucrado || ''}
                                onChange={e => setFormData({ ...formData, personal_involucrado: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Categoría</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.categoria || ''}
                                onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Tipo Incidente</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.tipo_incidente || ''}
                                onChange={e => setFormData({ ...formData, tipo_incidente: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Sub-Tipo Incidente</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.sub_tipo_incidente || ''}
                                onChange={e => setFormData({ ...formData, sub_tipo_incidente: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Descripción del Incidente</label>
                        <textarea
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 min-h-[80px]"
                            value={formData.descripcion_incidente || ''}
                            onChange={e => setFormData({ ...formData, descripcion_incidente: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Tipo Reporte</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.tipo_reporte || ''}
                                onChange={e => setFormData({ ...formData, tipo_reporte: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Tipo Acción Inmediata</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.tipo_accion_inmediata || ''}
                                onChange={e => setFormData({ ...formData, tipo_accion_inmediata: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Tipo Observación</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.tipo_observacion || ''}
                                onChange={e => setFormData({ ...formData, tipo_observacion: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Descripción de Acciones Tomadas</label>
                        <textarea
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 min-h-[80px]"
                            value={formData.descripcion_acciones_tomadas || ''}
                            onChange={e => setFormData({ ...formData, descripcion_acciones_tomadas: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Estado Cumplimiento</label>
                            <select
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.estado_cumplimiento}
                                onChange={e => setFormData({ ...formData, estado_cumplimiento: e.target.value })}
                            >
                                <option value="PENDIENTE">PENDIENTE</option>
                                <option value="EN PROCESO">EN PROCESO</option>
                                <option value="CUMPLIDO">CUMPLIDO</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Fecha Cumplimiento</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.fecha_cumplimiento || ''}
                                onChange={e => setFormData({ ...formData, fecha_cumplimiento: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Intensidad</label>
                            <select
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.intensidad}
                                onChange={e => setFormData({ ...formData, intensidad: e.target.value })}
                            >
                                <option value="BAJA">BAJA</option>
                                <option value="MEDIA">MEDIA</option>
                                <option value="ALTA">ALTA</option>
                                <option value="CRITICA">CRÍTICA</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Fotos</label>
                        <div className="flex gap-4 items-start">
                            <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-6 h-6 text-gray-400" />
                                    <span className="text-xs text-gray-500 mt-1">{uploading ? '...' : 'Subir'}</span>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                            </label>

                            {formData.fotos && formData.fotos.map((url, idx) => (
                                <div key={idx} className="relative w-24 h-24 group">
                                    <img src={url} alt="Foto" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, fotos: prev.fotos?.filter((_, i) => i !== idx) }))}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Nombre Usuario Reportante</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                value={formData.nombre_usuario_reportante || ''}
                                onChange={e => setFormData({ ...formData, nombre_usuario_reportante: e.target.value })}
                            />
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
