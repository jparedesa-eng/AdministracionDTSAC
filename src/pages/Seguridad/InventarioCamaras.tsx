import { useState, useEffect, useMemo } from "react";
import {
    Camera,
    Plus,
    Search,
    PencilLine,
} from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { getSedesState, subscribeSedes } from "../../store/sedesStore";
import { getCentralesState, subscribeCentrales } from "../../store/cctvCentralesStore";
import { getCamarasState, subscribeCamaras, upsertCamara, type Camara } from "../../store/camarasStore";

export default function InventarioCamaras() {
    const [, setSedesVersion] = useState(0);
    const [, setCentralesVersion] = useState(0);
    const [, setCamarasVersion] = useState(0);

    useEffect(() => {
        const unsubSedes = subscribeSedes(() => setSedesVersion(prev => prev + 1));
        const unsubCentrales = subscribeCentrales(() => setCentralesVersion(prev => prev + 1));
        const unsubCamaras = subscribeCamaras(() => setCamarasVersion(prev => prev + 1));

        return () => {
            unsubSedes();
            unsubCentrales();
            unsubCamaras();
        };
    }, []);

    const { sedes } = getSedesState();
    const { centrales } = getCentralesState();
    const { camaras } = getCamarasState();

    const [toast, setToast] = useState<ToastState>(null);

    return (
        <div className="space-y-6 pb-20">
            <Toast toast={toast} onClose={() => setToast(null)} />

            {/* Header moved inside TabCamaras for layout alignment */}

            {/* Content */}
            <div className="min-h-[400px]">
                <TabCamaras
                    sedes={sedes}
                    centrales={centrales}
                    camaras={camaras}
                    onAdd={async (data) => {
                        try {
                            await upsertCamara(data);
                            setToast({ type: "success", message: "Cámara creada correctamente." });
                        } catch (error: any) {
                            setToast({ type: "error", message: error.message || "Error al crear cámara." });
                        }
                    }}
                    onUpdate={async (id, data) => {
                        try {
                            const camara = camaras.find(c => c.id === id);
                            if (!camara) return;
                            await upsertCamara({
                                ...data,
                                id,
                                codigo: data.codigo || camara.codigo,
                                nombre: data.nombre || camara.nombre,
                                central_id: data.central_id || camara.central_id,
                            });
                            setToast({ type: "success", message: "Cámara actualizada." });
                        } catch (error: any) {
                            setToast({ type: "error", message: error.message || "Error al actualizar cámara." });
                        }
                    }}
                />
            </div>
        </div>
    );
}

// ===== TAB CAMARAS =====

