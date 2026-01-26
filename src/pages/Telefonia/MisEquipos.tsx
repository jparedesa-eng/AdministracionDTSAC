import { useEffect, useState } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import { useAuth } from "../../auth/AuthContext";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { Loader2, Search, Smartphone, User, MapPin, UserPlus, Check, Cpu, RefreshCw, CornerUpLeft, AlertTriangle, ClipboardCheck } from "lucide-react";
import { getSedesState, subscribeSedes } from "../../store/sedesStore";

interface AsignacionUI {
    id: string; // asignacion id
    equipo_id: string;
    equipo_marca: string;
    equipo_modelo: string;
    equipo_imei: string;
    equipo_categoria: string; // New
    equipo_ubicacion: string; // New
    usuario_final_dni: string;
    usuario_final_nombre: string;
    usuario_final_area: string;
    usuario_final_puesto: string; // New field
    usuario_final_sede: string; // New field
    fecha_entrega: string;
    solicitud_id: string | null;
    fecha_entrega_final: string; // New field
    editMode: boolean;
    // Temp edit values
    temp_dni: string;
    temp_nombre: string;
    temp_area: string;
    temp_puesto: string; // New field
    temp_sede: string;
    temp_fecha_entrega_final: string;
    // Solo Chip Fields
    isSoloChip: boolean;
    tipo_equipo_destino?: string;
    codigo_equipo_destino?: string;
    estado: string; // New
}

