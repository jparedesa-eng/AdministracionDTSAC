
import { useState, useEffect, useMemo } from "react";
import {
    Plus,
    Search,
    PencilLine,
} from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { PaginationFooter } from "../../components/ui/PaginationFooter";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { getSedesState, subscribeSedes } from "../../store/sedesStore";
import { getCentralesState, subscribeCentrales } from "../../store/cctvCentralesStore";
import { getSensoresState, subscribeSensores, upsertSensor, type Sensor } from "../../store/sensoresStore";

export default function InventarioSensores() {
    const [, setSedesVersion] = useState(0);
    const [, setCentralesVersion] = useState(0);
    const [, setSensoresVersion] = useState(0);

    useEffect(() => {
        const unsubSedes = subscribeSedes(() => setSedesVersion(prev => prev + 1));
        const unsubCentrales = subscribeCentrales(() => setCentralesVersion(prev => prev + 1));
        const unsubSensores = subscribeSensores(() => setSensoresVersion(prev => prev + 1));

        return () => {
            unsubSedes();
            unsubCentrales();
            unsubSensores();
        };
    }, []);

    const { sedes } = getSedesState();
    const { centrales } = getCentralesState();
    const { sensores } = getSensoresState();

    const [toast, setToast] = useState<ToastState>(null);

    return (
        <div className="space-y-6 pb-20">
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="min-h-[400px]">
                <TabSensores
                    sedes={sedes}
                    centrales={centrales}
                    sensores={sensores}
                    onAdd={async (data) => {
                        try {
                            await upsertSensor(data);
                            setToast({ type: "success", message: "Sensor creado correctamente." });
                        } catch (error: any) {
                            setToast({ type: "error", message: error.message || "Error al crear sensor." });
                        }
                    }}
                    onUpdate={async (id, data) => {
                        try {
                            const item = sensores.find(c => c.id === id);
                            if (!item) return;
                            await upsertSensor({ ...item, ...data, id });
                            setToast({ type: "success", message: "Sensor actualizado." });
                        } catch (error: any) {
                            setToast({ type: "error", message: error.message || "Error al actualizar sensor." });
                        }
                    }}
                />
            </div>
        </div>
    );
}

