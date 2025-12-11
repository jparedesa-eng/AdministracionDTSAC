// src/pages/Camionetas/Conductores.tsx
import React from "react";
import { supabase } from "../../supabase/supabaseClient";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  PencilLine,
  Shuffle,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  AlertCircle,
} from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";

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
  licencia_vencimiento: string | null;
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
    licenciaVence: r.licencia_vencimiento,
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
  if (d.licenciaVence !== undefined) out.licencia_vencimiento = d.licenciaVence;
  if (d.telefono !== undefined) out.telefono = d.telefono;
  if (d.sede !== undefined) out.sede = d.sede;
  if (d.activo !== undefined) out.activo = d.activo;
  return out;
}

function VencimientoLicencia({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) return <span className="text-gray-300">-</span>;

  const today = new Date();
  const target = new Date(dateStr);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let colorClass = "text-gray-600";
  let icon = null;

  if (diffDays < 0) {
    colorClass = "text-rose-600 font-bold";
    icon = <AlertCircle className="mr-1 h-3 w-3" />;
  } else if (diffDays < 30) {
    colorClass = "text-amber-600 font-bold";
    icon = <AlertTriangle className="mr-1 h-3 w-3" />;
  }

  const formatted = target.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  return (
    <div className={`inline-flex items-center text-xs ${colorClass}`}>
      {icon}
      <span>{formatted}</span>
    </div>
  );
}

