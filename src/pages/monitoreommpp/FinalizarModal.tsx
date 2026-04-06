import React, { useState, useEffect } from 'react';
import { Loader2, Flag } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { updateMMPPRecord } from '../../store/monitoreoMMPPStore';
import type { MMPPRecord } from '../../store/monitoreoMMPPStore';

interface FinalizarModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: MMPPRecord | null;
    onShowToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const FinalizarModal: React.FC<FinalizarModalProps> = ({ isOpen, onClose, record, onShowToast }) => {
    const [loading, setLoading] = useState(false);
    const [timestamp, setTimestamp] = useState('');

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            setTimestamp(localIso);
        }
    }, [isOpen]);

    if (!isOpen || !record) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!timestamp || !record) return;

        const now = new Date();
        const nowLocalIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        const originLocalIso = record.fecha_hora_origen.replace(' ', 'T').slice(0, 16);

        if (timestamp > nowLocalIso) {
            onShowToast('error', 'La fecha y hora de llegada no puede ser futura.');
            return;
        }

        if (timestamp < originLocalIso) {
            onShowToast('error', 'La fecha de llegada no puede ser anterior a la de origen.');
            return;
        }

        setLoading(true);
        try {
            // Generar un Date completo desde el input
            const end = new Date(timestamp).getTime();
            const start = new Date(record.fecha_hora_origen).getTime();
            
            const diffMs = end - start;
            
            // Si la fecha final es anterior a la fecha de inicio, es un error lógico pero el usuario manda.
            // Aún así, calcularemos los números en absoluto o manejaremos negativos.
            const absDiffMs = Math.abs(diffMs);
            const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
            const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));
            const tiempo_recorridoStr = `${diffMs < 0 ? '-' : ''}${hours}h ${minutes}m`;

            // Para la BD enviamos la cadena del input directamente para evitar conversiones a UTC (+5h)
            const endIsoString = timestamp;

            await updateMMPPRecord(record.id, {
                estado: 'FINALIZADO',
                fecha_hora_llegada: endIsoString,
                fin_monitoreo: endIsoString,
                tiempo_recorrido: tiempo_recorridoStr
            });

            onShowToast('success', `Se ha finalizado el viaje de la unidad ${record.placa}.`);
            onClose();
        } catch (error) {
            console.error("Error finalizando el viaje:", error);
            onShowToast('error', 'Error al finalizar el viaje. Verifica tu conexión.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={isOpen && !!record}
            onClose={onClose}
            title="Finalizar Viaje"
            size="sm"
        >
            <form onSubmit={handleSubmit} className="space-y-6 pb-2">
                <div>
                    <p className="text-xs text-slate-500 font-semibold mb-4 leading-relaxed">
                        Confirma o edita la fecha y hora final de llegada exacta.
                    </p>
                    
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wide">
                        Fecha y Hora de Llegada
                    </label>
                    <input 
                        type="datetime-local" 
                        value={timestamp}
                        min={record.fecha_hora_origen.replace(' ', 'T').slice(0, 16)}
                        max={new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16)}
                        onChange={(e) => setTimestamp(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/10 focus:border-green-500 outline-none font-semibold text-sm"
                        required
                    />
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-gray-100 -mx-6 px-6 -mb-6 pb-6 bg-gray-50/50 rounded-b-2xl mt-4">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-5 py-2 text-slate-500 font-semibold text-[10px] uppercase tracking-widest hover:bg-gray-100 rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        disabled={loading || !timestamp}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-green-700 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                        Guardar Fin
                    </button>
                </div>
            </form>
        </Modal>
    );
};
