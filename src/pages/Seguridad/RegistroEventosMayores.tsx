
import { useState, useEffect } from "react";
import { Plus, TriangleAlert, Calendar } from "lucide-react";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { Modal } from "../../components/ui/Modal";
import { getEventosState, subscribeEventos, upsertEvento } from "../../store/eventosMayoresStore";

export default function RegistroEventosMayores() {
    const [, setVersion] = useState(0);

    useEffect(() => {
        return subscribeEventos(() => setVersion(prev => prev + 1));
    }, []);

    const { eventos } = getEventosState();
    const [toast, setToast] = useState<ToastState>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        fecha_hora: "",
        tipo_evento: "",
        descripcion: "",
        impacto: "PARCIAL",
    });

    const handleAdd = async () => {
        if (!formData.tipo_evento || !formData.fecha_hora) return;
        try {
            await upsertEvento({
                ...formData,
                estado: "REGISTRADO"
            });
            setToast({ type: "success", message: "Evento registrado." });
            setModalOpen(false);
            setFormData({ fecha_hora: "", tipo_evento: "", descripcion: "", impacto: "PARCIAL" });
        } catch (error: any) {
            setToast({ type: "error", message: error.message || "Error." });
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="flex items-center justify-between gap-4 px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Registro de Eventos Mayores
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Bitácora de incidentes críticos del sistema (Caídas, Cortes de Energía, etc.)
                    </p>
                </div>
                <button
                    onClick={() => {
                        // Set default date to now formatted for datetime-local
                        const now = new Date();
                        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                        const defaultDate = now.toISOString().slice(0, 16);
                        setFormData({ ...formData, fecha_hora: defaultDate });
                        setModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-[#ff0000] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Registrar Evento
                </button>
            </div>

            <div className="grid gap-4">
                {eventos.map(e => (
                    <div key={e.id} className="bg-white p-5 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <div className={`p-3 rounded-full shrink-0 ${e.impacto === 'TOTAL' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                            <TriangleAlert className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-gray-900">{e.tipo_evento}</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${e.impacto === 'TOTAL' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>
                                    Impacto {e.impacto}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600">{e.descripcion}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(e.fecha_hora).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
                {eventos.length === 0 && (
                    <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        No hay eventos mayores registrados.
                    </div>
                )}
            </div>

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Evento Mayor" size="md">
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora</label>
                        <input
                            type="datetime-local"
                            className="w-full h-11 rounded-lg border px-3"
                            value={formData.fecha_hora}
                            onChange={e => setFormData({ ...formData, fecha_hora: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Evento</label>
                        <select
                            className="w-full h-11 rounded-lg border px-3"
                            value={formData.tipo_evento}
                            onChange={e => setFormData({ ...formData, tipo_evento: e.target.value })}
                        >
                            <option value="">-- Seleccionar --</option>
                            <option value="CAIDA DEL SERVIDOR">CAIDA DEL SERVIDOR</option>
                            <option value="CORTE DE LUZ PROGRAMADO">CORTE DE LUZ PROGRAMADO</option>
                            <option value="CORTE DE LUZ NO PROGRAMADO">CORTE DE LUZ NO PROGRAMADO</option>
                            <option value="FALLA DE ENLACE DE DATOS">FALLA DE ENLACE DE DATOS</option>
                            <option value="OTRO">OTRO</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Impacto</label>
                        <select
                            className="w-full h-11 rounded-lg border px-3"
                            value={formData.impacto}
                            onChange={e => setFormData({ ...formData, impacto: e.target.value })}
                        >
                            <option value="PARCIAL">PARCIAL (Afecta algunos servicios)</option>
                            <option value="TOTAL">TOTAL (Caída completa)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <textarea
                            className="w-full h-24 rounded-lg border p-3 resize-none"
                            placeholder="Detalles adicionales del evento..."
                            value={formData.descripcion}
                            onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
                        <button onClick={handleAdd} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg">Registrar</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
