import React from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../auth/AuthContext";
import {
    Loader2,
    AlertTriangle,
    AlertCircle,
    Truck,
    User,
    Plus,
    Trash2,
    CheckCircle2,
    IdCard,
    Search,
    Calendar,
    X,
    QrCode,
    Eye,
    CheckCircle,
    History as HistoryIcon,
} from "lucide-react";
import QRCode from "react-qr-code";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { Modal } from "../../components/ui/Modal";
import { CHECKLIST_CONFIG } from "../../data/checklistConfig";

/* =========================
   Tipos
   ========================= */

type VehiculoResumen = {
    id: string;
    placa: string;
    marca: string;
    modelo: string;
    color: string;
    soat: string; // YYYY-MM-DD
    rev_tecnica: string; // YYYY-MM-DD
    estado: string;
    categoria: string;
};

type Conductor = {
    id: string;
    nombre: string;
    dni: string;
    licencia: string;
    licencia_vencimiento?: string; // from DB
    activo?: boolean; // from DB
};

// Joined row from vehiculo_conductores
type ConductorAsignadoFull = {
    id: string; // id de la relación vehiculo_conductores
    conductor: Conductor; // joined data
    tipo_autorizacion: 'permanente' | 'rango';
    fecha_inicio: string;
    fecha_fin?: string;
    activo: boolean;
};

/* --- Checklist Types --- */
type ChecklistRow = {
    id: string;
    created_at: string;
    fecha?: string | null;
    hora?: string | null;
    sede?: string | null;
    placa?: string | null;
    kilometraje?: number | null;
    responsable_inspeccion?: string | null;
    usuario_dni?: string | null;
    dni_usuario?: string | null;
    usuario_nombre?: string | null;
    nombre_usuario?: string | null;
    usuario_correo?: string | null;
    correo_usuario?: string | null;
    firma_base64?: string | null;
    firma_usuario_dataurl?: string | null;
    observaciones?: string | null;
    aprobado?: boolean | null;
    fecha_ingreso?: string | null;
    grupos?: any;
    tipo?: "entrega" | "regular";
    codigo?: string;
};

type CkItem = { name: string; ok: boolean; status?: string; nota?: string };
type CkGroup = { titulo: string; items: CkItem[] };

/* =========================
   Componentes UI
   ========================= */

function ExpirationCard({
    label,
    dateStr,
}: {
    label: string;
    dateStr: string;
}) {
    if (!dateStr)
        return (
            <div className="flex flex-col rounded-xl border border-gray-100 bg-gray-50 p-4">
                <span className="text-sm font-medium text-gray-500">{label}</span>
                <span className="text-lg font-bold text-gray-400">-</span>
            </div>
        );

    const today = new Date();
    const target = new Date(dateStr);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let statusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
    let icon = <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    let msg = "Vigente";

    if (diffDays < 0) {
        statusColor = "bg-rose-50 text-rose-700 border-rose-100";
        icon = <AlertCircle className="h-5 w-5 text-rose-600" />;
        msg = "Vencido";
    } else if (diffDays < 30) {
        statusColor = "bg-amber-50 text-amber-700 border-amber-100";
        icon = <AlertTriangle className="h-5 w-5 text-amber-600" />;
        msg = "Por vencer";
    }

    return (
        <div
            className={`relative flex items-center justify-between overflow-hidden rounded-xl border p-4 ${statusColor}`}
        >
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                    {label}
                </p>
                <p className="mt-1 text-xl font-bold font-mono tracking-tight">
                    {target.toLocaleDateString("es-PE")}
                </p>
                <p className="mt-1 text-xs font-medium">{msg}</p>
            </div>
            <div className="rounded-full bg-white/50 p-2">{icon}</div>
        </div>
    );
}

