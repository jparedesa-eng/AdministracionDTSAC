import React, { useState, useMemo, useRef, useEffect } from "react";
import {
    ChevronLeft,
    ChevronRight,
    ShieldCheck,
    Clock,
    MapPin,
    CheckCircle2,
    XCircle,
    User,
    Calendar,
    Plus,
    Trash2,
    Search,
    Printer,
    Users,
    Sun,
    Moon
} from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";

import type { Turno, AssignmentStatus, Assignment } from "./SeguridadContext";
import { getSedesState, subscribeSedes } from "../../store/sedesStore";
import { getAgentesState, subscribeAgentes } from "../../store/agentesStore";
import { getPuestosState, subscribePuestos } from "../../store/puestosStore";
import {
    getProgramacionState,
    subscribeProgramacion,
    upsertProgramacion,
    deleteAssignmentsByCell,
    refreshProgramacion
} from "../../store/programacionStore";

// --- Helpers de Fecha ---

const DAYS_OF_WEEK = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getISOWeek(d: Date) {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    return (
        1 +
        Math.round(
            ((date.getTime() - week1.getTime()) / 86400000 -
                3 +
                ((week1.getDay() + 6) % 7)) /
            7
        )
    );
}

// Agrupa los días del mes en semanas
function getWeeksForMonth(year: number, month: number) {
    const days: Date[] = [];
    const numDays = getDaysInMonth(year, month);
    for (let i = 1; i <= numDays; i++) {
        days.push(new Date(year, month, i));
    }

    const weeks: { weekNum: number; days: Date[] }[] = [];

    days.forEach(d => {
        const w = getISOWeek(d);
        const existingWeek = weeks.find(wk => wk.weekNum === w);
        if (existingWeek) {
            existingWeek.days.push(d);
        } else {
            weeks.push({ weekNum: w, days: [d] });
        }
    });

    return weeks;
}

