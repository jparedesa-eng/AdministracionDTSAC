// src/pages/Camionetas/ProgramacionMantenimiento.tsx
import React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  Wrench,
  CheckCircle2,
  PlusCircle,
  PencilLine,
  Trash2,
  Eye,
  EyeOff,
  Eraser,
} from "lucide-react";
import {
  mantenimientoStore,
  createProgramacion,
  updateProgramacion,
  deleteProgramacion,
  createMantenimiento,
  upsertProgramaMaestro,
  fetchProgramacionesMes,
  fetchMantenimientosMes,
  fetchProgramasPorTipo,
} from "../../store/MantenimientoStore";
import type {
  Vehiculo,
  Programa,
  Mantenimiento,
  Programacion,
  Naturaleza,
} from "../../store/MantenimientoStore";

/* =========================
   Fechas y utils
========================= */
const ymdUTC = (d: Date): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const ymd = (d: Date): string =>
  ymdUTC(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
const todayYMD = (): string =>
  ymdUTC(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())));
function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const baseM0 = m - 1;
  const tgtM0Total = baseM0 + months;
  const tgtY = y + Math.floor(tgtM0Total / 12);
  const tgtM0 = ((tgtM0Total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(tgtY, tgtM0 + 1, 0)).getUTCDate();
  const dd = Math.min(d, lastDay);
  return ymdUTC(new Date(Date.UTC(tgtY, tgtM0, dd)));
}
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
function daysBetween(aYMD: string, bYMD: string): number {
  const [ay, am, ad] = aYMD.split("-").map(Number);
  const [by, bm, bd] = bYMD.split("-").map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/* =========================
   Estado pill (ancho fijo)
========================= */
function classForDueDate(nextDate: string | null): { label: string; cls: string } {
  if (!nextDate) return { label: "Sin programar", cls: "bg-gray-100 text-gray-700 ring-gray-200" };
  const d = daysBetween(todayYMD(), nextDate);
  if (d < 0) return { label: "Vencido", cls: "bg-rose-100 text-rose-700 ring-rose-200" };
  if (d <= 30) return { label: "Próx. 30 días", cls: "bg-amber-100 text-amber-700 ring-amber-200" };
  return { label: "En regla", cls: "bg-emerald-100 text-emerald-700 ring-emerald-200" };
}
function StatusPill({
  nextDate,
  override,
}: {
  nextDate: string | null;
  override?: { label: string; cls: string } | null;
}) {
  const s = override ?? classForDueDate(nextDate);
  return (
    <span className={`inline-flex w-[110px] justify-center items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${s.cls}`}>
      {s.label}
    </span>
  );
}
function computeNextDate(p: Programa | undefined | null): string | null {
  if (!p) return null;
  if (p.proxima_fecha) return p.proxima_fecha;
  if (p.ultima_fecha) return addMonths(p.ultima_fecha, p.periodicidad_meses);
  return null;
}

/* =========================
   Calendario mensual compacto
========================= */
function buildMonthMatrix(viewDate: Date): (Date | null)[][] {
  const start = startOfMonth(viewDate);
  const end = endOfMonth(viewDate);
  const startDay = (start.getDay() + 6) % 7; // ISO Lunes=0
  const daysInMonth = end.getDate();
  const cells: (Date | null)[] = [];
  for (let x = 0; x < startDay; x++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
type CalendarEvents = Record<
  string,
  { count: number; vencidos: number; soon: number; ok: number; cumplidos: number }
>;
function MonthCalendar(props: {
  viewDate: Date;
  selected: string | null;
  events: CalendarEvents;
  onPrev: () => void;
  onNext: () => void;
  onPick: (ymd: string) => void;
}) {
  const { viewDate, selected, events, onPrev, onNext, onPick } = props;
  const weeks = buildMonthMatrix(viewDate);
  const monthLabel = viewDate.toLocaleString(undefined, { month: "long", year: "numeric" });
  const today = todayYMD();

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          <p className="text-sm font-semibold capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onPrev} className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50">
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button onClick={onNext} className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50">
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-100 p-px text-[11px]">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="bg-gray-50 p-2 text-center font-medium text-gray-600">
            {d}
          </div>
        ))}

        {weeks.map((week, wi) => (
          <React.Fragment key={`w-${wi}`}>
            {week.map((day, di) => {
              if (!day) return <div key={`c-${wi}-${di}`} className="min-h-14 bg-white" />;
              const dYMD = ymd(day);
              const isToday = dYMD === today;
              const isSelected = selected === dYMD;
              const ev = events[dYMD];

              return (
                <button
                  key={`c-${wi}-${di}`}
                  onClick={() => onPick(dYMD)}
                  className={[
                    "min-h-14 w-full bg-white p-1.5 text-left transition relative rounded-md",
                    "hover:bg-gray-50",
                    isSelected ? "ring-2 ring-gray-900 bg-slate-50" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={[
                        "text-[12px] rounded px-1",
                        isToday ? "font-bold bg-slate-200" : "",
                      ].join(" ")}
                    >
                      {day.getDate()}
                    </span>
                    {ev && ev.count > 0 && (
                      <span className="rounded-full bg-gray-900 px-1.5 text-[10px] font-semibold text-white">
                        {ev.count}
                      </span>
                    )}
                  </div>
                  {ev && ev.count > 0 && (
                    <div className="mt-1 flex gap-0.5">
                      {ev.cumplidos > 0 && (
                        <span title="Cumplidos" className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      )}
                      {ev.vencidos > 0 && (
                        <span title="Vencidos" className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                      )}
                      {ev.soon > 0 && (
                        <span title="Próx. 30 días" className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      )}
                      {ev.ok > 0 && (
                        <span title="En regla" className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* =========================
   Modal base
========================= */
function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  if (!open) return null;
  const maxW = size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-lg";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className={`w-full ${maxW} rounded-2xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm hover:bg-gray-100">
            Cerrar
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* =========================
   Modales de negocio
========================= */
function RegisterAttentionModal({
  open,
  onClose,
  onSave,
  defaultDate,
  placa,
  tipo,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (values: { km: number | null; costo: number | null; notas: string | null }) => void;
  defaultDate: string;
  placa: string;
  tipo: string;
}) {
  const [km, setKm] = React.useState<string>("");
  const [costo, setCosto] = React.useState<string>("");
  const [notas, setNotas] = React.useState<string>("");

  React.useEffect(() => {
    if (open) {
      setKm("");
      setCosto("");
      setNotas("");
    }
  }, [open]);

  return (
    <Modal
      open={open}
      title={`Registrar atención — ${placa} (${tipo}) — ${defaultDate}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() =>
              onSave({
                km: km.trim() ? Number(km) : null,
                costo: costo.trim() ? Number(costo) : null,
                notas: notas.trim() || null,
              })
            }
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Guardar
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Kilometraje</label>
          <input
            inputMode="numeric"
            value={km}
            onChange={(e) => setKm(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="Ej. 123456"
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Costo (S/)</label>
          <input
            inputMode="decimal"
            value={costo}
            onChange={(e) => setCosto(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="Ej. 250.00"
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Notas</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            rows={4}
            placeholder="Detalle del trabajo realizado, proveedor, repuestos, etc."
          />
        </div>
      </div>
    </Modal>
  );
}

function CreatePreventiveModal({
  open,
  onClose,
  vehiculos,
  initialTipo,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  vehiculos: Vehiculo[];
  initialTipo: string;
  onCreate: (args: {
    vehiculo_id: string;
    placa: string;
    startDate: string;
    frecuenciaMeses: number;
    ocurrencias: number;
    tipo: string;
  }) => void;
}) {
  const [tipo, setTipo] = React.useState<string>(initialTipo);
  const [vehiculoId, setVehiculoId] = React.useState<string>("");
  const [disponibles, setDisponibles] = React.useState<Vehiculo[]>([]);
  const [startDate, setStartDate] = React.useState<string>(todayYMD());
  const [frecuenciaMeses, setFrecuenciaMeses] = React.useState<string>("3");
  const [ocurrencias, setOcurrencias] = React.useState<string>("12");

  async function refreshDisponibles(t: string) {
    const progs = await fetchProgramasPorTipo(t);
    const con = new Set(progs.map((p) => p.vehiculo_id));
    setDisponibles(vehiculos.filter((v) => !con.has(v.id)));
  }

  React.useEffect(() => {
    if (open) {
      setTipo(initialTipo);
      setVehiculoId("");
      setStartDate(todayYMD());
      setFrecuenciaMeses("3");
      setOcurrencias("12");
      void refreshDisponibles(initialTipo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal
      open={open}
      title={`Crear programa preventivo`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!vehiculoId) return alert("Selecciona una placa.");
              if (!startDate) return alert("Selecciona la fecha de inicio.");
              const f = Number(frecuenciaMeses || "0");
              const oc = Number(ocurrencias || "0");
              if (f <= 0) return alert("La frecuencia (meses) debe ser mayor a 0.");
              if (oc <= 0) return alert("Las ocurrencias deben ser mayor a 0.");
              const vSel = vehiculos.find((v) => v.id === vehiculoId);
              onCreate({
                vehiculo_id: vehiculoId,
                placa: vSel?.placa || "",
                startDate,
                frecuenciaMeses: f,
                ocurrencias: oc,
                tipo,
              });
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            <PlusCircle className="h-4 w-4" />
            Crear programa y agenda
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Tipo</label>
            <select
              value={tipo}
              onChange={async (e) => {
                const t = e.target.value;
                setTipo(t);
                setVehiculoId("");
                await refreshDisponibles(t);
              }}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            >
              {["General", "Aceite", "Frenos", "Neumáticos"].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Placa (sin programa del tipo)</label>
            <select
              value={vehiculoId}
              onChange={(e) => setVehiculoId(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            >
              <option value="">— Seleccionar —</option>
              {disponibles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa} — {v.marca} {v.modelo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Frecuencia (meses)</label>
            <input
              inputMode="numeric"
              value={frecuenciaMeses}
              onChange={(e) => setFrecuenciaMeses(e.target.value.replace(/[^\d]/g, ""))}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Ej. 3"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Ocurrencias</label>
            <input
              inputMode="numeric"
              value={ocurrencias}
              onChange={(e) => setOcurrencias(e.target.value.replace(/[^\d]/g, ""))}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Ej. 12"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function CreateCorrectiveModal({
  open,
  onClose,
  vehiculos,
  defaultDate,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  vehiculos: Vehiculo[];
  defaultDate: string | null;
  onCreate: (args: { vehiculo_id: string; placa: string; tipo: string; fecha: string; notas?: string | null }) => void;
}) {
  const [tipo, setTipo] = React.useState<string>("General");
  const [vehiculoId, setVehiculoId] = React.useState<string>("");
  const [fecha, setFecha] = React.useState<string>(defaultDate || todayYMD());
  const [notas, setNotas] = React.useState<string>("");

  React.useEffect(() => {
    if (open) {
      setTipo("General");
      setVehiculoId("");
      setFecha(defaultDate || todayYMD());
      setNotas("");
    }
  }, [open, defaultDate]);

  return (
    <Modal
      open={open}
      title="Programar mantenimiento correctivo"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!vehiculoId) return alert("Selecciona una placa.");
              if (!fecha) return alert("Selecciona la fecha.");
              const vSel = vehiculos.find((v) => v.id === vehiculoId);
              onCreate({ vehiculo_id: vehiculoId, placa: vSel?.placa || "", tipo, fecha, notas: notas || null });
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            <PlusCircle className="h-4 w-4" />
            Programar
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            >
              {["General", "Aceite", "Frenos", "Neumáticos"].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Placa</label>
            <select
              value={vehiculoId}
              onChange={(e) => setVehiculoId(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            >
              <option value="">— Seleccionar —</option>
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa} — {v.marca} {v.modelo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Notas (opcional)</label>
            <input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Descripción breve"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function EditProgramacionModal({
  open,
  onClose,
  programacion,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  programacion: Programacion | null;
  onSave: (patch: { fecha: string; tipo: string; naturaleza: Naturaleza; notas: string | null }) => void;
}) {
  const [fecha, setFecha] = React.useState<string>(programacion?.fecha || todayYMD());
  const [tipo, setTipo] = React.useState<string>(programacion?.tipo || "General");
  const [naturaleza, setNaturaleza] = React.useState<Naturaleza>(programacion?.naturaleza || "preventivo");
  const [notas, setNotas] = React.useState<string>(programacion?.notas || "");

  React.useEffect(() => {
    if (open && programacion) {
      setFecha(programacion.fecha);
      setTipo(programacion.tipo);
      setNaturaleza(programacion.naturaleza);
      setNotas(programacion.notas || "");
    }
  }, [open, programacion]);

  return (
    <Modal
      open={open}
      title={`Editar programación`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => onSave({ fecha, tipo, naturaleza, notas: notas.trim() || null })}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            <PencilLine className="h-4 w-4" />
            Guardar cambios
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            >
              {["General", "Aceite", "Frenos", "Neumáticos"].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Naturaleza</label>
            <select
              value={naturaleza}
              onChange={(e) => setNaturaleza(e.target.value as Naturaleza)}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            >
              <option value="preventivo">preventivo</option>
              <option value="correctivo">correctivo</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Notas</label>
            <input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Notas de la programación"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* =========================
   Página principal
========================= */
export default function ProgramacionMantenimiento() {
  const [q, setQ] = React.useState<string>("");
  const [tipoFiltro, setTipoFiltro] = React.useState<string>("General");
  type EstadoFiltro = "Todos" | "Vencido" | "Próx. 30 días" | "En regla" | "Cumplido";
  const [estadoFiltro, setEstadoFiltro] = React.useState<EstadoFiltro>("Todos");

  const [vehiculos, setVehiculos] = React.useState<Vehiculo[]>([]);
  const [programas, setProgramas] = React.useState<Record<string, Programa>>({});
  const [programaciones, setProgramaciones] = React.useState<Programacion[]>([]);
  const [mantenimientosMes, setMantenimientosMes] = React.useState<Mantenimiento[]>([]);

  const [viewDate, setViewDate] = React.useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);

  // columnas de atención (Fecha/KM/Costo/Notas)
  const [showAtencionCol, setShowAtencionCol] = React.useState<boolean>(false);

  // modales
  const [openRegister, setOpenRegister] = React.useState<{ open: boolean; prg: Programacion | null }>(
    { open: false, prg: null }
  );
  const [openCreatePreventivo, setOpenCreatePreventivo] = React.useState<boolean>(false);
  const [openCreateCorrectivo, setOpenCreateCorrectivo] = React.useState<boolean>(false);
  const [editModal, setEditModal] = React.useState<{ open: boolean; prg: Programacion | null }>(
    { open: false, prg: null }
  );

  const [loading, setLoading] = React.useState<boolean>(false);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      await mantenimientoStore.syncVehiculos(q);
      const vs = mantenimientoStore.vehiculos;
      setVehiculos(vs);

      const progs = await mantenimientoStore.fetchProgramas(
        vs.map((v: Vehiculo) => v.id),
        tipoFiltro
      );
      const map: Record<string, Programa> = {};
      for (const p of progs) map[p.vehiculo_id] = p;
      setProgramas(map);
    } catch (e: any) {
      setErr(e?.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [q, tipoFiltro]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    (async () => {
      const [ag, mm] = await Promise.all([
        fetchProgramacionesMes(viewDate, tipoFiltro),
        fetchMantenimientosMes(viewDate, tipoFiltro),
      ]);
      setProgramaciones(ag);
      setMantenimientosMes(mm);
    })();
  }, [viewDate, tipoFiltro]);

  const filteredVehiculos = React.useMemo<Vehiculo[]>(() => {
    const term = q.trim().toUpperCase();
    if (!term) return vehiculos;
    return vehiculos.filter((v: Vehiculo) =>
      [v.placa, v.marca ?? "", v.modelo ?? "", v.responsable ?? "", v.proveedor ?? ""].some((x) =>
        x.toUpperCase().includes(term)
      )
    );
  }, [vehiculos, q]);

  const buckets = React.useMemo(() => {
    let venc = 0,
      soon = 0,
      ok = 0,
      sin = 0;
    for (const v of filteredVehiculos) {
      const p = programas[v.id];
      const nx = computeNextDate(p);
      if (!nx) {
        sin++;
        continue;
      }
      const lbl = classForDueDate(nx).label;
      if (lbl === "Vencido") venc++;
      else if (lbl === "Próx. 30 días") soon++;
      else ok++;
    }
    return { venc, soon, ok, sin };
  }, [filteredVehiculos, programas]);

  const isCumplida = React.useCallback(
    (prg: Programacion): boolean =>
      mantenimientosMes.some(
        (m: Mantenimiento) => m.vehiculo_id === prg.vehiculo_id && m.tipo === prg.tipo && m.fecha === prg.fecha
      ),
    [mantenimientosMes]
  );
  const getMant = React.useCallback(
    (prg: Programacion): Mantenimiento | undefined =>
      mantenimientosMes.find(
        (m: Mantenimiento) => m.vehiculo_id === prg.vehiculo_id && m.tipo === prg.tipo && m.fecha === prg.fecha
      ),
    [mantenimientosMes]
  );

  const events: CalendarEvents = React.useMemo(() => {
    const map: CalendarEvents = {};
    for (const p of programaciones) {
      const key = p.fecha;
      const cumplida = isCumplida(p);
      if (!map[key]) map[key] = { count: 0, vencidos: 0, soon: 0, ok: 0, cumplidos: 0 };
      map[key].count += 1;

      if (cumplida) map[key].cumplidos += 1;
      else {
        const lbl = classForDueDate(p.fecha).label;
        if (lbl === "Vencido") map[key].vencidos += 1;
        else if (lbl === "Próx. 30 días") map[key].soon += 1;
        else map[key].ok += 1;
      }
    }
    return map;
  }, [programaciones, isCumplida]);

  // registrar atención
  const registrarAtencion = async (
    p: Programacion,
    payload: { km: number | null; costo: number | null; notas: string | null }
  ) => {
    try {
      await createMantenimiento({
        vehiculo_id: p.vehiculo_id,
        tipo: p.tipo,
        fecha: p.fecha,
        km: payload.km,
        costo: payload.costo,
        notas: payload.notas || undefined,
      });

      const progMaestro = programas[p.vehiculo_id];
      if (progMaestro && progMaestro.tipo === p.tipo) {
        const next = addMonths(p.fecha, progMaestro.periodicidad_meses);
        await upsertProgramaMaestro({
          vehiculo_id: p.vehiculo_id,
          tipo: p.tipo,
          periodicidad_meses: progMaestro.periodicidad_meses,
          proxima_fecha: next,
        });
      }

      const mm = await fetchMantenimientosMes(viewDate, tipoFiltro);
      setMantenimientosMes(mm);
      setOpenRegister({ open: false, prg: null });
    } catch (e: any) {
      alert(e?.message ?? "No se pudo registrar la atención.");
    }
  };

  // crear preventivo + agenda
  const handleCreatePreventivo = async (args: {
    vehiculo_id: string;
    placa: string;
    startDate: string;
    frecuenciaMeses: number;
    ocurrencias: number;
    tipo: string;
  }) => {
    try {
      await upsertProgramaMaestro({
        vehiculo_id: args.vehiculo_id,
        tipo: args.tipo,
        periodicidad_meses: args.frecuenciaMeses,
        proxima_fecha: args.startDate,
      });

      const rows = Array.from({ length: args.ocurrencias }, (_, i: number) => {
        const fecha = i === 0 ? args.startDate : addMonths(args.startDate, i * args.frecuenciaMeses);
        return {
          vehiculo_id: args.vehiculo_id,
          placa: args.placa,
          tipo: args.tipo,
          naturaleza: "preventivo" as Naturaleza,
          fecha,
          notas: null as string | null,
        };
      });
      await mantenimientoStore.bulkInsertProgramaciones(rows as any[]);

      const [ag, mm] = await Promise.all([
        fetchProgramacionesMes(viewDate, tipoFiltro),
        fetchMantenimientosMes(viewDate, tipoFiltro),
      ]);
      setProgramaciones(ag);
      setMantenimientosMes(mm);

      const progs = await mantenimientoStore.fetchProgramas([args.vehiculo_id], args.tipo);
      setProgramas((prev) => ({ ...prev, [args.vehiculo_id]: progs[0] }));

      setOpenCreatePreventivo(false);
      alert(`Programa preventivo creado para ${args.placa} (${args.tipo}).`);
    } catch (e: any) {
      alert(e?.message ?? "No se pudo crear el programa preventivo.");
    }
  };

  const handleCreateCorrectivo = async (args: {
    vehiculo_id: string;
    placa: string;
    tipo: string;
    fecha: string;
    notas?: string | null;
  }) => {
    try {
      await createProgramacion({
        vehiculo_id: args.vehiculo_id,
        placa: args.placa,
        tipo: args.tipo,
        fecha: args.fecha,
        naturaleza: "correctivo",
        notas: args.notas ?? null,
      });
      const [ag, mm] = await Promise.all([
        fetchProgramacionesMes(viewDate, tipoFiltro),
        fetchMantenimientosMes(viewDate, tipoFiltro),
      ]);
      setProgramaciones(ag);
      setMantenimientosMes(mm);
      setOpenCreateCorrectivo(false);
      alert(`Programación correctiva creada: ${args.placa} / ${args.tipo} / ${args.fecha}.`);
    } catch (e: any) {
      alert(e?.message ?? "No se pudo crear la programación correctiva.");
    }
  };

  const onEditar = (prg: Programacion) => setEditModal({ open: true, prg });
  const onEliminar = async (prg: Programacion) => {
    if (!confirm(`¿Eliminar programación de ${prg.placa || ""} el ${prg.fecha}?`)) return;
    try {
      await deleteProgramacion(prg.id);
      const ag = await fetchProgramacionesMes(viewDate, tipoFiltro);
      setProgramaciones(ag);
    } catch (e: any) {
      alert(e?.message ?? "No se pudo eliminar la programación.");
    }
  };

  const onGuardarEdicion = async (patch: {
    fecha: string;
    tipo: string;
    naturaleza: Naturaleza;
    notas: string | null;
  }) => {
    if (!editModal.prg) return;
    try {
      await updateProgramacion(editModal.prg.id, patch as any);
      const [ag, mm] = await Promise.all([
        fetchProgramacionesMes(viewDate, tipoFiltro),
        fetchMantenimientosMes(viewDate, tipoFiltro),
      ]);
      setProgramaciones(ag);
      setMantenimientosMes(mm);
      setEditModal({ open: false, prg: null });
    } catch (e: any) {
      alert(e?.message ?? "No se pudo guardar la edición.");
    }
  };

  const programacionesFiltradas = React.useMemo(() => {
    let arr = programaciones;
    if (estadoFiltro !== "Todos") {
      arr = arr.filter((p: Programacion) => {
        if (isCumplida(p)) return estadoFiltro === "Cumplido";
        const lbl = classForDueDate(p.fecha).label as EstadoFiltro;
        return lbl === estadoFiltro;
      });
    }
    if (selectedDay) {
      arr = arr.filter((p: Programacion) => p.fecha === selectedDay);
    }
    return arr;
  }, [programaciones, estadoFiltro, isCumplida, selectedDay]);

  return (
    <div className="grid gap-4 md:grid-cols-[420px_1fr]">
      {/* ========== IZQUIERDA ========== */}
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-2xl border bg-white p-3 text-center">
            <p className="text-xs text-gray-500">Vencidos</p>
            <p className="mt-1 text-xl font-semibold text-rose-600">{buckets.venc}</p>
          </div>
          <div className="rounded-2xl border bg-white p-3 text-center">
            <p className="text-xs text-gray-500">Próx. 30 días</p>
            <p className="mt-1 text-xl font-semibold text-amber-600">{buckets.soon}</p>
          </div>
          <div className="rounded-2xl border bg-white p-3 text-center">
            <p className="text-xs text-gray-500">En regla</p>
            <p className="mt-1 text-xl font-semibold text-emerald-600">{buckets.ok}</p>
          </div>
          <div className="rounded-2xl border bg-white p-3 text-center">
            <p className="text-xs text-gray-500">Sin programa</p>
            <p className="mt-1 text-xl font-semibold">{buckets.sin}</p>
          </div>
        </div>

        {/* Buscador + tipo */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por placa, modelo, responsable..."
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-3 inline-flex rounded-xl border bg-gray-50 p-1">
            {(["General", "Aceite", "Frenos", "Neumáticos"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setTipoFiltro(opt);
                  setEstadoFiltro("Todos");
                }}
                className={`px-3 py-1.5 text-xs rounded-lg ${
                  tipoFiltro === opt ? "bg-white shadow-sm border" : "text-gray-600"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de vehículos (contexto) */}
        <section className="rounded-2xl border bg-white shadow-sm">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              <div>
                <h2 className="text-sm font-semibold">Vehículos</h2>
                <p className="text-xs text-gray-500">Contexto del programa maestro</p>
              </div>
            </div>
          </header>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && <p className="p-4 text-sm text-gray-500">Cargando...</p>}
            {!loading && filteredVehiculos.length === 0 && (
              <p className="p-4 text-sm text-gray-500">{err ?? "Sin resultados."}</p>
            )}
            {!loading &&
              filteredVehiculos.map((v: Vehiculo) => {
                const p = programas[v.id];
                const next = computeNextDate(p);
                return (
                  <div
                    key={v.id}
                    className="flex w-full items-center justify-between border-b px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {v.placa} — {v.marca} {v.modelo}
                      </p>
                      <p className="text-xs text-gray-600">
                        {p ? `${p.tipo} / cada ${p.periodicidad_meses}m` : "Sin programa"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Próxima (programa maestro)</p>
                        <p className="text-sm font-medium">{next ?? "—"}</p>
                      </div>
                      <StatusPill nextDate={next} />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </div>

      {/* ========== DERECHA: calendario + tabla ========== */}
      <div className="space-y-4 min-w-0">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          {/* Toolbar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenCreatePreventivo(true)}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
                title="Crear programa preventivo para placas sin programa"
              >
                <PlusCircle className="h-4 w-4" />
                Programar (Preventivo)
              </button>

              <button
                type="button"
                onClick={() => setOpenCreateCorrectivo(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
                title="Programar mantenimiento correctivo"
              >
                <PlusCircle className="h-4 w-4" />
                Programar (Correctivo)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                title="Limpiar fecha seleccionada"
              >
                <Eraser className="h-4 w-4" />
                Limpiar fecha
              </button>
            </div>
          </div>

          {/* Calendario compacto */}
          <MonthCalendar
            viewDate={viewDate}
            selected={selectedDay}
            events={events}
            onPrev={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            onNext={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            onPick={(d) => setSelectedDay(d)}
          />
        </div>

        {/* ======= Tabla: Programaciones del mes (scroll local) ======= */}
        <section className="rounded-2xl border bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              <div>
                <h3 className="text-sm font-semibold">Programaciones del mes</h3>
                <p className="text-xs text-gray-500">
                  Mes visible — Tipo: {tipoFiltro}
                  {selectedDay ? ` — Día seleccionado: ${selectedDay}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl border bg-gray-50 p-1">
                {(["Todos", "Vencido", "Próx. 30 días", "En regla", "Cumplido"] as EstadoFiltro[]).map(
                  (opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setEstadoFiltro(opt)}
                      className={`px-3 py-1.5 text-xs rounded-lg ${
                        estadoFiltro === opt ? "bg-white shadow-sm border" : "text-gray-600"
                      }`}
                    >
                      {opt}
                    </button>
                  )
                )}
              </div>

              {/* Toggle columnas de atención */}
              <button
                type="button"
                onClick={() => setShowAtencionCol((v) => !v)}
                className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                title={showAtencionCol ? "Ocultar columnas de atención" : "Mostrar columnas de atención"}
              >
                {showAtencionCol ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showAtencionCol ? "Ocultar atención" : "Mostrar atención"}
              </button>
            </div>
          </header>

          {/* Contenedor con scroll horizontal local SIN expandir el layout */}
          <div className="max-w-full overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Placa</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Naturaleza</th>
                  <th className="px-4 py-3">Estado</th>

                  {/* columnas de atención con show/hide (sin cambiar min-width total) */}
                  <th className={`px-4 py-3 ${showAtencionCol ? "" : "hidden md:table-cell md:w-0"}`}>Fecha</th>
                  <th className={`px-4 py-3 ${showAtencionCol ? "" : "hidden md:table-cell md:w-0"}`}>KM</th>
                  <th className={`px-4 py-3 ${showAtencionCol ? "" : "hidden md:table-cell md:w-0"}`}>Costo</th>
                  <th className={`px-4 py-3 ${showAtencionCol ? "" : "hidden md:table-cell md:w-0"}`}>Notas</th>

                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {programacionesFiltradas.map((r: Programacion) => {
                  const v = vehiculos.find((x: Vehiculo) => x.id === r.vehiculo_id);
                  const mant = getMant(r);
                  const cumplida = !!mant;

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">{r.fecha}</td>
                      <td className="px-4 py-3">{r.placa || v?.placa || "—"}</td>
                      <td className="px-4 py-3">{r.tipo}</td>
                      <td className="px-4 py-3 capitalize">{r.naturaleza}</td>
                      <td className="px-4 py-3">
                        <StatusPill
                          nextDate={r.fecha}
                          override={
                            cumplida
                              ? { label: "Cumplido", cls: "bg-slate-200 text-slate-800 ring-slate-300" }
                              : undefined
                          }
                        />
                      </td>

                      {/* Atención: columnas normales, ocultables */}
                      <td className={`px-4 py-3 ${showAtencionCol ? "" : "hidden md:table-cell md:w-0"}`}>
                        {mant?.fecha ?? "—"}
                      </td>
                      <td className={`px-4 py-3 ${showAtencionCol ? "" : "hidden md:table-cell md:w-0"}`}>
                        {mant?.km ?? "—"}
                      </td>
                      <td className={`px-4 py-3 ${showAtencionCol ? "" : "hidden md:table-cell md:w-0"}`}>
                        {mant?.costo != null ? `S/ ${mant.costo}` : "—"}
                      </td>
                      <td className={`px-4 py-3 ${showAtencionCol ? "" : "hidden md:table-cell md:w-0"}`}>
                        {mant?.notas ?? "—"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {!cumplida && (
                            <button
                              type="button"
                              onClick={() => setOpenRegister({ open: true, prg: r })}
                              className="inline-flex items-center rounded-lg border p-1.5 text-xs hover:bg-gray-50"
                              title="Registrar atención"
                              aria-label="Registrar atención"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}

                          {/* Editar/Eliminar deshabilitados si ya está cumplido */}
                          <button
                            type="button"
                            onClick={() => !cumplida && onEditar(r)}
                            disabled={cumplida}
                            className={`inline-flex items-center rounded-lg border p-1.5 text-xs ${
                              cumplida ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"
                            }`}
                            title="Editar programación"
                            aria-label="Editar programación"
                          >
                            <PencilLine className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => !cumplida && onEliminar(r)}
                            disabled={cumplida}
                            className={`inline-flex items-center rounded-lg border p-1.5 text-xs ${
                              cumplida ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"
                            }`}
                            title="Eliminar programación"
                            aria-label="Eliminar programación"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {programacionesFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-sm text-gray-500">
                      No hay programaciones que coincidan con el filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* === Modales === */}
      <RegisterAttentionModal
        open={openRegister.open && !!openRegister.prg}
        onClose={() => setOpenRegister({ open: false, prg: null })}
        defaultDate={openRegister.prg?.fecha || todayYMD()}
        placa={openRegister.prg?.placa || "—"}
        tipo={openRegister.prg?.tipo || tipoFiltro}
        onSave={async (vals) => {
          if (!openRegister.prg) return;
          await registrarAtencion(openRegister.prg, vals);
        }}
      />

      <CreatePreventiveModal
        open={openCreatePreventivo}
        onClose={() => setOpenCreatePreventivo(false)}
        vehiculos={vehiculos}
        initialTipo={tipoFiltro}
        onCreate={handleCreatePreventivo}
      />

      <CreateCorrectiveModal
        open={openCreateCorrectivo}
        onClose={() => setOpenCreateCorrectivo(false)}
        vehiculos={vehiculos}
        defaultDate={selectedDay}
        onCreate={handleCreateCorrectivo}
      />

      <EditProgramacionModal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, prg: null })}
        programacion={editModal.prg}
        onSave={onGuardarEdicion}
      />
    </div>
  );
}
