import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Checkpoint, CheckpointStatus } from '../../store/reportePuestoStore';
import {
    Clock,
    Plus,
    Search,
    FileDown,
    CalendarDays,
    ChevronRight,
    RotateCcw,
    ShieldAlert,
    X,
    MapPin,
    Settings,
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    MessageSquare,
    Shield,
    Info,
    Activity,
    UserPlus,
    Trash2
} from 'lucide-react';
import { getSedesState, subscribeSedes } from '../../store/sedesStore';
import { getPuestosState, subscribePuestos } from '../../store/puestosStore';
import { getAgentesState, subscribeAgentes } from '../../store/agentesStore';
import {
    getReportePuestoState,
    subscribeReportes,
    fetchSchedulesByDate,
    createSchedule,
    deleteSchedule,
    updateCheckpoint,
    updateSchedule
} from '../../store/reportePuestoStore';
import { Modal } from '../../components/ui/Modal';

const DAYS_OF_WEEK = [
    { label: 'Lun', value: 1 },
    { label: 'Mar', value: 2 },
    { label: 'Mié', value: 3 },
    { label: 'Jue', value: 4 },
    { label: 'Vie', value: 5 },
    { label: 'Sáb', value: 6 },
    { label: 'Dom', value: 0 },
];

const GODS = ['ZEUS', 'HERA', 'APOLO', 'ARES', 'ATENEA', 'HADES', 'POSEIDON', 'HERMES', 'AFRODITA', 'HEFESTO', 'ODIN', 'THOR', 'RA', 'ANUBIS', 'CRONOS', 'OSIRIS', 'ISIS', 'LOKI', 'FREYA'];
const COLORS = ['ROJO', 'AZUL', 'VERDE', 'BLANCO', 'NEGRO', 'GRIS', 'ORO', 'PLATA', 'MORADO', 'CELESTE', 'AMARILLO', 'NARANJA', 'ROSADO', 'MARRON'];

const toLocalISODate = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const adjusted = new Date(date.getTime() - (offset * 60 * 1000));
    return adjusted.toISOString().split('T')[0];
};

