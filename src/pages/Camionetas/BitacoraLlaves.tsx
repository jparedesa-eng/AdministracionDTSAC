import { useEffect, useState, useCallback } from "react";
import {
  Key,
  Search,
  User,
  LayoutGrid,
  Download
} from "lucide-react";
import { supabase } from "../../supabase/supabaseClient";
import * as XLSX from "xlsx";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";

interface BitacoraRegistro {
  id: string;
  vehiculo_id: string;
  conductor_id: string | null;
  tipo_evento: "ENTRADA" | "SALIDA";
  fecha_hora: string;
  conductor_nombre: string | null;
  conductor_dni: string | null;
  usuario_nombre: string | null;
  vehiculo_placa: string;
  observacion: string | null;
  created_at: string;
}

interface Vehiculo {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  estado: string;
}

interface KeyStatus {
  id: string; // ID del vehículo
  placa: string;
  vehiculoInfo?: Vehiculo;
  lastRecord?: BitacoraRegistro;
  inUse: boolean;
}

export default function BitacoraLlaves() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<KeyStatus[]>([]);
  const [selectedKey, setSelectedKey] = useState<KeyStatus | null>(null);

  // Historial State
  const [historyRows, setHistoryRows] = useState<BitacoraRegistro[]>([]);
  const [hLoading, setHLoading] = useState(false);
  const [hFechaInicio, setHFechaInicio] = useState("");
  const [hFechaFin, setHFechaFin] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    fetchData();
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setHFechaInicio(lastWeek);
    setHFechaFin(today);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Obtener los últimos eventos de la bitácora (últimos 3000 registros para cubrir toda la flota activa)
      const { data: bitacora, error: bError } = await supabase
        .from("bitacora_llaves")
        .select("*")
        .order("fecha_hora", { ascending: false })
        .limit(3000);

      if (bError) throw bError;

      // 2. Mapear el último registro por ID de vehículo
      const latestMovesMap = new Map<string, BitacoraRegistro>();
      bitacora?.forEach((b: BitacoraRegistro) => {
        if (b.vehiculo_id && !latestMovesMap.has(b.vehiculo_id)) {
          latestMovesMap.set(b.vehiculo_id, b);
        }
      });

      // 3. Obtener información de vehículos para enriquecer (solo los que están en la bitácora)
      const vehicleIds = Array.from(latestMovesMap.keys());
      if (vehicleIds.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const { data: vehiculos, error: vError } = await supabase
        .from("vehiculos")
        .select("*")
        .in("id", vehicleIds);

      if (vError) throw vError;

      const vehiclesMap = new Map<string, Vehiculo>();
      vehiculos?.forEach((v: Vehiculo) => {
        vehiclesMap.set(v.id, v);
      });

      // 4. Procesar datos finales basándonos ÚNICAMENTE en lo que hay en la bitácora
      const processed: KeyStatus[] = Array.from(latestMovesMap.values()).map((lastMove) => {
        const vInfo = vehiclesMap.get(lastMove.vehiculo_id);
        return {
          id: lastMove.vehiculo_id,
          placa: lastMove.vehiculo_placa || vInfo?.placa || "S/N",
          vehiculoInfo: vInfo,
          lastRecord: lastMove,
          inUse: lastMove.tipo_evento === "SALIDA"
        };
      });

      processed.sort((a, b) => a.placa.localeCompare(b.placa));
      setData(processed);

      if (processed.length > 0 && !selectedKey) {
        setSelectedKey(processed[0]);
      }
    } catch (error) {
      console.error("Error fetching bitácora data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = useCallback(async () => {
    if (!selectedKey || !hFechaInicio || !hFechaFin) return;
    setHLoading(true);
    try {
      const { data, error } = await supabase
        .from("bitacora_llaves")
        .select("*")
        .eq("vehiculo_id", selectedKey.id)
        .gte("fecha_hora", `${hFechaInicio} 00:00:00`)
        .lte("fecha_hora", `${hFechaFin} 23:59:59`)
        .order("fecha_hora", { ascending: false });

      if (error) throw error;
      setHistoryRows(data as BitacoraRegistro[]);
    } catch (e: any) {
      setToast({ type: "error", message: e.message });
    } finally {
      setHLoading(false);
    }
  }, [selectedKey?.id, hFechaInicio, hFechaFin]);

  // Al cambiar la llave seleccionada, limpiamos el historial anterior para que empiece vacío
  useEffect(() => {
    setHistoryRows([]);
  }, [selectedKey?.id]);

  const handleExport = () => {
    if (historyRows.length === 0 || !selectedKey) return;

    const excelData = historyRows.map(r => ({
      "FECHA": r.fecha_hora?.split(' ')[0],
      "HORA": r.fecha_hora?.split(' ')[1],
      "EVENTO": r.tipo_evento,
      "CONDUCTOR": r.conductor_nombre,
      "DNI": r.conductor_dni,
      "USUARIO": r.usuario_nombre,
      "OBSERVACION": r.observacion
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");
    XLSX.writeFile(wb, `Historial_${selectedKey.placa}.xlsx`);
    setToast({ type: "success", message: "Excel descargado" });
  };

  const inUse = data.filter(i => i.inUse);
  const available = data.filter(i => !i.inUse);

  return (
    <div className="flex h-[calc(100vh-130px)] bg-slate-50 -m-8 overflow-hidden font-sans">
      {/* AREA PRINCIPAL (IZQUIERDA): Grilla de Unidades */}
      <div className="flex-1 flex flex-col h-full border-r border-slate-200 bg-white">
        <header className="border-b border-slate-200 p-8">
          <div className="px-1 flex items-center gap-4">
            <div className="p-3 bg-red-600 rounded-xl text-white shadow-lg shadow-red-100">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 line-clamp-1">Bitácora de Llaves</h1>
              <p className="mt-1 text-sm text-slate-500 line-clamp-1">Control de salida e ingreso de unidades en garita.</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-12 bg-slate-50/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-4 border-slate-100 border-t-red-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Sección En Uso */}
              <section>
                <div className="flex items-center gap-2 mb-6 px-1">
                  <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: '#ff0000' }} />
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">En Uso ({inUse.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {inUse.map(item => (
                    <button
                      key={item.placa}
                      onClick={() => setSelectedKey(item)}
                      className={`p-5 rounded-2xl text-left transition-all border flex flex-col gap-4 relative overflow-hidden group ${selectedKey?.placa === item.placa
                        ? "border-transparent text-white shadow-xl"
                        : "bg-white border-slate-300 text-slate-700 hover:border-red-400 hover:shadow-md"
                        }`}
                      style={selectedKey?.placa === item.placa ? { backgroundColor: '#ff0000' } : {}}
                    >
                      <div className="flex items-center justify-between w-full relative z-10">
                        <div className="flex items-center gap-3">
                          <Key className={`w-5 h-5 ${selectedKey?.placa === item.placa ? "text-white" : "text-red-500"}`} />
                          <div>
                            <p className={`text-2xl font-black tracking-tight leading-none ${selectedKey?.placa === item.placa ? "text-white" : "text-slate-900"}`}>{item.placa}</p>
                            <p className={`text-[10px] font-bold mt-1.5 uppercase tracking-wider ${selectedKey?.placa === item.placa ? "text-white/80" : "text-slate-500"}`}>
                              {(() => {
                                if (!item.lastRecord?.fecha_hora) return "";
                                const d = new Date(item.lastRecord.fecha_hora);
                                const day = d.getDate().toString().padStart(2, '0');
                                const month = (d.getMonth() + 1).toString().padStart(2, '0');
                                const hours = d.getHours() % 12 || 12;
                                const minutes = d.getMinutes().toString().padStart(2, '0');
                                const ampm = d.getHours() >= 12 ? 'pm' : 'am';
                                return `${day}/${month} • ${hours}:${minutes} ${ampm}`;
                              })()}
                            </p>
                          </div>
                        </div>
                        <User className={`w-4 h-4 ${selectedKey?.placa === item.placa ? "text-white/60" : "text-slate-300"}`} />
                      </div>
                      <div className="mt-auto relative z-10">
                        <p className={`text-xs font-bold uppercase truncate tracking-wide ${selectedKey?.placa === item.placa ? "text-white" : "text-slate-800"}`}>
                          {item.lastRecord?.conductor_nombre || "Sin Conductor"}
                        </p>
                      </div>
                    </button>
                  ))}
                  {inUse.length === 0 && <p className="col-span-full text-xs text-slate-400 italic py-4">No hay unidades en uso.</p>}
                </div>
              </section>

              {/* Sección Disponibles */}
              <section>
                <div className="flex items-center gap-2 mb-6 px-1">
                  <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">Disponibles ({available.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {available.map(item => (
                    <button
                      key={item.placa}
                      onClick={() => setSelectedKey(item)}
                      className={`p-5 rounded-2xl text-left transition-all border flex flex-col gap-4 relative overflow-hidden group ${selectedKey?.placa === item.placa
                        ? "bg-slate-900 border-transparent text-white shadow-xl"
                        : "bg-white border-slate-300 text-slate-700 hover:border-emerald-500 hover:shadow-md"
                        }`}
                    >
                      <div className="flex items-center justify-between w-full relative z-10">
                        <div className="flex items-center gap-3">
                          <Key className={`w-5 h-5 ${selectedKey?.placa === item.placa ? "text-white" : "text-emerald-500"}`} />
                          <div>
                            <p className={`text-2xl font-black tracking-tight leading-none ${selectedKey?.placa === item.placa ? "text-white" : "text-slate-900"}`}>{item.placa}</p>
                            <p className={`text-[10px] font-bold mt-1.5 uppercase tracking-wider ${selectedKey?.placa === item.placa ? "text-white/60" : "text-slate-500"}`}>
                              En Garita
                            </p>
                          </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${selectedKey?.placa === item.placa ? "bg-emerald-400 scale-125" : "bg-emerald-500 group-hover:scale-110"}`} />
                      </div>
                    </button>
                  ))}
                  {available.length === 0 && <p className="col-span-full text-xs text-slate-400 italic py-4">No hay unidades disponibles.</p>}
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      {/* SIDEBAR DERECHO: Detalle e Historial (Flat Style) */}
      <aside className="w-full lg:w-[400px] border-l border-slate-200 bg-white flex flex-col h-full">
        {!selectedKey ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-30">
            <LayoutGrid className="w-12 h-12 mb-4" />
            <p className="text-xs font-bold uppercase tracking-[0.2em]">Selecciona Unidad</p>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Header Detalle */}
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{selectedKey.placa}</h2>
                  <p className="text-sm font-bold text-slate-400 mt-1 capitalize">{selectedKey.vehiculoInfo?.marca} {selectedKey.vehiculoInfo?.modelo}</p>
                  <p className="text-[9px] font-black text-slate-300 mt-1 uppercase tracking-widest bg-slate-100/50 px-2 py-0.5 rounded-full inline-block">
                    {(() => {
                      if (!selectedKey.lastRecord?.fecha_hora) return "";
                      const d = new Date(selectedKey.lastRecord.fecha_hora);
                      const day = d.getDate().toString().padStart(2, '0');
                      const month = (d.getMonth() + 1).toString().padStart(2, '0');
                      const year = d.getFullYear();
                      const hours = d.getHours() % 12 || 12;
                      const minutes = d.getMinutes().toString().padStart(2, '0');
                      const ampm = d.getHours() >= 12 ? 'pm' : 'am';
                      return `${day}-${month}-${year} | ${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
                    })()}
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${selectedKey.inUse ? "text-white border-transparent ring-2 ring-red-500/20" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    }`}
                  style={selectedKey.inUse ? { backgroundColor: '#ff0000' } : {}}
                >
                  {selectedKey.inUse ? "EN USO" : "GARITA"}
                </div>
              </div>

              {selectedKey.lastRecord && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-bold text-slate-700">{selectedKey.lastRecord.conductor_nombre}</p>
                  </div>
                  <div className="text-xs font-bold text-slate-600 italic px-1 translate-y-[-4px]">
                    {selectedKey.lastRecord.observacion || "Sin observación hoy"}
                  </div>
                </div>
              )}
            </div>

            {/* Historial (Card Row Style) */}
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Historial de Unidad</h3>
                <button
                  onClick={handleExport}
                  style={{ backgroundColor: '#ff0000' }}
                  className="p-2 text-white rounded-lg shadow-lg shadow-red-100 hover:brightness-110 transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">Desde</label>
                    <input type="date" value={hFechaInicio} onChange={(e) => setHFechaInicio(e.target.value)} className="w-full text-[11px] font-bold bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">Hasta</label>
                    <input type="date" value={hFechaFin} onChange={(e) => setHFechaFin(e.target.value)} className="w-full text-[11px] font-bold bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none" />
                  </div>
                </div>
                <button
                  onClick={loadHistory}
                  style={{ backgroundColor: '#ff0000' }}
                  className="p-2.5 text-white rounded-lg shadow-lg shadow-red-100 hover:brightness-110 transition-all active:scale-95"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {hLoading ? (
                  <div className="py-10 flex justify-center"><div className="w-4 h-4 border-2 border-slate-100 border-t-slate-900 rounded-full animate-spin" /></div>
                ) : historyRows.length === 0 ? (
                  <p className="text-[10px] text-center text-slate-400 font-bold uppercase py-10">Sin registros</p>
                ) : historyRows.map(row => (
                  <div key={row.id} className="p-4 border border-slate-100 rounded-xl space-y-2 hover:border-slate-300 transition-colors text-slate-900">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-[10px] font-bold text-slate-400">
                        {(() => {
                          if (!row.fecha_hora) return "";
                          const d = new Date(row.fecha_hora);
                          const day = d.getDate().toString().padStart(2, '0');
                          const month = (d.getMonth() + 1).toString().padStart(2, '0');
                          const year = d.getFullYear();
                          let hours = d.getHours();
                          const minutes = d.getMinutes().toString().padStart(2, '0');
                          const ampm = hours >= 12 ? 'pm' : 'am';
                          hours = hours % 12 || 12;
                          return `${day}-${month}-${year} | ${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
                        })()}
                      </span>
                      <span className={`text-[8px] font-black uppercase ${row.tipo_evento === "SALIDA" ? "text-amber-600" : "text-emerald-500"}`}>{row.tipo_evento}</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-700 truncate">{row.conductor_nombre || 'Sin Conductor'}</p>
                    <p className="text-[9px] font-bold text-slate-400 italic leading-snug line-clamp-2">
                      {row.observacion}
                    </p>
                  </div>
                ))}
              </div>
            </div>


          </div>
        )}
      </aside>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
