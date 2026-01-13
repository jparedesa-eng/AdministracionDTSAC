import { useState, useEffect, useMemo } from "react";
import {
    Signal,
    Search,
    MapPin,
    ShieldCheck,
    SignalHigh,
    Building2,
    CheckCircle2
} from "lucide-react";
import { Toast } from "../../components/ui/Toast";
import type { ToastState, ToastType } from "../../components/ui/Toast";
import { getSedesState, subscribeSedes, upsertSede, type Sede } from "../../store/sedesStore";

const PAGE_SIZE = 10;
const OPERATORS = ["ENTEL", "CLARO"];

export default function CoberturaOperadores() {
    const [, setVersion] = useState(0);

    useEffect(() => {
        const unsubscribe = subscribeSedes(() => setVersion(prev => prev + 1));
        return unsubscribe;
    }, []);

    const { sedes, loading } = getSedesState();
    const [toast, setToast] = useState<ToastState>(null);
    const showToast = (type: ToastType, message: string) => setToast({ type, message });

    const [search, setSearch] = useState("");
    const [savingId, setSavingId] = useState<string | null>(null);

    const filteredSedes = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return sedes;
        return sedes.filter(s => s.nombre.toLowerCase().includes(q));
    }, [sedes, search]);

    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(filteredSedes.length / PAGE_SIZE));
    const start = (page - 1) * PAGE_SIZE;
    const currentRows = filteredSedes.slice(start, start + PAGE_SIZE);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    useEffect(() => {
        setPage(1);
    }, [search]);

    const handleToggleOperator = async (sede: Sede, operator: string) => {
        if (savingId) return;

        const currentOps = sede.operadores || [];
        const newOps = currentOps.includes(operator)
            ? currentOps.filter(op => op !== operator)
            : [...currentOps, operator];

        setSavingId(sede.id);
        try {
            await upsertSede({
                id: sede.id,
                nombre: sede.nombre,
                operadores: newOps
            });
            showToast("success", `Cobertura actualizada para ${sede.nombre}`);
        } catch (err: any) {
            showToast("error", "Error al actualizar cobertura");
        } finally {
            setSavingId(null);
        }
    };

    const Pagination = () => {
        if (filteredSedes.length === 0) return null;
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
        const totalSedes = sedes.length;
        const withCoverage = sedes.filter(s => s.operadores && s.operadores.length > 0).length;
        const coveragePercent = totalSedes > 0 ? Math.round((withCoverage / totalSedes) * 100) : 0;

        return [
            { label: "Total Sedes", value: totalSedes, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Con Cobertura", value: withCoverage, icon: Signal, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Progreso", value: `${coveragePercent}%`, icon: ShieldCheck, color: "text-purple-600", bg: "bg-purple-50" },
        ];
    }, [sedes]);

    return (
        <div className="space-y-6 pb-20">
            <Toast toast={toast} onClose={() => setToast(null)} />

            {/* Header section */}
            <div className="px-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gray-100 rounded-xl text-gray-900 border border-gray-200">
                        <SignalHigh className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">
                            Cobertura de Operadores
                        </h1>
                        <p className="text-sm text-gray-500">
                            Asigna la disponibilidad de operadores por sede.
                        </p>
                    </div>
                </div>
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
                        <h2 className="text-base font-bold text-gray-800">Listado de Sedes</h2>
                    </div>

                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar sede..."
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
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sede / Ubicación</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Operadores Disponibles</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Cargando...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredSedes.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-20 text-center">
                                        <p className="text-sm font-medium text-gray-400">No se encontraron sedes.</p>
                                    </td>
                                </tr>
                            ) : (
                                currentRows.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-100 flex items-center justify-center text-gray-500">
                                                    <MapPin className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 leading-tight">
                                                        {s.nombre}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                {OPERATORS.map(op => {
                                                    const isActive = s.operadores?.includes(op);
                                                    const isParamSaving = savingId === s.id;

                                                    return (
                                                        <button
                                                            key={op}
                                                            disabled={isParamSaving}
                                                            onClick={() => handleToggleOperator(s, op)}
                                                            className={`
                                                                relative px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border
                                                                ${isActive
                                                                    ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                                                                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                                                                }
                                                                ${isParamSaving ? 'opacity-50 cursor-wait' : ''}
                                                            `}
                                                        >
                                                            {op}
                                                            {isActive && (
                                                                <div className="absolute -top-1 -right-1">
                                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 bg-white rounded-full" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            {s.operadores && s.operadores.length > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wide border border-emerald-100">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    Con Cobertura
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-[10px] font-bold uppercase tracking-wide border border-orange-100">
                                                    Sin Asignar
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="border-t border-gray-100 px-6 py-3 bg-gray-50/30">
                    <Pagination />
                </div>
            </section>
        </div>
    );
}
