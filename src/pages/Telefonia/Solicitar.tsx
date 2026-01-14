import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../auth/AuthContext";
import { telefoniaStore, type Solicitud } from "../../store/telefoniaStore";
import { getSedesState, subscribeSedes } from "../../store/sedesStore";
import { getPersonalState, subscribePersonal } from "../../store/personalStore";
import { getGerenciasState, subscribeGerencias } from "../../store/gerenciasStore"; // NEW
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
import { TicketDetailContent } from "../../components/telefonia/TicketDetailContent.tsx";
import { RedistributionModal } from "../../components/telefonia/RedistributionModal";
import { Modal } from "../../components/ui/Modal";




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
    const { user, profile } = useAuth();

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
    const [selectedDetail, setSelectedDetail] = useState<Solicitud | null>(null);
    const [redistributionTicket, setRedistributionTicket] = useState<Solicitud | null>(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [appSearch, setAppSearch] = useState("");
    const [previousDevice, setPreviousDevice] = useState<string>("");
    const [verifyingNumber, setVerifyingNumber] = useState(false);
    const [renewalCalculated, setRenewalCalculated] = useState<{
        valid: boolean;
        message: string;
        lastDate: string;
        equipo: string;
    }>({ valid: false, message: "", lastDate: "", equipo: "" });

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
        paquete_asignado: "", // New field
        justificacion: "",
        asume_costo: "", // "EMPRESA" | "USUARIO"
        cuotas: 3,
        ceco: "", // NEW
        categoria: "", // NEW
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

    // Cargar historial y catalogos
    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            await Promise.all([
                telefoniaStore.fetchSolicitudes(),
                telefoniaStore.fetchPuestos(), // New
                telefoniaStore.fetchPlanes(),  // Ensure planes are loaded
                telefoniaStore.fetchModelos()  // New
            ]);
        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
        const unsubSedes = subscribeSedes(() => setSedesVersion(prev => prev + 1));
        const unsubPersonal = subscribePersonal(() => { });
        const unsubGerencias = subscribeGerencias(() => { }); // NEW
        return () => {
            unsubSedes();
            unsubPersonal();
            unsubGerencias();
        };
    }, []);

    // Auto-fill user data from profile
    useEffect(() => {
        if (profile) {
            setFormData(prev => ({
                ...prev,
                dni: profile.dni || prev.dni,
                nombre: profile.nombre || prev.nombre,
                area: profile.area || prev.area
            }));
        }
    }, [profile]);

    const [, setSedesVersion] = useState(0);
    const { sedes } = getSedesState();



    // Filter mis tickets
    // Filter mis tickets
    const myTickets = useMemo(() => {
        if (!user?.id) return [];
        return telefoniaStore.solicitudes.filter(s => s.created_by === user.id);
    }, [user?.id, telefoniaStore.solicitudes]);

    const [viewMode, setViewMode] = useState<"active" | "history">("active");

    const filteredTickets = useMemo(() => {
        return myTickets.filter(t => {
            const isHistory = ["Entregado", "Rechazada"].includes(t.estado);
            return viewMode === "active" ? !isHistory : isHistory;
        });
    }, [myTickets, viewMode]);



    // Puesto Selection State
    const [selectedPuestoId, setSelectedPuestoId] = useState<string>("");
    const [allowedPlans, setAllowedPlans] = useState<string[]>([]);

    // Sync selectedPuestoId if formData.puesto is set externally (e.g. from DNI search)
    useEffect(() => {
        if (formData.puesto && !selectedPuestoId) {
            const match = telefoniaStore.puestos.find(p => p.nombre === formData.puesto);
            if (match) setSelectedPuestoId(match.id);
        }
    }, [formData.puesto, telefoniaStore.puestos]);

    const handlePuestoChange = (puestoNombre: string) => {
        setFormData(prev => ({ ...prev, puesto: puestoNombre }));
        setSelectedPuestoId(""); // Reset ID as we are selecting by name now (which might map to multiple)

        if (!puestoNombre) {
            setAllowedPlans([]);
            return;
        }

        // Find all matches for this name
        const matches = telefoniaStore.puestos.filter(p => p.nombre === puestoNombre);

        if (matches.length > 0) {
            // Extract allowed plans
            const validPlans = matches
                .map(p => p.plan)
                .filter((p): p is any => !!p && !!p.active);

            const uniquePlanNames = Array.from(new Set(validPlans.map(p => p.nombre)));
            setAllowedPlans(uniquePlanNames);

            // If strictly one match, we can try to auto-fill
            if (matches.length === 1) {
                // Auto-select PLAN if unique
                if (uniquePlanNames.length === 1 && validPlans[0]) {
                    const p = validPlans[0];
                    setFormData(prev => ({
                        ...prev,
                        puesto: puestoNombre,
                        tipo_servicio: p.operador || "",
                        paquete_asignado: p.nombre || ""
                    }));
                }
            } else {
                // Check if ALL matches share a single plan?
                if (uniquePlanNames.length === 1 && validPlans[0]) {
                    const p = validPlans[0];
                    setFormData(prev => ({
                        ...prev,
                        puesto: puestoNombre,
                        tipo_servicio: p.operador || "",
                        paquete_asignado: p.nombre || ""
                    }));
                }
            }
        } else {
            setAllowedPlans([]);
        }
    };

    // ... (logic for unique names)
    const uniquePuestoNames = useMemo(() => {
        return Array.from(new Set(telefoniaStore.puestos.map(p => p.nombre))).sort();
    }, [telefoniaStore.puestos]);


    const handleChange = (field: string, value: any) => {
        setFormData(prev => {
            const newState = { ...prev, [field]: value };

            // Reset conditional fields if main selection changes
            if (field === "n_linea") {
                newState.numero_telefono = "";
                newState.motivo_reposicion = "";
                newState.tiene_evidencia = false;
                newState.asume_costo = "";
                newState.cuotas = 3;
            }

            // Reset sub-fields if reposicion motive changes
            if (field === "motivo_reposicion" && value !== "ROBO" && value !== "PERDIDA") {
                newState.asume_costo = "";
            }

            // Reset fecha_fin if switching to PERMANENTE
            if (field === "periodo_uso" && value === "PERMANENTE") {
                newState.fecha_fin = "";
            }

            return newState;
        });
    };

    const handleValidateReposicionNumber = async (value: string) => {
        if (!value || value.length < 5) return;

        setVerifyingNumber(true);
        setRenewalCalculated({ ...renewalCalculated, valid: false, message: "Buscando..." });

        try {
            const result = await telefoniaStore.validateReposicion(value);
            if (result.found && result.equipo) {
                setPreviousDevice(result.equipo);
            } else {
                setPreviousDevice("");
            }

            // Capture operator and plan if found
            if (result.found) {
                setFormData(prev => ({
                    ...prev,
                    tipo_servicio: result.operador || prev.tipo_servicio,
                    paquete_asignado: result.plan || prev.paquete_asignado
                }));
            }

            setRenewalCalculated({
                valid: result.found,
                message: result.message,
                lastDate: "",
                equipo: result.equipo || ""
            });

        } catch (error) {
            console.error(error);
            setRenewalCalculated({ valid: false, message: "Error", lastDate: "", equipo: "" });
        } finally {
            setVerifyingNumber(false);
        }
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
            if (res.valid || res.equipo) {
                if (res.equipo) setPreviousDevice(res.equipo);
                if (res.operador) {
                    setFormData(prev => ({ ...prev, tipo_servicio: res.operador || "Renovación" }));
                }
            }
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
            // Updated to use personalStore with manual mapping
            const { personal } = getPersonalState();
            const { gerencias } = getGerenciasState();
            const found = personal.find(p => p.dni === formData.dni);

            if (found) {
                // Find gerencia name
                const g = gerencias.find(g => g.id === found.gerenciaId);

                setFormData((prev) => ({
                    ...prev,
                    nombre: found.nombre || "",
                    area: g?.nombre || "", // Mapped manually
                    puesto: "", // Puesto not available in personal table
                }));
                // Warning added
                setToast({ type: "success", message: "Datos encontrados (Personal). NOTA: Puesto no disponible en este padrón." });
            } else {
                setToast({ type: "info", message: "DNI no encontrado en el padrón de personal." });
                setFormData((prev) => ({
                    ...prev,
                    nombre: "",
                    area: "",
                    puesto: "",
                }));
            }
        } catch (e) {
            console.error(e);
            setToast({ type: "error", message: "Error al buscar información." });
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

            // New Validation Rules
            if (formData.n_linea === "Renovación") {
                if (!validationResult?.valid) {
                    return "Debe validar la antigüedad del equipo para continuar (mínimo 3 años).";
                }
            }
            if (formData.n_linea === "Reposición") {
                if (!renewalCalculated.valid) { // Using renewalCalculated for Reposición state
                    return "Debe validar el número para proceder con la reposición.";
                }
            }
        }
        if (step === 2) {
            // BRANCH: REPOSICIÓN
            if (formData.n_linea === "Reposición") {
                if (!formData.motivo_reposicion) return "Seleccione el motivo de la reposición.";
                if (!formData.fundo_planta) return "Seleccione Fundo / Planta."; // NEW Validation
                if (!formData.tiene_evidencia) return "Es obligatorio tener evidencia (denuncia/reporte) para reposición.";
                if (["ROBO", "PERDIDA"].includes(formData.motivo_reposicion)) {
                    if (!formData.asume_costo) return "Indique quién asume el costo de la reposición.";
                }
            } else {
                // BRANCH: STANDARD SERVICES
                if (!formData.ceco) return "Ingrese el CECO (Centro de Costo).";
                if (!formData.categoria) return "Seleccione la Categoría (Proyecto/Administrativos).";

                if (!formData.tipo_servicio) return "Seleccione el Operador";
                if (["CLARO", "ENTEL", "MOVISTAR"].includes(formData.tipo_servicio) && !formData.paquete_asignado) {
                    return "Seleccione un paquete asignado";
                }
                if (!formData.fecha_inicio) return "Ingrese fecha de inicio";
                if (formData.periodo_uso === "CAMPAÑA" && !formData.fecha_fin) return "Ingrese fecha de fin para campaña";
                if (!formData.fundo_planta) return "Ingrese Fundo / Planta";
                if (!formData.cantidad_lineas || formData.cantidad_lineas < 1) return "Cantidad debe ser al menos 1";
            }
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
                tipo_servicio: formData.n_linea === "Reposición"
                    ? (formData.tipo_servicio && formData.tipo_servicio !== "PAQUETE ASIGNADO" ? formData.tipo_servicio : "REPOSICIÓN")
                    : formData.tipo_servicio,
                paquete_asignado: (["CLARO", "ENTEL", "MOVISTAR"].includes(formData.tipo_servicio) || formData.n_linea === "Reposición")
                    ? formData.paquete_asignado
                    : null,
                plan_costo: ["CLARO", "ENTEL", "MOVISTAR"].includes(formData.tipo_servicio)
                    ? telefoniaStore.planes.find(p => p.nombre === formData.paquete_asignado)?.costo || 0
                    : null,
                plan_datos: ["CLARO", "ENTEL", "MOVISTAR"].includes(formData.tipo_servicio)
                    ? telefoniaStore.planes.find(p => p.nombre === formData.paquete_asignado)?.gigas || ""
                    : null,
                fecha_inicio_uso: formData.fecha_inicio,
                fecha_fin_uso: formData.periodo_uso === "CAMPAÑA" ? formData.fecha_fin : null,
                fundo_planta: formData.fundo_planta,
                cultivo: formData.cultivo,
                cantidad_lineas: Number(formData.cantidad_lineas),
                detalle_reposicion: formData.n_linea === "Reposición" ? {
                    motivo: formData.motivo_reposicion,
                    asume: formData.asume_costo,
                    cuotas: formData.asume_costo === "USUARIO" ? Number(formData.cuotas) : 0,
                    tiene_evidencia: formData.tiene_evidencia,
                    equipoAnterior: previousDevice || "No registrado",
                    detalleIncidente: formData.motivo_reposicion, // Map simpler if needed
                    numero_afectado: formData.numero_telefono
                } : null,
                simulacion_descuento: (formData.n_linea === "Reposición" && formData.asume_costo === "USUARIO") ? {
                    costoEquipo: "0.00", // Start with 0 or fetch if possible. For now placeholder.
                    montoDescuento: "Pendiente RRHH",
                    cuotas: Number(formData.cuotas),
                    cuotaMensual: "Por definir",
                    periodo: `Mes 1 a ${formData.cuotas}`,
                    concepto: 'Descuento Equipo Telefónico',
                    descuento: `${(100 / Number(formData.cuotas)).toFixed(2)}% / mes`
                } : null,
                justificacion: formData.justificacion,
                aplicativos: selectedApps,
                estado: (formData.n_linea === "Reposición" || formData.n_linea === "Renovación" || formData.n_linea === "Línea Nueva" || formData.n_linea === "Línea de Segundo Uso" || formData.tipo_servicio === "REPOSICIÓN") ? "Revisión Admin" : "Pendiente Gerencia",
                created_by: user?.id,
                ceco: formData.ceco, // NEW
                categoria: formData.categoria, // NEW 
            });

            setToast({ type: "success", message: "Solicitud creada correctamente" });
            // Reset form
            setFormData({
                dni: "", nombre: "", area: "", puesto: "", n_linea: "",
                numero_telefono: "", motivo_reposicion: "", tiene_evidencia: false,
                tipo_servicio: "", periodo_uso: "PERMANENTE",
                fecha_inicio: new Date().toISOString().slice(0, 10), fecha_fin: "",
                fundo_planta: "", cultivo: "", cantidad_lineas: 1, justificacion: "",
                paquete_asignado: "", asume_costo: "", cuotas: 3, ceco: "", categoria: ""
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
                                    onChange={(e) => handlePuestoChange(e.target.value)}
                                >
                                    <option value="">Seleccione Puesto...</option>
                                    {uniquePuestoNames.map(name => (
                                        <option key={name} value={name}>
                                            {name}
                                        </option>
                                    ))}
                                    {/* Handle manual case */}
                                    {!uniquePuestoNames.includes(formData.puesto) && formData.puesto && (
                                        <option value={formData.puesto}>{formData.puesto} (Manual)</option>
                                    )}
                                </select>
                                {
                                    /* 
                                     * "Equipo sugerido" REMOVED as per request.
                                     * Logic remains in background for references if needed, but UI hidden.
                                     */
                                }
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
                                    <option value="Línea de Segundo Uso">Solicitar Línea de Segundo Uso</option>
                                    <option value="Renovación">Renovación de Equipo</option>
                                    <option value="Reposición">Reposición por Robo/Pérdida/Deterioro</option>
                                </select>
                            </div>

                            {/* CONDITIONAL FIELDS */}
                            {(formData.n_linea === "Renovación" || formData.n_linea === "Reposición") && (
                                <div className="col-span-12 md:col-span-6 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Número de Celular</label>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            className={`block w-full rounded border p-2 pl-9 pr-2 text-sm outline-none transition-all ${formData.n_linea === "Reposición" && renewalCalculated.message === "Validado"
                                                ? "border-green-500 ring-1 ring-green-500/20 bg-green-50"
                                                : formData.n_linea === "Reposición" && renewalCalculated.message === "No encontrado"
                                                    ? "border-red-300 bg-red-50 text-red-900"
                                                    : "border-gray-300 focus:border-indigo-500"
                                                }`}
                                            value={formData.numero_telefono}
                                            onChange={(e) => {
                                                handleChange("numero_telefono", e.target.value);
                                                // Reset validation when number changes
                                                if (formData.n_linea === "Reposición" && renewalCalculated.message) {
                                                    setRenewalCalculated({ ...renewalCalculated, message: "", valid: false });
                                                }
                                                // Reset validation for Renovación too
                                                if (formData.n_linea === "Renovación" && validationResult) {
                                                    setValidationResult(null);
                                                }
                                            }}
                                            // onBlur removed from here to use explicit button for Reposicion as requested
                                            placeholder="999 999 999"
                                        />
                                        <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />

                                        {/* Status Indicator for Reposicion - Kept for visual feedback inside input */}
                                        {formData.n_linea === "Reposición" && (
                                            <div className="absolute right-2 top-2">
                                                {renewalCalculated.message === "Validado" ? (
                                                    <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">
                                                        VALIDADO
                                                    </span>
                                                ) : renewalCalculated.message === "No encontrado" ? (
                                                    <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                                                        NO ENCONTRADO
                                                    </span>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>

                                    {/* Validar Button for Reposición (NEW) */}
                                    {formData.n_linea === "Reposición" && (
                                        <div className="mt-2">
                                            <button
                                                type="button"
                                                onClick={() => handleValidateReposicionNumber(formData.numero_telefono)}
                                                disabled={verifyingNumber || !formData.numero_telefono}
                                                className="mt-1 w-full inline-flex justify-center items-center px-4 py-2 border border-blue-200 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                            >
                                                {verifyingNumber ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                                                Validar Número para Reposición
                                            </button>
                                        </div>
                                    )}

                                    {/* Equipment Info Display for Reposicion - REMOVED per user request
                                    {formData.n_linea === "Reposición" && previousDevice && (
                                        <p className="text-xs text-green-600 mt-1 pl-1 flex items-center gap-1">
                                            <Smartphone className="w-3 h-3" />
                                            Modelo: <span className="font-semibold">{previousDevice}</span>
                                        </p>
                                    )}
                                    */}

                                    {formData.n_linea === "Renovación" && (
                                        <div className="mt-2">
                                            <button
                                                type="button"
                                                onClick={handleValidateRenewal}
                                                disabled={validating || !formData.numero_telefono}
                                                className="mt-1 w-full inline-flex justify-center items-center px-4 py-2 border border-indigo-200 shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                            >
                                                {validating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <History className="w-4 h-4 mr-2" />}
                                                Validar Antigüedad del Equipo
                                            </button>
                                            {validationResult && (
                                                <div className={`mt-2 p-2 rounded text-xs border ${validationResult.valid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                                    <p className="font-semibold">{validationResult.message}</p>
                                                    {/* Removed "Equipo ANTERIOR" as per user request */}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {formData.n_linea === "Reposición" && (
                                <div className="col-span-12 p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                                    <CheckCircle2 className="w-4 h-4 mt-0.5" />
                                    <div>
                                        <p className="font-semibold">Proceso de Reposición</p>
                                        <p className="text-xs mt-1">
                                            En el siguiente paso deberás ingresar los detalles de la incidencia (Robo/Pérdida/Deterioro)
                                            y la asunción de costos si corresponde.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 2:
                if (formData.n_linea === "Reposición") {
                    // --- RENDER REPOSICIÓN STEP 2 ---
                    return (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300 pt-2">
                            <h3 className="text-lg font-medium text-gray-900">Detalles de Reposición</h3>
                            <div className="grid grid-cols-12 gap-4">
                                {previousDevice && (
                                    <div className="col-span-12 p-3 bg-indigo-50 border border-indigo-100 rounded-lg mb-2">
                                        <p className="text-xs text-indigo-600 font-bold uppercase tracking-wide">Equipo a Reponer</p>
                                        <p className="text-gray-900 font-medium flex items-center gap-2 mt-1">
                                            <Smartphone className="w-4 h-4 text-indigo-500" />
                                            {previousDevice}
                                        </p>
                                        <p className="text-xs text-indigo-400 mt-1">Se le asignará un equipo de mismas características.</p>
                                    </div>
                                )}

                                <div className="col-span-12 md:col-span-6">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fundo / Planta</label>
                                    <select
                                        className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all"
                                        value={formData.fundo_planta}
                                        onChange={(e) => handleChange("fundo_planta", e.target.value)}
                                    >
                                        <option value="">Seleccione...</option>
                                        {sedes.map(sede => (
                                            <option key={sede.id} value={sede.nombre}>{sede.nombre}</option>
                                        ))}
                                        {!sedes.find(s => s.nombre === formData.fundo_planta) && formData.fundo_planta && (
                                            <option value={formData.fundo_planta}>{formData.fundo_planta} (Legacy)</option>
                                        )}
                                    </select>
                                </div>
                                <div className="col-span-12 md:col-span-6">
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


                                <div className="col-span-12 md:col-span-6">
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

                                {(formData.motivo_reposicion === "ROBO" || formData.motivo_reposicion === "PERDIDA") && (
                                    <div className="col-span-12 p-4 bg-gray-50 rounded-lg border border-gray-100 animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">¿Quién asume el costo de reposición?</label>
                                        <div className="flex gap-6 mb-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="asume_costo"
                                                    value="EMPRESA"
                                                    checked={formData.asume_costo === "EMPRESA"}
                                                    onChange={(e) => handleChange("asume_costo", e.target.value)}
                                                    className="text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm font-medium text-gray-700">Asume la Empresa</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="asume_costo"
                                                    value="USUARIO"
                                                    checked={formData.asume_costo === "USUARIO"}
                                                    onChange={(e) => handleChange("asume_costo", e.target.value)}
                                                    className="text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm font-medium text-gray-700">Asume el Usuario</span>
                                            </label>
                                        </div>

                                        {formData.asume_costo === "USUARIO" && (
                                            <div className="mt-4 border-t border-gray-200 pt-4">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <label className="text-sm font-medium text-gray-700">Número de Cuotas:</label>
                                                    <select
                                                        value={formData.cuotas}
                                                        onChange={(e) => handleChange("cuotas", Number(e.target.value))}
                                                        className="rounded border-gray-300 border p-1 text-sm focus:border-indigo-500 outline-none"
                                                    >
                                                        <option value={1}>1 Cuota</option>
                                                        <option value={2}>2 Cuotas</option>
                                                        <option value={3}>3 Cuotas</option>
                                                        <option value={4}>4 Cuotas</option>
                                                        <option value={5}>5 Cuotas</option>
                                                        <option value={6}>6 Cuotas</option>
                                                    </select>
                                                </div>

                                                <div className="bg-white border rounded-lg overflow-hidden text-sm">
                                                    <div className="bg-indigo-50 px-3 py-2 border-b border-indigo-100 font-medium text-indigo-800 flex items-center gap-2">
                                                        <FileText className="w-4 h-4" />
                                                        Simulación de Descuento por Planilla
                                                    </div>
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                                                <th className="px-3 py-2 font-medium text-gray-500">Periodo</th>
                                                                <th className="px-3 py-2 font-medium text-gray-500">Concepto</th>
                                                                <th className="px-3 py-2 font-medium text-gray-500 text-right">Porcentaje</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td className="px-3 py-2 text-gray-600">Mes 1 a {formData.cuotas}</td>
                                                                <td className="px-3 py-2 text-gray-600">Descuento Equipo Telefónico</td>
                                                                <td className="px-3 py-2 text-gray-900 font-medium text-right text-indigo-600">
                                                                    {(100 / formData.cuotas).toFixed(2)}% / mes
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                    <div className="px-3 py-2 bg-yellow-50 text-yellow-800 text-xs border-t border-yellow-100">
                                                        * El monto exacto será calculado por RRHH según el valor libro del equipo.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="col-span-12">
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
                            </div>
                        </div>
                    );
                }

                // --- RENDER STANDARD SERVICES STEP 2 ---
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* MOVED TO TOP: Fundo/Planta & Cultivo */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fundo / Planta</label>
                                <select
                                    className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all"
                                    value={formData.fundo_planta}
                                    onChange={(e) => {
                                        // Reset operator if current selection is not available in new sede (optional but cleaner)
                                        // For now, let's just update the sede. The operator validation happens next.
                                        handleChange("fundo_planta", e.target.value);
                                    }}
                                >
                                    <option value="">Seleccione...</option>
                                    {sedes.map(sede => (
                                        <option key={sede.id} value={sede.nombre}>{sede.nombre}</option>
                                    ))}
                                    {/* Fallback for legacy values not in DB or 'OTROS' if needed, but user wanted strict list from config */}
                                    {!sedes.find(s => s.nombre === formData.fundo_planta) && formData.fundo_planta && (
                                        <option value={formData.fundo_planta}>{formData.fundo_planta} (Legacy)</option>
                                    )}
                                </select>
                            </div>
                            <div className="md:col-span-2">
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

                            {/* New Fields: CECO & Categoria */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">CECO</label>
                                <input
                                    type="text" // numeric input but stored as string often safer for codes, user said "NUMERICO" so maybe <input type="number"> or regex.
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="block w-full rounded border-gray-300 border p-2 text-sm outline-none focus:border-indigo-500 transition-all"
                                    value={formData.ceco}
                                    onChange={(e) => handleChange("ceco", e.target.value.replace(/\D/g, ''))} // Enforce numeric
                                    placeholder="Centro de Costo"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Categoría</label>
                                <select
                                    className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all"
                                    value={formData.categoria}
                                    onChange={(e) => handleChange("categoria", e.target.value)}
                                >
                                    <option value="">Seleccione...</option>
                                    <option value="PROYECTO">PROYECTO</option>
                                    <option value="ADMINISTRATIVOS">ADMINISTRATIVOS</option>
                                </select>
                            </div>

                            {/* Service Type - Filtered */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">OPERADOR</label>
                                <select
                                    required
                                    className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all"
                                    value={formData.tipo_servicio}
                                    onChange={(e) => setFormData({ ...formData, tipo_servicio: e.target.value, paquete_asignado: "" })}
                                >
                                    <option value="">Seleccione...</option>

                                    {/* 
                                        Logic: 
                                        1. Find selected Sede
                                        2. Get allowed operators
                                        3. If no coverage defined (empty array), show ALL (fail-safe) or NONE? 
                                           User requested explicit assignment. But if DB is empty, user is blocked. 
                                           I will show ALL if operators array is empty/undefined, BUT if it has values, restrict to them.
                                    */}
                                    {(() => {
                                        const activeSede = sedes.find(s => s.nombre === formData.fundo_planta);
                                        const allowedOps = activeSede?.operadores;
                                        const hasRestrictions = allowedOps && allowedOps.length > 0;

                                        // Get all unique operators from Plans
                                        const allOps = Array.from(new Set(telefoniaStore.planes.filter(p => p.active).map(p => p.operador)));

                                        return allOps.map(op => {
                                            if (hasRestrictions && !allowedOps.includes(op)) return null;
                                            return <option key={op} value={op}>{op}</option>;
                                        });
                                    })()}

                                    <option value="SOLO CHIP">SOLO CHIP</option>
                                </select>
                                {formData.fundo_planta && sedes.find(s => s.nombre === formData.fundo_planta)?.operadores?.length === 0 && (
                                    <p className="text-[10px] text-orange-500 mt-1">* Sede sin cobertura configurada (se muestran todos)</p>
                                )}
                            </div>

                            {["CLARO", "ENTEL", "MOVISTAR"].includes(formData.tipo_servicio) && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Paquete Asignado</label>
                                    <select
                                        required
                                        className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all"
                                        value={formData.paquete_asignado}
                                        onChange={(e) => setFormData({ ...formData, paquete_asignado: e.target.value })}
                                    >
                                        <option value="">Seleccione Plan...</option>
                                        {telefoniaStore.planes
                                            .filter(p => {
                                                const matchOperator = p.operador === formData.tipo_servicio && p.active;

                                                // Use allowedPlans filter if available
                                                if (allowedPlans.length > 0) {
                                                    return matchOperator && allowedPlans.includes(p.nombre);
                                                }

                                                return matchOperator;
                                            })
                                            .map(p => (
                                                <option key={p.id} value={p.nombre}>
                                                    {p.nombre} ({p.gigas})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}
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
                                        disabled={
                                            (currentStep === 1 && formData.n_linea === "Renovación" && !validationResult?.valid) ||
                                            (currentStep === 1 && formData.n_linea === "Reposición" && !renewalCalculated.valid)
                                        }
                                        className="px-4 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-800 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
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


            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Mis Solicitudes</h2>
                </div>

                <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                    <button
                        onClick={() => setViewMode("active")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === "active"
                            ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        Pendientes ({myTickets.filter(t => !["Entregado", "Rechazada"].includes(t.estado)).length})
                    </button>
                    <button
                        onClick={() => setViewMode("history")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === "history"
                            ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        Historial
                    </button>
                </div>
            </div>

            {historyLoading ? (
                <div className="p-12 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
            ) : filteredTickets.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">
                        {viewMode === "active" ? "No tienes solicitudes pendientes" : "No tienes historial de solicitudes"}
                    </h3>
                    <p className="text-gray-500 mt-1 max-w-sm mx-auto">
                        {viewMode === "active"
                            ? 'Presiona "Nuevo Ticket" para comenzar una nueva solicitud.'
                            : 'Las solicitudes finalizadas o rechazadas aparecerán aquí.'}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filteredTickets.map((t) => (
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
                                        <span className="text-gray-400 text-xs block">Solicitud</span>
                                        <span className={`font-bold ${t.beneficiario_n_linea_ref === "Reposición" ? "text-orange-700" :
                                            t.beneficiario_n_linea_ref === "Renovación" ? "text-emerald-700" :
                                                "text-blue-700"
                                            }`}>
                                            {t.beneficiario_n_linea_ref || "Línea Nueva"}
                                        </span>
                                    </div>
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
                <Modal
                    open={!!selectedDetail}
                    onClose={() => setSelectedDetail(null)}
                    title={`Detalle de Solicitud #${selectedDetail.id?.slice(0, 8)}`}
                    size="lg"
                    footer={
                        <div className="flex gap-2">
                            {selectedDetail?.estado === "Entregado" && (
                                <button
                                    onClick={() => {
                                        setRedistributionTicket(selectedDetail);
                                        setSelectedDetail(null);
                                    }}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                >
                                    <span className="text-lg">👥</span> Asignar Responsables
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedDetail(null)}
                                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    }
                >
                    <div className="pt-2">
                        <TicketDetailContent ticket={selectedDetail} />
                    </div>
                </Modal>
            )
            }

            {/* REDISTRIBUTION MODAL */}
            {
                redistributionTicket && (
                    <RedistributionModal
                        isOpen={!!redistributionTicket}
                        onClose={() => setRedistributionTicket(null)}
                        ticket={redistributionTicket}
                    />
                )
            }
        </div >
    );
}