export default function MisEquipos() {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);
    const [assignments, setAssignments] = useState<AsignacionUI[]>([]);
    const [q, setQ] = useState("");
    const { sedes } = getSedesState();
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState<AsignacionUI | null>(null);
    const [itemErrors, setItemErrors] = useState<Record<string, string>>({}); // ID -> Error mapping

    const loadMisEquipos = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const allMyAssignments: AsignacionUI[] = [];
            const processedIds = new Set<string>(); // Avoid duplicates if filters overlap

            // 1. Fetch from Tickets (Created by me) - REMOVED (Deprecated created_by logic)
            // Logic moved to Direct Assignments check only for 'Mis Equipos' concept.
            /* 
            await telefoniaStore.fetchSolicitudes(); 
            const myTickets = telefoniaStore.solicitudes.filter(s => s.usuario_creador_id === user.id);

            myTickets.forEach(ticket => {
                // ... (Logic removed to rely on responsible check)
            }); 
            */

            // 2. Fetch from Direct Assignments (Where I am Responsable)
            if (profile?.dni) {
                const directAssignments = await telefoniaStore.fetchAsignacionesPorResponsable(profile.dni);
                if (directAssignments) {
                    directAssignments.forEach(asig => {
                        if (!processedIds.has(asig.id)) {
                            allMyAssignments.push({
                                id: asig.id,
                                equipo_id: asig.equipo_id || "",
                                equipo_marca: asig.equipo?.marca || "Desconocido",
                                equipo_modelo: asig.equipo?.modelo || "",
                                equipo_imei: asig.equipo?.imei || "",
                                equipo_categoria: asig.equipo?.categoria || "TELEFONIA",
                                equipo_ubicacion: asig.equipo?.ubicacion || "BASE",
                                usuario_final_dni: asig.usuario_final_dni || "",
                                usuario_final_nombre: asig.usuario_final_nombre || "",
                                usuario_final_area: asig.usuario_final_area || "",
                                usuario_final_puesto: asig.usuario_final_puesto || "",
                                usuario_final_sede: asig.usuario_final_sede || "",
                                fecha_entrega: asig.fecha_entrega || "",
                                solicitud_id: asig.solicitud_id, // Might be null
                                fecha_entrega_final: asig.fecha_entrega_final || "",
                                editMode: false,
                                temp_dni: asig.usuario_final_dni || "",
                                temp_nombre: asig.usuario_final_nombre || "",
                                temp_area: asig.usuario_final_area || "",
                                temp_puesto: asig.usuario_final_puesto || "",
                                temp_sede: asig.usuario_final_sede || "",
                                temp_fecha_entrega_final: asig.fecha_entrega_final || "",

                                isSoloChip: !asig.equipo_id && !!asig.chip_id,
                                tipo_equipo_destino: asig.tipo_equipo_destino || "",
                                codigo_equipo_destino: asig.codigo_equipo_destino || "",
                                estado: asig.estado || "Asignado"
                            });
                            processedIds.add(asig.id);
                        }
                    });
                }
            }

            setAssignments(allMyAssignments);

        } catch (error) {
            console.error(error);
            setToast({ type: "error", message: "Error cargando equipos" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMisEquipos();
    }, [user?.id]);

    // Subscribe to Sedes
    const [, setSedesVersion] = useState(0);
    useEffect(() => {
        const unsub = subscribeSedes(() => setSedesVersion(prev => prev + 1));
        return () => unsub();
    }, []);

    const toggleEdit = (id: string) => {
        setAssignments(prev => prev.map(a => {
            if (a.id === id) {
                return {
                    ...a,
                    editMode: !a.editMode,
                    // Reset temps on cancel
                    temp_dni: !a.editMode ? a.usuario_final_dni : a.temp_dni,
                    temp_nombre: !a.editMode ? a.usuario_final_nombre : a.temp_nombre,
                    temp_area: !a.editMode ? a.usuario_final_area : a.temp_area,
                    temp_puesto: !a.editMode ? a.usuario_final_puesto : a.temp_puesto,
                    temp_sede: !a.editMode ? a.usuario_final_sede : a.temp_sede,
                    temp_fecha_entrega_final: !a.editMode
                        ? (a.fecha_entrega_final ? a.fecha_entrega_final.split('T')[0] : (() => {
                            const d = new Date();
                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        })())
                        : a.temp_fecha_entrega_final
                };
            }
            return a;
        }));
    };

    const handleReassign = (id: string) => {
        setAssignments(prev => prev.map(a => {
            if (a.id === id) {
                return {
                    ...a,
                    editMode: true,
                    // Clear temps for new assignment
                    temp_dni: "",
                    temp_nombre: "",
                    temp_area: "",
                    temp_puesto: "",
                    temp_sede: "",
                    temp_fecha_entrega_final: (() => {
                        const d = new Date();
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    })()
                };
            }
            return a;
        }));
    };

    const handleSave = async (item: AsignacionUI) => {
        try {

            // Validation
            if (item.isSoloChip) {
                if (!item.temp_sede) {
                    setToast({ type: "error", message: "La Sede es obligatoria para Chips" });
                    return;
                }
            } else {
                if (!item.temp_dni || !item.temp_nombre || !item.temp_area || !item.temp_sede) {
                    setToast({ type: "error", message: "Todos los campos son obligatorios (DNI, Nombre, Área, Sede)" });
                    return;
                }
            }

            if (item.temp_fecha_entrega_final) {
                // Parse date string 'YYYY-MM-DD' manually to avoid UTC offset issues
                const [y, m, d] = item.temp_fecha_entrega_final.split('-').map(Number);
                const finalDate = new Date(y, m - 1, d); // Local Midnight

                const recibidoDate = new Date(item.fecha_entrega);
                recibidoDate.setHours(0, 0, 0, 0); // Local Midnight

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (finalDate < recibidoDate) {
                    setToast({ type: "error", message: "La fecha final no puede ser anterior a la de recibido" });
                    return;
                }
                if (finalDate > today) {
                    setToast({ type: "error", message: "La fecha final no puede ser futura" });
                    return;
                }
            }

            // --- BLOCKING VALIDATION (Only if DNI changed) ---
            if (item.temp_dni && item.temp_dni.length === 8 && item.temp_dni !== item.usuario_final_dni) {
                const check = await telefoniaStore.checkActiveAssignment(item.temp_dni);
                if (check.exists) {
                    setToast({ type: 'error', message: check.message || "Usuario ya tiene asignación." });
                    setItemErrors(prev => ({ ...prev, [item.id]: "Usuario ya tiene equipo asignado" }));
                    return;
                }
            }
            // -------------------------------------------------

            // Clear error if valid
            setItemErrors(prev => {
                const n = { ...prev };
                delete n[item.id];
                return n;
            });

            await telefoniaStore.updateAsignacionResponsable(item.id, {
                dni: item.temp_dni,
                nombre: item.temp_nombre,
                area: item.temp_area,
                puesto: item.temp_puesto,
                sede: item.temp_sede,
                fecha_entrega_final: item.temp_fecha_entrega_final
            });

            setAssignments(prev => prev.map(a => {
                if (a.id === item.id) {
                    return {
                        ...a,
                        usuario_final_dni: item.temp_dni,
                        usuario_final_nombre: item.temp_nombre,
                        usuario_final_area: item.temp_area,
                        usuario_final_puesto: item.temp_puesto,
                        usuario_final_sede: item.temp_sede,
                        fecha_entrega_final: item.temp_fecha_entrega_final,
                        editMode: false
                    };
                }
                return a;
            }));

            setToast({ type: "success", message: "Responsable actualizado" });
        } catch (error) {
            console.error("Error updating assignment:", error);
            setToast({ type: "error", message: "Error al actualizar" });
        }
    };

    const handleChange = (id: string, field: 'temp_dni' | 'temp_nombre' | 'temp_area' | 'temp_puesto' | 'temp_sede' | 'temp_fecha_entrega_final', value: string) => {
        setAssignments(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    const handleOpenReturn = (item: AsignacionUI) => {
        setSelectedReturn(item);
        setReturnModalOpen(true);
    };

    const confirmReturn = async () => {
        if (!selectedReturn) return;
        try {
            await telefoniaStore.marcarParaDevolucion(
                selectedReturn.id,
                selectedReturn.equipo_id || undefined,
                selectedReturn.isSoloChip ? undefined : undefined // Todo: verify if chipId is needed. 
                // For now, only passing equipoId as store logic primarily handles equipment or chip logic could be added if needed.
                // Since MisEquipos deals mainly with the assignment, passing ID is key.
            );

            // Update local state
            setAssignments(prev => prev.map(a =>
                a.id === selectedReturn.id ? { ...a, estado: "PARA DEVOLUCION" } : a
            ));

            setToast({ type: "success", message: "Equipo marcado para devolución" });
            setReturnModalOpen(false);
            setSelectedReturn(null);
        } catch (error) {
            console.error(error);
            setToast({ type: "error", message: "Error al registrar devolución" });
        }
    };

    const filtered = assignments.filter(a =>
        a.equipo_modelo.toLowerCase().includes(q.toLowerCase()) ||
        a.usuario_final_nombre.toLowerCase().includes(q.toLowerCase()) ||
        a.usuario_final_area.toLowerCase().includes(q.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Mis Equipos Asignados</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Gestiona los equipos que tienes bajo responsabilidad y registra la entrega final de los equipos.
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="flex flex-col items-center bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm min-w-[100px]">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</span>
                        <span className="text-xl font-bold text-gray-900">{assignments.length}</span>
                    </div>
                    <div className="flex flex-col items-center bg-white px-4 py-2 rounded-lg border border-green-200 shadow-sm min-w-[100px]">
                        <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Asignados</span>
                        <span className="text-xl font-bold text-green-700">{assignments.filter(a => a.usuario_final_nombre).length}</span>
                    </div>
                </div>
            </div>


            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            {/* Filter */}
            <div className="max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
                    placeholder="Buscar por modelo, usuario o área..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                />
            </div>

            {
                loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <Smartphone className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">No tienes equipos asignados</h3>
                        <p className="mt-1 text-sm text-gray-500">Cuando recibas equipos, aparecerán aquí para que asignes su usuario final.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map(item => (
                            <div key={item.id} className="relative flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-4 flex-1">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${item.isSoloChip ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                {item.isSoloChip ? <Cpu className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">
                                                    {item.isSoloChip
                                                        ? (item.tipo_equipo_destino || "Línea Móvil (Solo Chip)")
                                                        : `${item.equipo_marca} ${item.equipo_modelo}`}
                                                </h3>
                                                <p className="text-xs text-gray-500 font-mono mb-1">
                                                    {item.isSoloChip
                                                        ? `En equipo: ${item.codigo_equipo_destino || 'N/A'}`
                                                        : `IMEI: ${item.equipo_imei}`}
                                                </p>
                                                <div className="flex gap-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.isSoloChip ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {item.isSoloChip ? "CHIP" : item.equipo_categoria}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                        <MapPin className="w-3 h-3 mr-1" />
                                                        {item.equipo_ubicacion}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-3">
                                        {/* Form for User Info */}
                                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                                                <User className="h-3 w-3" />
                                                USUARIO FINAL
                                            </div>

                                            {item.editMode ? (
                                                <div className="space-y-3 animate-in fade-in duration-200">
                                                    {!item.isSoloChip && (
                                                        <>
                                                            <div>
                                                                <label className="text-[10px] uppercase text-gray-400 font-semibold ml-1">DNI</label>
                                                                <input
                                                                    className={`w-full text-base border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-2 ${itemErrors[item.id] ? 'border-red-500 bg-red-50' : ''}`}
                                                                    placeholder="Ingrese DNI"
                                                                    value={item.temp_dni}
                                                                    onChange={async (e) => {
                                                                        const val = e.target.value;
                                                                        handleChange(item.id, 'temp_dni', val);

                                                                        // Clear previous error
                                                                        if (itemErrors[item.id]) {
                                                                            setItemErrors(prev => {
                                                                                const n = { ...prev };
                                                                                delete n[item.id];
                                                                                return n;
                                                                            });
                                                                        }

                                                                        // Real-time Check
                                                                        if (val && val.length === 8 && val !== item.usuario_final_dni) {
                                                                            const check = await telefoniaStore.checkActiveAssignment(val);
                                                                            if (check.exists) {
                                                                                setItemErrors(prev => ({ ...prev, [item.id]: check.message || "Usuario ya tiene asignación." }));
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                                {itemErrors[item.id] && <p className="text-xs text-red-600 mt-1">{itemErrors[item.id]}</p>}
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] uppercase text-gray-400 font-semibold ml-1">Nombre Completo</label>
                                                                <input
                                                                    className="w-full text-base border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-2"
                                                                    placeholder="Nombres y Apellidos"
                                                                    value={item.temp_nombre}
                                                                    onChange={e => handleChange(item.id, 'temp_nombre', e.target.value)}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] uppercase text-gray-400 font-semibold ml-1">Área</label>
                                                                <input
                                                                    className="w-full text-base border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-2"
                                                                    placeholder="Ingresa el Área"
                                                                    value={item.temp_area}
                                                                    onChange={e => handleChange(item.id, 'temp_area', e.target.value)}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] uppercase text-gray-400 font-semibold ml-1">Puesto</label>
                                                                <input
                                                                    className="w-full text-base border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-2"
                                                                    placeholder="Ingresa el Puesto"
                                                                    value={item.temp_puesto}
                                                                    onChange={e => handleChange(item.id, 'temp_puesto', e.target.value)}
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                    <div>
                                                        <label className="text-[10px] uppercase text-gray-400 font-semibold ml-1">Sede</label>
                                                        <select
                                                            className="w-full text-base border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-2"
                                                            value={item.temp_sede}
                                                            onChange={e => handleChange(item.id, 'temp_sede', e.target.value)}
                                                        >
                                                            <option value="">Seleccione Sede...</option>
                                                            <option value="BASE">BASE</option>
                                                            {sedes.map(s => (
                                                                <option key={s.id} value={s.nombre}>{s.nombre}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] uppercase text-gray-400 font-semibold ml-1">Fecha Entrega Final</label>
                                                        <input
                                                            type="date"
                                                            className="w-full text-base border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-2"
                                                            value={item.temp_fecha_entrega_final}
                                                            min={item.fecha_entrega ? item.fecha_entrega.split('T')[0] : undefined}
                                                            max={new Date().toISOString().split('T')[0]}
                                                            onChange={e => handleChange(item.id, 'temp_fecha_entrega_final', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pl-1">
                                                    {item.isSoloChip ? (
                                                        <div className="space-y-2">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <span className="text-[10px] text-gray-400 font-semibold uppercase block">EQUIPO</span>
                                                                    <span className="text-sm font-medium text-gray-900">{item.tipo_equipo_destino || "No especificado"}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-[10px] text-gray-400 font-semibold uppercase block">Código / IMEI</span>
                                                                    <span className="text-sm font-medium text-gray-900">{item.codigo_equipo_destino || "S/N"}</span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-gray-400 font-semibold uppercase block">Sede / Ubicación</span>
                                                                <span className={`text-sm font-bold ${item.usuario_final_sede ? 'text-indigo-600' : 'text-gray-400 italic'}`}>
                                                                    {item.usuario_final_sede || "Ubicación no definida"}
                                                                </span>
                                                            </div>
                                                            <div className="pt-2 border-t border-gray-100 mt-2">
                                                                <span className="text-[10px] text-gray-400 font-semibold uppercase block">Fecha Entrega</span>
                                                                <span className="text-xs text-gray-700">{new Date(item.fecha_entrega).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    ) : item.usuario_final_nombre ? (
                                                        <>
                                                            <div className="font-medium text-gray-900 text-sm">{item.usuario_final_nombre}</div>
                                                            <div className="text-xs text-gray-500">
                                                                <div>{item.usuario_final_area} {item.usuario_final_sede ? `- ${item.usuario_final_sede}` : ''}</div>
                                                                {item.usuario_final_puesto && <div className="font-semibold text-gray-400">{item.usuario_final_puesto}</div>}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400">DNI: {item.usuario_final_dni}</div>
                                                        </>
                                                    ) : (
                                                        <span className="text-sm text-gray-400 italic">Sin asignar usuario específico</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1 text-xs text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-3 w-3" />
                                                Fecha de Recibido: {new Date(item.fecha_entrega).toLocaleDateString()}
                                            </div>
                                            {item.fecha_entrega_final && (
                                                <div className="flex items-center gap-2 text-indigo-600 font-medium">
                                                    <Check className="h-3 w-3" />
                                                    Entrega Final: {new Date(item.fecha_entrega_final).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                                    {item.editMode ? (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => toggleEdit(item.id)}
                                                className="flex-1 py-2.5 rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 font-medium text-sm transition-colors shadow-sm"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={() => handleSave(item)}
                                                className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                                            >
                                                <Check className="h-4 w-4" />
                                                Guardar
                                            </button>
                                        </div>
                                    ) : !item.usuario_final_nombre ? (
                                        <button
                                            onClick={() => toggleEdit(item.id)}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                                        >
                                            <UserPlus className="h-4 w-4" />
                                            Asignar Responsable
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            {item.estado === "PARA DEVOLUCION" ? (
                                                <div className="flex-1 py-2.5 text-center text-sm font-bold text-amber-600 bg-amber-50 rounded-lg border border-amber-200 cursor-default flex items-center justify-center gap-2">
                                                    <RefreshCw className="h-4 w-4 animate-spin-slow" />
                                                    En Devolución
                                                </div>
                                            ) : item.estado === "PARA REVISION" ? (
                                                <div className="flex-1 py-2.5 text-center text-sm font-bold text-purple-600 bg-purple-50 rounded-lg border border-purple-200 cursor-default flex items-center justify-center gap-2">
                                                    <ClipboardCheck className="h-4 w-4" />
                                                    En Revisión
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleReassign(item.id)}
                                                        className="flex-1 py-2.5 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                                                        title="Reasignar a otro usuario"
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                        Reasignar
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenReturn(item)}
                                                        className="flex-1 py-2.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                                                        title="Devolver equipo"
                                                    >
                                                        <CornerUpLeft className="h-4 w-4" />
                                                        Devolver
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Return Confirmation Modal */}
            {
                returnModalOpen && selectedReturn && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Confirmar Devolución</h3>
                                        <p className="text-sm text-gray-500">¿Estás seguro de devolver este equipo?</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-3 mb-6 border border-gray-100 text-sm">
                                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                                        <span className="font-semibold text-gray-500">Equipo:</span>
                                        <span className="font-medium text-gray-900">
                                            {selectedReturn.isSoloChip
                                                ? selectedReturn.tipo_equipo_destino
                                                : `${selectedReturn.equipo_marca} ${selectedReturn.equipo_modelo}`}
                                        </span>

                                        <span className="font-semibold text-gray-500">Usuario Actual:</span>
                                        <span className="font-medium text-gray-900">{selectedReturn.usuario_final_nombre || "Sin asignar"}</span>
                                    </div>
                                    <p className="mt-3 text-xs text-gray-500 italic">
                                        Al confirmar, el estado cambiará a "PARA DEVOLUCIÓN" y deberás entregar el equipo en la base.
                                    </p>
                                </div>

                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setReturnModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmReturn}
                                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
                                    >
                                        <CornerUpLeft className="h-4 w-4" />
                                        Confirmar Devolución
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