function TabSensores({
    sedes,
    centrales,
    sensores,
    onAdd,
    onUpdate
}: {
    sedes: { id: string, nombre: string }[];
    centrales: any[];
    sensores: Sensor[];
    onAdd: (data: any) => void;
    onUpdate: (id: string, data: Partial<Sensor>) => void;
}) {
    const [search, setSearch] = useState("");
    const [filterCentral, setFilterCentral] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<Sensor | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [formData, setFormData] = useState({
        codigo: "",
        nombre: "",
        central_id: "",
        sede_id: "",
        ubicacion: "",
        tipo: "",
        marca: "",
    });

    const filtered = sensores.filter(c => {
        const matchSearch = c.codigo.toLowerCase().includes(search.toLowerCase()) ||
            c.nombre.toLowerCase().includes(search.toLowerCase());
        const matchCentral = !filterCentral || c.central_id === filterCentral;
        return matchSearch && matchCentral;
    }).sort((a, b) => a.codigo.localeCompare(b.codigo));

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const start = (page - 1) * pageSize;
    const currentRows = pageSize === -1 ? filtered : filtered.slice(start, start + pageSize);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const filteredSedes = useMemo(() => {
        if (!formData.central_id) return [];
        const central = centrales.find(c => c.id === formData.central_id);
        if (!central || !central.sedes) return [];
        return sedes.filter(s => central.sedes.includes(s.id));
    }, [formData.central_id, centrales, sedes]);

    // Auto-generate code when Central changes
    useEffect(() => {
        if (!modalOpen || editItem || !formData.central_id) return;

        const central = centrales.find(c => c.id === formData.central_id);
        if (!central) return;

        // Find existing sensors for this central
        const existingCodes = sensores
            .filter(s => s.central_id === formData.central_id)
            .map(s => s.codigo);

        // Format: S-[Central Name]-XXX
        // Example: S-CCTV AQP-001
        let maxNum = 0;

        existingCodes.forEach(code => {
            const parts = code.split('-');
            if (parts.length >= 2) {
                const lastPart = parts[parts.length - 1].trim();
                const num = parseInt(lastPart, 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        });

        const nextNum = (maxNum + 1).toString().padStart(3, '0');
        const nextCode = `S-${central.nombre}-${nextNum}`;

        setFormData(prev => ({ ...prev, codigo: nextCode }));
    }, [formData.central_id, centrales, sensores, modalOpen, editItem]);

    const handleOpen = (item?: Sensor) => {
        if (item) {
            setEditItem(item);
            setFormData({
                codigo: item.codigo,
                nombre: item.nombre,
                central_id: item.central_id,
                sede_id: item.sede_id || "",
                ubicacion: item.ubicacion || "",
                tipo: item.tipo || "",
                marca: item.marca || "",
            });
        } else {
            setEditItem(null);
            setFormData({
                codigo: "",
                nombre: "",
                central_id: filterCentral || "",
                sede_id: "",
                ubicacion: "",
                tipo: "",
                marca: "",
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = () => {
        if (!formData.codigo.trim() || !formData.nombre.trim() || !formData.central_id) return;
        const payload = {
            ...formData,
            estado: editItem ? editItem.estado : "ACTIVO"
        };
        if (editItem) {
            onUpdate(editItem.id, payload);
        } else {
            onAdd(payload);
        }
        setModalOpen(false);
    };


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Inventario de Sensores y Alarmas
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Gestión de dispositivos de detección y alarmas
                    </p>
                </div>
                <button
                    onClick={() => handleOpen()}
                    className="flex items-center gap-2 bg-[#ff0000] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo sensor
                </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200">
                <div className="flex flex-wrap items-center gap-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por código o nombre..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 h-11 w-64 rounded-xl border border-gray-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Central</label>
                        <select
                            value={filterCentral}
                            onChange={e => setFilterCentral(e.target.value)}
                            className="bg-white border border-slate-300 text-sm font-semibold px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
                        >
                            <option value="">Todas las Centrales</option>
                            {centrales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-none">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-2 uppercase tracking-wider">Código</th>
                                <th className="px-3 py-2 uppercase tracking-wider">Nombre</th>
                                <th className="px-3 py-2 uppercase tracking-wider">Central</th>
                                <th className="px-3 py-2 uppercase tracking-wider">Sede</th>
                                <th className="px-3 py-2 uppercase tracking-wider">Tipo</th>
                                <th className="px-3 py-2 uppercase tracking-wider">Marca</th>
                                <th className="px-3 py-2 uppercase tracking-wider text-center">Estado</th>
                                <th className="px-3 py-2 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentRows.map(c => {
                                const central = centrales.find(ct => ct.id === c.central_id);
                                const sede = sedes.find(s => s.id === c.sede_id);
                                return (
                                    <tr key={c.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-1.5 font-mono text-xs">{c.codigo}</td>
                                        <td className="px-3 py-1.5 font-medium">{c.nombre}</td>
                                        <td className="px-3 py-1.5">{central?.nombre || "-"}</td>
                                        <td className="px-3 py-1.5">{sede?.nombre || "-"}</td>
                                        <td className="px-3 py-1.5">{c.tipo || "-"}</td>
                                        <td className="px-3 py-1.5">{c.marca || "-"}</td>
                                        <td className="px-3 py-1.5 text-center">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tighter ${c.estado === 'ACTIVO' ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                                {c.estado}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-right flex justify-end gap-1">
                                            <button onClick={() => handleOpen(c)} className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"><PencilLine className="h-3.5 w-3.5" /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {currentRows.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500 text-xs italic">
                                        No se encontraron sensores.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <PaginationFooter
                    currentPage={page}
                    totalPages={totalPages}
                    itemsPerPage={pageSize}
                    setItemsPerPage={(n) => { setPageSize(n); setPage(1); }}
                    setCurrentPage={setPage}
                    totalItems={filtered.length}
                />
            </div>

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? "Editar Sensor" : "Nuevo Sensor"} size="lg">
                <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 alert">Código</label>
                            <input
                                value={formData.codigo}
                                readOnly
                                className="w-full h-11 rounded-lg border px-3 bg-gray-100 text-gray-500 cursor-not-allowed"
                                placeholder="Generado automáticamente"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nombre</label>
                            <input value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full h-11 rounded-lg border px-3" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Central</label>
                            <select value={formData.central_id} onChange={e => setFormData({ ...formData, central_id: e.target.value })} className="w-full h-11 rounded-lg border px-3">
                                <option value="">-- Seleccionar --</option>
                                {centrales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Sede</label>
                            <select value={formData.sede_id} onChange={e => setFormData({ ...formData, sede_id: e.target.value })} className="w-full h-11 rounded-lg border px-3" disabled={!formData.central_id}>
                                <option value="">-- Seleccionar --</option>
                                {filteredSedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo</label>
                            <input value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })} className="w-full h-11 rounded-lg border px-3" placeholder="Humo, Movimiento..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Marca</label>
                            <input value={formData.marca} onChange={e => setFormData({ ...formData, marca: e.target.value })} className="w-full h-11 rounded-lg border px-3" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
                        <button onClick={handleSubmit} className="px-4 py-2 text-sm text-white bg-slate-800 hover:bg-slate-900 rounded-lg">Guardar</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
