// src/pages/pasajes/ProvidersPage.tsx
import React from "react";
import {
  Plus,
  PencilLine,
  Save,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getProvidersState,
  subscribeProviders,
  upsertProvider,
  seedIfEmpty,
  setProviderActive,
} from "../../store/providersStore";
import type { Provider } from "../../store/providersStore";

import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastType, ToastState } from "../../components/ui/Toast";

/** Badge de estado: Activo / Desactivado */
function EstadoBadge({ activo }: { activo: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        activo
          ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
          : "bg-rose-100 text-rose-800 ring-rose-200",
      ].join(" ")}
    >
      {activo ? "Activo" : "Desactivado"}
    </span>
  );
}

/** Modal Crear/Editar */
function ProviderDialog({
  open,
  initial,
  onCancel,
  onSubmit,
  loading,
}: {
  open: boolean;
  initial: (Provider & { activo?: boolean }) | null;
  onCancel: () => void;
  onSubmit: (prov: Provider & { activo?: boolean }) => void;
  loading?: boolean;
}) {
  const [draft, setDraft] = React.useState<
    (Provider & { activo?: boolean }) | null
  >(initial);

  React.useEffect(() => setDraft(initial), [initial]);
  if (!open || !draft) return null;

  const change = <
    K extends keyof (Provider & { activo?: boolean })
  >(
    k: K,
    val: (Provider & { activo?: boolean })[K]
  ) => setDraft((d) => (d ? { ...d, [k]: val } : d));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft) onSubmit(draft);
  };

  const trasladoValue = (draft as any)?.traslado ?? false;
  const alimentacionValue = (draft as any)?.alimentacion ?? false;
  const isHospedaje = draft.kind === "Hospedaje";

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={draft.id ? "Editar proveedor" : "Nuevo proveedor"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          {/* RUC */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">RUC</label>
            <input
              value={(draft as any)?.ruc || ""}
              onChange={(e) => change("ruc" as any, e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
              placeholder="RUC del proveedor"
            />
          </div>

          {/* Nombre */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Nombre</label>
            <input
              value={draft.nombre || ""}
              onChange={(e) => change("nombre", e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
              placeholder="Proveedor SAC"
              required
            />
          </div>

          {/* Tipo / Estado */}
          <div>
            <label className="text-sm font-medium text-gray-700">Tipo</label>
            <select
              value={(draft.kind as "Pasaje" | "Hospedaje") || "Pasaje"}
              onChange={(e) =>
                change("kind", e.target.value as "Pasaje" | "Hospedaje")
              }
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
            >
              <option>Pasaje</option>
              <option>Hospedaje</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Estado</label>
            <select
              value={(draft.activo ?? true) ? "Activo" : "Desactivado"}
              onChange={(e) => change("activo", e.target.value === "Activo")}
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
            >
              <option>Activo</option>
              <option>Desactivado</option>
            </select>
          </div>

          {/* Traslado / Alimentación SOLO para hospedaje */}
          {isHospedaje && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Traslado
                </label>
                <select
                  value={trasladoValue ? "Sí" : "No"}
                  onChange={(e) =>
                    change("traslado" as any, e.target.value === "Sí")
                  }
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                >
                  <option>Sí</option>
                  <option>No</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Alimentación
                </label>
                <select
                  value={alimentacionValue ? "Sí" : "No"}
                  onChange={(e) =>
                    change("alimentacion" as any, e.target.value === "Sí")
                  }
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                >
                  <option>Sí</option>
                  <option>No</option>
                </select>
              </div>
            </>
          )}

          {/* Contacto / Teléfono */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Contacto
            </label>
            <input
              value={draft.contacto || ""}
              onChange={(e) =>
                change("contacto", e.target.value || undefined)
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
              placeholder="Juan Pérez"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Teléfono
            </label>
            <input
              value={draft.telefono || ""}
              onChange={(e) =>
                change("telefono", e.target.value || undefined)
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
              placeholder="+51 999 999 999"
            />
          </div>

          {/* Nota */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Nota</label>
            <textarea
              value={draft.nota || ""}
              onChange={(e) => change("nota", e.target.value || undefined)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
              rows={3}
              placeholder="Observaciones internas"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Paginador (Tailwind) — SIEMPRE visible */
function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const go = (p: number) =>
    onPage(Math.max(1, Math.min(Math.max(1, totalPages), p)));

  const build = () => {
    const pages: (number | "dots")[] = [];
    const max = Math.max(1, totalPages);
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

  const disabledPrev = page <= 1;
  const disabledNext = page >= Math.max(1, totalPages);

  return (
    <nav className="flex items-center justify-between gap-2 py-3 text-sm text-gray-600">
      <div>
        Página <span className="font-medium">{page}</span> de{" "}
        <span className="font-medium">{Math.max(1, totalPages)}</span>
      </div>
      <ul className="inline-flex items-center overflow-hidden rounded-lg border bg-white">
        <li>
          <button
            type="button"
            onClick={() => go(page - 1)}
            disabled={disabledPrev}
            className="flex h-9 items-center gap-2 px-3 disabled:opacity-50 hover:bg-gray-50"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>
        </li>
        {build().map((it, idx) =>
          it === "dots" ? (
            <li
              key={`dots-${idx}`}
              className="px-3 text-gray-400 select-none"
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
                  it === page ? "bg-gray-900 text-white hover:bg-gray-900" : "",
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
            disabled={disabledNext}
            className="flex h-9 items-center gap-2 px-3 disabled:opacity-50 hover:bg-gray-50"
            aria-label="Siguiente"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </li>
      </ul>
    </nav>
  );
}

/** Página: mantenedor */
export default function ProvidersPage() {
  const [version, setVersion] = React.useState(0);

  React.useEffect(() => {
    seedIfEmpty();
    return subscribeProviders(() => setVersion((v) => v + 1));
  }, []);

  // Toast
  const [toast, setToast] = React.useState<ToastState>(null);
  const showToast = (type: ToastType, message: string) =>
    setToast({ type, message });

  // Filtro por tipo
  const [kindFilter, setKindFilter] = React.useState<
    "Todos" | "Pasaje" | "Hospedaje"
  >("Todos");

  // Orden por nombre
  const rows = React.useMemo(() => {
    return [...getProvidersState().providers]
      .map((p) => ({ ...p, activo: (p as any).activo ?? true }))
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  }, [version]);

  const filteredRows = React.useMemo(() => {
    if (kindFilter === "Todos") return rows;
    return rows.filter((p) => p.kind === kindFilter);
  }, [rows, kindFilter]);

  // Paginación 10 en 10
  const PAGE_SIZE = 10;
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);
  React.useEffect(() => {
    setPage(1);
  }, [kindFilter]);
  const start = (page - 1) * PAGE_SIZE;
  const currentRows = filteredRows.slice(start, start + PAGE_SIZE);

  // Modal Crear/Editar
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [dlgLoading, setDlgLoading] = React.useState(false);
  const [current, setCurrent] = React.useState<
    (Provider & { activo?: boolean }) | null
  >(null);

  const openCreate = () => {
    setCurrent({
      id: "" as string,
      kind: "Pasaje",
      nombre: "",
      ruc: "",
      traslado: false,
      alimentacion: false,
      activo: true,
    } as any);
    setDlgOpen(true);
  };

  const openEdit = (p: Provider & { activo?: boolean }) => {
    setCurrent({ ...(p as any), activo: (p as any).activo ?? true });
    setDlgOpen(true);
  };

  const saveProvider = async (prov: Provider & { activo?: boolean }) => {
    setDlgLoading(true);
    try {
      await upsertProvider({
        id: prov.id || undefined,
        kind: prov.kind,
        nombre: prov.nombre,
        ruc: (prov as any).ruc,
        traslado: (prov as any).traslado,
        alimentacion: (prov as any).alimentacion,
        contacto: prov.contacto,
        telefono: prov.telefono,
        nota: prov.nota,
        activo: prov.activo,
      } as any);
      showToast("success", "Proveedor guardado correctamente.");
    } catch (e: any) {
      showToast("error", e?.message ?? "No se pudo guardar el proveedor.");
    } finally {
      setDlgLoading(false);
      setDlgOpen(false);
      setCurrent(null);
    }
  };

  const toggleEstado = async (p: Provider & { activo?: boolean }) => {
    try {
      await setProviderActive(p.id, !(p.activo ?? true));
      showToast(
        "success",
        !(p.activo ?? true)
          ? "Proveedor activado correctamente."
          : "Proveedor desactivado correctamente."
      );
    } catch (e: any) {
      showToast("error", e?.message ?? "No se pudo cambiar el estado.");
    }
  };

  return (
    <>
      <div className="space-y-5">
        {/* Título */}
        <div className="px-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Proveedores (Mantenedor)
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Administra proveedores de Pasaje y Hospedaje. Puedes filtrar por
            tipo y cambiar el estado activo/desactivado.
          </p>
        </div>

        {/* Filtro tipo + botón crear */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs font-medium text-gray-600">Tipo</span>
            <select
              value={kindFilter}
              onChange={(e) =>
                setKindFilter(e.target.value as "Todos" | "Pasaje" | "Hospedaje")
              }
              className="rounded-lg border bg-white px-3 py-1.5 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
            >
              <option value="Todos">Todos</option>
              <option value="Pasaje">Pasaje</option>
              <option value="Hospedaje">Hospedaje</option>
            </select>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Añadir proveedor
          </button>
        </div>

        {/* Tabla */}
        <section className="overflow-hidden rounded-2xl border bg-white p-0 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">RUC</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Traslado</th>
                  <th className="px-4 py-3">Alimentación</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Nota</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {currentRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      No hay proveedores registrados.
                    </td>
                  </tr>
                )}

                {currentRows.map((p) => {
                  const activo = (p as any).activo ?? true;
                  const traslado = (p as any).traslado ?? false;
                  const alimentacion = (p as any).alimentacion ?? false;
                  const isHospedaje = p.kind === "Hospedaje";

                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">
                        {(p as any).ruc || (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{p.nombre}</td>
                      <td className="px-4 py-3">{p.kind}</td>
                      <td className="px-4 py-3">
                        {isHospedaje ? (
                          traslado ? (
                            "Sí"
                          ) : (
                            "No"
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isHospedaje ? (
                          alimentacion ? (
                            "Sí"
                          ) : (
                            "No"
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.contacto || (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.telefono || (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.nota || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <EstadoBadge activo={!!activo} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              toggleEstado(p as Provider & { activo?: boolean })
                            }
                            className="rounded-lg border p-2 hover:bg-gray-50"
                            title={activo ? "Desactivar" : "Activar"}
                            aria-label="Cambiar estado"
                          >
                            {activo ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openEdit(p as Provider & { activo?: boolean })
                            }
                            className="rounded-lg border p-2 hover:bg-gray-50"
                            title="Editar"
                            aria-label="Editar"
                          >
                            <PencilLine className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="border-t px-3">
            <Pagination page={page} totalPages={totalPages} onPage={setPage} />
          </div>
        </section>

        {/* Modal Crear/Editar */}
        <ProviderDialog
          open={dlgOpen}
          initial={current}
          loading={dlgLoading}
          onCancel={() => {
            setDlgOpen(false);
            setCurrent(null);
          }}
          onSubmit={saveProvider}
        />
      </div>

      {/* TOAST GLOBAL */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
