import { useState, useEffect } from "react";
import { Plus, Search, X, Upload } from "lucide-react";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { Modal } from "../../components/ui/Modal";
import { rispStore, type HechoRisp } from "../../store/rispStore";
import { getSedesState, subscribeSedes } from "../../store/sedesStore";
import { getRispAreasState, subscribeRispAreas } from "../../store/rispAreasStore";
import { getPersonalState, subscribePersonal } from "../../store/personalStore";
// import { RISP_INCIDENT_CATALOG, getSubtypes, getCategoria } from "../../store/rispIncidentCatalog"; // REMOVED
import { rispIncidentCatalogStore, type RispIncidentCatalogItem } from "../../store/rispIncidentCatalogStore";
import { getAgentesState, subscribeAgentes } from "../../store/agentesStore";
import { useAuth } from "../../auth/AuthContext";

// Using a simple list layout similar to other pages
export default function Historial() {
    const { user, profile } = useAuth();
    const [risps, setRisps] = useState<HechoRisp[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<ToastState>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<HechoRisp | null>(null);

    // Store States
    const { sedes } = getSedesState();
    const { areas } = getRispAreasState();
    const { personal } = getPersonalState();
    const { agentes } = getAgentesState();

    // Catalog State
    const [catalogItems, setCatalogItems] = useState<RispIncidentCatalogItem[]>([]);

    // Subscriptions
    useEffect(() => {
        const u1 = subscribeSedes(() => { });
        const u2 = subscribeRispAreas(() => { });
        const u3 = subscribePersonal(() => { });
        const u4 = subscribeAgentes(() => { });

        // Load catalog
        const loadCatalog = async () => {
            try {
                const items = await rispIncidentCatalogStore.fetchCatalog();
                setCatalogItems(items);
            } catch (error) {
                console.error("Error loading catalog:", error);
            }
        };
        loadCatalog();

        return () => { u1(); u2(); u3(); u4(); };
    }, []);

    // Form state
    const [formData, setFormData] = useState<Partial<HechoRisp>>({
        categoria_risp: 'CCTV',
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

    // Derived state for filtered areas (Must be after formData)
    const availableAreas = formData.unidad
        ? areas.filter(a => a.sede?.nombre === formData.unidad || a.sede_id === sedes.find(s => s.nombre === formData.unidad)?.id)
        : [];

    // Incident Types (Unique)
    const availableTypes = Array.from(new Set(catalogItems.map(i => i.tipo)));

    // Incident Subtypes based on selected Tipo
    const availableSubtypes = formData.tipo_incidente
        ? catalogItems.filter(i => i.tipo === formData.tipo_incidente)
        : [];

    // Autocomplete state
    const [personalSearch, setPersonalSearch] = useState("");
    const [showPersonalSuggestions, setShowPersonalSuggestions] = useState(false);

    const personalSuggestions = personalSearch.length > 2
        ? personal.filter(p => p.dni.includes(personalSearch) || p.nombre.toLowerCase().includes(personalSearch.toLowerCase())).slice(0, 5)
        : [];

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
                categoria_risp: 'CCTV',
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
                usuario_reportante: user?.id || '',
                nombre_usuario_reportante: profile?.nombre || '',
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
                title={selectedItem ? "Editar RISP" : "Nuevo Reporte de Incidente (CCTV)"}
                size="lg"
            >
                <div className="space-y-8 p-1">
                    {/* Section: Información General */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Información General</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Categoría RISP</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                                    value={formData.categoria_risp || 'CCTV'}
                                    readOnly
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

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">DNI Agente</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                    value={formData.dni_agente || ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        // Auto-search agent
                                        const found = agentes.find(a => a.dni === val);
                                        setFormData({
                                            ...formData,
                                            dni_agente: val,
                                            nombre_agente: found ? found.nombre : ''
                                        });
                                    }}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-sm font-medium text-gray-700">Nombre Agente Reporta</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                                    value={formData.nombre_agente || ''}
                                    readOnly
                                    placeholder="Se completa automáticamente al ingresar DNI válido"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Ubicación y Responsables */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Ubicación y Responsables</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Sede *</label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
                                    value={formData.unidad || ''}
                                    onChange={e => setFormData({ ...formData, unidad: e.target.value, area_involucrada: '' })}
                                >
                                    <option value="">-- Seleccione --</option>
                                    {sedes.map(s => (
                                        <option key={s.id} value={s.nombre}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Área Involucrada</label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
                                    value={formData.area_involucrada || ''}
                                    onChange={e => {
                                        const selectedArea = availableAreas.find(a => a.nombre === e.target.value);
                                        setFormData({
                                            ...formData,
                                            area_involucrada: e.target.value,
                                            asignado_a: selectedArea?.responsable?.nombre || ''
                                        });
                                    }}
                                    disabled={!formData.unidad}
                                >
                                    <option value="">-- Seleccione Área --</option>
                                    {availableAreas.map(a => (
                                        <option key={a.id} value={a.nombre}>{a.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Asignado A</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 focus:outline-none cursor-not-allowed"
                                    value={formData.asignado_a || ''}
                                    readOnly
                                />
                            </div>
                            <div className="space-y-2 relative">
                                <label className="text-sm font-medium text-gray-700">Personal Involucrado</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                    value={formData.personal_involucrado || ''}
                                    onChange={e => {
                                        setFormData({ ...formData, personal_involucrado: e.target.value });
                                        setPersonalSearch(e.target.value);
                                        setShowPersonalSuggestions(true);
                                    }}
                                    onFocus={() => setShowPersonalSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowPersonalSuggestions(false), 200)}
                                    placeholder="Buscar por DNI o Nombre"
                                />
                                {showPersonalSuggestions && personalSuggestions.length > 0 && (
                                    <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                                        {personalSuggestions.map(p => (
                                            <li
                                                key={p.id}
                                                className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                                                onClick={() => {
                                                    setFormData({ ...formData, personal_involucrado: `${p.dni} - ${p.nombre}` });
                                                    setPersonalSearch(`${p.dni} - ${p.nombre}`);
                                                    setShowPersonalSuggestions(false);
                                                }}
                                            >
                                                <span className="font-bold">{p.dni}</span> - {p.nombre}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section: Clasificación del Incidente */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Clasificación del Incidente</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Tipo Incidente</label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
                                    value={formData.tipo_incidente || ''}
                                    onChange={e => {
                                        setFormData({
                                            ...formData,
                                            tipo_incidente: e.target.value,
                                            sub_tipo_incidente: '',
                                            categoria: ''
                                        });
                                    }}
                                >
                                    <option value="">-- Seleccione Tipo --</option>
                                    {availableTypes.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Sub-Tipo Incidente</label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
                                    value={formData.sub_tipo_incidente || ''}
                                    onChange={e => {
                                        const selectedSubtype = e.target.value;
                                        const matchingItem = catalogItems.find(i =>
                                            i.tipo === formData.tipo_incidente &&
                                            i.subtipo === selectedSubtype
                                        );

                                        setFormData({
                                            ...formData,
                                            sub_tipo_incidente: selectedSubtype,
                                            categoria: matchingItem?.categoria || '',
                                            intensidad: matchingItem?.gravedad || ''
                                        });
                                    }}
                                    disabled={!formData.tipo_incidente}
                                >
                                    <option value="">-- Seleccione Sub-Tipo --</option>
                                    {availableSubtypes.map(s => (
                                        <option key={s.id} value={s.subtipo}>{s.subtipo}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Categoría</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                                    value={formData.categoria || ''}
                                    readOnly
                                    placeholder="Automático"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Intensidad</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                                    value={formData.intensidad || ''}
                                    readOnly
                                    placeholder="Automático"
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
                    </div>

                    {/* Section: Reporte y Acciones */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Reporte y Acciones</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Tipo Reporte</label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
                                    value={formData.tipo_reporte || ''}
                                    onChange={e => setFormData({ ...formData, tipo_reporte: e.target.value })}
                                >
                                    <option value="">-- Seleccione --</option>
                                    <option value="OCURRENCIA">OCURRENCIA</option>
                                    <option value="HALLAZGO">HALLAZGO</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Tipo Acción Inmediata</label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
                                    value={formData.tipo_accion_inmediata || ''}
                                    onChange={e => setFormData({ ...formData, tipo_accion_inmediata: e.target.value })}
                                >
                                    <option value="">-- Seleccione --</option>
                                    <option value="DERIVADO A GCH">DERIVADO A GCH</option>
                                    <option value="CUSTODIA">CUSTODIA</option>
                                    <option value="COMUNICACION A SUPERIOR">COMUNICACION A SUPERIOR</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Tipo Observación</label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
                                    value={formData.tipo_observacion || ''}
                                    onChange={e => setFormData({ ...formData, tipo_observacion: e.target.value })}
                                >
                                    <option value="">-- Seleccione --</option>
                                    <option value="PREVENTIVA">PREVENTIVA</option>
                                    <option value="CORRECTIVA">CORRECTIVA</option>
                                </select>
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
                    </div>

                    {/* Section: Archivos y Estado */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Archivos y Estado</h3>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Fotos del Incidente</label>
                            <div className="flex gap-4 items-start">
                                <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                        <span className="text-xs text-gray-500 font-medium">{uploading ? 'Subiendo...' : 'Subir Imagen'}</span>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                                </label>

                                {formData.fotos && formData.fotos.map((url, idx) => (
                                    <div key={idx} className="relative w-32 h-32 group">
                                        <img src={url} alt="Foto" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, fotos: prev.fotos?.filter((_, i) => i !== idx) }))}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedItem && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Estado Cumplimiento</label>
                                    <select
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                        value={formData.estado_cumplimiento}
                                        disabled
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
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                                        value={formData.fecha_cumplimiento || ''}
                                        readOnly
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-6 flex justify-end gap-3 border-t mt-4">
                        <button
                            onClick={() => setModalOpen(false)}
                            className="px-6 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-sm"
                        >
                            Guardar Registro
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
