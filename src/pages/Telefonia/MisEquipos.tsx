import { useEffect, useState } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import { useAuth } from "../../auth/AuthContext";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { 
    Smartphone, 
    UserPlus, 
    CornerUpLeft, 
    Loader2, 
    Cpu, 
    Check, 
    RefreshCw, 
    MapPin, 
    User, 
    AlertTriangle,
    Search,
    ShieldAlert
} from "lucide-react";
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
    equipo_custodio?: string; // New field
    editMode: boolean;
    // Temp edit values
    temp_dni: string;
    temp_nombre: string;
    temp_area: string;
    temp_puesto: string; // New field
    temp_sede: string;
    temp_fecha_entrega_final: string;
    temp_condicion_retorno?: string; // New field
    temp_observacion_retorno?: string; // New field
    // Solo Chip Fields
    isSoloChip: boolean;
    tipo_equipo_destino?: string;
    codigo_equipo_destino?: string;
    chip_numero?: string; // New
    estado: string; // New
}

export default function MisEquipos() {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);
    const [assignments, setAssignments] = useState<AsignacionUI[]>([]);
    const [stolenAssignments, setStolenAssignments] = useState<AsignacionUI[]>([]);
    const [activeTab, setActiveTab] = useState<"activos" | "robados">("activos");
    const [q, setQ] = useState("");
    const { sedes } = getSedesState();
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState<AsignacionUI | null>(null);
    const [returnCustodioModalOpen, setReturnCustodioModalOpen] = useState(false);
    const [selectedReturnCustodio, setSelectedReturnCustodio] = useState<AsignacionUI | null>(null);
    const [itemErrors, setItemErrors] = useState<Record<string, string>>({}); // ID -> Error mapping

    // New Additions: Assignment Modal and Filters
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignModalId, setAssignModalId] = useState<string | null>(null);
    const [sedeFilter, setSedeFilter] = useState<string>("");
    const [custodioFilter, setCustodioFilter] = useState<boolean>(false);

    const loadMisEquipos = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const allMyAssignments: AsignacionUI[] = [];
            const allStolenAssignments: AsignacionUI[] = [];
            const processedIds = new Set<string>();

            // 1. Fetch Direct Assignments (Active)
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
                                solicitud_id: asig.solicitud_id,
                                fecha_entrega_final: asig.fecha_entrega_final || "",
                                editMode: false,
                                temp_dni: asig.usuario_final_dni || "",
                                temp_nombre: asig.usuario_final_nombre || "",
                                temp_area: asig.usuario_final_area || "",
                                temp_puesto: asig.usuario_final_puesto || "",
                                temp_sede: asig.usuario_final_sede || "",
                                equipo_custodio: asig.equipo?.custodio || "",
                                temp_fecha_entrega_final: asig.fecha_entrega_final || "",
                                temp_condicion_retorno: "Bueno",
                                temp_observacion_retorno: "",
                                isSoloChip: !asig.equipo_id && !!asig.chip_id,
                                tipo_equipo_destino: asig.tipo_equipo_destino || "",
                                codigo_equipo_destino: asig.codigo_equipo_destino || "",
                                chip_numero: asig.chip?.numero_linea || "",
                                estado: asig.estado || "Asignado"
                            });
                            processedIds.add(asig.id);
                        }
                    });
                }

                // 2. Fetch Stolen Assignments
                const stolenAsigs = await telefoniaStore.fetchAsignacionesRobadasPorResponsable(profile.dni);
                if (stolenAsigs) {
                    stolenAsigs.forEach(asig => {
                        allStolenAssignments.push({
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
                            solicitud_id: asig.solicitud_id,
                            fecha_entrega_final: asig.fecha_entrega_final || "",
                            editMode: false,
                            temp_dni: asig.usuario_final_dni || "",
                            temp_nombre: asig.usuario_final_nombre || "",
                            temp_area: asig.usuario_final_area || "",
                            temp_puesto: asig.usuario_final_puesto || "",
                            temp_sede: asig.usuario_final_sede || "",
                            equipo_custodio: asig.equipo?.custodio || "",
                            temp_fecha_entrega_final: asig.fecha_entrega_final || "",
                            isSoloChip: !asig.equipo_id && !!asig.chip_id,
                            chip_numero: asig.chip?.numero_linea || "",
                            estado: asig.estado || "Devuelto"
                        });
                    });
                }
            }

            setAssignments(allMyAssignments);
            setStolenAssignments(allStolenAssignments);

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

    const handleOpenAssignModal = (id: string) => {
        setAssignments(prev => prev.map(a => {
            if (a.id === id) {
                return {
                    ...a,
                    // Reset temps on open
                    temp_dni: a.usuario_final_dni,
                    temp_nombre: a.usuario_final_nombre,
                    temp_area: a.usuario_final_area,
                    temp_puesto: a.usuario_final_puesto,
                    temp_sede: a.usuario_final_sede,
                    temp_fecha_entrega_final: a.fecha_entrega_final 
                        ? a.fecha_entrega_final.split('T')[0] 
                        : (() => {
                            const d = new Date();
                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        })(),
                    temp_condicion_retorno: "Bueno",
                    temp_observacion_retorno: ""
                };
            }
            return a;
        }));
        setItemErrors({});
        setAssignModalId(id);
        setAssignModalOpen(true);
    };

    const handleCloseAssignModal = () => {
        setAssignModalOpen(false);
        setAssignModalId(null);
    };



    const handleSaveAssignModal = async () => {
        if (!assignModalId) return;
        const item = assignments.find(a => a.id === assignModalId);
        if (!item) return;

        setLoading(true);
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

            // If it's the Custodio returning and assigning directly:
            if (!item.usuario_final_nombre && item.equipo_custodio === "Usuario") {
                await telefoniaStore.asignarUsuarioFinalDesdeCustodio(item.id, item.equipo_id, {
                    dni: item.temp_dni,
                    nombre: item.temp_nombre,
                    area: item.temp_area,
                    puesto: item.temp_puesto,
                    sede: item.temp_sede,
                    fecha_entrega_final: item.temp_fecha_entrega_final
                }, item.temp_condicion_retorno || "Bueno", item.temp_observacion_retorno || "");
            } else {
                // Regular Update
                await telefoniaStore.updateAsignacionResponsable(item.id, {
                    dni: item.temp_dni,
                    nombre: item.temp_nombre,
                    area: item.temp_area,
                    puesto: item.temp_puesto,
                    sede: item.temp_sede,
                    fecha_entrega_final: item.temp_fecha_entrega_final
                });
            }

            // After assigning final user or editing, refresh list completely to get new IDs
            await loadMisEquipos();

            setToast({ type: "success", message: "Responsable asignado/actualizado" });
            handleCloseAssignModal();
        } catch (error) {
            console.error("Error updating assignment:", error);
            setToast({ type: "error", message: "Error al actualizar" });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (id: string, field: 'temp_dni' | 'temp_nombre' | 'temp_area' | 'temp_puesto' | 'temp_sede' | 'temp_fecha_entrega_final' | 'temp_condicion_retorno' | 'temp_observacion_retorno', value: string) => {
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

    const handleOpenReturnCustodio = (item: AsignacionUI) => {
        setSelectedReturnCustodio(item);
        setReturnCustodioModalOpen(true);
    };

    const confirmReturnCustodio = async () => {
        if (!selectedReturnCustodio || !selectedReturnCustodio.equipo_id) return;
        setLoading(true);
        try {
            await telefoniaStore.registrarDevolucionCustodio(
                selectedReturnCustodio.id,
                selectedReturnCustodio.equipo_id,
                "Usuario" // Hardcoded to Usuario per business logic
            );
            setToast({ type: "success", message: "Devolución a custodio registrada" });
            setReturnCustodioModalOpen(false);
            setSelectedReturnCustodio(null);
            await loadMisEquipos();
        } catch (error) {
            console.error(error);
            setToast({ type: "error", message: "Error al registrar custodio" });
        } finally {
            setLoading(false);
        }
    };

    const uniqueSedes = Array.from(new Set(assignments.map(a => a.usuario_final_sede).filter(Boolean)));

    const filtered = assignments.filter(a => {
        const matchesSearch = a.equipo_modelo.toLowerCase().includes(q.toLowerCase()) ||
            a.usuario_final_nombre.toLowerCase().includes(q.toLowerCase()) ||
            a.usuario_final_area.toLowerCase().includes(q.toLowerCase());
        const matchesSede = sedeFilter ? a.usuario_final_sede === sedeFilter : true;
        const matchesCustodio = custodioFilter ? (!a.usuario_final_nombre && a.equipo_custodio === "Usuario") : true;

        return matchesSearch && matchesSede && matchesCustodio;
    });

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
                    <div className="flex items-center gap-3 bg-gray-50/80 px-4 py-2.5 rounded-xl border border-gray-100 min-w-[120px]">
                        <div className="p-2 bg-white rounded-lg border border-gray-100">
                            <Smartphone className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
                            <span className="text-xl font-black text-gray-800 leading-none">{assignments.length}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-indigo-50/80 px-4 py-2.5 rounded-xl border border-indigo-100 min-w-[120px]">
                        <div className="p-2 bg-white rounded-lg border border-indigo-100">
                            <Check className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Asignados</span>
                            <span className="text-xl font-black text-indigo-700 leading-none">{assignments.filter(a => a.usuario_final_nombre).length}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-red-50/80 px-4 py-2.5 rounded-xl border border-red-100 min-w-[120px]">
                        <div className="p-2 bg-white rounded-lg border border-red-100">
                            <ShieldAlert className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Robados</span>
                            <span className="text-xl font-black text-red-700 leading-none">{stolenAssignments.length}</span>
                        </div>
                    </div>
                </div>
            </div>


            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-indigo-500 hover:border-gray-300 transition-colors bg-white"
                        placeholder="Buscar por equipo, usuario o área..."
                        value={q}
                        onChange={e => setQ(e.target.value)}
                    />
                </div>
                <div className="flex gap-4">
                    <select
                        className="border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-indigo-500 py-2 px-3 border hover:border-gray-300 transition-colors bg-white"
                        value={sedeFilter}
                        onChange={e => setSedeFilter(e.target.value)}
                    >
                        <option value="">Todas las Sedes</option>
                        {uniqueSedes.map(sede => (
                            <option key={sede} value={sede}>{sede}</option>
                        ))}
                    </select>
                    
                    <div className="flex items-center gap-3 px-3 py-2 border border-gray-200 rounded-xl bg-white">
                        <span className="text-xs font-medium text-gray-600">Custodio</span>
                        <button
                            onClick={() => setCustodioFilter(!custodioFilter)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                                custodioFilter ? "bg-indigo-600" : "bg-gray-200"
                            }`}
                        >
                            <span
                                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                    custodioFilter ? "translate-x-5" : "translate-x-1"
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === "activos" ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
                    onClick={() => setActiveTab("activos")}
                >
                    Equipos Activos
                    {activeTab === "activos" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                </button>
                <button
                    className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === "robados" ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
                    onClick={() => setActiveTab("robados")}
                >
                    Equipos Robados
                    {activeTab === "robados" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                </button>
            </div>

            {
                loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    activeTab === "activos" ? (
                        filtered.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                                <Smartphone className="mx-auto h-12 w-12 text-gray-300" />
                                <h3 className="mt-2 text-sm font-semibold text-gray-900">No tienes equipos asignados</h3>
                                <p className="mt-1 text-sm text-gray-500">Cuando recibas equipos, aparecerán aquí para que asignes su usuario final.</p>
                            </div>
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Equipo</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">N° Chip</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Usuario Final</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sede / Área</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Entrega</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filtered.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-lg ${item.isSoloChip ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                            {item.isSoloChip ? <Cpu className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900 text-sm">
                                                                {item.isSoloChip
                                                                    ? (item.tipo_equipo_destino || "Línea Móvil")
                                                                    : `${item.equipo_marca} ${item.equipo_modelo}`}
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 font-mono">
                                                                {item.isSoloChip ? `En: ${item.codigo_equipo_destino || 'N/A'}` : `IMEI: ${item.equipo_imei}`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-mono text-gray-700">{item.chip_numero || '—'}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {item.usuario_final_nombre ? (
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">{item.usuario_final_nombre}</div>
                                                            <div className="text-[10px] text-gray-500">DNI: {item.usuario_final_dni}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-400 italic">Sin asignar</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-xs text-gray-700 font-medium">{item.usuario_final_area}</div>
                                                    <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {item.usuario_final_sede || "BASE"}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-600">
                                                    <div>{new Date(item.fecha_entrega).toLocaleDateString()}</div>
                                                    {item.fecha_entrega_final && (
                                                        <div className="text-indigo-600 font-medium text-[10px]">
                                                            Final: {new Date(item.fecha_entrega_final).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {!item.usuario_final_nombre ? (
                                                        <button
                                                            onClick={() => handleOpenAssignModal(item.id)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100 transition-colors"
                                                        >
                                                            <UserPlus className="h-3.5 w-3.5" />
                                                            Asignar
                                                        </button>
                                                    ) : (
                                                        <div className="flex justify-end gap-2">
                                                            {item.estado === "PARA DEVOLUCION" ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-amber-600 bg-amber-50 rounded-lg border border-amber-200">
                                                                    <RefreshCw className="h-3 w-3 animate-spin-slow" />
                                                                    DEV
                                                                </span>
                                                            ) : (
                                                                <>
                                                                    {item.equipo_categoria === 'PROYECTO' && (
                                                                        <button
                                                                            onClick={() => handleOpenReturnCustodio(item)}
                                                                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-100 bg-indigo-50 border border-indigo-100 transition-colors"
                                                                            title="Custodio"
                                                                        >
                                                                            <User className="h-4 w-4" />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleOpenReturn(item)}
                                                                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 bg-red-50 border border-red-100 transition-colors"
                                                                        title="Devolver"
                                                                    >
                                                                        <CornerUpLeft className="h-4 w-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : (
                        /* Tabs: Robados */
                        stolenAssignments.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                                <AlertTriangle className="mx-auto h-12 w-12 text-gray-300" />
                                <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay registros de robos</h3>
                                <p className="mt-1 text-sm text-gray-500">Aquí aparecerán los equipos que fueron marcados como robados.</p>
                            </div>
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-red-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-red-700 uppercase tracking-wider">Equipo Robado</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-red-700 uppercase tracking-wider">N° Chip</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-red-700 uppercase tracking-wider">Último Usuario Holder</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-red-700 uppercase tracking-wider">Área / Sede</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-red-700 uppercase tracking-wider">Día del Reporte</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {stolenAssignments.map(item => (
                                            <tr key={item.id} className="hover:bg-red-50/10 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
                                                            <Smartphone className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900 text-sm">{item.equipo_marca} {item.equipo_modelo}</div>
                                                            <div className="text-[10px] text-gray-500 font-mono">IMEI: {item.equipo_imei}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-mono text-gray-700">{item.chip_numero || '—'}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{item.usuario_final_nombre}</div>
                                                        <div className="text-[10px] text-gray-500 font-medium">DNI: {item.usuario_final_dni}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-xs text-gray-700 font-medium">{item.usuario_final_area}</div>
                                                    <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {item.usuario_final_sede || "BASE"}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-red-600 font-semibold">
                                                    {item.fecha_entrega_final ? new Date(item.fecha_entrega_final).toLocaleDateString() : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )
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

            {/* Custodio Return Modal */}
            {
                returnCustodioModalOpen && selectedReturnCustodio && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <User className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Devolver a Custodio</h3>
                                        <p className="text-sm text-gray-500">¿A quién se le entregará el equipo temporalmente?</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-3 mb-6 border border-gray-100 text-sm">
                                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 mb-4">
                                        <span className="font-semibold text-gray-500">Equipo:</span>
                                        <span className="font-medium text-gray-900">
                                            {selectedReturnCustodio.equipo_marca} {selectedReturnCustodio.equipo_modelo}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-xs font-semibold text-gray-500 mb-1 block">Custodio Destino:</span>
                                        <div className="w-full border border-gray-200 rounded-md shadow-sm sm:text-sm p-2 bg-gray-50 text-gray-700 font-medium">
                                            Usuario (Responsable actual)
                                        </div>
                                    </div>
                                    <p className="mt-3 text-xs text-gray-500 italic">
                                        Al confirmar, la asignación actual ({selectedReturnCustodio.usuario_final_nombre || "Sin usuario"}) se cerrará y el equipo quedará a cargo del custodio.
                                    </p>
                                </div>

                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setReturnCustodioModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmReturnCustodio}
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                                    >
                                        <Check className="h-4 w-4" />
                                        Confirmar Custodio
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Assignment Modal */}
            {assignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden my-auto border border-gray-100">
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                    <UserPlus className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Asignar Responsable</h3>
                                    <p className="text-sm text-gray-500">Ingresa los datos del usuario final del equipo.</p>
                                </div>
                            </div>

                            {/* Encontrar Item actual */}
                            {(() => {
                                const activeItem = assignments.find(a => a.id === assignModalId);
                                if (!activeItem) return null;

                                return (
                                    <div className="space-y-4">
                                        {!activeItem.isSoloChip && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="col-span-1 sm:col-span-2">
                                                    <label className="text-[11px] uppercase text-gray-500 font-bold ml-1 tracking-wider">DNI</label>
                                                    <input
                                                        className={`w-full text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none p-2.5 transition-shadow ${itemErrors[activeItem.id] ? 'border-red-500 bg-red-50' : 'bg-gray-50'}`}
                                                        placeholder="Ingrese DNI (8 dígitos)"
                                                        value={activeItem.temp_dni}
                                                        maxLength={8}
                                                        onChange={async (e) => {
                                                            const val = e.target.value.replace(/\D/g, ''); // Solo números
                                                            handleChange(activeItem.id, 'temp_dni', val);

                                                            // Clear previous error
                                                            if (itemErrors[activeItem.id]) {
                                                                setItemErrors(prev => {
                                                                    const n = { ...prev };
                                                                    delete n[activeItem.id];
                                                                    return n;
                                                                });
                                                            }

                                                            // Real-time Check
                                                            if (val && val.length === 8 && val !== activeItem.usuario_final_dni) {
                                                                const check = await telefoniaStore.checkActiveAssignment(val);
                                                                if (check.exists) {
                                                                    setItemErrors(prev => ({ ...prev, [activeItem.id]: check.message || "Usuario ya tiene asignación." }));
                                                                }
                                                            } else if (val && val.length < 8) {
                                                                setItemErrors(prev => ({ ...prev, [activeItem.id]: "El DNI debe tener 8 dígitos." }));
                                                            }
                                                        }}
                                                    />
                                                    {itemErrors[activeItem.id] && <p className="text-xs text-red-600 mt-1 font-medium">{itemErrors[activeItem.id]}</p>}
                                                </div>
                                                <div className="col-span-1 sm:col-span-2">
                                                    <label className="text-[11px] uppercase text-gray-500 font-bold ml-1 tracking-wider">Nombre Completo</label>
                                                    <input
                                                        className="w-full text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none p-2.5 transition-shadow bg-gray-50"
                                                        placeholder="Nombres y Apellidos"
                                                        value={activeItem.temp_nombre}
                                                        onChange={e => handleChange(activeItem.id, 'temp_nombre', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] uppercase text-gray-500 font-bold ml-1 tracking-wider">Área</label>
                                                    <input
                                                        className="w-full text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none p-2.5 transition-shadow bg-gray-50"
                                                        placeholder="Área del usuario"
                                                        value={activeItem.temp_area}
                                                        onChange={e => handleChange(activeItem.id, 'temp_area', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] uppercase text-gray-500 font-bold ml-1 tracking-wider">Puesto</label>
                                                    <input
                                                        className="w-full text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none p-2.5 transition-shadow bg-gray-50"
                                                        placeholder="Puesto del usuario"
                                                        value={activeItem.temp_puesto}
                                                        onChange={e => handleChange(activeItem.id, 'temp_puesto', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="col-span-1 sm:col-span-2">
                                                <label className="text-[11px] uppercase text-gray-500 font-bold ml-1 tracking-wider">Sede</label>
                                                <select
                                                    className="w-full text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none p-2.5 transition-shadow bg-gray-50"
                                                    value={activeItem.temp_sede}
                                                    onChange={e => handleChange(activeItem.id, 'temp_sede', e.target.value)}
                                                >
                                                    <option value="">Seleccione Sede...</option>
                                                    <option value="BASE">BASE</option>
                                                    {sedes.map(s => (
                                                        <option key={s.id} value={s.nombre}>{s.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-1 sm:col-span-2">
                                                <label className="text-[11px] uppercase text-gray-500 font-bold ml-1 tracking-wider">Fecha Entrega Final</label>
                                                <input
                                                    type="date"
                                                    className="w-full text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none p-2.5 transition-shadow bg-gray-50"
                                                    value={activeItem.temp_fecha_entrega_final}
                                                    min={activeItem.fecha_entrega ? activeItem.fecha_entrega.split('T')[0] : undefined}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    onChange={e => handleChange(activeItem.id, 'temp_fecha_entrega_final', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Mostrar campos de retorno SÓLO si es la primera asignación final (viniendo de custodia) */}
                                        {!activeItem.usuario_final_nombre && activeItem.equipo_custodio === "Usuario" && (
                                            <div className="pt-4 mt-4 border-t border-gray-200">
                                                <h4 className="flex items-center gap-2 text-[11px] font-bold text-gray-400 mb-3 uppercase tracking-wider">
                                                    Datos de retorno al asignar
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[11px] uppercase text-gray-500 font-bold ml-1 tracking-wider">Condición al entregar</label>
                                                        <select
                                                            className="w-full text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none p-2.5 transition-shadow bg-gray-50 font-medium text-gray-700"
                                                            value={activeItem.temp_condicion_retorno}
                                                            onChange={e => handleChange(activeItem.id, 'temp_condicion_retorno', e.target.value)}
                                                        >
                                                            <option value="Bueno">Bueno (Operativo)</option>
                                                            <option value="Dañado">Dañado</option>
                                                            <option value="Robado">Robado</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] uppercase text-gray-500 font-bold ml-1 tracking-wider">Observaciones</label>
                                                        <input
                                                            className="w-full text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none p-2.5 transition-shadow bg-gray-50"
                                                            placeholder="Opcional..."
                                                            value={activeItem.temp_observacion_retorno}
                                                            onChange={e => handleChange(activeItem.id, 'temp_observacion_retorno', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-3 justify-end pt-5 mt-2 border-t border-gray-100">
                                            <button
                                                onClick={handleCloseAssignModal}
                                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
                                                disabled={loading}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleSaveAssignModal}
                                                className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                                disabled={loading}
                                            >
                                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                Guardar Asignación
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