// --- Componente SearchableSelect (Interno) ---
function AgentSelect({
    agents,
    value,
    onChange,
    placeholder = "Buscar agente..."
}: {
    agents: { id: string; nombre: string }[];
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = agents.filter(a =>
        a.nombre.toLowerCase().includes(search.toLowerCase())
    );

    const selectedName = agents.find(a => a.id === value)?.nombre;

    return (
        <div className="relative" ref={wrapperRef}>
            <div
                className="w-full h-10 pl-3 pr-10 py-2 border border-gray-200 rounded-lg bg-white text-sm flex items-center cursor-text focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all"
                onClick={() => setIsOpen(true)}
            >
                {selectedName ? (
                    <span className="text-gray-900 font-medium">{selectedName}</span>
                ) : (
                    <span className="text-gray-400">{placeholder}</span>
                )}
                <div className="absolute right-3 text-gray-400">
                    <Search className="h-4 w-4" />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 sticky top-0 bg-white border-b border-gray-100">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Escribe para buscar..."
                            className="w-full text-sm p-1.5 bg-gray-50 rounded-md outline-none focus:ring-1 focus:ring-blue-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="p-1">
                        {filtered.length > 0 ? (
                            filtered.map(agent => (
                                <div
                                    key={agent.id}
                                    className={`px-3 py-2 text-sm rounded-md cursor-pointer transition-colors ${value === agent.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                    onClick={() => {
                                        onChange(agent.id);
                                        setIsOpen(false);
                                        setSearch("");
                                    }}
                                >
                                    {agent.nombre}
                                </div>
                            ))
                        ) : (
                            <div className="p-3 text-center text-xs text-gray-400">
                                No se encontraron agentes
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ProgramacionPuestos() {
    // --- Supabase Stores ---
    const [, setSedesVersion] = useState(0);
    const [, setAgentesVersion] = useState(0);
    const [, setPuestosVersion] = useState(0);
    const [, setProgramacionVersion] = useState(0);

    useEffect(() => {
        const unsubSedes = subscribeSedes(() => setSedesVersion(prev => prev + 1));
        const unsubAgentes = subscribeAgentes(() => setAgentesVersion(prev => prev + 1));
        const unsubPuestos = subscribePuestos(() => setPuestosVersion(prev => prev + 1));
        const unsubProgramacion = subscribeProgramacion(() => setProgramacionVersion(prev => prev + 1));

        return () => {
            unsubSedes();
            unsubAgentes();
            unsubPuestos();
            unsubProgramacion();
        };
    }, []);

    const { sedes } = getSedesState();
    const { agentes } = getAgentesState();
    const { puestos } = getPuestosState();
    const { turnos: programacionTurnos } = getProgramacionState();

    // Estado UI General
    const [toast, setToast] = useState<ToastState>(null);
    const [currentDate, setCurrentDate] = useState(new Date()); // Mes actual
    const [selectedSedeId, setSelectedSedeId] = useState<string>("");

    // Refrescar programación cuando cambia el mes
    useEffect(() => {
        refreshProgramacion(currentDate.getFullYear(), currentDate.getMonth());
    }, [currentDate]);

    // Convertir programacionTurnos a formato assignments para compatibilidad
    const assignments = useMemo(() => {
        const map: Record<string, Assignment[]> = {};
        programacionTurnos.forEach(turno => {
            const key = `${turno.fecha}|${turno.puesto_id}|${turno.turno}`;
            if (!map[key]) {
                map[key] = [];
            }
            map[key].push({
                agenteId: turno.agente_id,
                status: turno.status,
                absenceType: turno.absence_type || undefined,
                absenceReason: turno.absence_reason || undefined,
            });
        });
        return map;
    }, [programacionTurnos]);

    // Inicializar sede seleccionada
    React.useEffect(() => {
        if (!selectedSedeId && sedes.length > 0) {
            setSelectedSedeId(sedes[0].id);
        }
    }, [sedes, selectedSedeId]);

    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [agentViewOpen, setAgentViewOpen] = useState(false); // Modal "Por Agente"

    const [activeCell, setActiveCell] = useState<{
        dateStr: string;
        puestoId: string;
        turno: Turno;
        dayNum: number;
    } | null>(null);

    // --- Computados ---
    const weeks = useMemo(() => getWeeksForMonth(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);
    const filteredPuestos = useMemo(
        () => puestos.filter((p) => p.sede_id === selectedSedeId && p.activo),
        [selectedSedeId, puestos]
    );

    const activeAgents = useMemo(() => agentes.filter(a => a.activo), [agentes]);

    // Helpers de estado
    const getAssignmentKey = (day: number, puestoId: string, turno: Turno) => {
        const y = currentDate.getFullYear();
        const m = String(currentDate.getMonth() + 1).padStart(2, "0");
        const d = String(day).padStart(2, "0");
        return `${y}-${m}-${d}|${puestoId}|${turno}`;
    };

    // Validar asignacion diaria unica (Global)
    const isAgentAssignedElsewhere = (agentId: string, fullDateStr: string, currentKey: string): boolean => {
        return Object.entries(assignments).some(([key, valArray]) => {
            if (key === currentKey) return false; // Misma celda, ignorar (aunque ahora es array, chequeamos duplicados visualmente)

            // valArray es Assignment[]
            if (!valArray) return false;

            const isAssignedHere = valArray.some(a => a.agenteId === agentId);
            if (!isAssignedHere) return false;

            const [datePart] = key.split("|");

            return datePart === fullDateStr;
        });
    };

    const getWeekAssignmentCount = (agentId: string, day: number) => {
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const targetWeek = getISOWeek(targetDate);
        const targetYear = targetDate.getFullYear();

        let count = 0;
        Object.entries(assignments).forEach(([key, valArray]) => {
            if (!valArray) return;
            const hasAgent = valArray.some(a => a.agenteId === agentId);
            if (!hasAgent) return;

            const [datePart] = key.split("|");
            const [y, m, d] = datePart.split("-").map(Number);
            const assignDate = new Date(y, m - 1, d);

            if (getISOWeek(assignDate) === targetWeek && assignDate.getFullYear() === targetYear) {
                count++;
            }
        });

        return count;
    };

    // --- Handlers ---
    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };
    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleCellClick = (day: number, puestoId: string, turno: Turno) => {
        const y = currentDate.getFullYear();
        const m = String(currentDate.getMonth() + 1).padStart(2, "0");
        const d = String(day).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`; // YYYY-MM-DD

        setActiveCell({ dateStr, puestoId, turno, dayNum: day });
        setModalOpen(true);
    };

    const currentKey = activeCell
        ? `${activeCell.dateStr}|${activeCell.puestoId}|${activeCell.turno}`
        : "";

    // -- Edit State (Assignments List) --
    // Manejaremos una lista local de asignaciones para editar y luego guardar todo junto
    const [editAssignments, setEditAssignments] = useState<Assignment[]>([]);

    // State para "Agregar Nuevo"
    const [newAgentId, setNewAgentId] = useState("");
    const [, setNewStatus] = useState<AssignmentStatus>("PENDING");

    // State para Confirmación de 6to día
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [pendingAgentId, setPendingAgentId] = useState("");

    React.useEffect(() => {
        if (modalOpen && currentKey) {
            // Cargar existentes
            setEditAssignments(assignments[currentKey] || []);
        } else {
            setEditAssignments([]);
        }
        // Reset inputs
        setNewAgentId("");
        setNewStatus("PENDING");
    }, [modalOpen, currentKey, assignments]);

    const executeAddAgent = (agentId: string) => {
        setEditAssignments(prev => [...prev, {
            agenteId: agentId,
            status: "PENDING"
        }]);
        setNewAgentId("");
        setNewStatus("PENDING");
    };

    const handleAddAgent = () => {
        if (!newAgentId) return;

        // Validar si ya está en ESTA lista
        if (editAssignments.some(a => a.agenteId === newAgentId)) {
            setToast({ type: "error", message: "El agente ya está asignado a este puesto." });
            return;
        }

        // Validar si ya está en OTRA parte ese día
        if (activeCell && isAgentAssignedElsewhere(newAgentId, activeCell.dateStr, currentKey)) {
            setToast({ type: "error", message: "Error: El agente ya tiene un turno ese día." });
            return;
        }

        // Advertencia 5 dias
        if (activeCell) {
            const count = getWeekAssignmentCount(newAgentId, activeCell.dayNum);
            if (count >= 5) {
                // Abrir confirmación
                setPendingAgentId(newAgentId);
                setConfirmModalOpen(true);
                return;
            }
        }

        executeAddAgent(newAgentId);
    };

    const handleConfirmAdd = () => {
        executeAddAgent(pendingAgentId);
        setConfirmModalOpen(false);
        setPendingAgentId("");
    };

    const handleRemoveAgent = (agentId: string) => {
        setEditAssignments(prev => prev.filter(a => a.agenteId !== agentId));
    };

    const handleSave = async () => {
        if (!activeCell) return;

        try {
            // Primero eliminar todas las asignaciones existentes de esta celda
            await deleteAssignmentsByCell(
                activeCell.dateStr,
                activeCell.puestoId,
                activeCell.turno
            );

            // Luego insertar las nuevas asignaciones
            for (const assignment of editAssignments) {
                await upsertProgramacion({
                    fecha: activeCell.dateStr,
                    puesto_id: activeCell.puestoId,
                    turno: activeCell.turno,
                    agente_id: assignment.agenteId,
                    status: assignment.status,
                    absence_type: assignment.absenceType || null,
                    absence_reason: assignment.absenceReason || null,
                });
            }

            setModalOpen(false);
            setToast({ type: "success", message: "Asignaciones guardadas." });
        } catch (error: any) {
            setToast({ type: "error", message: error.message || "Error al guardar asignaciones." });
        }
    };

    // --- Agent View Modal Logic ---
    const [viewAgentId, setViewAgentId] = useState("");
    const viewAgentPlan = useMemo(() => {
        if (!viewAgentId) return [];
        // Extract all assignments for this agent in current month
        const plan: { date: Date, puesto: string, turno: Turno, status: string }[] = [];
        const m = currentDate.getMonth();
        const y = currentDate.getFullYear();

        Object.entries(assignments).forEach(([key, valArray]) => {
            if (!valArray) return;
            const myAssign = valArray.find(a => a.agenteId === viewAgentId);
            if (myAssign) {
                const [datePart, pId, turn] = key.split("|");
                const [dy, dm, dd] = datePart.split("-").map(Number);
                if (dy === y && (dm - 1) === m) {
                    const dateObj = new Date(dy, dm - 1, dd);
                    const pName = puestos.find(p => p.id === pId)?.nombre || "Puesto Desconocido";
                    plan.push({
                        date: dateObj,
                        puesto: pName,
                        turno: turn as Turno,
                        status: myAssign.status
                    });
                }
            }
        });
        return plan.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [viewAgentId, assignments, currentDate, puestos]);


    return (
        <div className="flex flex-col h-full gap-4 text-slate-800">
            <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Gestión de Turnos</h1>
                <p className="text-sm text-gray-500">Programación mensual de agentes y puestos</p>
            </div>

            <div className="flex flex-col flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <Toast toast={toast} onClose={() => setToast(null)} />

                {/* Toolbar "Inside" Table Header */}
                <div className="flex flex-col xl:flex-row items-center justify-between p-4 border-b border-gray-200 gap-4 bg-white">

                    {/* Left: Date Controls */}
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg w-full xl:w-auto justify-center xl:justify-start">
                        <button onClick={handlePrevMonth} className="hover:text-blue-600 transition-colors p-1 rounded-md text-gray-500 hover:bg-gray-100">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-2 px-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <span className="font-bold min-w-[140px] text-center capitalize text-gray-800 text-sm">
                                {currentDate.toLocaleDateString("es-PE", { month: "long", year: "numeric" })}
                            </span>
                        </div>
                        <button onClick={handleNextMonth} className="hover:text-blue-600 transition-colors p-1 rounded-md text-gray-500 hover:bg-gray-100">
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                        {/* View by Agent Button */}
                        <button
                            onClick={() => setAgentViewOpen(true)}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-blue-600 transition-colors w-full sm:w-auto justify-center"
                        >
                            <Users className="h-4 w-4" />
                            Ver por Agente
                        </button>

                        <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

                        {/* Sede Selector */}
                        <div className="relative group w-full sm:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MapPin className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <select
                                value={selectedSedeId}
                                onChange={(e) => setSelectedSedeId(e.target.value)}
                                className="block w-full pl-10 pr-8 py-2 text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors cursor-pointer outline-none font-medium text-gray-700"
                            >
                                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-auto relative bg-slate-50">
                    <table className="w-full border-collapse text-xs">
                        <thead className="sticky top-0 z-20 bg-white shadow-sm ring-1 ring-gray-200">
                            {/* Row 1: Weeks */}
                            {/* Row 1: Weeks */}
                            <tr>
                                <th rowSpan={2} className="sticky left-0 z-30 w-64 bg-gray-50 border-b border-r border-gray-200 p-2 text-left font-bold text-gray-700 text-xs align-middle">
                                    Puesto / Turno
                                </th>
                                {weeks.map((week) => (
                                    <th
                                        key={`w-${week.weekNum}`}
                                        colSpan={week.days.length}
                                        className="border-b border-r border-gray-200 bg-gray-50 py-1 text-center font-semibold text-gray-500 text-[10px] uppercase tracking-wider"
                                    >
                                        Semana {week.weekNum}
                                    </th>
                                ))}
                            </tr>
                            {/* Row 2: Days */}
                            <tr>
                                {/* Empty cell removed due to rowSpan above */}
                                {weeks.map(week => (
                                    week.days.map(d => {
                                        const dayNum = d.getDate();
                                        const dayName = DAYS_OF_WEEK[d.getDay()].substring(0, 2);
                                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                        const isToday = d.toDateString() === new Date().toDateString();

                                        return (
                                            <th
                                                key={dayNum}
                                                className={`
                                                min-w-[40px] border-b border-r border-gray-200 py-1 text-center font-medium h-10
                                                ${isWeekend ? 'bg-orange-50 text-orange-800' : 'bg-white text-gray-600'}
                                                ${isToday ? 'bg-blue-50 text-blue-700 font-bold ring-inset ring-2 ring-blue-500' : ''}
                                            `}
                                            >
                                                <div className="text-[9px] uppercase opacity-70 leading-none mb-0.5">{dayName}</div>
                                                <div className="text-sm leading-none">{dayNum}</div>
                                            </th>
                                        );
                                    })
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredPuestos.length === 0 ? (
                                <tr>
                                    <td colSpan={weeks.reduce((acc, w) => acc + w.days.length, 0) + 1} className="p-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-3 bg-gray-50 rounded-full">
                                                <ShieldCheck className="h-8 w-8 text-gray-300" />
                                            </div>
                                            <p>No hay puestos configurados para esta sede.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPuestos.map((puesto) => (
                                    <React.Fragment key={puesto.id}>
                                        {/* Puesto Header Row */}
                                        <tr className="bg-gray-50">
                                            <td className="sticky left-0 z-10 border-b border-r border-gray-200 bg-gray-50 px-4 py-2 font-semibold text-gray-700 text-xs">
                                                <div className="flex items-center gap-2 whitespace-nowrap">
                                                    <MapPin className="h-3 w-3 text-red-500" />
                                                    <span>{puesto.nombre}</span>
                                                </div>
                                            </td>
                                            <td colSpan={weeks.reduce((acc, w) => acc + w.days.length, 0)} className="bg-gray-50 border-b border-gray-200"></td>
                                        </tr>

                                        {/* Turnos */}
                                        {puesto.turnos.map(turno => (
                                            <tr key={`${puesto.id}-${turno}`} className="transition-colors">
                                                <td className="sticky left-0 z-10 border-r border-dashed border-gray-200 bg-white px-4 py-2 text-[11px] font-medium text-gray-500 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.02)]">
                                                    <div className="flex items-center gap-2 pl-4">
                                                        {turno === 'DIA' ? (
                                                            <Sun className="h-3 w-3 text-amber-500" />
                                                        ) : (
                                                            <Moon className="h-3 w-3 text-indigo-500" />
                                                        )}
                                                        <span className={turno === 'DIA' ? 'text-amber-700' : 'text-indigo-700'}>{turno}</span>
                                                    </div>
                                                </td>

                                                {weeks.map(week => (
                                                    week.days.map(d => {
                                                        const dayNum = d.getDate();
                                                        const key = getAssignmentKey(dayNum, puesto.id, turno);
                                                        const cellAssignments = assignments[key] || [];

                                                        let cellClass = "cursor-pointer bg-white hover:bg-gray-50";

                                                        return (
                                                            <td
                                                                key={key}
                                                                className={`border-r border-dashed border-gray-200 p-1 text-center transition-all h-14 relative group/cell ${cellClass}`}
                                                                onClick={() => handleCellClick(dayNum, puesto.id, turno)}
                                                            >
                                                                <div className="flex flex-col gap-0.5 h-full w-full overflow-hidden">
                                                                    {cellAssignments.length > 0 && cellAssignments.map((assign) => {
                                                                        const agent = agentes.find(a => a.id === assign.agenteId);
                                                                        const name = agent?.nombre.split(" ")[0] || "??";

                                                                        let badgeClass = "bg-blue-100 text-blue-900 border-blue-200";

                                                                        if (assign.status === "CUMPLIDO") {
                                                                            badgeClass = "bg-green-100 text-green-800 border-green-200";
                                                                        } else if (assign.status === "FALTA") {
                                                                            badgeClass = "bg-red-200 text-red-900 border-red-300";
                                                                        }

                                                                        return (
                                                                            <div
                                                                                key={assign.agenteId}
                                                                                className={`flex-1 ${badgeClass} rounded flex items-center justify-center border text-[9px] font-bold leading-none w-full min-h-0 relative group/item`}
                                                                                title={agent?.nombre}
                                                                            >
                                                                                <span className="truncate px-1">
                                                                                    {assign.status === "FALTA" ? "FALTA" : name}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* Hover Plus Icon */}
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-opacity">
                                                                    <Plus className="h-3 w-3 text-gray-400 opacity-60" />
                                                                </div>
                                                            </td>
                                                        );
                                                    })
                                                ))}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal de Gestión (Multi-Assign) */}
                <Modal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title="Gestión de Turno"
                    size="md"
                >
                    <div className="mt-4 space-y-6">
                        {/* Header Details */}
                        {activeCell && (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-gray-800 capitalize">
                                        {new Date(activeCell.dateStr + "T00:00:00").toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </span>
                                    <span className="text-gray-500">
                                        {puestos.find(p => p.id === activeCell?.puestoId)?.nombre}
                                        <span className="mx-2">•</span>
                                        {activeCell.turno}
                                    </span>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-bold ${activeCell.turno === 'DIA' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                    {activeCell.turno}
                                </div>
                            </div>
                        )}

                        {/* Lista de Asignados */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center justify-between">
                                Agentes Asignados
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">{editAssignments.length}</span>
                            </label>

                            {editAssignments.length === 0 ? (
                                <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                                    <User className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No hay agentes asignados aún.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                                    {editAssignments.map((assign) => (
                                        <div key={assign.agenteId} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-300 transition-colors">
                                            {/* Header con nombre y botón eliminar */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                                                        {agentes.find(a => a.id === assign.agenteId)?.nombre.charAt(0)}
                                                    </div>
                                                    <p className="text-sm font-semibold text-gray-800">{agentes.find(a => a.id === assign.agenteId)?.nombre}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveAgent(assign.agenteId)}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Remover agente"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>

                                            {/* Botones de Estado */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Estado del Turno</label>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditAssignments(prev => prev.map(a =>
                                                                a.agenteId === assign.agenteId
                                                                    ? { ...a, status: "PENDING", absenceType: undefined, absenceReason: undefined }
                                                                    : a
                                                            ));
                                                        }}
                                                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${assign.status === "PENDING"
                                                            ? 'bg-blue-500 text-white shadow-md'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        <Clock className="h-3.5 w-3.5 inline mr-1" />
                                                        Pendiente
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditAssignments(prev => prev.map(a =>
                                                                a.agenteId === assign.agenteId
                                                                    ? { ...a, status: "CUMPLIDO", absenceType: undefined, absenceReason: undefined }
                                                                    : a
                                                            ));
                                                        }}
                                                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${assign.status === "CUMPLIDO"
                                                            ? 'bg-green-500 text-white shadow-md'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                                                        Cumplido
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditAssignments(prev => prev.map(a =>
                                                                a.agenteId === assign.agenteId
                                                                    ? { ...a, status: "FALTA" }
                                                                    : a
                                                            ));
                                                        }}
                                                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${assign.status === "FALTA"
                                                            ? 'bg-red-500 text-white shadow-md'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        <XCircle className="h-3.5 w-3.5 inline mr-1" />
                                                        Falta
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Campos adicionales si es FALTA */}
                                            {assign.status === "FALTA" && (
                                                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100 space-y-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1.5 block">
                                                            Tipo de Falta
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditAssignments(prev => prev.map(a =>
                                                                        a.agenteId === assign.agenteId
                                                                            ? { ...a, absenceType: "JUSTIFICADA" }
                                                                            : a
                                                                    ));
                                                                }}
                                                                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${assign.absenceType === "JUSTIFICADA"
                                                                    ? 'bg-orange-500 text-white'
                                                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                                                    }`}
                                                            >
                                                                Justificada
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditAssignments(prev => prev.map(a =>
                                                                        a.agenteId === assign.agenteId
                                                                            ? { ...a, absenceType: "INJUSTIFICADA" }
                                                                            : a
                                                                    ));
                                                                }}
                                                                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${assign.absenceType === "INJUSTIFICADA"
                                                                    ? 'bg-red-600 text-white'
                                                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                                                    }`}
                                                            >
                                                                Injustificada
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1.5 block">
                                                            Comentario
                                                        </label>
                                                        <textarea
                                                            value={assign.absenceReason || ""}
                                                            onChange={(e) => {
                                                                setEditAssignments(prev => prev.map(a =>
                                                                    a.agenteId === assign.agenteId
                                                                        ? { ...a, absenceReason: e.target.value }
                                                                        : a
                                                                ));
                                                            }}
                                                            placeholder="Razón de la falta..."
                                                            className="w-full px-2 py-1.5 text-xs border border-red-200 rounded-md focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none resize-none bg-white"
                                                            rows={2}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Agregar Nuevo */}
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Agregar Agente</label>
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
                                <AgentSelect
                                    agents={
                                        // Filtramos agentes que YA están en la lista provisional (editAssignments)
                                        // O que ya están asignados en otro lugar ese mismo día (isAgentAssignedElsewhere)
                                        activeAgents.filter(agent => {
                                            const alreadyInList = editAssignments.some(ea => ea.agenteId === agent.id);
                                            if (alreadyInList) return false;

                                            // activeCell existe si el modal está abierto, pero chequeamos por si acaso
                                            if (activeCell) {
                                                if (isAgentAssignedElsewhere(agent.id, activeCell.dateStr, currentKey)) return false;
                                            }

                                            return true;
                                        })
                                    }
                                    value={newAgentId}
                                    onChange={setNewAgentId}
                                    placeholder="Buscar por nombre..."
                                />
                                <button
                                    onClick={handleAddAgent}
                                    disabled={!newAgentId}
                                    className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 justify-center"
                                >
                                    <Plus className="h-4 w-4" />
                                    Agregar
                                </button>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-lg shadow-slate-900/10 transition-colors"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* Modal Vista por Agente */}
                <Modal
                    open={agentViewOpen}
                    onClose={() => setAgentViewOpen(false)}
                    title="Vista Mensual por Agente"
                    size="xl"
                >
                    <div className="mt-4 space-y-6 min-h-[400px]">
                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex-1 max-w-sm">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Seleccionar Agente</label>
                                <AgentSelect
                                    agents={activeAgents}
                                    value={viewAgentId}
                                    onChange={setViewAgentId}
                                />
                            </div>
                            <div className="flex-1 flex justify-end items-end h-full pt-6">
                                <button
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    onClick={() => window.print()}
                                >
                                    <Printer className="h-4 w-4" />
                                    Imprimir / PDF
                                </button>
                            </div>
                        </div>

                        {viewAgentId ? (
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                    <User className="h-5 w-5 text-blue-500" />
                                    {agentes.find(a => a.id === viewAgentId)?.nombre}
                                    <span className="text-gray-400 font-normal text-sm">| {currentDate.toLocaleDateString("es-PE", { month: 'long', year: 'numeric' })}</span>
                                </h3>

                                {/* Calendar Grid */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                    {/* Weekday Headers */}
                                    <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-center">
                                        {["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"].map(d => (
                                            <div key={d} className="py-2 text-xs font-bold text-gray-500 border-r last:border-r-0 border-gray-200">
                                                {d}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Days Grid */}
                                    <div className="grid grid-cols-7 bg-white">
                                        {(() => {
                                            const year = currentDate.getFullYear();
                                            const month = currentDate.getMonth();
                                            const daysInMonth = getDaysInMonth(year, month);
                                            const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday

                                            const cells = [];

                                            // Empty/Prev month cells
                                            for (let i = 0; i < firstDay; i++) {
                                                cells.push(
                                                    <div key={`empty-${i}`} className="min-h-[80px] bg-gray-50/30 border-b border-r border-gray-100 last:border-r-0"></div>
                                                );
                                            }

                                            // Day cells
                                            for (let d = 1; d <= daysInMonth; d++) {
                                                const dateObj = new Date(year, month, d);
                                                // Find assignment for this date
                                                const dayAssignments = viewAgentPlan.filter(p => p.date.getDate() === d);

                                                const isToday = new Date().toDateString() === dateObj.toDateString();

                                                cells.push(
                                                    <div key={`day-${d}`} className={`relative min-h-[100px] border-b border-r border-gray-100 p-2 last:border-r-0 hover:bg-gray-50 transition-colors ${isToday ? 'bg-blue-50/30' : ''}`}>
                                                        <span className={`text-sm font-semibold mb-1 block ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{d}</span>

                                                        <div className="flex flex-col gap-1">
                                                            {dayAssignments.map((a, idx) => (
                                                                <div key={idx} className={`p-1.5 rounded text-[10px] font-medium border leading-tight ${a.turno === 'DIA' ? 'bg-amber-50 text-amber-800 border-amber-100' : 'bg-indigo-50 text-indigo-800 border-indigo-100'
                                                                    }`}>
                                                                    <div className="flex items-center gap-1 mb-0.5">
                                                                        {a.turno === 'DIA' ? '☀' : '☾'}
                                                                        <span className="font-bold">{a.turno}</span>
                                                                    </div>
                                                                    <div className="truncate" title={a.puesto}>{a.puesto}</div>
                                                                    {a.status === 'FALTA' && <div className="text-red-600 font-bold mt-0.5">⚠ FALTA</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Fill remaining slots
                                            const totalSlots = firstDay + daysInMonth;
                                            const remaining = 35 - totalSlots > 0 ? 35 - totalSlots : (42 - totalSlots > 0 ? 42 - totalSlots : 0);

                                            for (let i = 0; i < remaining; i++) {
                                                cells.push(
                                                    <div key={`end-empty-${i}`} className="min-h-[80px] bg-gray-50/30 border-b border-r border-gray-100 last:border-r-0"></div>
                                                );
                                            }

                                            return cells;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-100">
                                <User className="h-10 w-10 mb-2 opacity-20" />
                                <p>Selecciona un agente para ver su detalle</p>
                            </div>
                        )}

                        {/* Modal Footer */}
                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setAgentViewOpen(false)}
                                className="px-6 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-lg shadow-slate-900/10 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* Modal Confirmación 6to Día */}
                <Modal
                    open={confirmModalOpen}
                    onClose={() => { setConfirmModalOpen(false); setPendingAgentId(""); }}
                    title="Advertencia de Sobrecarga"
                    size="sm"
                >
                    <div className="mt-4 flex flex-col gap-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                            <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-amber-800 text-sm">Asignación de 6to Día</h4>
                                <p className="text-xs text-amber-700 mt-1">
                                    El agente <span className="font-bold">{agentes.find(a => a.id === pendingAgentId)?.nombre}</span> ya tiene 5 turnos asignados esta semana.
                                    <br /><br />
                                    ¿Estás seguro de que deseas asignar un turno adicional?
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-2">
                            <button
                                onClick={() => { setConfirmModalOpen(false); setPendingAgentId(""); }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmAdd}
                                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                            >
                                Confirmar Asignación
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        </div>
    );
}
