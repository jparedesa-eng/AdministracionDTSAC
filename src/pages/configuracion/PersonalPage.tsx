import React from "react";
import {
  Plus,
  PencilLine,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getPersonalState,
  subscribePersonal,
  upsertPersonal,
} from "../../store/personalStore";
import {
  getGerenciasState,
  subscribeGerencias,
} from "../../store/gerenciasStore";

/* ----------------------------------------
   Dialogo Crear / Editar Persona
---------------------------------------- */

function PersonalDialog({
  open,
  initial,
  gerencias,
  onCancel,
  onSubmit,
  loading,
}: {
  open: boolean;
  initial: any | null;
  gerencias: any[];
  onCancel: () => void;
  onSubmit: (p: any) => void;
  loading?: boolean;
}) {
  const [draft, setDraft] = React.useState<any | null>(initial);

  React.useEffect(() => setDraft(initial), [initial]);

  if (!open) return null;

  const handleChange = (key: string, value: any) =>
    setDraft((prev: any) => (prev ? { ...prev, [key]: value } : prev));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;

    const dni = (draft.dni || "").trim();
    const nombre = (draft.nombre || "").trim();

    if (!dni || !nombre || !draft.gerenciaId) return;

    onSubmit({
      ...draft,
      dni,
      nombre,
    });
  };

  const estadoValue = draft?.estado ?? "ACTIVO";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-semibold">
            {draft?.id ? "Editar trabajador" : "Nuevo trabajador"}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-2 hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">DNI</label>
              <input
                value={draft?.dni ?? ""}
                onChange={(e) => handleChange("dni", e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                placeholder="00000000"
                maxLength={8}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Nombre y apellido
              </label>
              <input
                value={draft?.nombre ?? ""}
                onChange={(e) => handleChange("nombre", e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Gerencia
              </label>
              <select
                value={draft?.gerenciaId ?? ""}
                onChange={(e) => handleChange("gerenciaId", e.target.value)}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
              >
                <option value="">Selecciona una gerencia</option>
                {gerencias.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Estado del trabajador
              </label>
              <select
                value={estadoValue}
                onChange={(e) => handleChange("estado", e.target.value)}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
              >
                <option value="ACTIVO">Activo</option>
                <option value="CESADO">Cesado</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
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
      </div>
    </div>
  );
}

/* ----------------------------------------
   Paginación
---------------------------------------- */

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

/* ----------------------------------------
   Página principal
---------------------------------------- */

export default function PersonalPage() {
  const [version, setVersion] = React.useState(0);

  // Suscripción a ambos stores (personal + gerencias)
  React.useEffect(() => {
    const unsubPersonal = subscribePersonal(() => setVersion((v) => v + 1));
    const unsubGerencias = subscribeGerencias(() => setVersion((v) => v + 1));

    return () => {
      if (typeof unsubPersonal === "function") unsubPersonal();
      if (typeof unsubGerencias === "function") unsubGerencias();
    };
  }, []);

  const gerencias = React.useMemo(
    () => [...getGerenciasState().gerencias] as any[],
    [version]
  );

  const rows = React.useMemo(() => {
    const list = [...getPersonalState().personal] as any[];

    return list
      .map((p) => {
        const gById = gerencias.find((g) => g.id === p.gerenciaId);
        const gByName = gerencias.find((g) => g.nombre === p.gerencia);
        const g = gById || gByName;

        return {
          ...p,
          gerenciaNombre: g?.nombre ?? p.gerencia ?? "—",
        };
      })
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  }, [version, gerencias]);

  // Paginación
  const PAGE_SIZE = 10;
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const start = (page - 1) * PAGE_SIZE;
  const currentRows = rows.slice(start, start + PAGE_SIZE);

  // Dialogo
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [dlgLoading, setDlgLoading] = React.useState(false);
  const [current, setCurrent] = React.useState<any | null>(null);

  const openCreate = () => {
    setCurrent({
      id: "" as string,
      dni: "",
      nombre: "",
      gerenciaId: "",
      estado: "ACTIVO",
    });
    setDlgOpen(true);
  };

  const openEdit = (p: any) => {
    setCurrent({
      ...p,
      gerenciaId: p.gerenciaId ?? p.gerenciaId ?? "",
    });
    setDlgOpen(true);
  };

  const savePersonal = async (p: any) => {
    setDlgLoading(true);
    try {
      await upsertPersonal({
        id: p.id || undefined,
        dni: p.dni,
        nombre: p.nombre,
        gerenciaId: p.gerenciaId,
        estado: p.estado,
      } as any);
    } catch (e: any) {
      alert(e?.message ?? "No se pudo guardar el registro de personal.");
    } finally {
      setDlgLoading(false);
      setDlgOpen(false);
      setCurrent(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Título */}
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Personal (Mantenedor)
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Maestro de trabajadores con DNI, nombre, gerencia y estado
          (activo/cesado). Las gerencias se toman del mantenedor de gerencias.
        </p>
      </div>

      {/* Botón crear */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          Añadir trabajador
        </button>
      </div>

      {/* Tabla */}
      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">DNI</th>
                <th className="px-4 py-3">Nombre y apellido</th>
                <th className="px-4 py-3">Gerencia</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {currentRows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No hay trabajadores registrados.
                  </td>
                </tr>
              )}

              {currentRows.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.dni}</td>
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3">{p.gerenciaNombre}</td>
                  <td className="px-4 py-3">
                    {p.estado === "CESADO" ? (
                      <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800 ring-1 ring-rose-200">
                        Cesado
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                        Activo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="rounded-lg border p-2 hover:bg-gray-50"
                        title="Editar"
                        aria-label="Editar"
                      >
                        <PencilLine className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="border-t px-3">
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </section>

      {/* Dialogo Crear / Editar */}
      <PersonalDialog
        open={dlgOpen}
        initial={current}
        gerencias={gerencias}
        loading={dlgLoading}
        onCancel={() => {
          setDlgOpen(false);
          setCurrent(null);
        }}
        onSubmit={savePersonal}
      />
    </div>
  );
}