export default function MiCamioneta() {
    const { profile } = useAuth();
    const [loading, setLoading] = React.useState(true);
    const [toast, setToast] = React.useState<ToastState>(null);

    const [vehiculos, setVehiculos] = React.useState<VehiculoResumen[]>([]);
    const [asignados, setAsignados] = React.useState<ConductorAsignadoFull[]>([]);
    const [ownerDriver, setOwnerDriver] = React.useState<Conductor | null>(null); // Para mostrar en el Header

    // QR Modal
    const [openQR, setOpenQR] = React.useState(false);
    const [selectedQR, setSelectedQR] = React.useState<{ id: string, placa: string } | null>(null);

    // Modal Agregar
    const [openAdd, setOpenAdd] = React.useState(false);
    const [allDrivers, setAllDrivers] = React.useState<Conductor[]>([]);
    const [selectedDriverId, setSelectedDriverId] = React.useState("");
    const [adding, setAdding] = React.useState(false);

    // New State for Add Modal
    const [searchTerm, setSearchTerm] = React.useState("");
    const [authType, setAuthType] = React.useState<'permanente' | 'rango'>('permanente');
    const [dateStart, setDateStart] = React.useState(new Date().toISOString().split('T')[0]);
    const [dateEnd, setDateEnd] = React.useState("");

    // View Options
    const [showHistory, setShowHistory] = React.useState(false);

    // Delete Confirmation
    const [openDelete, setOpenDelete] = React.useState(false);
    const [driverToDelete, setDriverToDelete] = React.useState<{ id: string, name: string } | null>(null);

    // Checklist State
    const [checklists, setChecklists] = React.useState<ChecklistRow[]>([]);
    const [loadingChecklists, setLoadingChecklists] = React.useState(false);
    const [visibleCount, setVisibleCount] = React.useState(5);
    const [openView, setOpenView] = React.useState(false);
    const [viewRow, setViewRow] = React.useState<ChecklistRow | null>(null);
    const [viewGrupos, setViewGrupos] = React.useState<CkGroup[]>([]);
    const [loadingView, setLoadingView] = React.useState(false);

    /* Filtrado de conductores para mostrar */
    const filteredDrivers = React.useMemo(() => {
        return asignados.filter(a => showHistory ? !a.activo : a.activo);
    }, [asignados, showHistory]);

    /* Carga inicial */
    React.useEffect(() => {
        if (!profile?.dni) {
            setLoading(false);
            return;
        }
        loadData();
    }, [profile?.dni]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Buscar vehículo asignado al DNI del usuario
            const { data: vData, error: vError } = await supabase
                .from("vehiculos")
                .select("id, placa, marca, modelo, color, soat, rev_tecnica, estado, categoria")
                .eq("dni_responsable", profile?.dni);

            if (vError) throw vError;

            // 2. Buscar datos del conductor (usuario actual) para el header
            if (profile?.dni) {
                const { data: dData } = await supabase
                    .from("conductores")
                    .select("*")
                    .eq("dni", profile.dni)
                    .maybeSingle();
                if (dData) setOwnerDriver(dData);
            }

            if (!vData || vData.length === 0) {
                setVehiculos([]);
            } else {
                setVehiculos(vData);
                // 3. Cargar conductores asignados al primer vehículo (o todos? por ahora mantenemos lógica de conductores adicionales para la unidad principal)
                // El usuario solo pidió mostrar las tarjetas.
                await loadAsignados(vData[0].id);
                await loadChecklists(vData[0].placa, vData[0].id);
            }
        } catch (e: any) {
            console.error(e);
            setToast({ type: "error", message: "Error al cargar datos de mi camioneta." });
        } finally {
            setLoading(false);
        }
    };
    const loadChecklists = async (placa: string, vehiculoId: string) => {
        if (!profile?.dni) return;
        setLoadingChecklists(true);
        setVisibleCount(5); // Reset a 5 al cargar
        try {
            // 1. Obtener rangos de asignación del historial
            const { data: hData, error: hError } = await supabase
                .from("vehiculos_historial_responsables")
                .select("*")
                .eq("vehiculo_id", vehiculoId)
                .eq("dni_responsable", profile.dni);

            if (hError) throw hError;

            if (!hData || hData.length === 0) {
                setChecklists([]);
                return;
            }

            // 2. Obtener checklists de esta placa (ordenados por 'fecha' descendente desde DB)
            const { data: cData, error: cError } = await supabase
                .from("checklists")
                .select("*")
                .eq("placa", placa)
                .order("fecha", { ascending: false });

            if (cError) throw cError;

            // 3. Filtrar en memoria: solo los que caen en ALGUNO de los rangos de asignación
            const filteredChecklists = (cData || []).filter(checklist => {
                if (!checklist.fecha) return false;
                const ckTime = new Date(checklist.fecha).getTime();

                return hData.some(range => {
                    const start = new Date(range.fecha_inicio).getTime();
                    // Si fecha_fin es null, es la asignación actual (usamos tiempo actual)
                    const end = range.fecha_fin ? new Date(range.fecha_fin).getTime() : new Date().getTime();

                    // Ajustamos el margen del fin para que sea inclusivo del día completo si es solo fecha
                    // Si el timestamp ya tiene hora, esto sigue siendo seguro para la inclusión
                    const adjustedEnd = range.fecha_fin && !range.fecha_fin.includes('T')
                        ? end + 86399999
                        : end;

                    return ckTime >= start && ckTime <= adjustedEnd;
                });
            });

            // 4. Ordenar estrictamente por 'fecha' descendente (más recientes primero)
            filteredChecklists.sort((a, b) => {
                const fa = a.fecha || "";
                const fb = b.fecha || "";
                return fb.localeCompare(fa);
            });

            setChecklists(filteredChecklists);
        } catch (e) {
            console.error("Error loading checklists:", e);
            setToast({ type: "error", message: "Error al cargar el historial de checklists." });
        } finally {
            setLoadingChecklists(false);
        }
    };

    const loadAsignados = async (vehiculoId: string) => {
        // Obtenemos todos los registros (activos e inactivos)
        const { data, error } = await supabase
            .from("vehiculo_conductores")
            .select(`
        id,
        tipo_autorizacion,
        fecha_inicio,
        fecha_fin,
        activo,
        conductor:conductores (id, nombre, dni, licencia, licencia_vencimiento)
      `)
            .eq("vehiculo_id", vehiculoId)
            .order("activo", { ascending: false }) // Activos primero
            .order("fecha_inicio", { ascending: false });

        if (error) throw error;
        // data es any, hacemos cast safe
        const mapped = (data || []).map((item: any) => ({
            id: item.id,
            conductor: item.conductor,
            tipo_autorizacion: item.tipo_autorizacion,
            fecha_inicio: item.fecha_inicio,
            fecha_fin: item.fecha_fin,
            activo: item.activo
        }));
        setAsignados(mapped);
    };

    /* Acciones */
    const handleOpenAdd = async () => {
        setOpenAdd(true);
        setAllDrivers([]);
        setSearchTerm("");
        setSelectedDriverId("");
        setAuthType("permanente");
        setDateStart(new Date().toISOString().split('T')[0]);
        setDateEnd("");

        try {
            // Nota: Quitamos el filtro de activo por si acaso, o lo dejamos si es estricto.
            // El usuario pidió "la lista de registros de conductores.tsx", que muestra todo.
            // Pero para asignar, idealmente solo activos. Vamos a traer TODO y filtrar en memoria si es necesario
            // o simplemente mostrar todo.
            const { data, error } = await supabase
                .from("conductores")
                .select("id, nombre, dni, licencia, activo")
                .order("nombre");

            if (error) {
                console.error("Error fetching drivers:", error);
                setToast({ type: "error", message: "Error al cargar lista de conductores" });
                return;
            }

            if (data) {
                const idsAsignados = new Set(asignados.map(a => a.conductor.id));

                // Filtrar:
                // 1. Los que ya están asignados como adicionales
                // 2. El mismo responsable (ownerDriver) para que no se auto-agregue
                const disponibles = data.filter((d: any) => {
                    // Si ya está en la lista de adicionales, false
                    if (idsAsignados.has(d.id)) return false;
                    // Si es el responsable actual (por DNI), false
                    if (d.dni === profile?.dni) return false;
                    return true;
                });

                setAllDrivers(disponibles);

                if (disponibles.length === 0) {
                    setToast({ type: "success", message: "Todos los conductores registrados ya están autorizados (o eres tú)." });
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (vehiculos.length === 0 || !selectedDriverId) return;

        const mainVeh = vehiculos[0];

        // Validaciones
        if (authType === 'rango') {
            if (!dateStart) {
                setToast({ type: "error", message: "Fecha de inicio requerida." });
                return;
            }
            if (!dateEnd) {
                setToast({ type: "error", message: "Fecha fin requerida para autorización por rango." });
                return;
            }
            if (dateEnd < dateStart) {
                setToast({ type: "error", message: "La fecha fin no puede ser anterior a la fecha de inicio." });
                return;
            }
        }

        setAdding(true);
        try {
            const payload = {
                vehiculo_id: mainVeh.id,
                conductor_id: selectedDriverId,
                tipo_autorizacion: authType,
                fecha_inicio: dateStart,
                fecha_fin: authType === 'rango' ? dateEnd : null,
                activo: true
            };

            // Verificar si el conductor ya existe en historial para reactivarlo?
            // Por simplicidad, intentamos insertar. Si existe constraint unique (vehiculo_id, conductor_id), fallará.
            // Si la lógica de negocio permite tener múltiples registros en el historia (mismo conductor, diferentes fechas), 
            // entonces no debería haber unique constraint compuesta estricta sin incluir fechas o estado.
            // Asumiremos que se crea un nuevo registro de autorización.

            const { error } = await supabase.from("vehiculo_conductores").insert([payload]);

            if (error) throw error;

            setToast({ type: "success", message: "Conductor autorizado correctamente." });
            setOpenAdd(false);
            setSelectedDriverId("");
            await loadAsignados(mainVeh.id);
        } catch (e: any) {
            console.error(e);
            if (e.code === '23505') {
                setToast({ type: "error", message: "Este conductor ya tiene una autorización (activa o registrada)." });
            } else {
                setToast({ type: "error", message: "Error al autorizar conductor." });
            }
        } finally {
            setAdding(false);
        }
    };

    const confirmRemove = (relId: string, name: string) => {
        setDriverToDelete({ id: relId, name });
        setOpenDelete(true);
    };

    const handleRemove = async () => {
        if (!driverToDelete) return;
        try {
            // Soft delete: Update activo = false, fecha_fin = Now
            const { error } = await supabase
                .from("vehiculo_conductores")
                .update({
                    activo: false,
                    fecha_fin: new Date().toISOString().split('T')[0] // Set end date to today
                })
                .eq("id", driverToDelete.id);

            if (error) throw error;

            setToast({ type: "success", message: "Autorización finalizada." });
            if (vehiculos.length > 0) await loadAsignados(vehiculos[0].id);
        } catch (e: any) {
            setToast({ type: "error", message: "Error al finalizar autorización." });
        } finally {
            setOpenDelete(false);
            setDriverToDelete(null);
        }
    };

    /* --- Checklist Helpers --- */
    const openDetails = async (row: ChecklistRow) => {
        setViewRow(row);
        setOpenView(true);
        setViewGrupos([]);
        setLoadingView(true);
        try {
            const grupos = await fetchGruposFor(row);
            setViewGrupos(grupos);
        } catch (e: any) {
            alert(e?.message ?? "No se pudieron cargar los ítems del checklist.");
        } finally {
            setLoadingView(false);
        }
    };

    async function fetchGruposFor(row: ChecklistRow): Promise<CkGroup[]> {
        // Primero intentamos desde el JSONB embebido (si existe)
        if (row.grupos && Array.isArray(row.grupos)) {
            return row.grupos.map((g: any) => ({
                titulo: String(g.title ?? g.titulo ?? "OTROS"),
                items: Array.isArray(g.items)
                    ? g.items.map((it: any) => ({
                        name: String(it.name ?? ""),
                        ok: Boolean(it.ok),
                        status: it.status,
                        nota: it.nota || ""
                    }))
                    : [],
            }));
        }

        // Si no, buscamos en la tabla plana
        const { data, error } = await supabase
            .from("checklist_items")
            .select("*")
            .eq("checklist_id", row.id)
            .order("id", { ascending: true });

        if (error) throw error;
        const byGroup = new Map<string, CkGroup>();
        (data as any[]).forEach((r) => {
            const key = (r.grupo ?? "OTROS").toString();
            if (!byGroup.has(key)) byGroup.set(key, { titulo: key, items: [] });
            byGroup.get(key)!.items.push({
                name: r.name,
                ok: !!r.ok,
                status: undefined,
                nota: r.nota ?? ""
            });
        });
        return Array.from(byGroup.values());
    }

    const getDni = (r: ChecklistRow) => r.usuario_dni ?? r.dni_usuario ?? "—";
    const getNombre = (r: ChecklistRow) => r.usuario_nombre ?? r.nombre_usuario ?? "—";
    const getCorreo = (r: ChecklistRow) => r.usuario_correo ?? r.correo_usuario ?? "—";

    function resolveFirmaSource(raw: string | null | undefined): string | null {
        if (!raw) return null;
        let cleaned = raw.replace(/\s/g, "");
        if (!cleaned) return null;
        if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) return cleaned;
        const base64Marker = "base64,";
        const markerIdx = cleaned.toLowerCase().indexOf(base64Marker);
        let payload: string;
        if (markerIdx !== -1) {
            payload = cleaned.substring(markerIdx + base64Marker.length);
        } else if (cleaned.includes(",")) {
            const parts = cleaned.split(",");
            payload = parts[parts.length - 1];
        } else {
            payload = cleaned;
        }
        return `data:image/png;base64,${payload}`;
    }

    const getFirma = (r: ChecklistRow) => {
        const raw = r.firma_base64 ?? r.firma_usuario_dataurl;
        return resolveFirmaSource(raw);
    };

    function dataURLtoBlob(dataURL: string): Blob {
        const parts = dataURL.split(',');
        const byteString = atob(parts[1]);
        const mimeString = parts[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    }

    function createBlobURL(dataURL: string | null): string | null {
        if (!dataURL) return null;
        try {
            const blob = dataURLtoBlob(dataURL);
            return URL.createObjectURL(blob);
        } catch (error) {
            return dataURL;
        }
    }

    function formatFechaHoraLocal(valor?: string | null, fallback?: string): string {
        const src = valor ?? fallback;
        if (!src) return "—";
        const d = new Date(src);
        if (!isNaN(d.getTime())) return d.toLocaleString();
        return src;
    }

    function calculateSeniority(fechaIngreso?: string | null): string {
        if (!fechaIngreso) return "—";
        try {
            const start = new Date(fechaIngreso);
            const end = new Date();
            if (isNaN(start.getTime())) return "—";
            let years = end.getFullYear() - start.getFullYear();
            let months = end.getMonth() - start.getMonth();
            if (months < 0) { years--; months += 12; }
            const yearStr = years > 0 ? `${years} ${years === 1 ? "año" : "años"}` : "";
            const monthStr = months > 0 ? `${months} ${months === 1 ? "mes" : "meses"}` : "";
            if (yearStr && monthStr) return `${yearStr} y ${monthStr}`;
            return yearStr || monthStr || "Menos de un mes";
        } catch (e) { return "—"; }
    }

    /* Render */
    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (vehiculos.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="rounded-full bg-gray-100 p-4">
                    <Truck className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="mt-4 text-xl font-bold text-gray-900">
                    No tienes camioneta asignada
                </h2>
                <p className="mt-2 text-gray-500 max-w-sm">
                    No encontramos un vehículo vinculado a tu DNI ({profile?.dni}).
                    Comunícate con administración si crees que es un error.
                </p>
            </div>
        );
    }

    const openQRCode = (v: VehiculoResumen) => {
        setSelectedQR({ id: v.id, placa: v.placa });
        setOpenQR(true);
    };


    /* Render */
    // ... (rest of render logic before Authorized Drivers section)

    return (
        <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in duration-500">
            <Toast toast={toast} onClose={() => setToast(null)} />

            {/* Header Usuario Refinado (Existing code...) */}
            <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-6 md:p-8">
                {/* ... (Existing Header User content) ... */}
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                                {profile?.nombre || "Usuario"}
                            </h1>
                            <p className="text-base font-medium text-gray-500 mt-1">
                                {profile?.area || "Sin área"}
                            </p>
                        </div>

                        {/* Detalles de Licencia */}
                        {(ownerDriver?.licencia || ownerDriver?.licencia_vencimiento) && (
                            <div className="flex flex-wrap items-center gap-6 text-sm">
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                        Vencimiento Licencia
                                    </span>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className={`font-medium ${ownerDriver.licencia_vencimiento && new Date(ownerDriver.licencia_vencimiento) < new Date() ? "text-rose-600" : "text-gray-900"
                                            }`}>
                                            {ownerDriver.licencia_vencimiento
                                                ? new Date(ownerDriver.licencia_vencimiento).toLocaleDateString("es-PE", { year: 'numeric', month: 'long', day: 'numeric' })
                                                : "-"}
                                        </span>
                                        {ownerDriver.licencia_vencimiento && new Date(ownerDriver.licencia_vencimiento) < new Date() && (
                                            <AlertCircle className="h-4 w-4 text-rose-500" />
                                        )}
                                    </div>
                                </div>

                                <div className="hidden h-8 w-px bg-gray-200 sm:block"></div>

                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                        Categoría
                                    </span>
                                    <span className="mt-1 font-mono font-bold text-gray-900">
                                        {ownerDriver.licencia || "-"}
                                    </span>
                                </div>
                            </div>
                        )}
                        {!ownerDriver && (
                            <p className="text-sm text-gray-400 italic">
                                No se encontraron datos de conductor para tu usuario.
                            </p>
                        )}
                    </div>

                    {/* Icono decorativo */}
                    <div className="hidden md:block">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
                            <IdCard className="h-8 w-8" strokeWidth={1.5} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Cards de Camionetas */}
            {vehiculos.map((v) => (
                <div key={v.id} className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8">
                    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">

                        <div className="flex gap-6">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
                                <Truck className="h-10 w-10" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                                        {v.placa}
                                    </h2>
                                </div>
                                <p className="text-lg font-medium text-gray-600">
                                    {v.marca} {v.modelo}
                                </p>
                                <p className="text-xs font-normal">
                                    {v.color}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <span
                                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${v.estado === "Disponible"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : v.estado === "Mantenimiento"
                                                ? "bg-amber-100 text-amber-700"
                                                : "bg-gray-100 text-gray-700"
                                            }`}
                                    >
                                        {v.estado}
                                    </span>
                                    {v.categoria && (
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium uppercase ${v.categoria === 'Permanente'
                                            ? "bg-indigo-50 text-indigo-700"
                                            : v.categoria === 'Temporal'
                                                ? "bg-orange-50 text-orange-700"
                                                : "bg-purple-50 text-purple-700"
                                            }`}>
                                            {v.categoria}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex w-full flex-col gap-3 md:w-auto">
                            {/* Tarjetas de vencimiento y QR */}
                            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
                                <ExpirationCard label="Rev. Técnica" dateStr={v.rev_tecnica} />
                                <ExpirationCard label="SOAT" dateStr={v.soat} />
                                <button
                                    onClick={() => openQRCode(v)}
                                    className="col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-1 flex flex-col items-center justify-center rounded-xl border border-red-600 bg-[#ff0000] p-4 text-white hover:bg-[#cc0000] transition-all shadow-sm group"
                                >
                                    <QrCode className="h-11 w-11 mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Ver QR</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Sección Conductores Autorizados */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            Conductores Autorizados
                        </h3>
                        <p className="text-sm text-gray-500">
                            Gestiona quién puede conducir tu unidad registrando sus entradas/salidas.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${showHistory
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                                }`}
                        >
                            <HistoryIcon className="h-4 w-4" />
                            <span>{showHistory ? "Ocultar Historial" : "Ver Historial"}</span>
                        </button>
                        <button
                            onClick={handleOpenAdd}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Agregar</span>
                        </button>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {filteredDrivers.length === 0 ? (
                            <div className="p-10 text-center">
                                <User className="mx-auto h-10 w-10 text-gray-300" />
                                <p className="mt-2 text-sm font-medium text-gray-900">
                                    {showHistory ? "No hay conductores en el historial." : "No hay conductores activos autorizados."}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {showHistory ? "Los registros antiguos aparecerán aquí." : "Agrega un conductor para comenzar."}
                                </p>
                            </div>
                        ) : (
                            filteredDrivers.map((item) => (
                                <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 transition-colors border-b border-gray-50 last:border-0 ${!item.activo ? "bg-gray-50/50" : "hover:bg-gray-50"}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-base ${item.activo ? "bg-slate-100 text-slate-600" : "bg-gray-100 text-gray-400 grayscale"}`}>
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <p className={`font-bold text-sm ${item.activo ? "text-gray-900" : "text-gray-500"}`}>
                                                    {item.conductor?.nombre || "Conductor desconocido"}
                                                </p>
                                                {!item.activo && (
                                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 border border-gray-200">
                                                        Historial
                                                    </span>
                                                )}
                                                {item.activo && item.tipo_autorizacion === 'rango' && (
                                                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-100">
                                                        Temporal
                                                    </span>
                                                )}
                                            </div>

                                            {/* Detalles: DNI, Licencia */}
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <span className="font-semibold text-gray-400 text-[10px] uppercase tracking-wider">DNI</span>
                                                    {item.conductor?.dni || "-"}
                                                </span>
                                                <span className="text-gray-300">•</span>
                                                <span className="flex items-center gap-1">
                                                    <span className="font-semibold text-gray-400 text-[10px] uppercase tracking-wider">Licencia</span>
                                                    <span>{item.conductor?.licencia || "S/L"}</span>
                                                </span>
                                                {(item.fecha_inicio || item.fecha_fin) && (
                                                    <>
                                                        <span className="text-gray-300 hidden sm:inline">•</span>
                                                        <span className="flex items-center gap-1 w-full sm:w-auto mt-1 sm:mt-0">
                                                            <Calendar className="h-3 w-3 text-gray-400" />
                                                            <span className="font-medium text-gray-600">
                                                                {item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString("es-PE", { day: '2-digit', month: '2-digit' }) : "-"}
                                                                {item.fecha_fin ? ` - ${new Date(item.fecha_fin).toLocaleDateString("es-PE", { day: '2-digit', month: '2-digit', year: '2-digit' })}` : " (Indefinido)"}
                                                            </span>
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    {item.activo && (
                                        <div className="mt-3 sm:mt-0 flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openQRCode({ id: item.id, placa: item.conductor?.nombre || 'Conductor' } as any)}
                                                className="flex items-center gap-2 rounded-lg border border-red-600 bg-[#ff0000] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#cc0000] transition-all shadow-sm"
                                            >
                                                <QrCode className="h-3.5 w-3.5" />
                                                Ver QR
                                            </button>
                                            <button
                                                onClick={() => item.conductor && confirmRemove(item.id, item.conductor.nombre)}
                                                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all active:scale-95 border border-transparent hover:border-rose-100 flex items-center gap-2"
                                                title="Finalizar autorización"
                                            >
                                                <span className="text-xs font-medium sm:hidden">Finalizar</span>
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Sección Últimos Checklists Realizados */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            Últimos Checklists Realizados
                        </h3>
                        <p className="text-sm text-gray-500">
                            Historial de inspecciones realizadas a esta unidad durante tu periodo de asignación.
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {loadingChecklists ? (
                            <div className="flex h-32 items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            </div>
                        ) : checklists.length === 0 ? (
                            <div className="p-10 text-center">
                                <div className="mx-auto h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                                    <HistoryIcon className="h-6 w-6 text-gray-300" />
                                </div>
                                <p className="text-sm font-medium text-gray-900">
                                    No hay checklists registrados.
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Los registros de inspección aparecerán aquí una vez realizados.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-gray-50/50 text-gray-600 border-b border-gray-100 text-[11px] uppercase tracking-wider font-bold">
                                            <th className="px-6 py-4">Fecha / Hora</th>
                                            <th className="px-6 py-4">Tipo</th>
                                            <th className="px-6 py-4">Estado</th>
                                            <th className="px-6 py-4 text-right">Detalles</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {checklists.slice(0, visibleCount).map((c) => (
                                            <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900">
                                                            {c.fecha ? new Date(c.fecha).toLocaleDateString("es-PE", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "-"}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-medium">
                                                            {c.fecha ? new Date(c.fecha).toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' }) : (c.hora || "")}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase border shrink-0 ${c.tipo === "entrega" ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-blue-50 text-blue-700 border-blue-100"
                                                        }`}>
                                                        {c.tipo ? c.tipo : "REGULAR"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {c.aprobado ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                                                            <CheckCircle className="h-3 w-3" />
                                                            Aprobado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-100">
                                                            <AlertCircle className="h-3 w-3" />
                                                            Observado
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => openDetails(c)}
                                                        className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
                                                    >
                                                        <Eye className="h-3.5 w-3.5 text-gray-400" />
                                                        Ver
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {/* Botón Mostrar Más */}
                        {!loadingChecklists && checklists.length > visibleCount && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex justify-center">
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 5)}
                                    className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-6 py-2 text-sm font-bold text-slate-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
                                >
                                    <HistoryIcon className="h-4 w-4 text-slate-400" />
                                    Mostrar más
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Agregar */}
            <Modal
                open={openAdd}
                onClose={() => setOpenAdd(false)}
                title="Autorizar Conductor"
                size="md"
            >
                <form onSubmit={handleAddSubmit} className="mt-4 space-y-5">
                    <p className="text-sm text-gray-600">
                        Selecciona un conductor de la lista general para autorizarlo en la unidad <strong>{vehiculos[0].placa}</strong>.
                    </p>

                    {/* Buscador de Conductor */}
                    <div className="relative">
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Conductor</label>
                        {!selectedDriverId ? (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o DNI..."
                                    className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-all outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                                {/* Dropdown de resultados */}
                                {searchTerm.length > 1 && (
                                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white p-1">
                                        {allDrivers
                                            .filter(d =>
                                                d.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                d.dni.includes(searchTerm)
                                            )
                                            .length === 0 ? (
                                            <div className="p-3 text-center text-sm text-gray-500">
                                                No se encontraron resultados
                                            </div>
                                        ) : (
                                            allDrivers
                                                .filter(d =>
                                                    d.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    d.dni.includes(searchTerm)
                                                )
                                                .map(d => (
                                                    <button
                                                        key={d.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedDriverId(d.id);
                                                            setSearchTerm("");
                                                        }}
                                                        className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-indigo-50 transition-colors"
                                                    >
                                                        <span className="font-medium text-gray-900">{d.nombre}</span>
                                                        <span className="text-xs text-gray-500">DNI: {d.dni}</span>
                                                    </button>
                                                ))
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-indigo-900">
                                            {allDrivers.find(d => d.id === selectedDriverId)?.nombre}
                                        </p>
                                        <p className="text-xs text-indigo-700">
                                            DNI: {allDrivers.find(d => d.id === selectedDriverId)?.dni}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDriverId("")}
                                    className="rounded-full p-1 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        {/* Fallback si no hay conductores cargados o disponibles */}
                        {allDrivers.length === 0 && !searchTerm && (
                            <p className="mt-1 text-xs text-amber-600">Cargando lista de conductores...</p>
                        )}
                    </div>

                    {/* Fechas */}
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Fecha de Autorización
                            </label>
                            <input
                                type="date"
                                readOnly
                                className="w-full rounded-xl border-gray-100 bg-gray-50 sm:text-sm py-2.5 px-3 border outline-none text-gray-500 cursor-not-allowed"
                                value={dateStart}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setOpenAdd(false)}
                            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!selectedDriverId || adding}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
                        >
                            {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                            Autorizar
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Confirmar Eliminar */}
            <Modal
                open={openDelete}
                onClose={() => setOpenDelete(false)}
                title="Quitar Autorización"
                size="sm"
            >
                <div className="mt-4">
                    <p className="text-gray-600">
                        ¿Estás seguro de que deseas quitar la autorización a <strong>{driverToDelete?.name}</strong>?
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                        Esta acción no eliminará al conductor del sistema, solo le quitará el permiso para conducir esta unidad.
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={() => setOpenDelete(false)}
                            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleRemove}
                            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
                        >
                            Sí, Quitar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal QR */}
            <Modal
                open={openQR}
                onClose={() => setOpenQR(false)}
                title={`Código QR - ${selectedQR?.placa}`}
                size="sm"
            >
                <div className="flex flex-col items-center justify-center p-6 space-y-4">
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        {selectedQR && (
                            <QRCode
                                value={selectedQR.id}
                                size={200}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                viewBox={`0 0 256 256`}
                            />
                        )}
                    </div>
                    <p className="text-center text-sm text-gray-500">
                        Muestra tu QR para el escaneo rapido en los puntos de control.
                    </p>
                    <div className="w-full pt-4">
                        <button
                            onClick={() => setOpenQR(false)}
                            className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-white hover:bg-slate-900 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODAL: Ver detalle de Checklist */}
            {openView && viewRow && (
                <div className="fixed inset-0 z-[60]">
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                        onClick={() => setOpenView(false)}
                        aria-hidden
                    />
                    <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
                        <div className="w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white pointer-events-auto animate-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 bg-gray-50/50">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        Detalle de Checklist
                                    </h3>
                                    <p className="text-xs font-medium text-gray-500 mt-0.5 uppercase tracking-wider">
                                        N°: {viewRow.codigo ?? viewRow.id.slice(0, 8)} • {formatFechaHoraLocal(viewRow.fecha, viewRow.created_at)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOpenView(false)}
                                    className="rounded-full p-2 h-10 w-10 flex items-center justify-center bg-white border border-gray-200 text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                                {/* Datos generales */}
                                <section>
                                    <h4 className="flex items-center gap-2 mb-4 text-sm font-bold text-gray-400 uppercase tracking-widest">
                                        <div className="h-px w-4 bg-gray-200"></div>
                                        Datos Generales
                                    </h4>
                                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                        {[
                                            ["Fecha Registro", formatFechaHoraLocal(viewRow.fecha, viewRow.created_at)],
                                            ["Sede", viewRow.sede ?? "—"],
                                            ["Placa", viewRow.placa ?? "—"],
                                            ["Kilometraje", viewRow.kilometraje?.toString() ?? "—"],
                                            ["Resp. Inspección", viewRow.responsable_inspeccion ?? "—"],
                                            ["Usuario de Unidad", getNombre(viewRow)],
                                            ["Correo Usuario", getCorreo(viewRow)],
                                            ["DNI Usuario", getDni(viewRow)],
                                            ["Tipo de Checklist", viewRow.tipo ? viewRow.tipo.toUpperCase() : "REGULAR"],
                                            ["Antigüedad Unidad", calculateSeniority(viewRow.fecha_ingreso)],
                                        ].map(([label, val]) => (
                                            <div key={label as string} className="flex flex-col p-3 rounded-2xl bg-gray-50/50 border border-gray-200">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                                                <span className="text-sm font-semibold text-gray-900 mt-1">{val as string}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Firma */}
                                <section>
                                    <h4 className="flex items-center gap-2 mb-4 text-sm font-bold text-gray-400 uppercase tracking-widest">
                                        <div className="h-px w-4 bg-gray-200"></div>
                                        Firma de Conformidad
                                    </h4>
                                    <div className="inline-block p-4 rounded-2xl bg-white border border-gray-200">
                                        {(() => {
                                            const dataUrl = getFirma(viewRow);
                                            if (!dataUrl) return <span className="text-xs text-gray-400 italic">No se registró firma</span>;
                                            const blobUrl = createBlobURL(dataUrl);
                                            return (
                                                <img
                                                    src={blobUrl!}
                                                    alt="Firma"
                                                    className="h-28 w-auto object-contain"
                                                    onError={(e) => { (e.target as any).src = ''; }}
                                                />
                                            );
                                        })()}
                                    </div>
                                </section>

                                {/* Observaciones Generales */}
                                <section>
                                    <h4 className="flex items-center gap-2 mb-4 text-sm font-bold text-gray-400 uppercase tracking-widest">
                                        <div className="h-px w-4 bg-gray-200"></div>
                                        Observaciones Generales
                                    </h4>
                                    <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-200 min-h-[60px]">
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            {viewRow.observaciones?.trim() || "Sin observaciones generales registradas."}
                                        </p>
                                    </div>
                                </section>

                                {/* Ítems Detallados */}
                                <section>
                                    <h4 className="flex items-center gap-2 mb-6 text-sm font-bold text-gray-400 uppercase tracking-widest">
                                        <div className="h-px w-4 bg-gray-200"></div>
                                        Inspección Detallada
                                    </h4>

                                    {loadingView ? (
                                        <div className="flex items-center gap-3 p-8 justify-center text-gray-400">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span className="text-sm font-medium">Cargando ítems...</span>
                                        </div>
                                    ) : viewGrupos.length === 0 ? (
                                        <div className="bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                                            <p className="text-sm text-gray-500 font-medium">No hay registros de ítems individuales para este checklist.</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-8">
                                            {viewGrupos.map((g) => (
                                                <div key={g.titulo} className="space-y-4">
                                                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight bg-slate-100 px-3 py-1 rounded inline-block">
                                                        {g.titulo}
                                                    </h5>
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        {g.items.map((it) => {
                                                            const statusKey = it.status || it.nota || "";

                                                            const getStatusColor = () => {
                                                                // Buscar en configuración global para colores precisos
                                                                const groupCfg = CHECKLIST_CONFIG.find(gc => gc.title.toUpperCase() === g.titulo.toUpperCase());
                                                                const itemCfg = groupCfg?.items.find(ic => ic.name === it.name);
                                                                const option = itemCfg?.options.find(opt =>
                                                                    opt.value === statusKey || opt.label.toUpperCase() === statusKey.toUpperCase()
                                                                );

                                                                if (option) {
                                                                    switch (option.color) {
                                                                        case 'green': return "bg-emerald-50 text-emerald-700 border-emerald-100";
                                                                        case 'yellow': return "bg-yellow-50 text-yellow-700 border-yellow-100";
                                                                        case 'orange': return "bg-orange-50 text-orange-700 border-orange-100";
                                                                        case 'red': return "bg-rose-50 text-rose-700 border-rose-100";
                                                                        default: return "bg-gray-50 text-gray-700 border-gray-100";
                                                                    }
                                                                }
                                                                return it.ok ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100";
                                                            };

                                                            const colorClasses = getStatusColor();
                                                            const displayLabel = it.status ? (it.status.charAt(0).toUpperCase() + it.status.slice(1).replace(/_/g, ' ')) : (it.ok ? "Conforme" : "Incorrecto");
                                                            const hasExtraObs = it.nota && it.nota !== statusKey;

                                                            return (
                                                                <div key={it.name} className="flex flex-col gap-2 p-3 rounded-2xl border border-gray-200 bg-white hover:border-gray-200 transition-colors">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <span className="text-sm font-semibold text-gray-700 leading-tight">{it.name}</span>
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border shrink-0 ${colorClasses}`}>
                                                                            {displayLabel}
                                                                        </span>
                                                                    </div>
                                                                    {hasExtraObs && (
                                                                        <div className="text-[11px] text-gray-500 font-medium italic border-t border-gray-50 pt-2 mt-1">
                                                                            <span className="text-gray-400 not-italic uppercase font-bold text-[9px] mr-1">Obs: </span>
                                                                            {it.nota}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>

                            {/* Footer */}
                            <div className="border-t border-gray-100 px-6 py-5 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setOpenView(false)}
                                    className="px-8 py-2.5 rounded-2xl bg-slate-800 text-sm font-bold text-white hover:bg-slate-900 transition-all active:scale-[0.98]"
                                >
                                    Cerrar Detalle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
