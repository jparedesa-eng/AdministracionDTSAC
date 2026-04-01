import React, { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { addMMPPUbicacion } from '../../store/monitoreoMMPPStore';
import { useAuth } from '../../auth/AuthContext';

interface UbicacionModalProps {
    isOpen: boolean;
    onClose: () => void;
    recordId: string | null;
    onShowToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const UbicacionModal: React.FC<UbicacionModalProps> = ({ isOpen, onClose, recordId, onShowToast }) => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [ubicacion, setUbicacion] = useState('');
    const [timestamp, setTimestamp] = useState('');

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            setTimestamp(localIso);
            setUbicacion('');
        }
    }, [isOpen]);

    if (!isOpen || !recordId) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ubicacion.trim() || !timestamp) return;

        setLoading(true);
        try {
            // Pasamos el timestamp manualmente
            await addMMPPUbicacion(recordId, ubicacion.toUpperCase(), profile?.id || '', timestamp);
            setUbicacion('');
            onShowToast('success', 'Ubicación registrada exitosamente.');
            onClose();
        } catch (error) {
            console.error("Error adding location:", error);
            onShowToast('error', 'Error al registrar ubicación.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-300">
                <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-slate-50">
                    <h2 className="text-lg font-semibold text-slate-800 uppercase tracking-tight">Reportar Ubicación</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors border border-transparent hover:border-gray-300 text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5">
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-2 tracking-wide">Fecha y Hora de Reporte</label>
                            <input 
                                type="datetime-local" 
                                value={timestamp}
                                onChange={(e) => setTimestamp(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none font-semibold text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-2 tracking-wide">Punto de Control / Ubicación Actual</label>
                            <textarea 
                                value={ubicacion}
                                onChange={(e) => setUbicacion(e.target.value)}
                                placeholder="Ej: PEAJE VIRU, DESVIO CHIMBOTE, etc."
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none uppercase min-h-[100px] resize-none font-semibold text-sm"
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-5 border-t border-gray-100">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-5 py-2 text-slate-500 font-semibold text-[10px] uppercase tracking-widest hover:bg-gray-100 rounded-lg border border-transparent hover:border-gray-200 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={loading || !ubicacion.trim() || !timestamp}
                            className="flex items-center gap-2 px-6 py-2 bg-[#ff0000] text-white font-semibold text-[10px] uppercase tracking-widest rounded-lg hover:bg-[#cc0000] border border-red-600 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Registrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
