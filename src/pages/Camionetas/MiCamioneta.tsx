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
} from "lucide-react";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { Modal } from "../../components/ui/Modal";

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
};

type Conductor = {
    id: string;
    nombre: string;
    dni: string;
    licencia: string;
    licencia_vencimiento?: string; // from DB
};

// Joined row from vehiculo_conductores
type ConductorAsignadoFull = {
    id: string; // id de la relación vehiculo_conductores
    conductor: Conductor; // joined data
};

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

    const [vehiculo, setVehiculo] = React.useState<VehiculoResumen | null>(null);
    const [asignados, setAsignados] = React.useState<ConductorAsignadoFull[]>([]);
    const [ownerDriver, setOwnerDriver] = React.useState<Conductor | null>(null); // Para mostrar en el Header

    // Modal Agregar
    const [openAdd, setOpenAdd] = React.useState(false);
    const [allDrivers, setAllDrivers] = React.useState<Conductor[]>([]);
    const [selectedDriverId, setSelectedDriverId] = React.useState("");
    const [adding, setAdding] = React.useState(false);

    // Delete Confirmation
    const [openDelete, setOpenDelete] = React.useState(false);
    const [driverToDelete, setDriverToDelete] = React.useState<{ id: string, name: string } | null>(null);

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
                .select("id, placa, marca, modelo, color, soat, rev_tecnica, estado")
                .eq("dni_responsable", profile?.dni)
                .maybeSingle();

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

            if (!vData) {
                setVehiculo(null);
            } else {
                setVehiculo(vData);
                // 3. Cargar conductores asignados a este vehículo
                await loadAsignados(vData.id);
            }
        } catch (e: any) {
            console.error(e);
            setToast({ type: "error", message: "Error al cargar datos de mi camioneta." });
        } finally {
            setLoading(false);
        }
    };

    const loadAsignados = async (vehiculoId: string) => {
        const { data, error } = await supabase
            .from("vehiculo_conductores")
            .select(`
        id,
        conductor:conductores (id, nombre, dni, licencia, licencia_vencimiento)
      `)
            .eq("vehiculo_id", vehiculoId);

        if (error) throw error;
        // data es any, hacemos cast safe
        const mapped = (data || []).map((item: any) => ({
            id: item.id,
            conductor: item.conductor,
        }));
        setAsignados(mapped);
    };

    /* Acciones */
    const handleOpenAdd = async () => {
        setOpenAdd(true);
        setAllDrivers([]);

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
        if (!vehiculo || !selectedDriverId) return;

        setAdding(true);
        try {
            const { error } = await supabase.from("vehiculo_conductores").insert([
                {
                    vehiculo_id: vehiculo.id,
                    conductor_id: selectedDriverId,
                },
            ]);

            if (error) throw error;

            setToast({ type: "success", message: "Conductor autorizado correctamente." });
            setOpenAdd(false);
            setSelectedDriverId("");
            await loadAsignados(vehiculo.id);
        } catch (e: any) {
            // Check unique constraint violation
            if (e.code === '23505') {
                setToast({ type: "error", message: "Este conductor ya está autorizado." });
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
            const { error } = await supabase
                .from("vehiculo_conductores")
                .delete()
                .eq("id", driverToDelete.id);
            if (error) throw error;

            setToast({ type: "success", message: "Conductor removido." });
            if (vehiculo) await loadAsignados(vehiculo.id);
        } catch (e: any) {
            setToast({ type: "error", message: "Error al eliminar." });
        } finally {
            setOpenDelete(false);
            setDriverToDelete(null);
        }
    };

    /* Render */
    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!vehiculo) {
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

    return (
        <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in duration-500">
            <Toast toast={toast} onClose={() => setToast(null)} />

            {/* Header Usuario Refinado */}
            <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-6 md:p-8">
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
                                No se encontró información de conductor asociada a tu usuario.
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

            {/* Header Camioneta */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">

                    <div className="flex gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
                            <Truck className="h-8 w-8" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                                {vehiculo.placa}
                            </h2>
                            <p className="text-lg font-medium text-gray-600">
                                {vehiculo.marca} {vehiculo.modelo}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                                    {vehiculo.color}
                                </span>
                                <span
                                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${vehiculo.estado === "Disponible"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-700"
                                        }`}
                                >
                                    {vehiculo.estado}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 md:w-auto">
                        {/* Tarjetas de vencimiento */}
                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                            <ExpirationCard label="Rev. Técnica" dateStr={vehiculo.rev_tecnica} />
                            <ExpirationCard label="SOAT" dateStr={vehiculo.soat} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sección Conductores Autorizados */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            Conductores Autorizados
                        </h3>
                        <p className="text-sm text-gray-500">
                            Gestiona quién puede conducir tu unidad registrando sus entradas/salidas.
                        </p>
                    </div>
                    <button
                        onClick={handleOpenAdd}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Agregar</span>
                    </button>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {asignados.length === 0 ? (
                            <div className="p-10 text-center">
                                <User className="mx-auto h-10 w-10 text-gray-300" />
                                <p className="mt-2 text-sm font-medium text-gray-900">Sin conductores autorizados</p>
                                <p className="text-xs text-gray-500">Solo tú estás registrado como responsable.</p>
                            </div>
                        ) : (
                            asignados.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold text-base shadow-sm">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            {/* Fila 1: Nombre */}
                                            <p className="font-bold text-gray-900 text-sm">
                                                {item.conductor.nombre}
                                            </p>

                                            {/* Fila 2: DNI • Licencia */}
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                <span className="flex items-center gap-1">
                                                    <span className="font-semibold text-gray-400 text-[10px] uppercase tracking-wider">DNI</span>
                                                    {item.conductor.dni}
                                                </span>
                                                <span className="text-gray-300">•</span>
                                                <span className="flex items-center gap-1">
                                                    <span className="font-semibold text-gray-400 text-[10px] uppercase tracking-wider">Lic</span>
                                                    <span className="font-medium text-gray-700 bg-gray-100 px-1 rounded-[4px] text-[10px]">
                                                        {item.conductor.licencia || "S/L"}
                                                    </span>
                                                </span>
                                            </div>

                                            {/* Fila 3: Vencimiento */}
                                            <div className="flex items-center gap-1 text-xs mt-0.5">
                                                <span className="font-semibold text-gray-400 text-[10px] uppercase tracking-wider">Vence</span>
                                                <span className={`flex items-center gap-1 font-medium ${item.conductor.licencia_vencimiento && new Date(item.conductor.licencia_vencimiento) < new Date()
                                                        ? "text-rose-600"
                                                        : item.conductor.licencia_vencimiento && new Date(item.conductor.licencia_vencimiento).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000
                                                            ? "text-amber-600"
                                                            : "text-emerald-600"
                                                    }`}>
                                                    {item.conductor.licencia_vencimiento
                                                        ? new Date(item.conductor.licencia_vencimiento).toLocaleDateString("es-PE")
                                                        : "-"}
                                                    {item.conductor.licencia_vencimiento && new Date(item.conductor.licencia_vencimiento) < new Date() && (
                                                        <AlertCircle className="h-3 w-3" />
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => confirmRemove(item.id, item.conductor.nombre)}
                                        className="p-3 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all active:scale-95 shadow-sm border border-transparent hover:border-rose-100"
                                        title="Quitar autorización"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            ))
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
                <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
                    <p className="text-sm text-gray-600">
                        Selecciona un conductor de la lista general para autorizarlo en la unidad <strong>{vehiculo.placa}</strong>.
                    </p>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Conductor</label>
                        <select
                            required
                            className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 border"
                            value={selectedDriverId}
                            onChange={(e) => setSelectedDriverId(e.target.value)}
                        >
                            <option value="">Seleccione...</option>
                            {allDrivers.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.nombre} — {d.dni} {!(d as any).activo ? "(Inactivo)" : ""}
                                </option>
                            ))}
                        </select>
                        {allDrivers.length === 0 && (
                            <p className="mt-1 text-xs text-amber-600">No se encontraron conductores disponibles para agregar.</p>
                        )}
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
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
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
                            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
                        >
                            Sí, Quitar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