function TabCamaras({
    sedes,
    centrales,
    camaras,
    onAdd,
    onUpdate
}: {
    sedes: { id: string, nombre: string }[];
    centrales: any[];
    camaras: Camara[];
    onAdd: (data: any) => void;
    onUpdate: (id: string, data: Partial<Camara>) => void;
}) {
    const [search, setSearch] = useState("");
    const [filterSede, setFilterSede] = useState("");
    const [filterCentral, setFilterCentral] = useState("");
    const [filterTipo, setFilterTipo] = useState("");
    const [filterUbicacion, setFilterUbicacion] = useState("");
    const [filterEstado, setFilterEstado] = useState<"all" | "activa" | "inactiva">("all");
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<Camara | null>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [formData, setFormData] = useState({
        codigo: "",
        nombre: "",
        central_id: "",
        sede_id: "",
        nave_fundo: "",
        tiempo_respaldo: "",
        marca: "",
        tipo_componente: "" as "" | "CAMARA FIJA" | "CAMARA DOMO",
        ubicacion: "" as "" | "INTERIOR" | "EXTERIOR",
        fecha_instalacion: "",
        area: "",
    });

    const filtered = camaras.filter(c => {
        const matchSearch = c.codigo.toLowerCase().includes(search.toLowerCase()) ||
            c.nombre.toLowerCase().includes(search.toLowerCase());
        const matchSede = !filterSede || c.sede_id === filterSede;
        const matchCentral = !filterCentral || c.central_id === filterCentral;
        const matchTipo = !filterTipo || c.tipo_componente === filterTipo;
        const matchUbicacion = !filterUbicacion || c.ubicacion === filterUbicacion;
        const matchEstado = filterEstado === "all" ||
            (filterEstado === "activa" && c.activa) ||
            (filterEstado === "inactiva" && !c.activa);

        return matchSearch && matchSede && matchCentral && matchTipo && matchUbicacion && matchEstado;
    });

    // Pagination Logic
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const start = (page - 1) * pageSize;
    const currentRows = pageSize === -1 ? filtered : filtered.slice(start, start + pageSize);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    useEffect(() => {
        setPage(1);
    }, [search, filterSede, filterCentral, filterTipo, filterUbicacion, filterEstado]);

    const getCentralAbbr = (name: string) => {
        const parts = name.trim().split(/\s+/);
        // If it's "CCTV AQP" -> "AQP"
        // If it's "CCTV CONSERVA" -> "CONSERVA"
        if (parts.length > 1) {
            return parts[parts.length - 1].toUpperCase();
        }
        return name.substring(0, 3).toUpperCase();
    };

    const generateNextCodigo = (centralId: string) => {
        const central = centrales.find(c => c.id === centralId);
        if (!central) return "";

        const abbr = getCentralAbbr(central.nombre);
        const centralCamaras = camaras.filter(c => c.central_id === centralId);

        let maxNum = 0;
        centralCamaras.forEach(c => {
            const parts = c.codigo.split('-');
            // Expected format: CAM-01-ABBR
            if (parts.length >= 2) {
                const num = parseInt(parts[1], 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });

        return `CAM-${String(maxNum + 1).padStart(2, '0')}-${abbr}`;
    };

    // Update code when central changes for NEW items
    useEffect(() => {
        if (!editItem && formData.central_id && modalOpen) {
            const nextCodigo = generateNextCodigo(formData.central_id);
            if (nextCodigo !== formData.codigo) {
                setFormData(prev => ({ ...prev, codigo: nextCodigo }));
            }
        }
    }, [formData.central_id, modalOpen, editItem, camaras]);

    // Dependent Dropdown Logic: Filter sedes based on selected central
    const filteredSedes = useMemo(() => {
        if (!formData.central_id) return [];
        const central = centrales.find(c => c.id === formData.central_id);
        if (!central || !central.sedes) return [];
        return sedes.filter(s => central.sedes.includes(s.id));
    }, [formData.central_id, centrales, sedes]);

    // Reset Sede if it's not valid for the selected Central
    useEffect(() => {
        if (formData.central_id && formData.sede_id) {
            const central = centrales.find(c => c.id === formData.central_id);
            if (central && central.sedes && !central.sedes.includes(formData.sede_id)) {
                setFormData(prev => ({ ...prev, sede_id: "" }));
            }
        }
    }, [formData.central_id, centrales]);

    const handleOpen = (item?: Camara) => {
        if (item) {
            setEditItem(item);
            setFormData({
                codigo: item.codigo,
                nombre: item.nombre,
                central_id: item.central_id,
                sede_id: item.sede_id || "",
                nave_fundo: item.nave_fundo || "",
                tiempo_respaldo: item.tiempo_respaldo || "",
                marca: item.marca || "",
                tipo_componente: item.tipo_componente || "",
                ubicacion: item.ubicacion || "",
                fecha_instalacion: item.fecha_instalacion || "",
                area: item.area || "",
            });
        } else {
            const initialCentralId = filterCentral || centrales[0]?.id || "";
            const initialSedeId = filterSede || sedes[0]?.id || "";

            setEditItem(null);
            setFormData({
                codigo: generateNextCodigo(initialCentralId),
                nombre: "",
                central_id: initialCentralId,
                sede_id: initialSedeId,
                nave_fundo: "",
                tiempo_respaldo: "",
                marca: "",
                tipo_componente: "",
                ubicacion: "",
                fecha_instalacion: "",
                area: "",
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = () => {
        if (!formData.codigo.trim() || !formData.nombre.trim() || !formData.central_id) return;

        if (editItem) {
            const updateData: Partial<Camara> = {
                codigo: formData.codigo,
                nombre: formData.nombre,
                central_id: formData.central_id,
                sede_id: formData.sede_id || null,
                nave_fundo: formData.nave_fundo || null,
                tiempo_respaldo: formData.tiempo_respaldo || null,
                marca: formData.marca || null,
                tipo_componente: formData.tipo_componente || null,
                ubicacion: formData.ubicacion || null,
                fecha_instalacion: formData.fecha_instalacion || null,
                area: formData.area || null,
            };
            onUpdate(editItem.id, updateData);
        } else {
            onAdd(formData);
        }
        setModalOpen(false);
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between gap-4 px-1">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                        <Camera className="h-7 w-7 text-blue-600" />
                        Inventario de cámaras CCTV
                    </h1>
                    <p className="text-sm font-medium text-gray-500">
                        Gestión técnica de infraestructura de video vigilancia
                    </p>
                </div>
                <button
                    onClick={() => handleOpen()}
                    className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-900 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nueva cámara
                </button>
            </div>

            {/* Filters Container */}
            <div className="bg-white p-4 rounded-xl border border-gray-200">
                <div className="flex flex-col gap-4">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por código o nombre..."
                            className="pl-9 w-full rounded-xl border border-gray-200 text-sm focus:ring-1 focus:ring-gray-200 focus:border-gray-400 h-10 bg-gray-50/50 outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <select
                            value={filterSede}
                            onChange={e => setFilterSede(e.target.value)}
                            className="rounded-lg border-gray-200 text-sm focus:ring-1 focus:ring-gray-200 focus:border-gray-400 h-9 outline-none"
                        >
                            <option value="">Todas las Sedes</option>
                            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>

                        <select
                            value={filterCentral}
                            onChange={e => setFilterCentral(e.target.value)}
                            className="rounded-lg border-gray-200 text-xs focus:ring-1 focus:ring-gray-200 focus:border-gray-400 h-8 outline-none"
                        >
                            <option value="">Todas las Centrales</option>
                            {centrales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>

                        <select
                            value={filterTipo}
                            onChange={e => setFilterTipo(e.target.value)}
                            className="rounded-lg border-gray-200 text-sm focus:ring-1 focus:ring-gray-200 focus:border-gray-400 h-9 outline-none"
                        >
                            <option value="">Todos los Tipos</option>
                            <option value="CAMARA FIJA">Cámara Fija</option>
                            <option value="CAMARA DOMO">Cámara Domo</option>
                        </select>

                        <select
                            value={filterUbicacion}
                            onChange={e => setFilterUbicacion(e.target.value)}
                            className="rounded-lg border-gray-200 text-sm focus:ring-1 focus:ring-gray-200 focus:border-gray-400 h-9 outline-none"
                        >
                            <option value="">Todas las Ubicaciones</option>
                            <option value="INTERIOR">Interior</option>
                            <option value="EXTERIOR">Exterior</option>
                        </select>

                        <select
                            value={filterEstado}
                            onChange={e => setFilterEstado(e.target.value as any)}
                            className="rounded-lg border-gray-200 text-xs focus:ring-1 focus:ring-gray-200 focus:border-gray-400 h-8 outline-none"
                        >
                            <option value="all">Todos los Estados</option>
                            <option value="activa">Activas</option>
                            <option value="inactiva">Inactivas</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-wider">Código</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-wider">Nombre</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">Central</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">Sede</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">Tipo</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">Ubicación</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">Área</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">Nave/Fundo</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-center">Status</th>
                                <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentRows.map(c => {
                                const central = centrales.find(ct => ct.id === c.central_id);
                                const sede = sedes.find(s => s.id === c.sede_id);
                                return (
                                    <tr key={c.id} className="hover:bg-gray-50 group">
                                        <td className="px-3 py-1.5 font-mono font-medium text-gray-900 text-[11px]">{c.codigo}</td>
                                        <td className="px-3 py-1.5 font-medium text-gray-700 text-[11px] truncate max-w-[150px]">{c.nombre}</td>
                                        <td className="px-3 py-1.5 text-gray-600 text-[10px] text-center">{central?.nombre || "-"}</td>
                                        <td className="px-3 py-1.5 text-gray-600 text-[10px] text-center">{sede?.nombre || "-"}</td>
                                        <td className="px-3 py-1.5 text-center">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tighter ${c.tipo_componente === "CAMARA FIJA" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                                                {c.tipo_componente || "-"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-center">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tighter ${c.ubicacion === "INTERIOR" ? "bg-gray-100 text-gray-700" : "bg-green-50 text-green-700"}`}>
                                                {c.ubicacion || "-"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-center">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tighter bg-amber-50 text-amber-700 uppercase">
                                                {c.area || "-"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-600 text-[10px] text-center">
                                            {c.nave_fundo || "-"}
                                        </td>
                                        <td className="px-3 py-1.5 text-center">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tighter ${c.activa ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                                {c.activa ? "OK" : "OUT"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-right">
                                            <button
                                                onClick={() => handleOpen(c)}
                                                className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <PencilLine className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {currentRows.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="px-6 py-8 text-center text-gray-500 text-xs italic">
                                        No se encontraron cámaras.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Footer */}
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                            Mostrando {start + 1} a {Math.min(start + pageSize, filtered.length)} de {filtered.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Filas:</label>
                            <select
                                value={pageSize}
                                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                                className="h-7 rounded border-gray-200 text-[10px] font-medium bg-white focus:ring-0"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={-1}>Todas</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(prev => prev - 1)}
                            className="px-2 py-1 rounded border border-gray-200 bg-white text-[10px] font-medium hover:bg-gray-50 disabled:opacity-30"
                        >
                            Anterior
                        </button>
                        <div className="flex items-center gap-1 px-2">
                            <span className="text-[10px] font-medium text-gray-900">{page}</span>
                            <span className="text-[10px] font-medium text-gray-400">/</span>
                            <span className="text-[10px] font-medium text-gray-400">{totalPages}</span>
                        </div>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(prev => prev + 1)}
                            className="px-2 py-1 rounded border border-gray-200 bg-white text-[10px] font-medium hover:bg-gray-50 disabled:opacity-30"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editItem ? "Editar Cámara" : "Nueva Cámara"}
                size="lg"
            >
                <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Código *
                                {!editItem && <span className="text-xs text-gray-500 ml-2">(Auto-generado)</span>}
                            </label>
                            <input
                                type="text"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 font-mono bg-gray-50 outline-none"
                                value={formData.codigo}
                                readOnly
                                placeholder="CAM-001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre *</label>
                            <input
                                type="text"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                placeholder="Cámara Principal Entrada"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Central CCTV *</label>
                            <select
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.central_id}
                                onChange={e => setFormData({ ...formData, central_id: e.target.value })}
                            >
                                <option value="">-- Seleccionar --</option>
                                {centrales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sede</label>
                            <select
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.sede_id}
                                onChange={e => setFormData({ ...formData, sede_id: e.target.value })}
                                disabled={!formData.central_id}
                            >
                                <option value="">-- Seleccionar --</option>
                                {filteredSedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nave/Fundo</label>
                            <input
                                type="text"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.nave_fundo}
                                onChange={e => setFormData({ ...formData, nave_fundo: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tiempo de Respaldo</label>
                            <input
                                type="text"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.tiempo_respaldo}
                                onChange={e => setFormData({ ...formData, tiempo_respaldo: e.target.value })}
                                placeholder="24 horas"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Marca</label>
                            <input
                                type="text"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.marca}
                                onChange={e => setFormData({ ...formData, marca: e.target.value })}
                                placeholder="Hikvision, Dahua, etc."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Componente</label>
                            <select
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.tipo_componente}
                                onChange={e => setFormData({ ...formData, tipo_componente: e.target.value as any })}
                            >
                                <option value="">-- Seleccionar --</option>
                                <option value="CAMARA FIJA">Cámara Fija</option>
                                <option value="CAMARA DOMO">Cámara Domo</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ubicación</label>
                            <select
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.ubicacion}
                                onChange={e => setFormData({ ...formData, ubicacion: e.target.value as any })}
                            >
                                <option value="">-- Seleccionar --</option>
                                <option value="INTERIOR">Interior</option>
                                <option value="EXTERIOR">Exterior</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de Instalación</label>
                            <input
                                type="date"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.fecha_instalacion}
                                onChange={e => setFormData({ ...formData, fecha_instalacion: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Área</label>
                            <input
                                type="text"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.area}
                                onChange={e => setFormData({ ...formData, area: e.target.value })}
                                placeholder="Eje: Empaque, Recepción, etc."
                            />
                        </div>
                    </div>

                    {editItem && (
                        <div className="flex items-center gap-2 mt-2">
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editItem.activa}
                                    onChange={(e) => onUpdate(editItem.id, { activa: e.target.checked })}
                                    className="rounded text-red-600 focus:ring-red-500"
                                />
                                Cámara Activa
                            </label>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
                        <button onClick={handleSubmit} className="px-4 py-2 text-sm text-white bg-slate-800 hover:bg-slate-900 rounded-lg">Guardar</button>
                    </div>
                </div>
            </Modal>
        </div >
    );
}

