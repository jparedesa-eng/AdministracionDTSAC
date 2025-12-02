// src/pages/Camionetas/Conductores.tsx
import React from "react";
import { supabase } from "../../supabase/supabaseClient";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Modelo en app */
type Driver = {
  id: string;
  nombre: string;
  dni: string;
  licencia: string;
  licenciaVence: string | null; // ISO date o null
  telefono: string;
  sede: string;
  activo: boolean;
  created_at?: string | null;
};

/** Mapeo DB -> App */
type DriverRow = {
  id: string;
  nombre: string;
  dni: string;
  licencia: string;
  licencia_vence: string | null;
  telefono: string;
  sede: string;
  activo: boolean;
  created_at: string | null;
};

function fromRow(r: DriverRow): Driver {
  return {
    id: r.id,
    nombre: r.nombre,
    dni: r.dni,
    licencia: r.licencia,
    licenciaVence: r.licencia_vence,
    telefono: r.telefono,
    sede: r.sede,
    activo: r.activo,
    created_at: r.created_at,
  };
}

function toRow(d: Partial<Driver>): Partial<DriverRow> {
  const out: Partial<DriverRow> = {};
  if (d.id !== undefined) out.id = d.id;
  if (d.nombre !== undefined) out.nombre = d.nombre;
  if (d.dni !== undefined) out.dni = d.dni;
  if (d.licencia !== undefined) out.licencia = d.licencia;
  if (d.licenciaVence !== undefined) out.licencia_vence = d.licenciaVence;
  if (d.telefono !== undefined) out.telefono = d.telefono;
  if (d.sede !== undefined) out.sede = d.sede;
  if (d.activo !== undefined) out.activo = d.activo;
  return out;
}

