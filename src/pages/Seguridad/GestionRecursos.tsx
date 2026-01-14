import { useState, useEffect } from "react";
import {
    Users,
    MapPin,
    Plus,
    Search,
    PencilLine,
    Moon,
    Sun
} from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { getSedesState, subscribeSedes } from "../../store/sedesStore";
import {
    getAgentesState,
    subscribeAgentes,
    upsertAgente,
    type Agente
} from "../../store/agentesStore";
import {
    getSupervisoresState,
    subscribeSupervisores,
    type Supervisor
} from "../../store/supervisoresStore";
import { getPuestosState, subscribePuestos, upsertPuesto, type Puesto, type Turno } from "../../store/puestosStore";

export default function GestionRecursos() {
    // Integrar stores desde Supabase
    const [, setSedesVersion] = useState(0);
    const [, setPuestosVersion] = useState(0);
    const [, setAgentesVersion] = useState(0);
    const [, setSupervisoresVersion] = useState(0);

    // View State
    const [activeTab, setActiveTab] = useState<"agentes" | "puestos">("agentes");

    useEffect(() => {
        const unsubSedes = subscribeSedes(() => setSedesVersion(prev => prev + 1));
        const unsubPuestos = subscribePuestos(() => setPuestosVersion(prev => prev + 1));
        const unsubAgentes = subscribeAgentes(() => setAgentesVersion(prev => prev + 1));
        const unsubSupervisores = subscribeSupervisores(() => setSupervisoresVersion(prev => prev + 1));

        return () => {
            unsubSedes();
            unsubPuestos();
            unsubAgentes();
            unsubSupervisores();
        };
    }, []);

    const { sedes } = getSedesState();
    const { puestos } = getPuestosState();
    const { agentes } = getAgentesState();
    const { supervisores } = getSupervisoresState();

    const [toast, setToast] = useState<ToastState>(null);

    // Calculate Counts
    const activeAgentesCount = agentes.filter(a => a.activo).length;
    const activePuestosCount = puestos.filter(p => p.activo).length;

    return (
        <div className="space-y-8 pb-20">
            <Toast toast={toast} onClose={() => setToast(null)} />

            {/* Header, Counters & Toggle */}
            <div className="bg-white/50 backdrop-blur-sm p-3 sm:p-4 rounded-2xl border border-gray-100 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 w-full">
                    {/* Title & Subtitle */}
                    <div className="flex items-start justify-between w-full sm:w-auto gap-2">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 leading-tight">
                                Gestión de Recursos
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500">
                                Administración de seguridad.
                            </p>
                        </div>

                        {/* Mobile Only: Counters appear here next to title */}
                        <div className="flex items-end gap-2 sm:hidden">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200">
                                <div className="p-1 bg-blue-50 rounded-md">
                                    <Users size={14} className="text-blue-600" />
                                </div>
                                <div className="flex flex-col items-end leading-none">
                                    <span className="text-base font-bold text-gray-900">{activeAgentesCount}</span>
                                    <span className="text-[10px] text-gray-500 font-medium">Agentes</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200">
                                <div className="p-1 bg-emerald-50 rounded-md">
                                    <MapPin size={14} className="text-emerald-600" />
                                </div>
                                <div className="flex flex-col items-end leading-none">
                                    <span className="text-base font-bold text-gray-900">{activePuestosCount}</span>
                                    <span className="text-[10px] text-gray-500 font-medium">Puestos</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Only: Counters appear inline */}
                    <div className="hidden sm:flex items-center gap-4">
                        <div className="h-10 w-px bg-gray-200"></div>

                        <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-gray-200">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Users size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Agentes</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-gray-900">{activeAgentesCount}</span>
                                    <span className="text-xs text-gray-400 font-medium">/ {agentes.length}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-gray-200">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <MapPin size={20} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Puestos</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-gray-900">{activePuestosCount}</span>
                                    <span className="text-xs text-gray-400 font-medium">/ {puestos.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toggle */}
                <div className="bg-gray-100/80 p-1 rounded-lg border border-gray-200 self-start sm:self-auto w-full sm:w-auto">
                    <div className="flex w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab("agentes")}
                            className={`
                                    flex-1 sm:flex-none justify-center items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                                    ${activeTab === "agentes"
                                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"}
                                `}
                        >
                            <Users size={14} />
                            Agentes
                        </button>
                        <button
                            onClick={() => setActiveTab("puestos")}
                            className={`
                                    flex-1 sm:flex-none justify-center items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                                    ${activeTab === "puestos"
                                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"}
                                `}
                        >
                            <MapPin size={14} />
                            Puestos
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
                {activeTab === "agentes" ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

                        <TabAgentes
                            agentes={agentes}
                            supervisores={supervisores}
                            setToast={setToast}
                            onAdd={async (nombre, dni, supervisor) => {
                                try {
                                    await upsertAgente({ nombre, dni, supervisor });
                                    setToast({ type: "success", message: "Agente creado correctamente." });
                                } catch (error: any) {
                                    setToast({ type: "error", message: error.message || "Error al crear agente." });
                                }
                            }}
                            onUpdate={async (id, data) => {
                                try {
                                    const agente = agentes.find(a => a.id === id);
                                    if (!agente) return;
                                    await upsertAgente({
                                        id,
                                        nombre: data.nombre ?? agente.nombre,
                                        dni: data.dni ?? agente.dni ?? undefined,
                                        supervisor: data.supervisor ?? agente.supervisor ?? undefined,
                                        activo: data.activo ?? agente.activo
                                    });
                                    setToast({ type: "success", message: "Agente actualizado." });
                                } catch (error: any) {
                                    setToast({ type: "error", message: error.message || "Error al actualizar agente." });
                                }
                            }}
                        />
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

                        <TabPuestos
                            sedes={sedes}
                            puestos={puestos}
                            onAdd={async (nombre, sede_id, turnos) => {
                                try {
                                    await upsertPuesto({ nombre, sede_id, turnos });
                                    setToast({ type: "success", message: "Puesto creado correctamente." });
                                } catch (error: any) {
                                    setToast({ type: "error", message: error.message || "Error al crear puesto." });
                                }
                            }}
                            onUpdate={async (id, data) => {
                                try {
                                    const puesto = puestos.find(p => p.id === id);
                                    if (!puesto) return;
                                    await upsertPuesto({
                                        id,
                                        nombre: data.nombre ?? puesto.nombre,
                                        sede_id: data.sede_id ?? puesto.sede_id,
                                        turnos: data.turnos ?? puesto.turnos,
                                        activo: data.activo ?? puesto.activo
                                    });
                                    setToast({ type: "success", message: "Puesto actualizado." });
                                } catch (error: any) {
                                    setToast({ type: "error", message: error.message || "Error al actualizar puesto." });
                                }
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Subcomponente: Agentes ---

function TabAgentes({
    agentes,
    supervisores,
    setToast,
    onAdd,
    onUpdate
}: {
    agentes: Agente[];
    supervisores: Supervisor[];
    setToast: (t: ToastState) => void;
    onAdd: (n: string, d?: string, s?: string) => void;
    onUpdate: (id: string, d: Partial<Agente>) => void;
}) {
    const [search, setSearch] = useState("");
    const [supervisorFilter, setSupervisorFilter] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<Agente | null>(null);
    const [formData, setFormData] = useState({ nombre: "", dni: "", supervisor: "", activo: true });

    const filtered = agentes.filter(a => {
        const matchesSearch = a.nombre.toLowerCase().includes(search.toLowerCase());
        const matchesSupervisor = supervisorFilter ? a.supervisor === supervisorFilter : true;
        return matchesSearch && matchesSupervisor;
    });

    const handleOpen = (item?: Agente) => {
        if (item) {
            setEditItem(item);
            setFormData({ nombre: item.nombre, dni: item.dni || "", supervisor: item.supervisor || "", activo: item.activo });
        } else {
            setEditItem(null);
            setFormData({ nombre: "", dni: "", supervisor: "", activo: true });
        }
        setModalOpen(true);
    };

    const handleSubmit = () => {
        if (!formData.nombre.trim()) return;

        // Validar DNI duplicado
        if (formData.dni) {
            const duplicate = agentes.find(a => a.dni === formData.dni && a.id !== editItem?.id);
            if (duplicate) {
                setToast({ type: "error", message: "El DNI ya está registrado en otro agente." });
                return;
            }
        }

        if (editItem) {
            onUpdate(editItem.id, {
                nombre: formData.nombre,
                dni: formData.dni,
                supervisor: formData.supervisor,
                activo: formData.activo
            });
        } else {
            onAdd(formData.nombre, formData.dni, formData.supervisor);
        }
        setModalOpen(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1 max-w-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar agente..."
                            className="pl-9 w-full rounded-xl border border-gray-300 text-sm focus:ring-red-500 focus:border-red-500 h-10"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-10 rounded-xl border border-gray-300 text-sm focus:ring-red-500 focus:border-red-500 w-40"
                        value={supervisorFilter}
                        onChange={e => setSupervisorFilter(e.target.value)}
                    >
                        <option value="">Todos (Sup)</option>
                        {supervisores.filter(s => s.activo).map(s => (
                            <option key={s.id} value={s.nombre}>
                                {s.nombre}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={() => handleOpen()}
                    style={{ backgroundColor: "#ff0000" }}
                    className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors shrink-0 shadow-sm shadow-red-200"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Agente
                </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-2.5">Nombre</th>
                            <th className="px-4 py-2.5">DNI</th>
                            <th className="px-4 py-2.5">Supervisor</th>
                            <th className="px-4 py-2.5">Estado</th>
                            <th className="px-4 py-2.5 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map(a => (
                            <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2 font-medium text-gray-900">{a.nombre}</td>
                                <td className="px-4 py-2 text-gray-600">{a.dni || "-"}</td>
                                <td className="px-4 py-2 text-gray-600 truncate max-w-[120px]" title={a.supervisor || ""}>{a.supervisor || "-"}</td>
                                <td className="px-4 py-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${a.activo ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-gray-50 text-gray-500 border border-gray-100"}`}>
                                        {a.activo ? "Activo" : "Inactivo"}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <button
                                        onClick={() => handleOpen(a)}
                                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                    >
                                        <PencilLine className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                                    No se encontraron agentes.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editItem ? "Editar Agente" : "Nuevo Agente"}
                size="sm"
            >
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre Completo</label>
                        <input
                            type="text"
                            className="w-full h-11 rounded-lg border-gray-300 focus:border-red-500 focus:ring-red-500 text-sm px-3 border border-gray-200"
                            value={formData.nombre}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            placeholder="Nombre del Agente"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">DNI</label>
                        <input
                            type="text"
                            className="w-full h-11 rounded-lg border-gray-300 focus:border-red-500 focus:ring-red-500 text-sm px-3 border border-gray-200"
                            value={formData.dni}
                            onChange={e => setFormData({ ...formData, dni: e.target.value })}
                            placeholder="DNI del Agente"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Supervisor</label>
                        <select
                            className="w-full h-11 rounded-lg border-gray-300 focus:border-red-500 focus:ring-red-500 text-sm px-3 border border-gray-200"
                            value={formData.supervisor}
                            onChange={e => setFormData({ ...formData, supervisor: e.target.value })}
                        >
                            <option value="">-- Seleccionar --</option>
                            {supervisores.filter(s => s.activo).map(s => (
                                <option key={s.id} value={s.nombre}>
                                    {s.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    {editItem && (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 mt-2">
                            <span className="text-sm font-medium text-gray-700">Agente Activo</span>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, activo: !formData.activo })}
                                className={`
                                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none
                                    ${formData.activo ? "bg-emerald-500" : "bg-gray-300"}
                                `}
                            >
                                <span
                                    className={`
                                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
                                        ${formData.activo ? "translate-x-6" : "translate-x-1"}
                                    `}
                                />
                            </button>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
                        <button onClick={handleSubmit} className="px-4 py-2 text-sm text-white bg-red-800 hover:bg-red-600 rounded-lg">Guardar</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// --- Subcomponente: Puestos ---

function TabPuestos({
    sedes,
    puestos,
    onAdd,
    onUpdate
}: {
    sedes: { id: string, nombre: string }[];
    puestos: Puesto[];
    onAdd: (n: string, s: string, t: Turno[]) => void;
    onUpdate: (id: string, d: Partial<Puesto>) => void;
}) {
    const [search, setSearch] = useState("");
    const [sedeFilter, setSedeFilter] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<Puesto | null>(null);

    // Form State
    const [nombre, setNombre] = useState("");
    const [sedeId, setSedeId] = useState("");
    const [turnos, setTurnos] = useState<Turno[]>(["DIA", "NOCHE"]);
    const [activo, setActivo] = useState(true);

    const filtered = puestos.filter(p => {
        const matchesSearch = p.nombre.toLowerCase().includes(search.toLowerCase());
        const matchesSede = sedeFilter ? p.sede_id === sedeFilter : true;
        return matchesSearch && matchesSede;
    });

    const handleOpen = (item?: Puesto) => {
        if (item) {
            setEditItem(item);
            setNombre(item.nombre);
            setSedeId(item.sede_id);
            setTurnos(item.turnos);
            setActivo(item.activo);
        } else {
            setEditItem(null);
            setNombre("");
            setSedeId(sedes[0]?.id || "");
            setTurnos(["DIA", "NOCHE"]);
            setActivo(true);
        }
        setModalOpen(true);
    };

    const toggleTurno = (t: Turno) => {
        setTurnos(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
    };

    const handleSubmit = () => {
        if (!nombre.trim() || !sedeId) return;

        if (editItem) {
            onUpdate(editItem.id, { nombre, sede_id: sedeId, turnos, activo });
        } else {
            onAdd(nombre, sedeId, turnos);
        }
        setModalOpen(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1 max-w-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar puesto..."
                            className="pl-9 w-full rounded-xl border border-gray-300 text-sm focus:ring-red-500 focus:border-red-500 h-10"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-10 rounded-xl border border-gray-300 text-sm focus:ring-red-500 focus:border-red-500 w-40"
                        value={sedeFilter}
                        onChange={e => setSedeFilter(e.target.value)}
                    >
                        <option value="">Todas las Sedes</option>
                        {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                </div>
                <button
                    onClick={() => handleOpen()}
                    style={{ backgroundColor: "#ff0000" }}
                    className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors shrink-0 shadow-sm shadow-red-200"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Puesto
                </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-2.5">Nombre del Puesto</th>
                            <th className="px-4 py-2.5">Sede</th>
                            <th className="px-4 py-2.5">Turnos</th>
                            <th className="px-4 py-2.5">Estado</th>
                            <th className="px-4 py-2.5 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map(p => {
                            const sedeName = sedes.find(s => s.id === p.sede_id)?.nombre || "Desconocida";
                            return (
                                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-2 font-medium text-gray-900">{p.nombre}</td>
                                    <td className="px-4 py-2 text-gray-600">{sedeName}</td>
                                    <td className="px-4 py-2">
                                        <div className="flex gap-1.5">
                                            {p.turnos.includes("DIA") && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">🌞 DIA</span>}
                                            {p.turnos.includes("NOCHE") && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-100">🌙 NOCHE</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${p.activo ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-gray-50 text-gray-500 border border-gray-100"}`}>
                                            {p.activo ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <button
                                            onClick={() => handleOpen(p)}
                                            className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                        >
                                            <PencilLine className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                                    No se encontraron puestos.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editItem ? "Editar Puesto" : "Nuevo Puesto"}
                size="sm"
            >
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del Puesto</label>
                        <input
                            type="text"
                            className="w-full h-11 rounded-lg border-gray-300 focus:border-red-500 focus:ring-red-500 text-sm px-3 border border-gray-200"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="Nombre del Puesto"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Sede</label>
                        <select
                            className="w-full h-11 rounded-lg border-gray-300 focus:border-red-500 focus:ring-red-500 text-sm px-3 border border-gray-200"
                            value={sedeId}
                            onChange={e => setSedeId(e.target.value)}
                        >
                            <option value="">-- Seleccionar Sede --</option>
                            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Turnos Habilitados</label>
                        <div className="flex gap-4">
                            <label
                                className={`
                                flex items-center justify-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 flex-1
                                ${turnos.includes("DIA")
                                        ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                                        : "border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50"}
                            `}
                            >
                                <input
                                    type="checkbox"
                                    className="hidden" // Quitamos el checkbox visualmente
                                    checked={turnos.includes("DIA")}
                                    onChange={() => toggleTurno("DIA")}
                                />

                                <Sun
                                    size={20}
                                    strokeWidth={turnos.includes("DIA") ? 2.5 : 2}
                                    className={turnos.includes("DIA") ? "text-orange-600" : "text-gray-400"}
                                />

                                <span className="font-bold text-sm tracking-wide">
                                    DIA
                                </span>
                            </label>
                            <label
                                className={`
                                    flex items-center justify-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 flex-1
                                    ${turnos.includes("NOCHE")
                                        ? "border-red-500 bg-red-50 text-red-700 shadow-sm"
                                        : "border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50"}
                                `}
                            >
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={turnos.includes("NOCHE")}
                                    onChange={() => toggleTurno("NOCHE")}
                                />

                                <Moon
                                    size={20}
                                    strokeWidth={turnos.includes("NOCHE") ? 2.5 : 2}
                                    className={turnos.includes("NOCHE") ? "text-red-600" : "text-gray-400"}
                                />

                                <span className="font-bold text-sm tracking-wide">
                                    NOCHE
                                </span>
                            </label>
                        </div>
                    </div>

                    {editItem && (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 mt-2">
                            <span className="text-sm font-medium text-gray-700">Puesto Activo</span>
                            <button
                                type="button"
                                onClick={() => setActivo(!activo)}
                                className={`
                                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none
                                    ${activo ? "bg-emerald-500" : "bg-gray-300"}
                                `}
                            >
                                <span
                                    className={`
                                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
                                        ${activo ? "translate-x-6" : "translate-x-1"}
                                    `}
                                />
                            </button>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
                        <button onClick={handleSubmit} className="px-4 py-2 text-sm text-white bg-gray-900 hover:bg-gray-800 rounded-lg">Guardar</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
