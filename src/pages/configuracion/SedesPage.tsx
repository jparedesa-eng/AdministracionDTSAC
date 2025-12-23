// src/pages/configuracion/SedesPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Plus, Save, PencilLine, Search } from "lucide-react";
import {
    getSedesState,
    subscribeSedes,
    upsertSede,
} from "../../store/sedesStore";
import type { Sede } from "../../store/sedesStore";

import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastType, ToastState } from "../../components/ui/Toast";

const PAGE_SIZE = 10;

export default function SedesPage() {
    // Forzar re-render cuando cambie el store
    const [, setVersion] = useState(0);

    useEffect(() => {
        const unsubscribe = subscribeSedes(() =>
            setVersion((prev) => prev + 1)
        );
        return unsubscribe;
    }, []);

    // Estado global
    const { sedes, loading, error } = getSedesState();

    // Formulario (para modal)
    const [nombre, setNombre] = useState<string>("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState<boolean>(false);
    const [localError, setLocalError] = useState<string | null>(null);

    // Control del modal de alta / edición
    const [formOpen, setFormOpen] = useState(false);

    // Toast global
    const [toast, setToast] = useState<ToastState>(null);
    const showToast = (type: ToastType, message: string) =>
        setToast({ type, message });

    // Buscador
    const [search, setSearch] = useState<string>("");

    // Filtrado por texto
    const filteredSedes = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return sedes;
        return sedes.filter((s) =>
            s.nombre.toLowerCase().includes(q)
        );
    }, [sedes, search]);

    // Paginación
    const [page, setPage] = useState<number>(1);
    const totalPages = Math.max(
        1,
        Math.ceil(filteredSedes.length / PAGE_SIZE)
    );
    const start = (page - 1) * PAGE_SIZE;
    const currentRows = filteredSedes.slice(start, start + PAGE_SIZE);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    useEffect(() => {
        setPage(1);
    }, [search]);

    const resetForm = () => {
        setNombre("");
        setEditingId(null);
        setLocalError(null);
        setFormOpen(false);
    };

    const openCreate = () => {
        setNombre("");
        setEditingId(null);
        setLocalError(null);
        setFormOpen(true);
    };

    const openEdit = (s: Sede) => {
        setNombre(s.nombre.toUpperCase());
        setEditingId(s.id);
        setLocalError(null);
        setFormOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmed = nombre.trim().toUpperCase();

        if (!trimmed) {
            setLocalError("Ingresa un nombre de sede.");
            return;
        }

        setSaving(true);
        setLocalError(null);

        try {
            await upsertSede({
                id: editingId ?? undefined,
                nombre: trimmed,
            });

            showToast(
                "success",
                editingId
                    ? "Sede actualizada correctamente."
                    : "Sede registrada correctamente."
            );
            resetForm();
        } catch (err: any) {
            const msg = err?.message ?? "No se pudo guardar la sede.";
            setLocalError(msg);
            showToast("error", msg);
        } finally {
            setSaving(false);
        }
    };

    const Pagination = () => {
        if (filteredSedes.length === 0) return null;

        const go = (p: number) =>
            setPage(Math.max(1, Math.min(totalPages, p)));

        const build = () => {
            const pages: (number | "dots")[] = [];
            const max = totalPages;
            const window = 1;
            pages.push(1);
            if (page - window > 2) pages.push("dots");
            for (
                let p = Math.max(2, page - window);
                p <= Math.min(max - 1, page + window);
                p++
            ) {
                pages.push(p);
            }
            if (page + window < max - 1) pages.push("dots");
            if (max > 1) pages.push(max);
            return pages;
        };

        return (
            <nav className="flex items-center justify-between gap-2 py-3 text-sm text-gray-600">
                <div>
                    Página <span className="font-medium">{page}</span> de{" "}
                    <span className="font-medium">{totalPages}</span>
                </div>
                <ul className="inline-flex items-center overflow-hidden rounded-lg border bg-white">
                    <li>
                        <button
                            type="button"
                            onClick={() => go(page - 1)}
                            disabled={page <= 1}
                            className="flex h-9 items-center gap-2 px-3 disabled:opacity-50 hover:bg-gray-50"
                            aria-label="Anterior"
                        >
                            ‹ Anterior
                        </button>
                    </li>
                    {build().map((it, idx) =>
                        it === "dots" ? (
                            <li
                                key={`dots-${idx}`}
                                className="select-none px-3 text-gray-400"
                            >
                                …
                            </li>
                        ) : (
                            <li key={it}>
                                <button
                                    type="button"
                                    onClick={() => go(it)}
                                    className={[
                                        "h-9 px-3 hover:bg-gray-50",
                                        it === page
                                            ? "bg-gray-900 text-white hover:bg-gray-900"
                                            : "",
                                    ].join(" ")}
                                    aria-current={it === page ? "page" : undefined}
                                >
                                    {it}
                                </button>
                            </li>
                        )
                    )}
                    <li>
                        <button
                            type="button"
                            onClick={() => go(page + 1)}
                            disabled={page >= totalPages}
                            className="flex h-9 items-center gap-2 px-3 disabled:opacity-50 hover:bg-gray-50"
                            aria-label="Siguiente"
                        >
                            Siguiente ›
                        </button>
                    </li>
                </ul>
            </nav>
        );
    };

    return (
        <>
            <div className="space-y-5">
                {/* Título */}
                <div className="px-1 flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Mantenedor de Sedes
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Crea o edita las sedes disponibles para usar en el sistema.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                    >
                        <Plus className="h-4 w-4" />
                        Nueva sede
                    </button>
                </div>

                {/* Tabla de sedes */}
                <section className="rounded-2xl border border-gray-200 bg-white p-0 overflow-hidden">
                    {/* Barra superior con buscador */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                        <span>
                            {filteredSedes.length} sede(s) encontrada(s)
                        </span>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por nombre..."
                                className="w-56 rounded-lg border border-gray-200 bg-white px-9 py-1.5 text-xs outline-none ring-1 ring-transparent focus:ring-gray-300"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-3">Sede</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {loading && (
                                    <tr>
                                        <td
                                            colSpan={2}
                                            className="px-4 py-6 text-center text-sm text-gray-500"
                                        >
                                            Cargando sedes...
                                        </td>
                                    </tr>
                                )}

                                {!loading && filteredSedes.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={2}
                                            className="px-4 py-6 text-center text-sm text-gray-500"
                                        >
                                            No se encontraron sedes para el criterio actual.
                                        </td>
                                    </tr>
                                )}

                                {!loading &&
                                    filteredSedes.length > 0 &&
                                    currentRows.map((s: Sede) => (
                                        <tr key={s.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">{s.nombre}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(s)}
                                                    className="inline-flex items-center justify-center rounded-lg p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                                                    aria-label="Editar sede"
                                                >
                                                    <PencilLine className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-gray-200 px-3">
                        <Pagination />
                    </div>
                </section>
            </div>

            {/* MODAL: Crear / Editar sede */}
            <Modal
                open={formOpen}
                onClose={resetForm}
                title={
                    editingId ? "Editar sede" : "Registrar nueva sede"
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                            Nombre de sede
                        </label>
                        <input
                            value={nombre}
                            onChange={(e) =>
                                setNombre(e.target.value.toUpperCase())
                            }
                            placeholder="SEDE TRUJILLO"
                            className="w-full rounded-lg border bg-white px-3 py-2 text-sm uppercase outline-none ring-1 ring-transparent focus:ring-gray-300"
                        />
                        {(localError || error) && (
                            <p className="mt-1 text-xs text-rose-600">
                                {localError || error}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                        >
                            <Save className="h-4 w-4" />
                            {editingId ? "Guardar cambios" : "Registrar"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* TOAST GLOBAL */}
            <Toast toast={toast} onClose={() => setToast(null)} />
        </>
    );
}