export default function Conductores() {
  /* =========================
   * Estado local
   * ========================= */
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filtros
  const [query, setQuery] = React.useState("");
  const [onlyActive, setOnlyActive] = React.useState(false);

  // Paginación
  const pageSize = 10;
  const [page, setPage] = React.useState(1);

  // Modal crear/editar
  const [openModal, setOpenModal] = React.useState(false);
  const [editing, setEditing] = React.useState<Driver | null>(null);

  // Form controlado
  const [form, setForm] = React.useState<Driver>({
    id: "",
    nombre: "",
    dni: "",
    licencia: "",
    licenciaVence: null,
    telefono: "",
    sede: "",
    activo: true,
  });

  /* =========================
   * Carga inicial
   * ========================= */
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from("conductores")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setDrivers((data as DriverRow[]).map(fromRow));
      } catch (e: any) {
        setError(e.message ?? "Error al cargar conductores.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* =========================
   * Filtro + Paginación
   * ========================= */
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return drivers.filter((d) => {
      const match =
        !q ||
        d.nombre.toLowerCase().includes(q) ||
        d.dni.toLowerCase().includes(q) ||
        d.licencia.toLowerCase().includes(q) ||
        d.sede.toLowerCase().includes(q) ||
        (d.telefono ?? "").toLowerCase().includes(q);
      const okActivo = !onlyActive || d.activo;
      return match && okActivo;
    });
  }, [drivers, query, onlyActive]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = filtered.slice(start, end);

  // Resetear a página 1 si cambian los filtros o la data
  React.useEffect(() => {
    setPage(1);
  }, [query, onlyActive, drivers.length]);

  /* =========================
   * Helpers UI
   * ========================= */
  const resetForm = () =>
    setForm({
      id: "",
      nombre: "",
      dni: "",
      licencia: "",
      licenciaVence: null,
      telefono: "",
      sede: "",
      activo: true,
    });

  const handleCreate = () => {
    setEditing(null);
    resetForm();
    setOpenModal(true);
  };

  const handleEdit = (d: Driver) => {
    setEditing(d);
    setForm(d);
    setOpenModal(true);
  };

  const toggleActivo = async (d: Driver) => {
    try {
      const next = !d.activo;
      const { error } = await supabase
        .from("conductores")
        .update({ activo: next })
        .eq("id", d.id);
      if (error) throw error;
      setDrivers((prev) =>
        prev.map((x) => (x.id === d.id ? { ...x, activo: next } : x))
      );
    } catch (e: any) {
      alert(e.message ?? "No se pudo actualizar el estado.");
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.dni.trim()) {
      alert("Nombre y DNI son obligatorios.");
      return;
    }
    try {
      if (editing) {
        const payload = toRow({
          nombre: form.nombre,
          dni: form.dni,
          licencia: form.licencia,
          licenciaVence: form.licenciaVence,
          telefono: form.telefono,
          sede: form.sede,
          activo: form.activo,
        });
        const { data, error } = await supabase
          .from("conductores")
          .update(payload)
          .eq("id", editing.id)
          .select("*")
          .single();
        if (error) throw error;
        const updated = fromRow(data as DriverRow);
        setDrivers((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
      } else {
        const payload = toRow({
          nombre: form.nombre,
          dni: form.dni,
          licencia: form.licencia,
          licenciaVence: form.licenciaVence,
          telefono: form.telefono,
          sede: form.sede,
          activo: form.activo,
        });
        const { data, error } = await supabase
          .from("conductores")
          .insert([payload])
          .select("*")
          .single();
        if (error) throw error;
        const inserted = fromRow(data as DriverRow);
        setDrivers((prev) => [inserted, ...prev]);
      }

      setOpenModal(false);
      setEditing(null);
      resetForm();
    } catch (e: any) {
      alert(e.message ?? "No se pudo guardar el conductor.");
    }
  };

  const formatVence = (s: string | null) => {
    if (!s) return "—";
    try {
      const d = new Date(s);
      return d.toLocaleDateString();
    } catch {
      return s;
    }
  };

  const Pagination = () => (
    <div className="flex items-center justify-between px-6 py-4">
      <p className="text-sm text-gray-600">
        Mostrando <span className="font-medium">{filtered.length === 0 ? 0 : start + 1}</span>–
        <span className="font-medium">{Math.min(end, filtered.length)}</span> de{" "}
        <span className="font-medium">{filtered.length}</span> registros
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={safePage === 1}
          className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <span className="text-sm text-gray-700">
          Página <span className="font-semibold">{safePage}</span> de{" "}
          <span className="font-semibold">{totalPages}</span>
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage === totalPages}
          className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  /* =========================
   * Render
   * ========================= */
  return (
    <div className="space-y-6">
      {/* Título + subtítulo */}
      <div className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight">Conductores</h1>
        <p className="mt-1 text-sm text-gray-600">
          Administra la base de conductores (crear, editar, activar/desactivar).
        </p>
      </div>

      {/* Filtros */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, DNI, licencia, teléfono o sede"
              className="w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none ring-1 ring-transparent placeholder:text-gray-400 focus:ring-gray-300"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
            />
            Solo activos
          </label>
          <div className="md:text-right">
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
            >
              Nuevo conductor
            </button>
          </div>
        </div>
      </section>

      {/* Tabla en tarjeta */}
      <section className="rounded-2xl border bg-white p-0 shadow-sm overflow-hidden">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold">Lista de conductores</h2>
          <p className="mt-1 text-sm text-gray-600">
            Total: {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
          </p>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-t">
            <thead className="bg-gray-50 text-left text-sm text-gray-600">
              <tr>
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">DNI</th>
                <th className="px-6 py-3">Licencia</th>
                <th className="px-6 py-3">Vence</th>
                <th className="px-6 py-3">Teléfono</th>
                <th className="px-6 py-3">Sede</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {loading && (
                <tr>
                  <td className="px-6 py-8 text-center text-sm text-gray-500" colSpan={8}>
                    Cargando...
                  </td>
                </tr>
              )}

              {!loading && pageData.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/60">
                  <td className="px-6 py-3 font-medium text-gray-900">{d.nombre}</td>
                  <td className="px-6 py-3">{d.dni}</td>
                  <td className="px-6 py-3">{d.licencia}</td>
                  <td className="px-6 py-3">{formatVence(d.licenciaVence)}</td>
                  <td className="px-6 py-3">{d.telefono}</td>
                  <td className="px-6 py-3">{d.sede}</td>
                  <td className="px-6 py-3">
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 " +
                        (d.activo
                          ? "bg-teal-100 text-teal-800 ring-teal-200"
                          : "bg-gray-200 text-gray-700 ring-gray-300")
                      }
                    >
                      {d.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActivo(d)}
                        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
                        title={d.activo ? "Desactivar" : "Activar"}
                      >
                        {d.activo ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(d)}
                        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
                      >
                        Editar
                      </button>
                      {/* Sin botón Eliminar (según solicitud previa) */}
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && pageData.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-center text-sm text-gray-500" colSpan={8}>
                    {error ? `Error: ${error}` : "No hay conductores que coincidan con el filtro."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <Pagination />
      </section>

      {/* Modal Crear/Editar */}
      {openModal && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                {editing ? "Editar conductor" : "Nuevo conductor"}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Completa los datos y guarda los cambios.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                  placeholder="Nombres y apellidos"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">DNI</label>
                  <input
                    value={form.dni}
                    onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                    placeholder="Ej. 12345678"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Licencia</label>
                  <input
                    value={form.licencia}
                    onChange={(e) => setForm((f) => ({ ...f, licencia: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                    placeholder="Ej. A-I, A-IIb"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Vence</label>
                  <input
                    type="date"
                    value={form.licenciaVence ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, licenciaVence: e.target.value || null }))
                    }
                    className="w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Teléfono</label>
                  <input
                    value={form.telefono}
                    onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                    placeholder="Ej. 999-111-222"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Sede</label>
                <input
                  value={form.sede}
                  onChange={(e) => setForm((f) => ({ ...f, sede: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                  placeholder="Ej. Lima"
                />
              </div>

              <label className="mt-1 inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                />
                Activo
              </label>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpenModal(false);
                    setEditing(null);
                    resetForm();
                  }}
                  className="rounded-xl border px-4 py-2.5 text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
