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
import { getAgentesState, subscribeAgentes, upsertAgente, type Agente } from "../../store/agentesStore";
import { getPuestosState, subscribePuestos, upsertPuesto, type Puesto, type Turno } from "../../store/puestosStore";

export default function GestionRecursos() {
    // Integrar stores desde Supabase
    const [, setSedesVersion] = useState(0);
    const [, setAgentesVersion] = useState(0);
    const [, setPuestosVersion] = useState(0);

    useEffect(() => {
        const unsubSedes = subscribeSedes(() => setSedesVersion(prev => prev + 1));
        const unsubAgentes = subscribeAgentes(() => setAgentesVersion(prev => prev + 1));
        const unsubPuestos = subscribePuestos(() => setPuestosVersion(prev => prev + 1));

        return () => {
            unsubSedes();
            unsubAgentes();
            unsubPuestos();
        };
    }, []);

    const { sedes } = getSedesState();
    const { agentes } = getAgentesState();
    const { puestos } = getPuestosState();

    const [toast, setToast] = useState<ToastState>(null);

    return (
        <div className="space-y-6 pb-20">
            <Toast toast={toast} onClose={() => setToast(null)} />

            <div className="px-1">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                    Gestión de Recursos
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Administración de agentes de seguridad y puestos de vigilancia.
                </p>
            </div>

            {/* 2-Column Grid Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <Users className="h-5 w-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Agentes de Seguridad</h2>
                    </div>
                    <TabAgentes
                        agentes={agentes}
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

                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <MapPin className="h-5 w-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Puestos de Vigilancia</h2>
                    </div>
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
            </div>
        </div>
    );
}

// --- Subcomponente: Agentes ---

function TabAgentes({
    agentes,
    onAdd,
    onUpdate
}: {
    agentes: Agente[];
    onAdd: (n: string, d?: string, s?: string) => void;
    onUpdate: (id: string, d: Partial<Agente>) => void;
}) {
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<Agente | null>(null);
    const [formData, setFormData] = useState({ nombre: "", dni: "", supervisor: "", activo: true });

    const filtered = agentes.filter(a => a.nombre.toLowerCase().includes(search.toLowerCase()));

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
            <div className="flex items-center justify-between">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar agente..."
                        className="pl-9 w-full rounded-xl border-gray-200 text-sm focus:ring-red-500 focus:border-red-500 h-10"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => handleOpen()}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
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
                        <input
                            type="text"
                            className="w-full h-11 rounded-lg border-gray-300 focus:border-red-500 focus:ring-red-500 text-sm px-3 border border-gray-200"
                            value={formData.supervisor}
                            onChange={e => setFormData({ ...formData, supervisor: e.target.value })}
                            placeholder="Nombre del supervisor"
                        />
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
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<Puesto | null>(null);

    // Form State
    const [nombre, setNombre] = useState("");
    const [sedeId, setSedeId] = useState("");
    const [turnos, setTurnos] = useState<Turno[]>(["DIA", "NOCHE"]);
    const [activo, setActivo] = useState(true);

    const filtered = puestos.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));

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
            <div className="flex items-center justify-between">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar puesto..."
                        className="pl-9 w-full rounded-xl border-gray-200 text-sm focus:ring-red-500 focus:border-red-500 h-10"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => handleOpen()}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
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
