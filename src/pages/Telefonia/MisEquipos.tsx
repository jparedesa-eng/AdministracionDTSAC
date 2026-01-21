import { useEffect, useState } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import { useAuth } from "../../auth/AuthContext";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { Loader2, Search, Smartphone, User, MapPin, UserPlus, Check } from "lucide-react";
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
    usuario_final_sede: string; // New field
    fecha_entrega: string;
    solicitud_id: string | null;
    fecha_entrega_final: string; // New field
    editMode: boolean;
    // Temp edit values
    temp_dni: string;
    temp_nombre: string;
    temp_area: string;
    temp_sede: string;
    temp_fecha_entrega_final: string;
}

export default function MisEquipos() {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);
    const [assignments, setAssignments] = useState<AsignacionUI[]>([]);
    const [q, setQ] = useState("");
    const { sedes } = getSedesState();

    const loadMisEquipos = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const allMyAssignments: AsignacionUI[] = [];
            const processedIds = new Set<string>(); // Avoid duplicates if filters overlap

            // 1. Fetch from Tickets (Created by me)
            await telefoniaStore.fetchSolicitudes(); // Ensure we have tickets
            const myTickets = telefoniaStore.solicitudes.filter(s => s.created_by === user.id);

            myTickets.forEach(ticket => {
                if (ticket.asignaciones && ticket.asignaciones.length > 0) {
                    ticket.asignaciones.forEach(asig => {
                        // Only active assignments (no return date)
                        if (!asig.fecha_devolucion && asig.estado === 'Entregado') {
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
                                    usuario_final_sede: asig.usuario_final_sede || "",
                                    fecha_entrega: asig.fecha_entrega || "",
                                    solicitud_id: asig.solicitud_id,
                                    fecha_entrega_final: asig.fecha_entrega_final || "",
                                    editMode: false,
                                    temp_dni: asig.usuario_final_dni || "",
                                    temp_nombre: asig.usuario_final_nombre || "",
                                    temp_area: asig.usuario_final_area || "",
                                    temp_sede: asig.usuario_final_sede || "",
                                    temp_fecha_entrega_final: asig.fecha_entrega_final || ""
                                });
                                processedIds.add(asig.id);
                            }
                        }
                    });
                }
            });

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
                                usuario_final_sede: asig.usuario_final_sede || "",
                                fecha_entrega: asig.fecha_entrega || "",
                                solicitud_id: asig.solicitud_id, // Might be null
                                fecha_entrega_final: asig.fecha_entrega_final || "",
                                editMode: false,
                                temp_dni: asig.usuario_final_dni || "",
                                temp_nombre: asig.usuario_final_nombre || "",
                                temp_area: asig.usuario_final_area || "",
                                temp_sede: asig.usuario_final_sede || "",
                                temp_fecha_entrega_final: asig.fecha_entrega_final || ""
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
                    temp_sede: !a.editMode ? a.usuario_final_sede : a.temp_sede,
                    temp_fecha_entrega_final: !a.editMode
                        ? (a.fecha_entrega_final ? a.fecha_entrega_final.split('T')[0] : new Date().toISOString().split('T')[0])
                        : a.temp_fecha_entrega_final
                };
            }
            return a;
        }));
    };

    const handleSave = async (item: AsignacionUI) => {
        try {
            // Validation
            if (!item.temp_dni || !item.temp_nombre || !item.temp_area || !item.temp_sede) {
                setToast({ type: "error", message: "Todos los campos son obligatorios (DNI, Nombre, Área, Sede)" });
                return;
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

            await telefoniaStore.updateAsignacionResponsable(item.id, {
                dni: item.temp_dni,
                nombre: item.temp_nombre,
                area: item.temp_area,
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

    const handleChange = (id: string, field: 'temp_dni' | 'temp_nombre' | 'temp_area' | 'temp_sede' | 'temp_fecha_entrega_final', value: string) => {
        setAssignments(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    const filtered = assignments.filter(a =>
        a.equipo_modelo.toLowerCase().includes(q.toLowerCase()) ||
        a.usuario_final_nombre.toLowerCase().includes(q.toLowerCase()) ||
        a.usuario_final_area.toLowerCase().includes(q.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Mis Equipos Asignados</h1>
                <div className="flex gap-4 mt-2">
                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-200">
                        Total: {assignments.length}
                    </div>
                    <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium border border-green-200">
                        Asignados: {assignments.filter(a => a.usuario_final_nombre).length}
                    </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                    Gestiona los responsables y la fecha de entrega final de tus equipos.
                </p>
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

            {loading ? (
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
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <Smartphone className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{item.equipo_marca} {item.equipo_modelo}</h3>
                                            <p className="text-xs text-gray-500 font-mono mb-1">{item.equipo_imei}</p>
                                            <div className="flex gap-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                    {item.equipo_categoria}
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
                                                <div>
                                                    <label className="text-[10px] uppercase text-gray-400 font-semibold ml-1">DNI</label>
                                                    <input
                                                        className="w-full text-base border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 p-2"
                                                        placeholder="Ingrese DNI"
                                                        value={item.temp_dni}
                                                        onChange={e => handleChange(item.id, 'temp_dni', e.target.value)}
                                                    />
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
                                                {item.usuario_final_nombre ? (
                                                    <>
                                                        <div className="font-medium text-gray-900 text-sm">{item.usuario_final_nombre}</div>
                                                        <div className="text-xs text-gray-500">{item.usuario_final_area} {item.usuario_final_sede ? `- ${item.usuario_final_sede}` : ''}</div>
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
                                    <div className="py-2.5 text-center text-sm text-gray-400 font-medium bg-gray-50 rounded-lg border border-gray-100">
                                        Asignado
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