export const ReportingManager: React.FC = () => {
    // --- Store Integration ---
    const [, setSedesVersion] = useState(0);
    const [, setPuestosVersion] = useState(0);
    const [, setAgentesVersion] = useState(0);
    const [, setReporteVersion] = useState(0);

    // Initial Date View - Use Local Date
    const [viewDate, setViewDate] = useState(toLocalISODate(new Date()));

    useEffect(() => {
        const unsubSedes = subscribeSedes(() => setSedesVersion(prev => prev + 1));
        const unsubPuestos = subscribePuestos(() => setPuestosVersion(prev => prev + 1));
        const unsubAgentes = subscribeAgentes(() => setAgentesVersion(prev => prev + 1));
        const unsubReporte = subscribeReportes(() => setReporteVersion(prev => prev + 1));

        // Initial Fetch
        fetchSchedulesByDate(viewDate);

        return () => {
            unsubSedes();
            unsubPuestos();
            unsubAgentes();
            unsubReporte();
        };
    }, []);

    // Re-fetch when date changes
    useEffect(() => {
        fetchSchedulesByDate(viewDate);
    }, [viewDate]);

    const { sedes } = getSedesState();
    const { puestos } = getPuestosState();
    const { agentes } = getAgentesState();
    // Alias 'agentes' to 'agents' to match existing search logic if needed, or update search logic
    const agents = agentes;
    const { schedules: storeSchedules } = getReportePuestoState();

    // Sync store schedules to parent state (for compatibility if needed, or replace local entirely)
    // For now we will use storeSchedules primarily
    const schedules = storeSchedules;
    // -------------------------

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const [activeIntervention, setActiveIntervention] = useState<{ scheduleId: string, checkpoint: Checkpoint } | null>(null);
    const [interventionComment, setInterventionComment] = useState('');

    const [assignmentModal, setAssignmentModal] = useState<{ isOpen: boolean, scheduleId: string | null }>({ isOpen: false, scheduleId: null });
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, scheduleId: string | null }>({ isOpen: false, scheduleId: null });
    const [selectedAgentId, setSelectedAgentId] = useState('');

    const [newSchedule, setNewSchedule] = useState({
        postId: '',
        startTime: '08:00',
        endTime: '20:00',
        frequency: 60,
        selectedDays: [new Date().getDay()] as number[]
    });

    const [selectedSiteForNewShift, setSelectedSiteForNewShift] = useState('');

    // Filter Sedes to only show those that have active Puestos
    const availableSedes = useMemo(() => {
        const activeSedeIds = new Set(puestos.filter(p => p.activo).map(p => p.sede_id));
        return sedes.filter(s => activeSedeIds.has(s.id));
    }, [puestos, sedes]);

    const filteredPosts = useMemo(() => {
        if (!selectedSiteForNewShift) return [];
        return puestos.filter(p => p.sede_id === selectedSiteForNewShift && p.activo);
    }, [puestos, selectedSiteForNewShift]);

    // --- NOC ENGINE LOGIC (TRANSFERRED FROM APP.TSX) ---
    const distressSeenRef = useRef<Set<string>>(new Set());
    const missedSeenRef = useRef<Set<string>>(new Set());

    const playSOSAlarm = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const playTone = (freq: number, startTime: number, duration: number) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0.3, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };
            for (let i = 0; i < 4; i++) {
                playTone(980, audioCtx.currentTime + (i * 0.4), 0.15);
                playTone(780, audioCtx.currentTime + (i * 0.4) + 0.2, 0.15);
            }
        } catch (e) { console.warn("Audio bloqueado"); }
    };

    const playMissedAlarm = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const playTone = (freq: number, startTime: number, duration: number) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0.2, startTime);
                gain.gain.linearRampToValueAtTime(0, startTime + duration);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };
            for (let i = 0; i < 2; i++) {
                playTone(440, audioCtx.currentTime + (i * 1.0), 0.5);
            }
        } catch (e) { console.warn("Audio bloqueado"); }
    };

    useEffect(() => {
        let sosDetected = false;
        let missedDetected = false;

        schedules.forEach(s => {
            s.checkpoints.forEach(cp => {
                if (cp.isDistress && !distressSeenRef.current.has(cp.id)) {
                    sosDetected = true;
                    distressSeenRef.current.add(cp.id);
                }
                if (cp.status === 'MISSED' && !missedSeenRef.current.has(cp.id)) {
                    missedDetected = true;
                    missedSeenRef.current.add(cp.id);
                }
            });
        });

        if (sosDetected) playSOSAlarm();
        else if (missedDetected) playMissedAlarm();
    }, [schedules]);

    useEffect(() => {
        const interval = setInterval(() => {
            // Refresh data every minute to catch updates from other users or auto-miss logic if implemented securely
            // For now we rely on manual refresh or just re-fetching occasionally
            fetchSchedulesByDate(viewDate);
        }, 30000);
        return () => clearInterval(interval);
    }, [viewDate]);
    // --- END NOC ENGINE LOGIC ---

    const generateIndicator = () => {
        const god = GODS[Math.floor(Math.random() * GODS.length)];
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        return `${god} ${color}`;
    };

    const handleSaveSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        const post = puestos.find(p => p.id === newSchedule.postId);
        if (!post) {
            setIsSubmitting(false);
            return;
        }
        const sede = sedes.find(s => s.id === post.sede_id);

        const startParts = newSchedule.startTime.split(':').map(Number);
        const endParts = newSchedule.endTime.split(':').map(Number);
        let startTotal = startParts[0] * 60 + startParts[1];
        let endTotal = endParts[0] * 60 + endParts[1];

        if (endTotal <= startTotal) endTotal += 1440;

        const durationMin = endTotal - startTotal;
        if (durationMin > 720) {
            alert("ERROR: El turno excede las 12 horas permitidas (" + (durationMin / 60).toFixed(1) + "h).");
            setIsSubmitting(false);
            return;
        }

        try {
            const today = new Date();
            // Process sequentially to ensure order (or parallel if independent)
            for (const dayValue of newSchedule.selectedDays) {
                const d = new Date(today);
                const diff = dayValue - d.getDay();
                d.setDate(d.getDate() + (diff < 0 ? diff + 7 : diff));
                const dateStr = toLocalISODate(d);

                const checkpointsList: any[] = [];
                let current = new Date(`${dateStr}T${newSchedule.startTime}`);
                let end = new Date(`${dateStr}T${newSchedule.endTime}`);
                if (end <= current) end.setDate(end.getDate() + 1);

                while (current <= end) {
                    checkpointsList.push({
                        scheduled_time: current.toTimeString().substring(0, 5),
                        status: 'PENDING',
                        is_distress: false,
                        manual_override: false
                    });
                    current.setMinutes(current.getMinutes() + newSchedule.frequency);
                }

                await createSchedule({
                    post_id: post.id,
                    agent_id: null,
                    site_name: sede ? sede.nombre : 'Unknown',
                    post_name: post.nombre,
                    date: dateStr,
                    start_time: newSchedule.startTime,
                    end_time: newSchedule.endTime,
                    frequency_minutes: newSchedule.frequency,
                    daily_indicator: generateIndicator()
                }, checkpointsList);
            }
            // Refresh currently viewed date
            await fetchSchedulesByDate(viewDate);
            setIsModalOpen(false);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSchedule = (id: string) => {
        setDeleteModal({ isOpen: true, scheduleId: id });
    };

    const confirmDeleteSchedule = async () => {
        if (!deleteModal.scheduleId) return;
        try {
            await deleteSchedule(deleteModal.scheduleId, viewDate);
            setDeleteModal({ isOpen: false, scheduleId: null });
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleAssignAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignmentModal.scheduleId || !selectedAgentId) return;

        try {
            await updateSchedule(assignmentModal.scheduleId, viewDate, { agent_id: selectedAgentId });
            setAssignmentModal({ isOpen: false, scheduleId: null });
            setSelectedAgentId('');
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleUpdateCheckpoint = async (cpId: string, newStatus: CheckpointStatus, clearDistress: boolean = false) => {
        try {
            await updateCheckpoint(cpId, {
                status: newStatus,
                is_distress: clearDistress ? false : undefined, // only update if clearing
                manual_override: true,
                completed_at: new Date().toISOString(),
                comment: interventionComment
            }, viewDate);
            setActiveIntervention(null);
            setInterventionComment('');
        } catch (error: any) {
            alert(error.message);
        }
    };

    const activeSites = useMemo(() => Array.from(new Set(schedules.map(sc => sc.site))).sort(), [schedules]);

    const filteredSchedules = useMemo(() => {
        return schedules.filter(s => {
            const matchDate = s.date === viewDate;
            const matchSite = selectedSiteFilter === 'ALL' || s.site === selectedSiteFilter;
            const matchSearch = s.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.postName.toLowerCase().includes(searchTerm.toLowerCase());
            return matchDate && matchSite && matchSearch;
        });
    }, [schedules, selectedSiteFilter, searchTerm, viewDate]);

    const stats = useMemo(() => {
        let totalCheckpoints = 0;
        let completed = 0;
        let missed = 0;
        let late = 0;
        let distress = 0;
        filteredSchedules.forEach(s => {
            s.checkpoints.forEach(cp => {
                totalCheckpoints++;
                if (cp.isDistress) distress++;
                if (cp.status === 'COMPLETED') completed++;
                if (cp.status === 'LATE') late++;
                if (cp.status === 'MISSED') missed++;
            });
        });
        return { totalCheckpoints, completed, missed, late, distress, activeSchedules: filteredSchedules.length };
    }, [filteredSchedules]);

    const getCheckpointStyles = (cp: Checkpoint) => {
        if (cp.isDistress) return 'bg-[#ff0000] border-[#990000] text-white animate-pulse shadow-md';
        switch (cp.status) {
            case 'COMPLETED': return 'bg-emerald-500 border-emerald-600 text-white';
            case 'LATE': return 'bg-amber-500 border-amber-600 text-white';
            case 'MISSED': return 'bg-white border-[#ff0000] text-slate-400';
            default: return 'bg-slate-50 border-slate-200 text-slate-400';
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300 pb-10">

            {/* Header Section */}
            <div className="flex items-center justify-between gap-4 px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Reporte Puestos
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Consola de alertas y gestión de turnos SOC
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-[#ff0000] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Turno SOC
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: 'Servicios', val: stats.activeSchedules, color: 'text-slate-900', bg: 'bg-white' },
                    { label: 'Reportado', val: stats.completed, color: 'text-emerald-600', bg: 'bg-white' },
                    { label: 'Reporte con Demora', val: stats.late, color: 'text-amber-600', bg: 'bg-white' },
                    { label: 'No Reportado', val: stats.missed, color: 'text-rose-600', bg: 'bg-white' },
                    { label: 'Alerta SOS', val: stats.distress, color: stats.distress > 0 ? 'text-white' : 'text-slate-900', bg: stats.distress > 0 ? 'bg-[#ff0000] shadow-md' : 'bg-white' },
                ].map((item, idx) => (
                    <div key={idx} className={`p-5 rounded-xl border border-slate-200 ${item.bg}`}>
                        <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${item.label === 'Alerta SOS' && stats.distress > 0 ? 'text-white' : 'text-slate-500'}`}>{item.label}</p>
                        <p className={`text-2xl font-bold ${item.color}`}>{item.val}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-col xl:flex-row gap-6 min-h-[500px]">
                <aside className="xl:w-64 flex flex-col gap-4 shrink-0">
                    <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 mb-1 text-slate-400">
                            <CalendarDays size={14} />
                            <label className="text-[9px] font-black uppercase tracking-widest">Calendario</label>
                        </div>
                        <div className="relative">
                            <input
                                type="date"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-bold uppercase text-slate-700 outline-none focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all cursor-pointer"
                                value={viewDate}
                                onChange={e => setViewDate(e.target.value)}
                            />
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                                <ChevronRight size={14} className="rotate-90" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-2 rounded-xl flex-1 overflow-y-auto">
                        <p className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-2">Sede Operativa</p>
                        <div className="space-y-1">
                            <button onClick={() => setSelectedSiteFilter('ALL')} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase rounded-lg transition-all flex justify-between items-center ${selectedSiteFilter === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Todos los Sitios <RotateCcw size={14} /></button>
                            {activeSites.map(site => (
                                <button key={site} onClick={() => setSelectedSiteFilter(site)} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase rounded-lg transition-all flex justify-between items-center ${selectedSiteFilter === site ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>{site} <ChevronRight size={14} /></button>
                            ))}
                        </div>
                    </div>
                </aside>

                <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
                        <div className="relative w-full sm:w-72 group">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Buscar por personal o puesto..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-slate-400 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <button className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-slate-500 hover:text-slate-900 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"><FileDown size={14} /> Exportar Log</button>
                    </div>

                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Personal / Destino</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Progreso</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Matriz de Checkpoints</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredSchedules.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin registros para esta fecha</td>
                                    </tr>
                                )}
                                {filteredSchedules.map(schedule => {
                                    const completed = schedule.checkpoints.filter(c => c.status === 'COMPLETED' || c.status === 'LATE').length;
                                    const hasDistress = schedule.checkpoints.some(c => c.isDistress);
                                    const isAssigned = schedule.agentName && schedule.agentName.length > 0;
                                    return (
                                        <tr key={schedule.id} className={`${hasDistress ? 'bg-red-50' : 'hover:bg-slate-50'} transition-all group`}>
                                            <td className="px-6 py-4 relative">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs shadow-sm transition-all shrink-0 ${hasDistress ? 'bg-[#ff0000] text-white animate-pulse' : isAssigned ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                                        {hasDistress ? 'SOS' : isAssigned ? schedule.agentName.substring(0, 2) : '?'}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <p className={`text-xs font-black uppercase tracking-tight ${hasDistress ? 'text-[#ff0000]' : isAssigned ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                                                            {isAssigned ? schedule.agentName : 'SIN ASIGNAR'}
                                                        </p>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight flex items-center gap-1.5 leading-none">
                                                            {schedule.postName} <span className="text-slate-300">•</span> <span className="text-slate-600">{schedule.site}</span>
                                                        </p>
                                                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 self-start mt-0.5">
                                                            <Activity size={10} className="text-[#ff0000]" />
                                                            <span className="text-[9px] font-black text-slate-700 font-sans tracking-tight uppercase">
                                                                {schedule.dailyIndicator}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span className={`text-[10px] font-black ${hasDistress ? 'text-[#ff0000]' : 'text-slate-900'}`}>{completed}/{schedule.checkpoints.length} OK</span>
                                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`${hasDistress ? 'bg-[#ff0000]' : 'bg-emerald-500'} h-full transition-all duration-700`} style={{ width: `${(completed / schedule.checkpoints.length) * 100}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 flex-wrap max-w-[450px]">
                                                    {schedule.checkpoints.map(cp => {
                                                        const [h, m] = cp.scheduledTime.split(':');
                                                        return (
                                                            <button
                                                                key={cp.id}
                                                                onClick={() => setActiveIntervention({ scheduleId: schedule.id, checkpoint: cp })}
                                                                className={`w-8 h-10 rounded-lg border transition-all hover:scale-110 flex flex-col items-center justify-center gap-0.5 shadow-sm ${getCheckpointStyles(cp)}`}
                                                            >
                                                                <span className="text-[10px] font-black leading-none">{h}</span>
                                                                <div className={`w-4 h-[1px] ${cp.status === 'PENDING' || cp.status === 'MISSED' ? 'bg-slate-200' : 'bg-white/20'}`} />
                                                                <span className="text-[8px] font-bold leading-none">{m}</span>
                                                                {cp.manualOverride && <Shield size={7} className="absolute bottom-1 right-1" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-3">
                                                    <button
                                                        onClick={() => setAssignmentModal({ isOpen: true, scheduleId: schedule.id })}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Asignar Agente"
                                                    >
                                                        <UserPlus size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSchedule(schedule.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Eliminar programación"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {activeIntervention && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-[110] animate-in fade-in">
                    <div className="bg-white rounded-xl w-full max-w-md border border-slate-200 overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeIntervention.checkpoint.isDistress ? 'bg-[#ff0000] text-white' : 'bg-slate-900 text-white'}`}>
                                    <ShieldAlert size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase">Gestión de Intervención</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Checkpoint {activeIntervention.checkpoint.scheduledTime}</p>
                                </div>
                            </div>
                            <button onClick={() => setActiveIntervention(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            {activeIntervention.checkpoint.isDistress && (
                                <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
                                    <AlertTriangle className="text-[#ff0000] shrink-0" size={20} />
                                    <div>
                                        <p className="text-[10px] font-black text-[#ff0000] uppercase">Alerta de Coacción</p>
                                        <p className="text-[10px] text-red-800 leading-tight mt-1">El agente no ingresó el código correcto. Proceda con llamada de seguridad inmediata.</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MessageSquare size={12} /> Bitácora SOC</label>
                                <textarea
                                    value={interventionComment}
                                    onChange={e => setInterventionComment(e.target.value)}
                                    placeholder="Ej: Se validó presencia vía radio con éxito..."
                                    className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:bg-white focus:border-slate-400 transition-all resize-none shadow-inner"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleUpdateCheckpoint(activeIntervention.checkpoint.id, 'COMPLETED', true)}
                                    className="bg-emerald-600 text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg flex flex-col items-center gap-1"
                                >
                                    <CheckCircle2 size={16} /> Validar Reportado
                                </button>
                                {activeIntervention.checkpoint.isDistress ? (
                                    <button
                                        onClick={() => handleUpdateCheckpoint(activeIntervention.checkpoint.id, 'COMPLETED', true)}
                                        className="bg-slate-900 text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black flex flex-col items-center gap-1"
                                    >
                                        <ShieldCheck size={16} /> Anular SOS
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleUpdateCheckpoint(activeIntervention.checkpoint.id, 'MISSED')}
                                        className="bg-slate-100 text-slate-600 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 flex flex-col items-center gap-1"
                                    >
                                        <RotateCcw size={16} /> Mantener No Reportado
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-[100] animate-in fade-in">
                    <div className="bg-white rounded-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#ff0000] text-white rounded-lg flex items-center justify-center"><Clock size={20} /></div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase">Configurar Turno SOC</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Puestos por programación horaria</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveSchedule} className="p-6 space-y-6">
                            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-center gap-2 mb-2">
                                <Info size={14} className="text-blue-500" />
                                <p className="text-[9px] font-black text-blue-700 uppercase">La asignación de agente se realiza al inicio del turno en la terminal.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1"><MapPin size={12} /> Sede Operativa</label>
                                <select required value={selectedSiteForNewShift} onChange={e => {
                                    setSelectedSiteForNewShift(e.target.value);
                                    setNewSchedule({ ...newSchedule, postId: '' }); // Reset post when site changes
                                }} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black uppercase outline-none focus:border-slate-400">
                                    <option value="">Seleccionar Sede...</option>
                                    {availableSedes.map(sede => <option key={sede.id} value={sede.id}>{sede.nombre}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1"><Shield size={12} /> Puesto Operativo</label>
                                <select required value={newSchedule.postId} onChange={e => setNewSchedule({ ...newSchedule, postId: e.target.value })} disabled={!selectedSiteForNewShift} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black uppercase outline-none focus:border-slate-400 disabled:opacity-50">
                                    <option value="">{selectedSiteForNewShift ? 'Seleccionar Puesto...' : 'Primero seleccione una sede'}</option>
                                    {filteredPosts.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Inicio</label>
                                    <input type="time" required value={newSchedule.startTime} onChange={e => setNewSchedule({ ...newSchedule, startTime: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Término</label>
                                    <input type="time" required value={newSchedule.endTime} onChange={e => setNewSchedule({ ...newSchedule, endTime: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Settings size={10} /> Frec.</label>
                                    <select value={newSchedule.frequency} onChange={e => setNewSchedule({ ...newSchedule, frequency: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black outline-none">
                                        <option value={30}>30 min</option>
                                        <option value={60}>60 min</option>
                                        <option value={120}>2 hrs</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Días de Aplicación</label>
                                <div className="flex justify-between gap-1">
                                    {DAYS_OF_WEEK.map(day => (
                                        <button key={day.value} type="button" onClick={() => {
                                            const exists = newSchedule.selectedDays.includes(day.value);
                                            setNewSchedule({ ...newSchedule, selectedDays: exists ? newSchedule.selectedDays.filter(d => d !== day.value) : [...newSchedule.selectedDays, day.value] });
                                        }} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg border transition-all ${newSchedule.selectedDays.includes(day.value) ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full py-3 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${isSubmitting ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[#ff0000] text-white shadow-red-100 hover:bg-[#d90000]'}`}
                            >
                                {isSubmitting ? 'Generando...' : 'Generar Programación'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {assignmentModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-[100] animate-in fade-in">
                    <div className="bg-white rounded-xl w-full max-w-sm border border-slate-200 overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-sm font-black text-slate-900 uppercase">Asignar Agente</h3>
                            <button onClick={() => setAssignmentModal({ isOpen: false, scheduleId: null })} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAssignAgent} className="p-6 space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Agente</label>
                                <select required value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black uppercase outline-none focus:border-slate-400">
                                    <option value="">Seleccionar...</option>
                                    {agents.filter(a => a.activo).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">Guardar Asignación</button>
                        </form>
                    </div>
                </div>
            )}

            <Modal
                open={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, scheduleId: null })}
                title="Confirmar Eliminación"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                        <div className="text-xs">
                            <p className="font-bold">¿Esta seguro de eliminar esta programación?</p>
                            <p className="mt-1">Esta acción no se puede deshacer y borrará todos los reportes y checkpoints asociados.</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setDeleteModal({ isOpen: false, scheduleId: null })}
                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmDeleteSchedule}
                            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={14} /> Eliminar
                        </button>
                    </div>
                </div>
            </Modal>

            <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.02); }
        }
        .animate-pulse-slow { animation: pulse-slow 3s infinite ease-in-out; }
      `}</style>
        </div>
    );
};