export default function Conductores() {
  /* =========================
   * Estado local
   * ========================= */
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [toast, setToast] = React.useState<ToastState>(null);

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
        const { data, error } = await supabase
          .from("conductores")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setDrivers((data as DriverRow[]).map(fromRow));
      } catch (e: any) {
        setToast({ type: "error", message: e.message ?? "Error al cargar." });
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

  React.useEffect(() => {
    setPage(1);
  }, [query, onlyActive, drivers.length]);

  /* =========================
   * Helpers UI / Actions
   * ========================= */
  function Switch({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
  }) {
    return (
      <label className="inline-flex cursor-pointer items-center gap-3">
        <div className="relative">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          {/* Track */}
          <div className="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-slate-900 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-slate-500 peer-focus:ring-offset-2"></div>
          {/* Thumb */}
          <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"></div>
        </div>
        {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      </label>
    );
  }

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
  // ... (rest of simple logic unchanged)

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
      setToast({
        type: "success",
        message: `Conductor ${next ? "activado" : "desactivado"}.`,
      });
    } catch (e: any) {
      setToast({ type: "error", message: "Error al actualizar estado." });
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.dni.trim()) {
      setToast({ type: "error", message: "Nombre y DNI obligatorios." });
      return;
    }
    try {
      if (editing) {
        // Update
        const payload = toRow({ ...form, id: editing.id });
        const { data, error } = await supabase
          .from("conductores")
          .update(payload)
          .eq("id", editing.id)
          .select("*")
          .single();
        if (error) throw error;
        const updated = fromRow(data as DriverRow);
        setDrivers((prev) =>
          prev.map((x) => (x.id === editing.id ? updated : x))
        );
        setToast({ type: "success", message: "Conductor actualizado." });
      } else {
        // Create
        const payload = toRow(form);
        const { data, error } = await supabase
          .from("conductores")
          .insert([payload])
          .select("*")
          .single();
        if (error) throw error;
        const inserted = fromRow(data as DriverRow);
        setDrivers((prev) => [inserted, ...prev]);
        setToast({ type: "success", message: "Conductor creado." });
      }

      setOpenModal(false);
      setEditing(null);
      resetForm();
    } catch (e: any) {
      setToast({ type: "error", message: e.message || "Error al guardar." });
    }
  };

  // KPIs
  const totalCount = drivers.length;
  const activeCount = drivers.filter((d) => d.activo).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Conductores
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestión de choferes, licencias y estados.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{totalCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
              <User className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Activos */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Activos</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{activeCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Inactivos */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Inactivos</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {inactiveCount}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros + Acciones */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, DNI, licencia..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
          />
        </div>

        {/* Filters/Buttons */}
        <div className="flex items-center gap-3">
          <Switch
            checked={onlyActive}
            onChange={setOnlyActive}
            label="Solo activos"
          />

          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo</span>
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Nombre / DNI</th>
                <th className="px-6 py-3">Licencia</th>
                <th className="px-6 py-3">Vencimiento</th>
                <th className="px-6 py-3">Teléfono</th>
                <th className="px-6 py-3">Sede</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && pageData.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-gray-900">
                        {d.nombre}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {d.dni}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 font-medium text-gray-700">
                    {d.licencia}
                  </td>
                  <td className="px-6 py-3">
                    <VencimientoLicencia dateStr={d.licenciaVence} />
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {d.telefono || "-"}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{d.sede || "-"}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${d.activo
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                        : "bg-gray-100 text-gray-600 ring-gray-500/10"
                        }`}
                    >
                      {d.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleActivo(d)}
                        className="rounded-lg border p-2 hover:bg-gray-50"
                        title={d.activo ? "Desactivar" : "Activar"}
                      >
                        <Shuffle className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleEdit(d)}
                        className="rounded-lg border p-2 hover:bg-gray-50"
                        title="Editar"
                      >
                        <PencilLine className="h-4 w-4 text-gray-700" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && pageData.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    No se encontraron conductores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between border-t bg-white px-6 py-3 text-sm text-gray-600">
          <div>
            Mostrando <span className="font-medium">{filtered.length === 0 ? 0 : start + 1}</span> a{" "}
            <span className="font-medium">{Math.min(end, filtered.length)}</span> de{" "}
            <span className="font-medium">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={openModal}
        title={editing ? "Editar Conductor" : "Nuevo Conductor"}
        onClose={() => setOpenModal(false)}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
          {/* Row 1: Nombre */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Nombre Completo <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
              placeholder="Ej. Juan Pérez"
            />
          </div>

          {/* Row 2: DNI, Teléfono */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">
                DNI <span className="text-rose-500">*</span>
              </label>
              <input
                required
                maxLength={8}
                value={form.dni}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dni: e.target.value.replace(/\D/g, "").slice(0, 8),
                  })
                }
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                placeholder="8 dígitos"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                placeholder="Ej. 999 000 000"
              />
            </div>
          </div>

          {/* Row 3: Licencia (Select), Vence */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Licencia
              </label>
              <select
                value={form.licencia}
                onChange={(e) => setForm({ ...form, licencia: e.target.value })}
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
              >
                <option value="">Seleccione...</option>
                <option value="A-I">A-I</option>
                <option value="A-IIA">A-IIA</option>
                <option value="A-IIB">A-IIB</option>
                <option value="A-IIIA">A-IIIA</option>
                <option value="A-IIIB">A-IIIB</option>
                <option value="A-IIIC">A-IIIC</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Vencimiento Licencia
              </label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={form.licenciaVence ?? ""}
                onChange={(e) =>
                  setForm({ ...form, licenciaVence: e.target.value || null })
                }
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
              />
            </div>
          </div>

          {/* Row 4: Sede */}
          <div>
            <label className="text-sm font-medium text-gray-700">Sede</label>
            <select
              value={form.sede}
              onChange={(e) => setForm({ ...form, sede: e.target.value })}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
            >
              <option value="">Seleccione...</option>
              <option value="Trujillo">Trujillo</option>
              <option value="Arequipa">Arequipa</option>
            </select>
          </div>

          <div className="pt-2">
            <Switch
              checked={form.activo}
              onChange={(val) => setForm({ ...form, activo: val })}
              label="Conductor activo"
            />
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpenModal(false)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              {editing ? "Guardar Cambios" : "Crear Conductor"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
