import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { supabase } from "../../supabase/supabaseClient";
import * as XLSX from "xlsx";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import type { EstadoSolicitud } from "../../store/camionetasStore";

// Type definition for data retrieved from supabase
// Matches SolicitudRow loosely
type HistorialRow = {
  id: string;
  dni: string;
  nombre: string;
  ceco: string | null;
  origen: string;
  destino: string;
  motivo: string | null;
  uso_inicio: string;
  uso_fin: string;
  estado: EstadoSolicitud;
  vehiculo: string | null;
  recojo: string | null;
  created_at: string;
  entrega_garita_at: string | null;
  termino_uso_garita_at: string | null;
};

export default function HistorialSolicitudes() {
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  // Filters
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("Todos");
  const [q, setQ] = useState("");

  // Applied Filters
  const [appliedFechaInicio, setAppliedFechaInicio] = useState("");
  const [appliedFechaFin, setAppliedFechaFin] = useState("");
  const [appliedEstado, setAppliedEstado] = useState("Todos");

  const [rows, setRows] = useState<HistorialRow[]>([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState>(null);

  const PAGE_TOTAL_MIN = 1;
  const totalPages = rowsPerPage === 0 ? 1 : Math.max(PAGE_TOTAL_MIN, Math.ceil(total / rowsPerPage));
  const pageSafe = Math.min(page, totalPages);

  // Fetch logic with pagination
  const loadHistorial = useCallback(async () => {
    // DO NOT load if dates are not applied yet.
    if (!appliedFechaInicio || !appliedFechaFin) {
      setRows([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setErrMsg(null);
    try {
      let query = supabase
        .from("solicitudes")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (appliedFechaInicio) {
        query = query.gte("created_at", `${appliedFechaInicio}T00:00:00.000Z`);
      }
      if (appliedFechaFin) {
        query = query.lte("created_at", `${appliedFechaFin}T23:59:59.999Z`);
      }
      if (appliedEstado !== "Todos") {
        query = query.eq("estado", appliedEstado);
      }
      if (q.trim()) {
        const term = q.trim();
        query = query.or(
          `nombre.ilike.%${term}%,dni.ilike.%${term}%,origen.ilike.%${term}%,destino.ilike.%${term}%,vehiculo.ilike.%${term}%`
        );
      }

      if (rowsPerPage > 0) {
        const from = (page - 1) * rowsPerPage;
        const to = from + rowsPerPage - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setRows(data as HistorialRow[]);
      setTotal(count ?? 0);
    } catch (e: any) {
      const msg = e?.message || "Error al cargar historial";
      setErrMsg(msg);
      setToast({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }, [appliedFechaInicio, appliedFechaFin, appliedEstado, q, page, rowsPerPage]);

  const handleApplyFilters = () => {
    setAppliedFechaInicio(fechaInicio);
    setAppliedFechaFin(fechaFin);
    setAppliedEstado(estadoFilter);
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [q]);

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial]);

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      let query = supabase
        .from("solicitudes")
        .select(`
          id, dni, nombre, origen, destino, motivo, ceco,
          uso_inicio, uso_fin, estado, vehiculo, recojo, 
          created_at, creado_por_nombre, creado_por_area,
          entrega_garita_at, termino_uso_garita_at
        `)
        .order("created_at", { ascending: false });

      if (appliedFechaInicio) {
        query = query.gte("created_at", `${appliedFechaInicio}T00:00:00.000Z`);
      }
      if (appliedFechaFin) {
        query = query.lte("created_at", `${appliedFechaFin}T23:59:59.999Z`);
      }
      if (appliedEstado !== "Todos") {
        query = query.eq("estado", appliedEstado);
      }
      if (q.trim()) {
        const term = q.trim();
        query = query.or(
          `nombre.ilike.%${term}%,dni.ilike.%${term}%,origen.ilike.%${term}%,destino.ilike.%${term}%,vehiculo.ilike.%${term}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        setToast({ type: "warning", message: "No hay datos para exportar en este rango." });
        return;
      }

      const formatFecha = (iso: string | null) => {
        if (!iso) return "";
        return new Date(iso).toLocaleString("es-PE");
      };

      const excelData = data.map((item) => ({
        "DNI": item.dni,
        "NOMBRE": item.nombre,
        "CECO": item.ceco || "",
        "USO_INICIO": formatFecha(item.uso_inicio),
        "USO_FIN": formatFecha(item.uso_fin),
        "ENTREGA_GARITA_AT": formatFecha(item.entrega_garita_at),
        "TERMINO_USO_GARITA_AT": formatFecha(item.termino_uso_garita_at),
        "Origen": item.origen,
        "Destino": item.destino,
        "Motivo": item.motivo || "",
        "Fecha Solicitud": formatFecha(item.created_at),
        "Recojo Programado": formatFecha(item.recojo),
        "Placa Vehículo": item.vehiculo || "",
        "Estado": item.estado,
        "Creado por": item.creado_por_nombre || "",
        "Área Creador": item.creado_por_area || "",
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Historial Solicitudes");

      let filename = "Historial_Camionetas";
      if (fechaInicio || fechaFin) {
        filename += `_${fechaInicio || "inicio"}_al_${fechaFin || "fin"}`;
      }
      filename += ".xlsx";

      XLSX.writeFile(wb, filename);
      setToast({ type: "success", message: "Archivo Excel descargado correctamente." });
    } catch (e: any) {
      const msg = e?.message || "Error al exportar a Excel";
      setToast({ type: "error", message: msg });
    } finally {
      setExportLoading(false);
    }
  };

  const getStatusBadge = (estado: EstadoSolicitud) => {
    switch (estado) {
      case "Reservada":
      case "Asignada":
      case "En uso":
        return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800">{estado}</span>;
      case "Cerrada":
        return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800">{estado}</span>;
      case "Cancelado":
      case "Rechazada":
      case "Vencido":
        return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-100 text-rose-800">{estado}</span>;
      default:
        return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">{estado}</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-5">
      {/* Título */}
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight">Historial de Solicitudes</h1>
        <p className="mt-1 text-sm text-gray-600">
          Descarga y revisa el historial histórico de todas las solicitudes de camionetas.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500 ml-1">Desde</span>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                    <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="border-none bg-transparent text-sm outline-none text-gray-700 w-32"
                    />
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500 ml-1">Hasta</span>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                    <input
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        className="border-none bg-transparent text-sm outline-none text-gray-700 w-32"
                    />
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500 ml-1">Estado</span>
                <select
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-gray-700"
                >
                    <option value="Todos">Todos</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Asignada">Asignada</option>
                    <option value="Reservada">Reservada</option>
                    <option value="En uso">En uso</option>
                    <option value="Rechazada">Rechazada</option>
                    <option value="Cancelado">Cancelado</option>
                    <option value="Cerrada">Cerrada</option>
                    <option value="Vencido">Vencido</option>
                </select>
            </div>
            <button
                onClick={handleApplyFilters}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 w-10 h-10 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                title="Buscar solicitudes"
            >
                <Search className="h-5 w-5" />
            </button>
            <div className="relative ml-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar en resultados..."
                    className="w-full sm:w-64 rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors bg-white h-10"
                />
            </div>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={exportLoading || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span>Descargar Excel</span>
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Solicitante</th>
                <th className="px-4 py-3">Fechas Uso</th>
                <th className="px-4 py-3 hidden lg:table-cell">Garita Actividad</th>
                <th className="px-4 py-3">Ruta</th>
                <th className="px-4 py-3">Vehículo / Detalle</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando historial...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && (!appliedFechaInicio || !appliedFechaFin) && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="h-8 w-8 text-gray-300" />
                      <p>Seleccione un rango de fechas y presione buscar para ver el historial.</p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && (appliedFechaInicio && appliedFechaFin) && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                    {errMsg ?? "No se encontraron solicitudes con los filtros aplicados."}
                  </td>
                </tr>
              )}

              {!loading && (appliedFechaInicio && appliedFechaFin) &&
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3">
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-900 line-clamp-1">{row.nombre}</span>
                            <span className="text-xs text-gray-500">DNI: {row.dni}</span>
                        </div>
                    </td>
                    <td className="px-4 py-3">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-700 text-nowrap" title="Uso inicio">I: {formatDate(row.uso_inicio)}</span>
                            <span className="text-xs text-gray-700 text-nowrap" title="Uso fin">F: {formatDate(row.uso_fin)}</span>
                        </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-col">
                            <span className="text-xs text-emerald-700 text-nowrap" title="Entrega Garita">E: {row.entrega_garita_at ? formatDate(row.entrega_garita_at) : 'Pendiente'}</span>
                            <span className="text-xs text-rose-700 text-nowrap" title="Devolución Garita">D: {row.termino_uso_garita_at ? formatDate(row.termino_uso_garita_at) : 'Pendiente'}</span>
                        </div>
                    </td>
                    <td className="px-4 py-3">
                        <div className="flex flex-col">
                            <span className="font-semibold text-gray-800 line-clamp-1 truncate max-w-[150px]">{row.origen}</span>
                            <span className="text-xs text-gray-500 line-clamp-1 truncate max-w-[150px]">{row.destino}</span>
                        </div>
                    </td>
                    <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                            <span className="font-bold text-gray-900 leading-none">{row.vehiculo || <span className="text-gray-400 font-normal italic">Sin asignar</span>}</span>
                            <span className="text-[11px] text-gray-500 leading-none">CECO: {row.ceco || "-"}</span>
                        </div>
                    </td>
                    <td className="px-4 py-3">
                        {getStatusBadge(row.estado)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Paginación - Telefonia Style (Idéntico a Inventario) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium uppercase">Filas:</span>
            <select
              className="rounded border-none text-gray-500 py-1 pl-2 pr-6 text-sm focus:ring-0 bg-transparent cursor-pointer hover:text-gray-700"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={pageSafe === 1 || loading}
              className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Primera Página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe === 1 || loading}
              className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Página Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-xs font-medium px-4 text-gray-400">
              {pageSafe} / {Math.max(PAGE_TOTAL_MIN, totalPages)}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe === totalPages || loading}
              className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Página Siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={pageSafe === totalPages || loading}
              className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Última Página"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {toast && (
        <Toast
          toast={toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
