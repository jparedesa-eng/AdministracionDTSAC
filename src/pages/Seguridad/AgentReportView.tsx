
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { AlertSchedule, CheckpointStatus, Post, Checkpoint } from '../types';
import {
    Menu,
    RefreshCcw,
    Search,
    ChevronRight,
    RotateCcw,
    CheckCircle2,
    Clock,
    Sun,
    Moon,
    Home,
    Truck,
    ShieldCheck,
    AlertTriangle,
    Settings2,
    LogOut,
    Fingerprint,
    MapPin,
    User,
    Shield,
    UserPlus,
    X,
    CalendarX
} from 'lucide-react';

interface AgentReportViewProps {
    schedules: AlertSchedule[];
    setSchedules: React.Dispatch<React.SetStateAction<AlertSchedule[]>>;
    posts?: Post[];
}

interface Session {
    agentName: string;
    dni: string;
    postId: string;
    postName: string;
    site: string;
    shiftDate: string;
    loginTime: string;
}

export const AgentReportView: React.FC<AgentReportViewProps> = ({ schedules, setSchedules, posts = [] }) => {
    const [devicePost, setDevicePost] = useState<Post | null>(() => {
        const saved = localStorage.getItem('control_center_post');
        return saved ? JSON.parse(saved) : null;
    });

    const [session, setSession] = useState<Session | null>(() => {
        const saved = localStorage.getItem('agent_session');
        if (!saved) return null;
        const parsed = JSON.parse(saved) as Session;
        const loginDate = new Date(parsed.loginTime);
        const diffHours = (new Date().getTime() - loginDate.getTime()) / (1000 * 60 * 60);
        // Sesión válida por 14 horas
        return diffHours < 14 ? parsed : null;
    });

    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [agentForm, setAgentForm] = useState({ name: '', dni: '' });
    const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [lastWasDistress, setLastWasDistress] = useState(false);

    const [pinNumbers, setPinNumbers] = useState<number[]>([]);
    const [nextExpected, setNextExpected] = useState<number | null>(null);
    const [pinAuthorized, setPinAuthorized] = useState(false);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const handleDeviceSetup = (post: Post) => {
        setDevicePost(post);
        localStorage.setItem('control_center_post', JSON.stringify(post));
    };

    const handleAgentLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!devicePost) return;
        if (!agentForm.name || !agentForm.dni) {
            setError('Datos incompletos');
            return;
        }

        const agentNameUpper = agentForm.name.toUpperCase();

        // Actualizar el estado global con el nombre del agente si existe la programación
        const existingIdx = schedules.findIndex(s => s.postId === devicePost.id && s.date === todayStr);

        if (existingIdx !== -1) {
            setSchedules(prev => prev.map((s, idx) =>
                idx === existingIdx ? { ...s, agentName: agentNameUpper, agentId: 'LOCAL' } : s
            ));
        }

        const newSession: Session = {
            agentName: agentNameUpper,
            dni: agentForm.dni,
            postId: devicePost.id,
            postName: devicePost.name,
            site: devicePost.site,
            shiftDate: todayStr,
            loginTime: now.toISOString()
        };

        setSession(newSession);
        localStorage.setItem('agent_session', JSON.stringify(newSession));
        setIsLoggingIn(false);
        setError('');
    };

    const activeSchedule = useMemo(() => {
        if (!session) return null;
        return schedules.find(s => s.postId === session.postId && s.date === session.shiftDate);
    }, [schedules, session]);

    const stats = useMemo(() => {
        if (!activeSchedule) return { completed: 0, pending: 0 };
        const completed = activeSchedule.checkpoints.filter(cp => cp.status === 'COMPLETED' || cp.status === 'LATE').length;
        const pending = activeSchedule.checkpoints.filter(cp => cp.status === 'PENDING').length;
        return { completed, pending };
    }, [activeSchedule]);

    const nextCheckpoint = useMemo(() => {
        if (!activeSchedule) return null;
        return activeSchedule.checkpoints.find(cp => cp.status === 'PENDING');
    }, [activeSchedule]);

    const getDiffMins = (scheduledTime: string, date: string) => {
        const d = new Date();
        const schedDate = new Date(`${date}T${scheduledTime}:00`);
        // Manejo básico de cruce de día
        const [hours] = scheduledTime.split(':').map(Number);
        if (d.getHours() < 6 && hours > 18) schedDate.setDate(schedDate.getDate() - 1);
        if (d.getHours() > 18 && hours < 6) schedDate.setDate(schedDate.getDate() + 1);

        return (d.getTime() - schedDate.getTime()) / 60000;
    };

    const indicatorOptions = useMemo(() => {
        if (!activeSchedule) return [];
        const real = activeSchedule.dailyIndicator;
        const GODS = ['ZEUS', 'HERA', 'APOLO', 'ARES', 'ATENEA', 'HADES', 'POSEIDON', 'HERMES', 'AFRODITA', 'HEFESTO', 'ODIN', 'THOR', 'RA', 'ANUBIS', 'CRONOS', 'OSIRIS', 'ISIS', 'LOKI', 'FREYA'];
        const COLORS = ['ROJO', 'AZUL', 'VERDE', 'BLANCO', 'NEGRO', 'GRIS', 'ORO', 'PLATA', 'MORADO', 'CELESTE', 'AMARILLO', 'NARANJA', 'ROSADO', 'MARRON'];

        const gen = () => `${GODS[Math.floor(Math.random() * GODS.length)]} ${COLORS[Math.floor(Math.random() * COLORS.length)]}`;
        let f = [gen(), gen()];
        while (f[0] === real) f[0] = gen();
        while (f[1] === real || f[1] === f[0]) f[1] = gen();
        return [real, ...f].sort(() => Math.random() - 0.5);
    }, [activeSchedule]);

    const initPinPad = useCallback(() => {
        const nums = [1, 2, 3, 4, 5, 6];
        const shuffled = nums.sort(() => Math.random() - 0.5);
        setPinNumbers(shuffled);
        setNextExpected(1);
        setPinAuthorized(false);
    }, []);

    useEffect(() => {
        if (selectedScheduleId) initPinPad();
    }, [selectedScheduleId, initPinPad]);

    const handleKeyClick = (num: number) => {
        if (pinAuthorized) return;
        if (num === nextExpected) {
            if (num === 6) {
                setPinAuthorized(true);
                setNextExpected(999);
            } else {
                setNextExpected(num + 1);
            }
        } else {
            setError('ORDEN PIN INCORRECTO');
            initPinPad();
            setTimeout(() => setError(''), 1500);
        }
    };

    const handleReport = (selectedIndicator: string) => {
        if (!activeSchedule) return;
        const isDistress = selectedIndicator !== activeSchedule.dailyIndicator;
        let finalStatus: CheckpointStatus = 'COMPLETED';
        let blocked = false;

        setSchedules(prev => prev.map(s => {
            if (s.id === activeSchedule.id) {
                const nextPendingIdx = s.checkpoints.findIndex(cp => cp.status === 'PENDING');
                if (nextPendingIdx === -1) return s;
                const cp = s.checkpoints[nextPendingIdx];
                const diff = getDiffMins(cp.scheduledTime, s.date);

                if (diff < -10) { setError(`DEMASIADO PRONTO`); blocked = true; return s; }
                else if (diff > 10) {
                    // Si el retraso es excesivo (más de 10 min), se marca como Missed y no deja reportar
                    setError('TURNO VENCIDO'); blocked = true;
                    const updated = [...s.checkpoints];
                    updated[nextPendingIdx] = { ...updated[nextPendingIdx], status: 'MISSED' };
                    return { ...s, checkpoints: updated };
                }
                if (diff > 3) finalStatus = 'LATE';
                const updated = [...s.checkpoints];
                updated[nextPendingIdx] = { ...updated[nextPendingIdx], status: finalStatus, completedAt: new Date().toISOString(), isDistress };
                setLastWasDistress(isDistress);
                return { ...s, checkpoints: updated };
            }
            return s;
        }));

        if (!blocked) {
            setSuccess(true);
            setTimeout(() => {
                setSuccess(true); // Mantener feedback visual
                setTimeout(() => {
                    setSuccess(false);
                    setSelectedScheduleId(null);
                    setPinAuthorized(false);
                }, 1500);
            }, 500);
        }
    };

    const getGreeting = () => {
        const hour = now.getHours();
        if (hour < 12) return "Buenos días";
        if (hour < 18) return "Buenas tardes";
        return "Buenas noches";
    };

    const dateData = [
        { day: now.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', ''), date: now.getDate().toString(), current: true },
    ];

    if (!devicePost) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-6 animate-in fade-in">
                <div className="w-full max-w-sm text-center space-y-8 bg-white p-10 rounded-[32px] border border-slate-200 shadow-xl">
                    <div className="w-16 h-16 bg-[#3b82f6] rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg">
                        <Settings2 size={32} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Vincular Terminal</h2>
                        <p className="text-sm text-slate-500 font-medium">Seleccione el puesto operativo asignado a este equipo.</p>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar px-1">
                        {posts.map(post => (
                            <button
                                key={post.id}
                                onClick={() => handleDeviceSetup(post)}
                                className="w-full p-4 mb-2 bg-slate-50 border border-slate-100 rounded-2xl text-left hover:border-[#3b82f6] hover:bg-white transition-all group flex items-center justify-between"
                            >
                                <div>
                                    <p className="text-xs font-black text-slate-900 uppercase">{post.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{post.site}</p>
                                </div>
                                <ChevronRight size={16} className="text-slate-300 group-hover:text-[#3b82f6]" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden">
            <div className="bg-white border-b border-slate-200 h-16 flex items-center px-6 shrink-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-400"><Shield size={16} /></div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">AGENT REPORT</p>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
                <div className="w-full max-w-[450px] bg-white rounded-[40px] border-[3px] border-[#3b82f6] shadow-2xl overflow-hidden flex flex-col aspect-[9/18.5] relative">

                    {selectedScheduleId ? (
                        <div className="absolute inset-0 z-40 bg-white flex flex-col p-8 animate-in slide-in-from-bottom duration-300 overflow-y-auto custom-scrollbar">
                            <button
                                onClick={() => { setSelectedScheduleId(null); setPinAuthorized(false); }}
                                className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 hover:text-slate-900 transition-colors"
                            >
                                <RotateCcw size={14} /> VOLVER
                            </button>

                            {success ? (
                                <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in zoom-in">
                                    <div className={`w-32 h-32 rounded-full flex items-center justify-center ${lastWasDistress ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'} shadow-2xl`}>
                                        <CheckCircle2 size={64} />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-2xl font-black text-slate-900 uppercase">Transmitido</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">SOC - Conformidad Registrada</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    <div className="text-center space-y-2">
                                        <h3 className="text-2xl font-black text-slate-900 uppercase">Validación Personal</h3>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ingrese orden PIN (1 al 6)</p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-6 max-w-[280px] mx-auto">
                                        {pinNumbers.map(num => {
                                            const isPressed = num < (nextExpected || 0) || pinAuthorized;
                                            return (
                                                <button
                                                    key={num}
                                                    disabled={isPressed || pinAuthorized}
                                                    onClick={() => handleKeyClick(num)}
                                                    className={`aspect-square rounded-[24px] flex items-center justify-center text-xl font-black transition-all border-2
                               ${isPressed ? 'bg-slate-900 border-slate-900 text-white opacity-20 scale-90' :
                                                            'bg-white border-slate-100 text-slate-800 shadow-lg active:scale-95'}`}
                                                >
                                                    {num}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className={`space-y-6 transition-all duration-500 ${!pinAuthorized ? 'opacity-20 grayscale pointer-events-none translate-y-4' : 'translate-y-0'}`}>
                                        <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">TOKEN SOC CONFIRMADO</p>
                                        <div className="space-y-3">
                                            {indicatorOptions.map((opt, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleReport(opt)}
                                                    className="w-full py-5 bg-white border-2 border-slate-100 rounded-[28px] text-xl font-black tracking-[0.4em] text-slate-900 shadow-xl hover:border-slate-900 active:scale-95 transition-all"
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 justify-center animate-shake border border-red-100">
                                            <AlertTriangle size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="px-6 py-10 flex flex-col items-center gap-1 text-center bg-white shrink-0">
                                <p className="text-slate-400 text-sm font-medium">{getGreeting()}</p>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                                    {session ? session.postName : devicePost.name}
                                </h2>
                                <div className="px-5 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">{devicePost.site}</div>
                            </div>

                            <div className="flex-1 flex flex-col px-6 overflow-y-auto custom-scrollbar">

                                <div className="flex items-center justify-center gap-4 my-8 shrink-0">
                                    {dateData.map((d, i) => (
                                        <div
                                            key={i}
                                            className="w-24 h-44 bg-[#1e1e1e] text-white shadow-2xl scale-110 flex flex-col items-center justify-center rounded-[35px]"
                                        >
                                            <p className="text-[11px] font-black mb-2 opacity-60 tracking-[0.2em]">{d.day}</p>
                                            <p className="text-4xl font-black mb-6 text-white">{d.date}</p>
                                            <div className="p-2 bg-white/5 rounded-full border border-white/10">
                                                {now.getHours() >= 7 && now.getHours() < 19 ? <Sun size={24} className="text-amber-400" /> : <Moon size={24} className="text-amber-300" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="w-full space-y-8 pb-32 flex-1">
                                    <p className="text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] border-t border-slate-50 pt-8">
                                        {now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                                    </p>

                                    {!session ? (
                                        <div className="animate-in fade-in duration-500">
                                            {isLoggingIn ? (
                                                <div className="bg-slate-50 rounded-[40px] p-8 space-y-6 border border-slate-200 shadow-inner animate-in slide-in-from-bottom-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificación SOC</h4>
                                                        <button onClick={() => setIsLoggingIn(false)} className="text-slate-400"><X size={16} /></button>
                                                    </div>
                                                    <form onSubmit={handleAgentLogin} className="space-y-4">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre y Apellidos</label>
                                                            <input type="text" placeholder="JUAN PEREZ" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none uppercase shadow-sm" value={agentForm.name} onChange={e => setAgentForm({ ...agentForm, name: e.target.value })} required />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Documento (DNI)</label>
                                                            <input type="text" placeholder="DNI" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm" value={agentForm.dni} onChange={e => setAgentForm({ ...agentForm, dni: e.target.value })} required />
                                                        </div>
                                                        <button type="submit" className="w-full py-5 bg-[#3b82f6] text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 active:scale-95 transition-all">Verificar Programación</button>
                                                    </form>
                                                </div>
                                            ) : (
                                                <div className="bg-[#f8fafc]/50 rounded-[40px] p-10 border border-slate-100 flex flex-col items-center text-center space-y-6 shadow-sm">
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">TERMINAL BLOQUEADA</p>
                                                        <h4 className="text-5xl font-black text-slate-300 tracking-tighter">--:--</h4>
                                                    </div>
                                                    <button
                                                        onClick={() => setIsLoggingIn(true)}
                                                        className="w-full py-6 bg-slate-900 text-white rounded-[30px] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                                                    >
                                                        <UserPlus size={18} /> Iniciar Turno
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="animate-in fade-in duration-500">
                                            {!activeSchedule ? (
                                                <div className="bg-amber-50/50 rounded-[40px] p-10 border border-amber-100 flex flex-col items-center text-center space-y-6 shadow-sm">
                                                    <CalendarX size={48} className="text-amber-400" />
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.4em]">SIN PROGRAMACIÓN</p>
                                                        <p className="text-xs font-bold text-amber-700 leading-tight">No hay alertas SOC programadas para este puesto hoy. Contacte al centro de control.</p>
                                                    </div>
                                                    <button onClick={() => { localStorage.removeItem('agent_session'); setSession(null); }} className="text-[10px] font-black text-amber-500 uppercase underline">Cambiar Agente</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="bg-[#f8fafc]/50 rounded-[40px] p-10 border border-slate-100 flex flex-col items-center text-center space-y-8 shadow-sm">
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">SIGUIENTE CONTROL</p>
                                                            <h4 className="text-6xl font-black text-slate-900 tracking-tighter">
                                                                {nextCheckpoint ? nextCheckpoint.scheduledTime : '--:--'}
                                                            </h4>
                                                        </div>
                                                        {nextCheckpoint ? (() => {
                                                            const diff = getDiffMins(nextCheckpoint.scheduledTime, activeSchedule!.date);
                                                            const isAvailable = diff >= -10 && diff <= 10;
                                                            return (
                                                                <button
                                                                    disabled={!isAvailable}
                                                                    onClick={() => { setSelectedScheduleId(activeSchedule!.id); initPinPad(); }}
                                                                    className={`w-full py-6 rounded-[35px] font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-xl
                                      ${isAvailable ? 'bg-white text-slate-900 border-2 border-slate-100 hover:scale-[1.03] active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'}`}
                                                                >
                                                                    {isAvailable ? 'REPORTAR' : 'PENDIENTE'}
                                                                </button>
                                                            );
                                                        })() : (
                                                            <div className="py-2">
                                                                <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-2" />
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin Pendientes</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-center gap-10 py-10">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{stats.completed} HECHOS</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{stats.pending} PENDIENTES</span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <nav className="shrink-0 h-24 bg-white border-t border-slate-100 flex items-center justify-around px-8 z-20">
                                <div className="flex flex-col items-center gap-2 opacity-30 group cursor-pointer">
                                    <Home size={22} className="text-slate-900 group-hover:text-[#3b82f6] transition-colors" />
                                    <span className="text-[10px] font-bold text-slate-900 uppercase">Inicio</span>
                                </div>
                                <div className="flex flex-col items-center gap-2 opacity-30 group cursor-pointer">
                                    <Truck size={22} className="text-slate-900 group-hover:text-[#3b82f6] transition-colors" />
                                    <span className="text-[10px] font-bold text-slate-900 uppercase">Vehículos</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="text-[#3b82f6] drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"><ShieldCheck size={28} strokeWidth={3} /></div>
                                    <span className="text-[10px] font-black text-[#3b82f6] uppercase">Control</span>
                                </div>
                            </nav>

                            {session && (
                                <button
                                    onClick={() => { if (window.confirm('¿Finalizar turno?')) { localStorage.removeItem('agent_session'); setSession(null); } }}
                                    className="absolute top-8 right-8 p-2 text-slate-300 hover:text-red-500 transition-colors z-50"
                                >
                                    <LogOut size={20} />
                                </button>
                            )}
                        </>
                    )}

                </div>
            </div>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
        </div>
    );
};
