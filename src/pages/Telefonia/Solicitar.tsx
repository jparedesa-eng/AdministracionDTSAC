import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../auth/AuthContext";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { ValidationResult } from "../../store/telefoniaStore";
import { aplicativosStore } from "../../store/aplicativosStore";

import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import {
    Calendar,
    CheckCircle2,
    ChevronRight,
    FileText,
    History,
    Loader2,
    Plus,
    Search,
    Smartphone,
    X,
} from "lucide-react";
import { supabase } from "../../supabase/supabaseClient";
import { TicketDetailContent } from "../../components/telefonia/TicketDetailContent.tsx";


const COMMON_ROLES = [
    "Gerente General",
    "Gerente Central",
    "Gerente",
    "Jefe",
    "Superintendente",
    "Coordinador",
    "Supervisor",
    "Analista",
    "Asistente",
    "Auxiliar",
    "Practicante",
    "Operario",
    "Otros"
];

const StatusBadge = ({ estado }: { estado: string }) => {
    let color = "bg-gray-100 text-gray-800 border-gray-200";
    if (estado === "Entregado") color = "bg-green-100 text-green-800 border-green-200";
    else if (estado === "Rechazada") color = "bg-red-100 text-red-800 border-red-200";
    else if (estado === "Programar Entrega") color = "bg-blue-100 text-blue-800 border-blue-200";
    else if (estado?.includes("Pendiente")) color = "bg-amber-100 text-amber-800 border-amber-200";

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
            {estado}
        </span>
    );
};

