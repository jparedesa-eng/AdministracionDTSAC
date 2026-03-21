import { useEffect, useState } from "react";
import { 
  Key, 
  Search, 
  MapPin, 
  User, 
  Clock, 
  ChevronRight, 
  AlertCircle,
  ArrowRightLeft,
  Car,
  LayoutGrid,
  Info
} from "lucide-react";
import { supabase } from "../../supabase/supabaseClient";
import { Modal } from "../../components/ui/Modal";

interface Solicitud {
  id: string;
  nombre: string;
  dni: string;
  origen: string;
  destino: string;
  estado: string;
  vehiculo: string;
  entrega_garita_at: string | null;
  termino_uso_garita_at: string | null;
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
  placa: string;
  vehiculoInfo?: Vehiculo;
  lastRecord?: Solicitud;
  inUse: boolean;
}

export default function BitacoraLlaves() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<KeyStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKey, setSelectedKey] = useState<KeyStatus | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: vehiculos, error: vError } = await supabase
        .from("vehiculos")
        .select("*")
        .neq("estado", "Inactivo");

      if (vError) throw vError;

      const { data: solicitudes, error: sError } = await supabase
        .from("solicitudes")
        .select("*")
        .in("estado", ["En uso", "Cerrada"])
        .order("created_at", { ascending: false });

      if (sError) throw sError;

      const latestMoves = new Map<string, Solicitud>();
      solicitudes?.forEach((s: Solicitud) => {
        if (!latestMoves.has(s.vehiculo)) {
          latestMoves.set(s.vehiculo, s);
        }
      });

      const processed: KeyStatus[] = (vehiculos || []).map((v: Vehiculo) => {
        const lastMove = latestMoves.get(v.placa);
        return {
          placa: v.placa,
          vehiculoInfo: v,
          lastRecord: lastMove,
          inUse: lastMove?.estado === "En uso"
        };
      });

      processed.sort((a, b) => a.placa.localeCompare(b.placa));
      setData(processed);
    } catch (error) {
      console.error("Error fetching bitácora data:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredData = data.filter(item => 
    item.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.lastRecord?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inUse = filteredData.filter(i => i.inUse);
  const available = filteredData.filter(i => !i.inUse);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Header Compacto */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600 rounded-lg text-white">
                <Key className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Bitácora de Llaves</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group flex-1 md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Buscar placa o conductor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all"
                />
              </div>
              <button 
                onClick={fetchData}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
              >
                <ArrowRightLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-500 text-sm font-medium">Actualizando...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Sección: En Uso */}
            <section>
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">En Uso ({inUse.length})</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {inUse.map(item => (
                   <button
                    key={item.placa}
                    onClick={() => setSelectedKey(item)}
                    className="group bg-white border border-amber-200 hover:border-amber-400 hover:shadow-md p-3 rounded-2xl transition-all flex flex-col items-center text-center relative overflow-hidden active:scale-95"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 opacity-50" />
                    <span className="text-sm font-black text-slate-800 tracking-tight">{item.placa}</span>
                    <span className="text-[10px] font-bold text-amber-600 mt-0.5 truncate w-full">{item.lastRecord?.nombre.split(' ')[0]}</span>
                  </button>
                ))}
                {inUse.length === 0 && (
                  <p className="col-span-full text-xs text-slate-400 font-medium py-4 text-center border-2 border-dashed border-slate-200 rounded-2xl">No hay unidades en uso actualmente.</p>
                )}
              </div>
            </section>

            {/* Sección: Disponibles */}
            <section>
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">En Garita ({available.length})</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {available.map(item => (
                   <button
                    key={item.placa}
                    onClick={() => setSelectedKey(item)}
                    className="group bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md p-3 rounded-2xl transition-all flex flex-col items-center justify-center active:scale-95"
                  >
                    <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors uppercase">{item.placa}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      <Modal
        open={!!selectedKey}
        onClose={() => setSelectedKey(null)}
        title={`Detalles de Unidad: ${selectedKey?.placa}`}
        size="sm"
      >
        {selectedKey && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
               <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-white shadow-sm ${selectedKey.inUse ? 'text-amber-600' : 'text-emerald-600'}`}>
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Estado</p>
                    <p className={`text-sm font-black ${selectedKey.inUse ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {selectedKey.inUse ? 'En Uso' : 'En Garita (Disponible)'}
                    </p>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Vehículo</p>
                  <p className="text-sm font-bold text-slate-700">{selectedKey.vehiculoInfo?.marca} {selectedKey.vehiculoInfo?.modelo}</p>
               </div>
            </div>

            {selectedKey.lastRecord ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Responsable</p>
                      <p className="text-base font-bold text-slate-800">{selectedKey.lastRecord.nombre}</p>
                      <p className="text-xs text-slate-500 font-medium">DNI: {selectedKey.lastRecord.dni}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 mt-1">
                      <MapPin className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Movimiento</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-bold text-slate-700">{selectedKey.lastRecord.origen}</span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        <span className="text-sm font-bold text-slate-700">{selectedKey.lastRecord.destino}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Registro:</span>
                      </div>
                      <span className="text-xs font-black text-slate-700">
                        {new Date(selectedKey.inUse ? selectedKey.lastRecord.entrega_garita_at! : selectedKey.lastRecord.termino_uso_garita_at!).toLocaleString()}
                      </span>
                    </div>
                    {!selectedKey.inUse && selectedKey.lastRecord.entrega_garita_at && (
                       <div className="flex items-center justify-between opacity-60">
                        <div className="flex items-center gap-2">
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Handover:</span>
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          {new Date(selectedKey.lastRecord.entrega_garita_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <AlertCircle className="w-6 h-6 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin registros de movimiento</p>
              </div>
            )}

            <button
               onClick={() => setSelectedKey(null)}
               className="w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all mt-4"
            >
              Cerrar
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
