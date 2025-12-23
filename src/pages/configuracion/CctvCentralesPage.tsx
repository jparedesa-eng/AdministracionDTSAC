import { useState, useEffect, useMemo } from "react";
import {
    Building2,
    Plus,
    Search,
    PencilLine,
    Save,
    MapPin,
    ShieldCheck
} from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState, ToastType } from "../../components/ui/Toast";
import { getSedesState, subscribeSedes } from "../../store/sedesStore";
import {
    getCentralesState,
    subscribeCentrales,
    upsertCentral,
    type CctvCentral
} from "../../store/cctvCentralesStore";

const PAGE_SIZE = 10;

export default function CctvCentralesPage() {
    const [, setSedesVersion] = useState(0);
    const [, setCentralesVersion] = useState(0);

    useEffect(() => {
        const unsubSedes = subscribeSedes(() => setSedesVersion(prev => prev + 1));
        const unsubCentrales = subscribeCentrales(() => setCentralesVersion(prev => prev + 1));

        return () => {
            unsubSedes();
            unsubCentrales();
        };
    }, []);

    const { sedes } = getSedesState();
    const { centrales, loading, error: storeError } = getCentralesState();

    const [toast, setToast] = useState<ToastState>(null);
    const showToast = (type: ToastType, message: string) => setToast({ type, message });

    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<CctvCentral | null>(null);
    const [formData, setFormData] = useState({
        nombre: "",
        selectedSedes: [] as string[],
        descripcion: ""
    });
    const [saving, setSaving] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return centrales;
        return centrales.filter(c =>
            c.nombre.toLowerCase().includes(q) ||
            (c.descripcion && c.descripcion.toLowerCase().includes(q))
        );
    }, [centrales, search]);

    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const start = (page - 1) * PAGE_SIZE;
    const currentRows = filtered.slice(start, start + PAGE_SIZE);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    useEffect(() => {
        setPage(1);
    }, [search]);

    const handleOpen = (item?: CctvCentral) => {
        if (item) {
            setEditItem(item);
            setFormData({
                nombre: item.nombre,
                selectedSedes: item.sedes || [],
                descripcion: item.descripcion || ""
            });
        } else {
            setEditItem(null);
            setFormData({ nombre: "", selectedSedes: [], descripcion: "" });
        }
        setLocalError(null);
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombre.trim()) {
            setLocalError("Debes ingresar un nombre para la central.");
            return;
        }
        if (formData.selectedSedes.length === 0) {
            setLocalError("Debes seleccionar al menos una sede.");
            return;
        }

        setSaving(true);
        setLocalError(null);

        try {
            await upsertCentral({
                id: editItem?.id,
                nombre: formData.nombre.toUpperCase(),
                sedes: formData.selectedSedes,
                descripcion: formData.descripcion
            });
            showToast("success", editItem ? "Central CCTV actualizada correctamente." : "Central CCTV creada correctamente.");
            setModalOpen(false);
        } catch (error: any) {
            const msg = error.message || "Error al guardar la central.";
            setLocalError(msg);
            showToast("error", msg);
        } finally {
            setSaving(false);
        }
    };

    const toggleSede = (sedeId: string) => {
        setFormData(prev => ({
            ...prev,
            selectedSedes: prev.selectedSedes.includes(sedeId)
                ? prev.selectedSedes.filter(id => id !== sedeId)
                : [...prev.selectedSedes, sedeId]
        }));
    };

    const Pagination = () => {
        if (filtered.length === 0) return null;
        const go = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)));

        return (
            <nav className="flex items-center justify-between gap-2 py-3 text-sm text-gray-500">
                <div>
                    Página <span className="font-semibold">{page}</span> de <span className="font-semibold">{totalPages}</span>
                </div>
                <ul className="inline-flex items-center overflow-hidden rounded-lg border bg-white">
                    <li>
                        <button
                            type="button"
                            onClick={() => go(page - 1)}
                            disabled={page <= 1}
                            className="flex h-9 items-center gap-2 px-4 disabled:opacity-50 hover:bg-gray-50 transition-colors border-r"
                        >
                            ‹ Anterior
                        </button>
                    </li>
                    <li>
                        <button
                            type="button"
                            onClick={() => go(page + 1)}
                            disabled={page >= totalPages}
                            className="flex h-9 items-center gap-2 px-4 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                            Siguiente ›
                        </button>
                    </li>
                </ul>
            </nav>
        );
    };

    const stats = useMemo(() => {
        const totalSedesAsignadas = new Set(centrales.flatMap(c => c.sedes || [])).size;
        return [
            { label: "Total Centrales", value: centrales.length, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Sedes Vinculadas", value: totalSedesAsignadas, icon: MapPin, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Cobertura de Sedes", value: `${Math.round((totalSedesAsignadas / (sedes.length || 1)) * 100)}%`, icon: ShieldCheck, color: "text-purple-600", bg: "bg-purple-50" },
        ];
    }, [centrales, sedes]);

    return (
        <div className="space-y-6 pb-20">
            <Toast toast={toast} onClose={() => setToast(null)} />

            {/* Header section */}
            <div className="px-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gray-100 rounded-xl text-gray-900 border border-gray-200">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">
                            Gestión de Centrales CCTV
                        </h1>
                        <p className="text-sm text-gray-500">
                            Administración de centros de monitoreo.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => handleOpen()}
                    className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    Registrar Central
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                            <stat.icon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-gray-900 rounded-full" />
                        <h2 className="text-base font-bold text-gray-800">Listado de Centrales</h2>
                    </div>

                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-300 transition-all placeholder:text-gray-400"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Centro de Monitoreo</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sedes</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Cargando...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <p className="text-sm font-medium text-gray-400">No se encontraron centrales.</p>
                                    </td>
                                </tr>
                            ) : (
                                currentRows.map((c) => {
                                    const centralSedes = sedes.filter(s => c.sedes?.includes(s.id));
                                    return (
                                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-100 flex items-center justify-center text-gray-900 font-bold text-sm">
                                                        {c.nombre.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 leading-tight">
                                                            {c.nombre.toUpperCase()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {centralSedes.length > 0 ? (
                                                        centralSedes.map((s) => (
                                                            <span
                                                                key={s.id}
                                                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight bg-gray-50 text-gray-500 border border-gray-100"
                                                            >
                                                                {s.nombre}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-[11px] text-gray-300 italic">Sin sedes</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-sm text-gray-500 line-clamp-2 max-w-[250px]">
                                                    {c.descripcion || "Sin descripción."}
                                                </p>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button
                                                    onClick={() => handleOpen(c)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-colors"
                                                >
                                                    <PencilLine className="h-3.5 w-3.5" />
                                                    Editar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="border-t border-gray-100 px-6 py-3 bg-gray-50/30">
                    <Pagination />
                </div>
            </section>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editItem ? "Actualizar Central" : "Nueva Central"}
                size="sm"
            >
                <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nombre</label>
                        <input
                            type="text"
                            autoFocus
                            className="w-full h-11 rounded-lg border-gray-200 focus:border-gray-900 focus:ring-0 text-sm font-semibold px-4 uppercase transition-all"
                            value={formData.nombre}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            placeholder="Nombre de la central..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Vincular Sedes</label>
                        <div className="border border-gray-100 rounded-lg p-2 max-h-48 overflow-y-auto bg-gray-50/50">
                            {sedes.length === 0 ? (
                                <p className="text-xs text-gray-400 p-4 text-center">Sin sedes disponibles</p>
                            ) : (
                                <div className="space-y-0.5">
                                    {sedes.map(s => (
                                        <label
                                            key={s.id}
                                            className={`
                                                flex items-center gap-3 cursor-pointer px-3 py-2 rounded-md transition-colors
                                                ${formData.selectedSedes.includes(s.id) ? 'bg-white border border-gray-100' : 'hover:bg-gray-200/50 text-gray-600'}
                                            `}
                                        >
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                                                checked={formData.selectedSedes.includes(s.id)}
                                                onChange={() => toggleSede(s.id)}
                                            />
                                            <span className={`text-sm ${formData.selectedSedes.includes(s.id) ? 'font-bold text-gray-900' : 'font-medium'}`}>
                                                {s.nombre}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Descripción</label>
                        <textarea
                            className="w-full rounded-lg border-gray-200 focus:border-gray-900 focus:ring-0 text-sm px-4 py-3 transition-all min-h-[80px] resize-none"
                            rows={2}
                            value={formData.descripcion}
                            onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                            placeholder="Detalles opcionales..."
                        />
                    </div>

                    {(localError || storeError) && (
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                            <p className="text-[11px] font-bold text-red-600 uppercase tracking-tight text-center">
                                {localError || storeError}
                            </p>
                        </div>
                    )}

                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="flex-1 h-10 text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-gray-900 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 h-10 inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                        >
                            {saving ? "..." : (
                                <>
                                    <Save className="h-4 w-4" />
                                    <span>{editItem ? "Guardar" : "Crear"}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