export default function SolicitarTelefonia() {
    const { user } = useAuth();

    // Hooks
    const [toast, setToast] = useState<ToastState>(null);
    const [submitting, setSubmitting] = useState(false);
    const [searchingDni, setSearchingDni] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Validation State
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [validating, setValidating] = useState(false);

    // Modal controls
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [appSearch, setAppSearch] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        dni: "",
        nombre: "",
        area: "",
        puesto: "",
        n_linea: "",
        numero_telefono: "",
        motivo_reposicion: "",
        tiene_evidencia: false,
        tipo_servicio: "PAQUETE ASIGNADO",
        periodo_uso: "PERMANENTE",
        fecha_inicio: new Date().toISOString().slice(0, 10),
        fecha_fin: "",
        fundo_planta: "",
        cultivo: "",
        cantidad_lineas: 1,
        justificacion: "",
    });

    const [selectedApps, setSelectedApps] = useState<string[]>([]);
    const [availableApps, setAvailableApps] = useState<{ id: string, nombre: string }[]>([]);

    useEffect(() => {
        const loadApps = async () => {
            try {
                const apps = await aplicativosStore.fetchAll();
                setAvailableApps(apps);
            } catch (error) {
                console.error("Error loading apps", error);
            }
        };
        loadApps();
    }, []);

    // Cargar historial
    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            await telefoniaStore.fetchSolicitudes();
        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    // Detail Modal State
    const [selectedDetail, setSelectedDetail] = useState<any | null>(null);

    // Filter mis tickets
    const myTickets = useMemo(() => {
        if (!user?.id) return [];
        return telefoniaStore.solicitudes.filter(s => s.created_by === user.id);
    }, [user?.id, telefoniaStore.solicitudes]);


    const handleChange = (field: string, value: any) => {
        setFormData(prev => {
            const newState = { ...prev, [field]: value };

            // Reset conditional fields if main selection changes
            if (field === "n_linea") {
                newState.numero_telefono = "";
                newState.motivo_reposicion = "";
                newState.tiene_evidencia = false;
            }

            // Reset fecha_fin if switching to PERMANENTE
            if (field === "periodo_uso" && value === "PERMANENTE") {
                newState.fecha_fin = "";
            }

            return newState;
        });
    };

    const handleValidateRenewal = async () => {
        if (!formData.numero_telefono || formData.numero_telefono.length < 9) {
            setToast({ type: "error", message: "Ingrese un número válido para validar." });
            return;
        }
        setValidating(true);
        setValidationResult(null);
        try {
            const res = await telefoniaStore.validateRenovacion(formData.numero_telefono);
            setValidationResult(res);
            if (res.valid) {
                setToast({ type: "success", message: "Renovación disponible." });
            } else {
                setToast({ type: "warning", message: res.message });
            }
        } catch (e: any) {
            setToast({ type: "error", message: "Error al validar renovación. Posiblemente no exista historial." });
        } finally {
            setValidating(false);
        }
    };

    const toggleApp = (app: string) => {
        setSelectedApps((prev) =>
            prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
        );
    };

    const handleSearchDni = async () => {
        if (!formData.dni || formData.dni.length < 8) {
            setToast({ type: "error", message: "Ingrese un DNI válido (8 dígitos)" });
            return;
        }

        setSearchingDni(true);
        try {
            const { data } = await supabase
                .from("profiles")
                .select("nombre, area, puesto")
                .eq("dni", formData.dni)
                .single();

            if (data) {
                setFormData((prev) => ({
                    ...prev,
                    nombre: data.nombre || "",
                    area: data.area || "",
                    puesto: data.puesto || "",
                }));
                setToast({ type: "success", message: "Datos encontrados" });
            } else {
                setToast({ type: "info", message: "DNI no encontrado, ingrese datos manualmente" });
                setFormData((prev) => ({
                    ...prev,
                    nombre: "",
                    area: "",
                    puesto: "",
                }));
            }
        } catch (e) {
            console.error(e);
            setToast({ type: "error", message: "No se pudo traer información, ingrese manual." });
        } finally {
            setSearchingDni(false);
        }
    };

    const validateStep = (step: number) => {
        if (step === 1) {
            if (!formData.dni || formData.dni.length !== 8) return "Ingrese un DNI válido";
            if (!formData.nombre) return "Ingrese el nombre del beneficiario";
            if (!formData.area) return "Ingrese el área";
            if (!formData.n_linea) return "Seleccione el motivo de solicitud";

            if ((formData.n_linea === "Renovación" || formData.n_linea === "Reposición") && !formData.numero_telefono) {
                return "Debe ingresar el número de teléfono.";
            }
            if (formData.n_linea === "Reposición") {
                if (!formData.motivo_reposicion) {
                    return "Seleccione el motivo de la reposición.";
                }
                if (!formData.tiene_evidencia) {
                    return "Es obligatorio tener evidencia (denuncia/reporte) para reposición.";
                }
            }
        }
        if (step === 2) {
            if (!formData.fecha_inicio) return "Ingrese fecha de inicio";
            if (formData.periodo_uso === "CAMPAÑA" && !formData.fecha_fin) return "Ingrese fecha de fin para campaña";
            if (!formData.fundo_planta) return "Ingrese Fundo / Planta";
            if (!formData.cantidad_lineas || formData.cantidad_lineas < 1) return "Cantidad debe ser al menos 1";
        }
        if (step === 3) {
            if (!formData.justificacion) return "Ingrese una justificación";
        }
        return null;
    };

    const nextStep = () => {
        const error = validateStep(currentStep);
        if (error) {
            setToast({ type: "error", message: error });
            return;
        }
        setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const error = validateStep(3);
        if (error) {
            setToast({ type: "error", message: error });
            return;
        }

        setSubmitting(true);
        try {
            await telefoniaStore.createSolicitud({
                usuario_creador_id: user?.id,
                beneficiario_dni: formData.dni,
                beneficiario_nombre: formData.nombre,
                beneficiario_area: formData.area,
                beneficiario_puesto: formData.puesto,
                beneficiario_n_linea_ref: formData.n_linea,
                tipo_servicio: formData.tipo_servicio,
                periodo_uso: formData.periodo_uso,
                fecha_inicio_uso: formData.fecha_inicio,
                fecha_fin_uso: formData.periodo_uso === "CAMPAÑA" ? formData.fecha_fin : null,
                fundo_planta: formData.fundo_planta,
                cultivo: formData.cultivo,
                cantidad_lineas: Number(formData.cantidad_lineas),
                justificacion: `
                    ${formData.motivo_reposicion ? `[Motivo: ${formData.motivo_reposicion}] ` : ""}
                    ${formData.numero_telefono ? `[Num: ${formData.numero_telefono}] ` : ""}
                    ${formData.tiene_evidencia ? `[Con Evidencia] ` : ""}
                    ${formData.justificacion}
                `.trim().replace(/\s+/g, ' '),
                aplicativos: selectedApps,
                estado: "Pendiente IT",
                created_by: user?.id,
            });

            setToast({ type: "success", message: "Solicitud creada correctamente" });
            // Reset form
            setFormData({
                dni: "", nombre: "", area: "", puesto: "", n_linea: "",
                numero_telefono: "", motivo_reposicion: "", tiene_evidencia: false,
                tipo_servicio: "PAQUETE ASIGNADO", periodo_uso: "PERMANENTE",
                fecha_inicio: new Date().toISOString().slice(0, 10), fecha_fin: "",
                fundo_planta: "", cultivo: "", cantidad_lineas: 1, justificacion: ""
            });
            setSelectedApps([]);
            setCurrentStep(1);
            setIsWizardOpen(false); // Close Modal

            // Reload history
            loadHistory();
        } catch (err: any) {
            setToast({ type: "error", message: err.message || "Error al crear solicitud" });
        } finally {
            setSubmitting(false);
        }
    };

    // Components for steps


    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300 pt-2">
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">DNI</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        maxLength={8}
                                        className="block w-full rounded border-gray-300 border p-2 text-sm outline-none focus:border-indigo-500 transition-all"
                                        value={formData.dni}
                                        onChange={(e) => handleChange("dni", e.target.value)}
                                        placeholder="00000000"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSearchDni}
                                        disabled={searchingDni}
                                        className="inline-flex items-center px-3 border border-gray-300 rounded bg-gray-50 hover:bg-white text-gray-600 transition-colors"
                                    >
                                        {searchingDni ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-5">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    className="block w-full rounded border-gray-300 border p-2 text-sm bg-gray-50/50 outline-none focus:border-indigo-500 transition-all"
                                    value={formData.nombre}
                                    onChange={(e) => handleChange("nombre", e.target.value)}
                                    placeholder="Nombre del beneficiario"
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Área</label>
                                <input
                                    type="text"
                                    className="block w-full rounded border-gray-300 border p-2 text-sm bg-gray-50/50 outline-none focus:border-indigo-500 transition-all"
                                    value={formData.area}
                                    onChange={(e) => handleChange("area", e.target.value)}
                                    placeholder="Gerencia / Área"
                                />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Puesto</label>
                                <select
                                    className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all"
                                    value={formData.puesto}
                                    onChange={(e) => handleChange("puesto", e.target.value)}
                                >
                                    <option value="">Seleccione Puesto...</option>
                                    {COMMON_ROLES.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Motivo de Solicitud</label>
                                <select
                                    className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all"
                                    value={formData.n_linea}
                                    onChange={(e) => handleChange("n_linea", e.target.value)}
                                >
                                    <option value="">Seleccione...</option>
                                    <option value="Línea Nueva">Solicitar Línea Nueva</option>
                                    <option value="Renovación">Renovación de Equipo</option>
                                    <option value="Reposición">Reposición por Robo/Pérdida/Deterioro</option>
                                </select>
                            </div>

                            {/* CONDITIONAL FIELDS */}
                            {(formData.n_linea === "Renovación" || formData.n_linea === "Reposición") && (
                                <div className="col-span-12 md:col-span-6 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Número de Celular</label>
                                    <div className="relative">
                                        <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <input
                                            type="tel"
                                            className="block w-full rounded border-gray-300 border py-2 pl-9 pr-2 text-sm outline-none focus:border-indigo-500 transition-all"
                                            value={formData.numero_telefono}
                                            onChange={(e) => handleChange("numero_telefono", e.target.value)}
                                            placeholder="999 999 999"
                                        />
                                    </div>
                                    {formData.n_linea === "Renovación" && (
                                        <div className="mt-2">
                                            <button
                                                type="button"
                                                onClick={handleValidateRenewal}
                                                disabled={validating || !formData.numero_telefono}
                                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                            >
                                                {validating ? <Loader2 className="w-3 h-3 animate-spin" /> : <History className="w-3 h-3" />}
                                                Validar Antigüedad
                                            </button>
                                            {validationResult && (
                                                <div className={`mt-2 p-2 rounded text-xs border ${validationResult.valid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                                    <p className="font-semibold">{validationResult.message}</p>
                                                    {validationResult.equipo && <p>Equipo anterior: {validationResult.equipo}</p>}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {formData.n_linea === "Reposición" && (
                                <>
                                    <div className="col-span-12 md:col-span-6 animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Motivo de Reposición</label>
                                        <select
                                            className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all"
                                            value={formData.motivo_reposicion}
                                            onChange={(e) => handleChange("motivo_reposicion", e.target.value)}
                                        >
                                            <option value="">Seleccione Motivo...</option>
                                            <option value="ROBO">Robo</option>
                                            <option value="PERDIDA">Pérdida</option>
                                            <option value="DETERIORO">Deterioro</option>
                                        </select>
                                    </div>
                                    <div className="col-span-12 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                                            <input
                                                type="checkbox"
                                                id="chkEvidencia"
                                                checked={formData.tiene_evidencia}
                                                onChange={(e) => handleChange("tiene_evidencia", e.target.checked)}
                                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                            />
                                            <label htmlFor="chkEvidencia" className="text-sm text-gray-700 select-none cursor-pointer">
                                                Confirmo que tengo la <strong>evidencia (Denuncia Policial o Reporte)</strong> lista para entregar.
                                            </label>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tipo de Servicio</label>
                                <select
                                    className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all"
                                    value={formData.tipo_servicio}
                                    onChange={(e) => handleChange("tipo_servicio", e.target.value)}
                                >
                                    <option value="PAQUETE ASIGNADO">PAQUETE ASIGNADO</option>
                                    <option value="SOLO CHIP">SOLO CHIP</option>
                                    <option value="REPOSICIÓN">REPOSICIÓN DE EQUIPO</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Periodo</label>
                                <select
                                    className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all"
                                    value={formData.periodo_uso}
                                    onChange={(e) => handleChange("periodo_uso", e.target.value)}
                                >
                                    <option value="PERMANENTE">PERMANENTE</option>
                                    <option value="CAMPAÑA">CAMPAÑA</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cantidad</label>
                                <input
                                    type="number"
                                    min={1}
                                    className="block w-full rounded border-gray-300 border p-2 text-sm outline-none focus:border-indigo-500 transition-all"
                                    value={formData.cantidad_lineas}
                                    onChange={(e) => handleChange("cantidad_lineas", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fecha Inicio</label>
                                <input
                                    type="date"
                                    className="block w-full rounded border-gray-300 border p-2 text-sm outline-none focus:border-indigo-500 transition-all"
                                    value={formData.fecha_inicio}
                                    onChange={(e) => handleChange("fecha_inicio", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fecha Fin</label>
                                <input
                                    type="date"
                                    disabled={formData.periodo_uso !== "CAMPAÑA"}
                                    className="block w-full rounded border-gray-300 border p-2 text-sm outline-none focus:border-indigo-500 transition-all disabled:bg-gray-100 disabled:text-gray-400"
                                    value={formData.fecha_fin}
                                    onChange={(e) => handleChange("fecha_fin", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fundo / Planta</label>
                                <select
                                    className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all"
                                    value={formData.fundo_planta}
                                    onChange={(e) => handleChange("fundo_planta", e.target.value)}
                                >
                                    <option value="">Seleccione...</option>
                                    <option value="PLANTA FRESCO">PLANTA FRESCO</option>
                                    <option value="PLANTA AREQUITA">PLANTA AREQUITA</option>
                                    <option value="FUNDO MUCHIK">FUNDO MUCHIK</option>
                                    <option value="COMPOSITAN">COMPOSITAN</option>
                                    <option value="EL ARENAL">EL ARENAL</option>
                                    <option value="CERRO PRIETO">CERRO PRIETO</option>
                                    <option value="OTROS">OTROS</option>
                                </select>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cultivo</label>
                                <select
                                    className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all"
                                    value={formData.cultivo}
                                    onChange={(e) => handleChange("cultivo", e.target.value)}
                                >
                                    <option value="">Seleccione...</option>
                                    <option value="ARANDANO">ARANDANO</option>
                                    <option value="PALTA">PALTA</option>
                                    <option value="ESPARRAGO">ESPARRAGO</option>
                                    <option value="UVA">UVA</option>
                                    <option value="MANGO">MANGO</option>
                                    <option value="PIMIENTO">PIMIENTO</option>
                                    <option value="OTROS">OTROS</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                const filteredApps = availableApps.filter(app =>
                    app.nombre.toLowerCase().includes(appSearch.toLowerCase()) &&
                    !selectedApps.includes(app.nombre)
                );

                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 pt-2">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Justificación del Requerimiento</label>
                            <textarea
                                rows={2}
                                className="block w-full rounded border-gray-300 border p-2 text-sm outline-none focus:border-indigo-500 transition-all resize-none"
                                placeholder="Especifique el motivo de la solicitud..."
                                value={formData.justificacion}
                                onChange={(e) => handleChange("justificacion", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Aplicativos Necesarios</label>

                            {/* Selected Apps List (Professional View) */}
                            <div className="border border-gray-200 rounded-md bg-gray-50/50 mb-3 overflow-hidden">
                                {selectedApps.length === 0 ? (
                                    <div className="p-3 text-sm text-gray-400 italic text-center text-xs">
                                        No se han seleccionado aplicativos
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {selectedApps.map(app => (
                                            <div key={app} className="flex justify-between items-center p-2.5 bg-white hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                    <span className="text-sm font-medium text-gray-700">{app}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleApp(app)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                    title="Quitar aplicativo"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Search & Add */}
                            <div className="relative group">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    className="block w-full rounded border-gray-300 border py-2 pl-9 pr-2 text-sm outline-none focus:border-indigo-500 transition-all"
                                    placeholder="Buscar aplicativos para agregar..."
                                    value={appSearch}
                                    onChange={(e) => setAppSearch(e.target.value)}
                                />
                            </div>

                            {/* Dropdown / Output List */}
                            {(appSearch || filteredApps.length > 0) && (
                                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg shadow-sm">
                                    {filteredApps.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 gap-px bg-gray-200">
                                            {filteredApps.map((app) => (
                                                <button
                                                    key={app.id}
                                                    type="button"
                                                    onClick={() => {
                                                        toggleApp(app.nombre);
                                                        setAppSearch(""); // Optional: clear search on add? maybe better to keep it if adding multiple
                                                    }}
                                                    className="flex items-center justify-between w-full p-2.5 bg-white hover:bg-gray-50 transition-colors text-left group"
                                                >
                                                    <span className="text-sm text-gray-700">{app.nombre}</span>
                                                    <Plus className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-sm text-gray-500">
                                            No se encontraron aplicativos.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const handleOpenDetail = (ticket: any) => {
        setSelectedDetail(ticket);
    };

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 md:px-8">
            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            {/* Header + Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">Solicitud de Telefonía</h1>
                    <p className="text-gray-500 text-xs">
                        Gestión de equipos y líneas corporativas
                    </p>
                </div>
                {!isWizardOpen && (
                    <button
                        onClick={() => {
                            setIsWizardOpen(true);
                            setCurrentStep(1);
                        }}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Solicitud
                    </button>
                )}
            </div>

            {isWizardOpen && (
                // WIZARD FORM VIEW
                <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
                    {/* Header with Inline Stepper */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
                        <h2 className="text-lg font-bold text-gray-900">Nueva Solicitud</h2>
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                            <div className={`flex items-center gap-1 ${currentStep >= 1 ? "text-indigo-600 font-semibold" : ""}`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${currentStep >= 1 ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300"}`}>1</div>
                                <span>Beneficiario</span>
                            </div>
                            <ChevronRight className="w-3 h-3 text-gray-300" />

                            <div className={`flex items-center gap-1 ${currentStep >= 2 ? "text-indigo-600 font-semibold" : ""}`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${currentStep >= 2 ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300"}`}>2</div>
                                <span>Servicio</span>
                            </div>
                            <ChevronRight className="w-3 h-3 text-gray-300" />

                            <div className={`flex items-center gap-1 ${currentStep >= 3 ? "text-indigo-600 font-semibold" : ""}`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${currentStep >= 3 ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300"}`}>3</div>
                                <span>Justificación</span>
                            </div>
                        </div>
                    </div>
                    {/* Removed Old StepIndicator component */}

                    <form onSubmit={handleSubmit} className="mt-8">
                        <div className="min-h-[200px]">
                            {renderStepContent()}
                        </div>

                        <div className="flex justify-between pt-4 border-t mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsWizardOpen(false);
                                    setCurrentStep(1);
                                }}
                                className="px-3 py-1.5 text-red-600 rounded hover:bg-red-50 text-sm font-medium transition-colors"
                            >
                                Cancelar
                            </button>

                            <div className="flex gap-2">
                                {currentStep > 1 && (
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="px-4 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
                                    >
                                        Atrás
                                    </button>
                                )}

                                {currentStep < 3 ? (
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="px-4 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-800 text-sm font-medium inline-flex items-center gap-2 transition-colors shadow-sm"
                                    >
                                        Siguiente <ChevronRight className="w-3 h-3" />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-4 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
                                    >
                                        {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                        Finalizar
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* List of Requests - CARD VIEW */}
            <div className="flex items-center gap-2 mb-4 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                <History className="h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Mis Solicitudes</h2>
            </div>

            {historyLoading ? (
                <div className="p-12 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
            ) : myTickets.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No tienes solicitudes</h3>
                    <p className="text-gray-500 mt-1 max-w-sm mx-auto">
                        Aún no has registrado solicitudes de telefonía. Presiona "Nuevo Ticket" para comenzar.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {myTickets.map((t) => (
                        <div
                            key={t.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-all group"
                        >
                            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                                {/* LEFT: Main Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-xs text-gray-400 font-medium border border-gray-100 px-2 py-0.5 rounded-md bg-gray-50 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(t.created_at).toLocaleDateString()}
                                        </span>
                                        <StatusBadge estado={t.estado} />
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900 truncate" title={t.beneficiario_nombre || ""}>
                                        {t.beneficiario_nombre}
                                    </h3>
                                    <p className="text-sm text-gray-500">{t.beneficiario_puesto}</p>
                                </div>

                                {/* MIDDLE: Technial Details */}
                                <div className="md:flex-1 md:border-l md:border-r border-gray-100 md:px-6 py-2 md:py-0 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    <div>
                                        <span className="text-gray-400 text-xs block">Servicio</span>
                                        <span className="font-medium text-gray-700">{t.tipo_servicio}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-xs block">Cantidad</span>
                                        <span className="font-medium text-gray-700">{t.cantidad_lineas} Línea(s)</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-gray-400 text-xs block">Ubicación</span>
                                        <span className="font-medium text-gray-700 truncate">{t.fundo_planta}</span>
                                    </div>
                                </div>

                                {/* RIGHT: Action */}
                                <div className="w-full md:w-auto flex items-center justify-end">
                                    <button
                                        onClick={() => handleOpenDetail(t)}
                                        className="px-4 py-2 bg-gray-50 text-blue-600 font-medium text-sm rounded-lg border border-blue-100 hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center gap-2"
                                    >
                                        Ver Detalle
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* DETAIL MODAL */}
            {selectedDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-xl animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => setSelectedDetail(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="pt-2">
                            <TicketDetailContent ticket={selectedDetail} />

                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={() => setSelectedDetail(null)}
                                    className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
