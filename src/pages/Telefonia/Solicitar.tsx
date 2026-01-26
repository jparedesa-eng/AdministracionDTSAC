import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../auth/AuthContext";
import { telefoniaStore, type Solicitud } from "../../store/telefoniaStore";
import { getSedesState, subscribeSedes } from "../../store/sedesStore";

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
    Edit2,
    Trash2,
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
    const [currentStep, setCurrentStep] = useState(1);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Validation State
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [validating, setValidating] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Modal controls
    const [selectedDetail, setSelectedDetail] = useState<Solicitud | null>(null);
    const [redistributionTicket, setRedistributionTicket] = useState<Solicitud | null>(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [appSearch, setAppSearch] = useState("");
    const [previousDevice, setPreviousDevice] = useState<string>("");

    // New State for Beneficiaries
    const [beneficiaries, setBeneficiaries] = useState<{ dni: string, nombre: string, area: string, puesto: string, sede: string }[]>([]);
    const [skipBeneficiaries, setSkipBeneficiaries] = useState(false);
    const [verifyingNumber, setVerifyingNumber] = useState(false);
    const [renewalCalculated, setRenewalCalculated] = useState<{
        valid: boolean;
        message: string;
        lastDate: string;
        equipo: string;
    }>({ valid: false, message: "", lastDate: "", equipo: "" });

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);

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
        proyecto: "", // NEW FIELD (Renamed from descripcion_categoria)
        perfil_puesto: "", // NEW - ID of selected Puesto Catalog
        alternativa_modelo: null as string | null, // NEW - Auto-registered suggested equipment
        condicion_equipo: "", // "Nuevo" | "Segundo Uso"
        tipo_equipo_destino: "", // NEW: EQUIPO, DREAM, SENSOR, TABLET
        codigo_equipo_destino: "", // NEW: IMEI
    });

    const [chipTargets, setChipTargets] = useState<{ type: string; imei: string }[]>([]);
    const [suggestedModel, setSuggestedModel] = useState<string>("");

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
                telefoniaStore.fetchModelos(),  // New
                telefoniaStore.fetchProyectos(), // New
                telefoniaStore.fetchEquipos()   // Ensure inventory is loaded for validation
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
        return () => {
            unsubSedes();
        };
    }, []);

    // Update beneficiaries when count changes
    useEffect(() => {
        const count = Number(formData.cantidad_lineas) || 0;
        setBeneficiaries(prev => {
            if (prev.length === count) return prev;
            if (count > prev.length) {
                const newItems = Array(count - prev.length).fill(null).map(() => ({ dni: "", nombre: "", area: "", puesto: "", sede: "" }));
                return [...prev, ...newItems];
            }
            return prev.slice(0, count);
        });

        // Auto-skip logic if > 5
        if (count > 5) {
            setSkipBeneficiaries(true);
        } else {
            // Optional: Auto-unskip if lowered? Or keep valid?
            // User requirement: "si son mas de 5 equipos debe saltarse marcarte por defecto"
            // If user manually unchecked it, we shouldn't force it again unless they change number again?
            // Implementation: Simple check here is fine.
            // If it drops to <= 5, we can revert to false to encourage filling it out, unless they manually set it?
            // Simpler: Just set to true if > 5. If <= 5, set to false (reset).
            setSkipBeneficiaries(false);
        }
    }, [formData.cantidad_lineas]);

    // Update chipTargets when count changes (Solo Chip)
    useEffect(() => {
        const count = Number(formData.cantidad_lineas) || 1;
        setChipTargets(prev => {
            if (prev.length === count) return prev;
            if (count > prev.length) {
                const newItems = Array(count - prev.length).fill(null).map(() => ({ type: "", imei: "" }));
                return [...prev, ...newItems];
            }
            return prev.slice(0, count);
        });
    }, [formData.cantidad_lineas]);

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
        return telefoniaStore.solicitudes.filter(s => s.usuario_creador_id === user.id);
    }, [user?.id, telefoniaStore.solicitudes]);

    const [viewMode, setViewMode] = useState<"active" | "history">("active");

    const filteredTickets = useMemo(() => {
        return myTickets.filter(t => {
            const isHistory = ["Entregado", "Rechazada"].includes(t.estado);
            return viewMode === "active" ? !isHistory : isHistory;
        });
    }, [myTickets, viewMode]);



    // Puesto Selection State





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

            // Reset condicion_equipo if n_linea changes
            if (field === "n_linea") {
                newState.condicion_equipo = "";
                newState.tipo_equipo_destino = "";
                newState.codigo_equipo_destino = "";
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

    const handlePuestoChange = (puestoId: string) => {
        const puesto = telefoniaStore.puestos.find(p => p.id === puestoId);

        if (puesto) {
            // 1. Suggest Equipment & Auto-register as 'alternativa_modelo'
            const modelString = puesto.modelo ? `${puesto.modelo.marca} ${puesto.modelo.nombre}` : "";
            setSuggestedModel(modelString);

            setFormData(prev => ({
                ...prev,
                perfil_puesto: puestoId,
                alternativa_modelo: modelString || null, // Auto-register suggested model as the alternative (skips admin assignment)
                tipo_servicio: puesto.plan?.operador || prev.tipo_servicio,
                paquete_asignado: puesto.plan?.nombre || prev.paquete_asignado
            }));
        } else {
            setSuggestedModel("");
            setFormData(prev => ({
                ...prev,
                perfil_puesto: puestoId,
                alternativa_modelo: null,
                tipo_servicio: "",
                paquete_asignado: ""
            }));
        }
    };



    const validateStep = (step: number) => {
        const newErrors: Record<string, string> = {};

        if (step === 1) {
            // STEP 1: MOTIVO & DATOS GENERALES
            if (!formData.n_linea) newErrors.n_linea = "Seleccione el motivo de solicitud";

            if ((formData.n_linea === "Renovación" || formData.n_linea === "Reposición") && !formData.numero_telefono) {
                newErrors.numero_telefono = "Debe ingresar el número de teléfono.";
            }

            // Validation Rules
            if (formData.n_linea === "Renovación" && !validationResult?.valid) {
                return { general: "Debe validar la antigüedad del equipo para continuar (mínimo 3 años)." };
            }

            if (formData.n_linea === "Reposición" && !renewalCalculated.valid) {
                return { general: "Debe validar el número para proceder con la reposición." };
            }

            // COMMON VALIDATIONS
            if (!formData.fundo_planta) newErrors.fundo_planta = "Seleccione Fundo / Planta.";
            if (!formData.cultivo) newErrors.cultivo = "Seleccione Cultivo.";

            // CECO Validation
            if (!formData.ceco) {
                newErrors.ceco = "Ingrese el CECO (Centro de Costo).";
            } else if (formData.ceco.length !== 10) {
                newErrors.ceco = "El CECO debe tener 10 dígitos.";
            }

            if (!formData.categoria) newErrors.categoria = "Seleccione la Categoría (Proyecto/Telefonia).";

            if (formData.categoria === "PROYECTO" && !formData.proyecto) {
                newErrors.proyecto = "Seleccione el Proyecto.";
            }
        }

        if (step === 2) {
            // ... existing logic mapped to errors ...
            if (formData.n_linea === "Reposición") {
                if (!formData.motivo_reposicion) newErrors.motivo_reposicion = "Seleccione el motivo de la reposición.";
                if (!formData.tiene_evidencia) newErrors.tiene_evidencia = "Es obligatorio tener evidencia.";
                if (["ROBO", "PERDIDA"].includes(formData.motivo_reposicion)) {
                    if (!formData.asume_costo) newErrors.asume_costo = "Indique quién asume el costo.";
                }
            } else {
                if (formData.n_linea === "Solicitar Equipo" && !formData.condicion_equipo) {
                    newErrors.condicion_equipo = "Debe seleccionar si requiere Equipo Nuevo o de Segundo Uso.";
                }
                if (formData.n_linea !== "Línea Nueva (SOLO CHIP)" && !formData.perfil_puesto) {
                    newErrors.perfil_puesto = "Seleccione el Perfil del Puesto";
                }
                if (formData.tipo_servicio !== "PAQUETE ASIGNADO" && !formData.tipo_servicio) newErrors.tipo_servicio = "Seleccione el Operador";

                if (["CLARO", "ENTEL", "MOVISTAR"].includes(formData.tipo_servicio) && !formData.paquete_asignado) {
                    newErrors.paquete_asignado = "Seleccione un paquete asignado";
                }
                if (!formData.fecha_inicio) newErrors.fecha_inicio = "Ingrese fecha de inicio";
                if (formData.periodo_uso === "CAMPAÑA" && !formData.fecha_fin) newErrors.fecha_fin = "Ingrese fecha de fin para campaña";

                if (formData.fecha_inicio && formData.fecha_fin && formData.periodo_uso !== "PERMANENTE") {
                    if (formData.fecha_inicio > formData.fecha_fin) {
                        newErrors.fecha_inicio = "Fecha Inicio > Fecha Fin";
                        newErrors.fecha_fin = "Fecha Fin < Fecha Inicio";
                    }
                }

                if (!formData.cantidad_lineas || formData.cantidad_lineas < 1) newErrors.cantidad_lineas = "Cantidad debe ser al menos 1";
            }
        }

        if (step === 3) {
            if (formData.n_linea === "Línea Nueva (SOLO CHIP)") {
                const invalidTarget = chipTargets.find(t => !t.type || !t.imei);
                if (invalidTarget) {
                    return { general: "Complete todos los campos de Equipo de Destino (Tipo e IMEI) para cada solicitud." };
                }
            } else if (!skipBeneficiaries) {
                if (formData.cantidad_lineas > 0) {
                    const invalid = beneficiaries.find(b => !b.dni || b.dni.length !== 8 || !b.nombre || !b.sede);
                    if (invalid) return { general: "Complete todos los datos de los beneficiarios (DNI, Nombre y Sede)." };
                }
            }
        }

        if (step === 4) {
            if (!formData.justificacion) newErrors.justificacion = "Ingrese una justificación";
        }

        return Object.keys(newErrors).length > 0 ? newErrors : null;
    };

    const nextStep = () => {
        const validationErrors = validateStep(currentStep);
        if (validationErrors) {
            // Updated: Set errors state
            setErrors(validationErrors);

            // If it's a general string error (legacy/complex), show toast
            if (validationErrors.general) {
                setToast({ type: "error", message: validationErrors.general });
            } else {
                // Determine if we should show a generic toast "Fix errors"
                setToast({ type: "error", message: "Por favor corrija los errores marcados en rojo." });
            }
            return;
        }
        // Clear errors if valid
        setErrors({});

        // Prepare Beneficiaries State when moving to Step 2 (Beneficiaries)
        if (currentStep === 2 && formData.cantidad_lineas > 0) {
            // Find selected Puesto Name
            const selectedPuesto = telefoniaStore.puestos.find(p => p.id === formData.perfil_puesto);
            const puestoName = selectedPuesto ? selectedPuesto.nombre : "";

            // Initialize beneficiaries array size
            setBeneficiaries(prev => {
                const newArr = [...prev];
                // Resize
                if (newArr.length < formData.cantidad_lineas) {
                    const toAdd = formData.cantidad_lineas - newArr.length;
                    for (let i = 0; i < toAdd; i++) {
                        // First one defaults to Responsable if empty? Maybe optional.
                        // Lets just add empty but with Puesto pre-filled
                        newArr.push({ dni: "", nombre: "", area: "", puesto: puestoName, sede: "" });
                    }
                } else if (newArr.length > formData.cantidad_lineas) {
                    newArr.splice(formData.cantidad_lineas);
                }

                // Also update existing ones if they are empty? Or force update?
                // User asked: "EL CAMPO PUESTO SE DEBE AUTOCOMPLETAR CON EL CAMPO ANTERIOR"
                // Let's update all of them to match the profile if they are empty or just force it?
                // Usually it implies 'pre-fill'. Let's pre-fill empty ones or all. 
                // Since this is a "Configuración" step, likely applies to all.
                return newArr.map(b => ({
                    ...b,
                    puesto: b.puesto || puestoName // Only fill if empty to avoid overwriting user input if they went back? 
                    // Actually if they change the config in step 2, it should probably update step 3. 
                    // But let's stick to safe "fill if empty" or just fill. 
                    // Let's fill if it matches the Logic.
                }));
            });

            // Force update all just to be sure if they changed the selection in Step 2
            setBeneficiaries(prev => prev.map(b => ({ ...b, puesto: puestoName })));
        }

        // SKIP STEP 3 logic removed for Solo Chip as it now uses Step 3

        /* 
        if (currentStep === 2 && formData.n_linea === "Línea Nueva (SOLO CHIP)") {
            setCurrentStep(4);
            return;
        } 
        */

        setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => {
        /*
        if (currentStep === 4 && formData.n_linea === "Línea Nueva (SOLO CHIP)") {
            setCurrentStep(2);
            return;
        }
        */
        setCurrentStep(prev => prev - 1);
    };

    const [cancelTicketId, setCancelTicketId] = useState<string | null>(null);

    const handleCancelClick = (ticket: Solicitud) => {
        setCancelTicketId(ticket.id);
    };

    const confirmCancelTicket = async () => {
        if (!cancelTicketId) return;
        try {
            await telefoniaStore.updateSolicitud(cancelTicketId, { estado: "Cancelada" });
            setToast({ type: "success", message: "Solicitud cancelada correctamente." });
            loadHistory();
        } catch (error) {
            console.error(error);
            setToast({ type: "error", message: "Error al cancelar la solicitud." });
        } finally {
            setCancelTicketId(null);
        }
    };

    const handleEditTicket = (ticket: Solicitud) => {
        // Map back Solicitud to FormData
        setEditingId(ticket.id);

        // Reverse Logic for Tipo Solicitud
        let linea = ticket.tipo_solicitud || "";
        let condicion = "";
        if (linea === "Equipo Nuevo") {
            linea = "Solicitar Equipo";
            condicion = "Nuevo";
        } else if (linea === "Equipo de Segundo Uso") {
            linea = "Solicitar Equipo";
            condicion = "Segundo Uso";
        }

        setFormData({
            dni: ticket.beneficiario_dni || "",
            nombre: ticket.beneficiario_nombre || "",
            area: ticket.beneficiario_area || "",
            puesto: ticket.beneficiario_puesto || "",
            n_linea: linea,
            condicion_equipo: condicion,
            tipo_equipo_destino: ticket.tipo_equipo_destino || "",
            codigo_equipo_destino: ticket.codigo_equipo_destino || "",
            numero_telefono: ticket.detalle_reposicion?.numero_afectado || "", // Best effort
            motivo_reposicion: ticket.detalle_reposicion?.motivo || "",
            tiene_evidencia: ticket.detalle_reposicion?.tiene_evidencia || false,

            tipo_servicio: ticket.tipo_servicio || "",
            periodo_uso: ticket.periodo_uso || "PERMANENTE",
            fecha_inicio: ticket.fecha_inicio_uso || new Date().toISOString().slice(0, 10),
            fecha_fin: ticket.fecha_fin_uso || "",

            fundo_planta: ticket.fundo_planta || "",
            cultivo: ticket.cultivo || "",
            ceco: ticket.ceco || "",
            categoria: ticket.categoria || "",
            proyecto: ticket.proyecto || "",

            cantidad_lineas: ticket.cantidad_lineas || 1,
            paquete_asignado: ticket.paquete_asignado || "",
            justificacion: ticket.justificacion || "",

            // Reposicion details
            asume_costo: ticket.detalle_reposicion?.asume || "",
            cuotas: ticket.detalle_reposicion?.cuotas || 3,

            // Internal logic
            perfil_puesto: "", // We might not have this ID stored in Solicitud, so user must re-select or we try to find by name? 
            // Ideally we should store puestos_id in solicitud but we don't. 
            // For now, leave empty and user re-selects "Ubicación" if needed, 
            // OR we try to match by role? 
            // It's safer to ask user to review the fields.
            alternativa_modelo: ticket.alternativa_modelo || null,
        });

        // Set beneficiaries if any
        if (ticket.asignaciones && ticket.asignaciones.length > 0) {
            setBeneficiaries(ticket.asignaciones.map(a => ({
                dni: a.usuario_final_dni || "",
                nombre: a.usuario_final_nombre || "",
                area: a.usuario_final_area || "",
                puesto: a.usuario_final_puesto || "",
                sede: a.usuario_final_sede || ""
            })));
        } else {
            setBeneficiaries([]);
        }

        // Apps
        setSelectedApps(ticket.aplicativos || []);

        // Pre-validate if editing existing valid ticket
        if (linea === "Renovación") {
            setValidationResult({
                valid: true,
                message: "Validado previamente",
                lastDate: "",
                equipo: ticket.equipo?.modelo || "" // Approximate
            });
        }
        if (linea === "Reposición") {
            setPreviousDevice(ticket.detalle_reposicion?.equipoAnterior || "");
            setRenewalCalculated({
                valid: true,
                message: "Validado previamente",
                lastDate: "",
                equipo: ticket.detalle_reposicion?.equipoAnterior || ""
            });
        }

        setCurrentStep(1);
        setIsWizardOpen(true);
    };

    // ... (rest of file, ensuring borders are gray-200 instead of 300 where appropriate)
    // I will do a bulk replace for the borders in a separate/subsequent call effectively by just targeting the blocks with styles.
    // For now I'm just fixing the logic block. I'll use multi_replace for styles.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        const validationErrors = validateStep(4);
        if (validationErrors) {
            setErrors(validationErrors);
            if (validationErrors.general) {
                setToast({ type: "error", message: validationErrors.general });
            } else {
                setToast({ type: "error", message: "Faltan campos por completar." });
            }
            return;
        }

        setSubmitting(true);
        try {
            const payload: any = {
                usuario_creador_id: user?.id,
                beneficiario_dni: formData.dni,
                beneficiario_nombre: formData.nombre,
                beneficiario_area: formData.area,
                beneficiario_puesto: formData.puesto,
                tipo_solicitud: formData.n_linea === "Solicitar Equipo"
                    ? (formData.condicion_equipo === "Nuevo" ? "Equipo Nuevo" : "Equipo de Segundo Uso")
                    : formData.n_linea,
                tipo_servicio: formData.n_linea === "Reposición"
                    ? (formData.tipo_servicio && formData.tipo_servicio !== "PAQUETE ASIGNADO" ? formData.tipo_servicio : "REPOSICIÓN")
                    : formData.tipo_servicio,
                periodo_uso: formData.periodo_uso,
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
                // Only reset state if creating, else keep current or use logic. 
                // For editing, we usually don't reset approval flow unless major change? 
                // Requirement: "modificar su ticket". Usually implies re-submission -> Reset to initial state? 
                // Let's reset to "Revisión Admin" / "Pendiente Gerencia" to be safe.

                estado: (formData.n_linea === "Reposición" || formData.n_linea === "Renovación" || formData.n_linea === "Solicitar Equipo" || formData.n_linea === "Línea Nueva" || formData.n_linea === "Línea Nueva (SOLO CHIP)" || formData.tipo_servicio === "REPOSICIÓN") ? "Revisión Admin" : "Pendiente Gerencia",
                // created_by: user?.id, deprecated
                ceco: formData.ceco, // NEW
                categoria: formData.categoria, // NEW
                proyecto: formData.proyecto, // NEW (Renamed from descripcion_categoria)
                alternativa_modelo: formData.alternativa_modelo, // NEW: Auto-registered suggested equipment
                tipo_equipo_destino: null, // Legacy field, now handled in assignments
                codigo_equipo_destino: null, // Legacy field
            };

            let assignmentsPayload: any[] = [];

            if (formData.n_linea === "Línea Nueva (SOLO CHIP)") {
                // Map chipTargets to assignments
                assignmentsPayload = chipTargets.map(t => ({
                    tipo_equipo_destino: t.type,
                    codigo_equipo_destino: t.imei,
                    estado: "Pendiente"
                }));
            } else {
                // Map beneficiaries (Standard Flow)
                // Filter out empty ones if quantity > beneficiarios length (though step valid ensures they are filled if required)
                // If skipBeneficiaries is true, we create empty ones?
                // The store handles creation of empty assignments if we pass empty array? No, implementation plan said pass generic assignments.
                // Re-read store: createSolicitud accepts asignacionesList.

                if (beneficiaries.length > 0) {
                    assignmentsPayload = beneficiaries.map(b => ({
                        usuario_final_dni: b.dni,
                        usuario_final_nombre: b.nombre,
                        usuario_final_area: b.area,
                        usuario_final_puesto: b.puesto,
                        usuario_final_sede: b.sede,
                        estado: "Pendiente"
                    }));
                }
            }

            if (editingId) {
                // UPDATE
                await telefoniaStore.updateSolicitud(editingId, payload);
                // TODO: Update assignments on edit? Complex. For now just update ticket.
                setToast({ type: "success", message: "Solicitud actualizada correctamente" });
            } else {
                // CREATE
                await telefoniaStore.createSolicitud(payload, assignmentsPayload);
                setToast({ type: "success", message: "Solicitud creada correctamente" });
            }
            // Reset form
            setEditingId(null);
            setFormData({
                dni: "", nombre: "", area: "", puesto: "", n_linea: "",
                numero_telefono: "", motivo_reposicion: "", tiene_evidencia: false,
                tipo_servicio: "", periodo_uso: "PERMANENTE",
                fecha_inicio: new Date().toISOString().slice(0, 10), fecha_fin: "",
                fundo_planta: "", cultivo: "", cantidad_lineas: 1, justificacion: "",
                paquete_asignado: "", asume_costo: "", cuotas: 3, ceco: "", categoria: "", proyecto: "", perfil_puesto: "", alternativa_modelo: null, condicion_equipo: "",
                tipo_equipo_destino: "", codigo_equipo_destino: ""
            });
            setBeneficiaries([]);
            setChipTargets([]);
            setSelectedApps([]);
            setSuggestedModel("");
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


    // Helper render function for Service Details
    const renderServiceDetails = () => {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 pt-2">

                {/* --- SECCION 1: DATOS COMUNES (OBLIGATORIOS) --- */}
                <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        Datos Generales
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Fundo / Planta */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                Fundo / Planta <span className="text-red-500">*</span>
                            </label>
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

                        {/* Cultivo */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                Cultivo <span className="text-red-500">*</span>
                            </label>
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

                        {/* CECO */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                CECO <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={10}
                                className={`block w-full rounded border p-2 text-sm outline-none transition-all ${errors.ceco ? "border-red-500 bg-red-50 focus:border-red-600" : "border-gray-300 focus:border-indigo-500"
                                    }`}
                                value={formData.ceco}
                                onChange={(e) => {
                                    handleChange("ceco", e.target.value.replace(/\D/g, '').slice(0, 10));
                                    if (errors.ceco) setErrors({ ...errors, ceco: "" });
                                }}
                                onBlur={() => {
                                    if (formData.ceco && formData.ceco.length !== 10) {
                                        setErrors({ ...errors, ceco: "El CECO debe tener 10 dígitos." });
                                    }
                                }}
                                placeholder="Centro de Costo"
                            />
                            {errors.ceco && (
                                <p className="text-[10px] text-red-600 font-bold mt-1 animate-in fade-in slide-in-from-top-1">
                                    {errors.ceco}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Categoría */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                Categoría <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all"
                                value={formData.categoria}
                                onChange={(e) => handleChange("categoria", e.target.value)}
                            >
                                <option value="">Seleccione...</option>
                                <option value="PROYECTO">PROYECTO</option>
                                <option value="TELEFONIA">TELEFONIA</option>
                            </select>
                        </div>
                        {/* Proyecto (Dropdown) */}
                        {formData.categoria === "PROYECTO" && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                    Proyecto <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all"
                                    value={formData.proyecto || ""}
                                    onChange={(e) => handleChange("proyecto", e.target.value)}
                                >
                                    <option value="">Seleccione Proyecto...</option>
                                    {telefoniaStore.proyectos
                                        .filter(p => p.active)
                                        .map(p => (
                                            <option key={p.id} value={p.nombre}>{p.nombre}</option>
                                        ))}
                                    {/* If editing and has a value not in list (legacy), show it? */}
                                    {formData.proyecto && !telefoniaStore.proyectos.find(p => p.nombre === formData.proyecto) && (
                                        <option value={formData.proyecto}>{formData.proyecto} (Archivado)</option>
                                    )}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderConfigurationDetails = () => {
        const selectedPuesto = telefoniaStore.puestos.find(p => p.id === formData.perfil_puesto);
        // LOCK SERVICE if standard flow and no profile selected. PROCEED if Solo Chip.
        const isServiceLocked = (formData.n_linea !== "Línea Nueva (SOLO CHIP)" && !formData.perfil_puesto) || !!selectedPuesto?.plan;

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 pt-2">
                {/* --- SECCION 2: CONFIGURACIÓN DEL SERVICIO --- */}

                {formData.n_linea === "Reposición" ? (
                    // --- REPOSICIÓN FLOW ---
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                            Detalles de la Reposición
                        </h3>

                        {previousDevice && (
                            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wide">Equipo a Reponer</p>
                                <p className="text-gray-900 font-medium flex items-center gap-2 mt-1">
                                    <Smartphone className="w-4 h-4 text-indigo-500" />
                                    {previousDevice}
                                </p>
                                <p className="text-xs text-indigo-400 mt-1">Se le asignará un equipo de mismas características.</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                    Motivo de Reposición <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all font-medium"
                                    value={formData.motivo_reposicion}
                                    onChange={(e) => handleChange("motivo_reposicion", e.target.value)}
                                >
                                    <option value="">Seleccione Motivo...</option>
                                    <option value="ROBO">Robo</option>
                                    <option value="PERDIDA">Pérdida</option>
                                    <option value="DETERIORO">Deterioro</option>
                                </select>
                            </div>
                        </div>

                        {(formData.motivo_reposicion === "ROBO" || formData.motivo_reposicion === "PERDIDA") && (
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
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
                                    <div className="mt-4 border-t border-gray-300 pt-4">
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

                                        <div className="bg-white border text-sm">
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
                                                * El monto exacto será calculado por RRHH.
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg flex items-center gap-2">
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
                ) : (
                    // --- STANDARD SERVICES FLOW (Including Solo Chip) ---
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                            Configuración de Línea / Equipo
                        </h3>

                        {/* SOLO CHIP EXTRA FIELDS REMOVED FROM HERE - MOVED TO STEP 3 */}

                        {/* PUESTO DROPDOWN (NEW) - MOVED TO TOP. Hide for Solo Chip */}
                        {formData.n_linea !== "Línea Nueva (SOLO CHIP)" && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                    Perfil del Puesto <span className="text-gray-400 font-normal normal-case float-right">(Sugerido)</span>
                                </label>
                                <select
                                    className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all"
                                    value={formData.perfil_puesto}
                                    onChange={(e) => handlePuestoChange(e.target.value)}
                                >
                                    <option value="">Seleccione perfil...</option>
                                    {telefoniaStore.puestos.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* SUGGESTED EQUIPMENT CARD */}
                        {suggestedModel && formData.n_linea !== "Línea Nueva (SOLO CHIP)" && (
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-md border border-gray-200">
                                        <Smartphone className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase">Equipo Recomendado</p>
                                        <p className="text-sm font-bold text-gray-900">{suggestedModel}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CONDICION EQUIPO SELECTION (Solicitar Equipo ONLY) - MOVED BELOW PUESTO AND CONDITIONAL */}
                        {formData.n_linea === "Solicitar Equipo" && formData.perfil_puesto && (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                    Seleccione Condición del Equipo
                                </label>
                                <div className="flex gap-4">
                                    {/* SEGUNDO USO */}
                                    {(() => {
                                        // Smart Check: Filter by Model if Puesto has a recommended model
                                        const puesto = telefoniaStore.puestos.find(p => p.id === formData.perfil_puesto);
                                        const recommendedModelName = puesto?.modelo?.nombre;

                                        const secondUseCount = telefoniaStore.equipos.filter(e => {
                                            const isAvailable = e.estado === "Disponible" && e.condicion === "Segundo Uso";
                                            if (!isAvailable) return false;
                                            // If we have a recommended model, strictly check it? Or loosen it?
                                            // User likely wants the specific model if defined.
                                            if (recommendedModelName) {
                                                return e.modelo === recommendedModelName;
                                            }
                                            return true;
                                        }).length;

                                        const isAvailable = secondUseCount > 0;

                                        return (
                                            <button
                                                type="button"
                                                disabled={!isAvailable}
                                                onClick={() => setFormData({ ...formData, condicion_equipo: "Segundo Uso" })}
                                                className={`flex-1 p-3 rounded-md border text-left transition-all relative ${formData.condicion_equipo === "Segundo Uso"
                                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                                    : isAvailable
                                                        ? "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                                                        : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className={`block text-sm font-bold ${formData.condicion_equipo === "Segundo Uso" ? "text-white" : "text-gray-900"}`}>Segundo Uso</span>
                                                        <span className={`text-xs block mt-0.5 ${formData.condicion_equipo === "Segundo Uso"
                                                            ? "text-indigo-100"
                                                            : isAvailable ? "text-green-600 font-medium" : "text-gray-500"}`}>
                                                            {isAvailable
                                                                ? `(Disponible${recommendedModelName ? `: ${recommendedModelName}` : ''})`
                                                                : `(Sin Stock${recommendedModelName ? `: ${recommendedModelName}` : ''})`
                                                            }
                                                        </span>
                                                    </div>
                                                    {formData.condicion_equipo === "Segundo Uso" && <CheckCircle2 className="w-5 h-5 text-white" />}
                                                </div>
                                            </button>
                                        );
                                    })()}

                                    {/* NUEVO */}
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, condicion_equipo: "Nuevo" })}
                                        className={`flex-1 p-3 rounded-md border text-left transition-all ${formData.condicion_equipo === "Nuevo"
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                            : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className={`block text-sm font-bold ${formData.condicion_equipo === "Nuevo" ? "text-white" : "text-gray-900"}`}>Nuevo</span>
                                                <span className={`text-xs block mt-0.5 ${formData.condicion_equipo === "Nuevo" ? "text-indigo-100" : "text-amber-600 font-medium"}`}>(Requiere Autorización)</span>
                                            </div>
                                            {formData.condicion_equipo === "Nuevo" && <CheckCircle2 className="w-5 h-5 text-white" />}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* OPERADOR Y PAQUETE (Juntos) */}
                            <div className={`p-4 rounded-lg border flex flex-col gap-3 transition-colors ${formData.tipo_servicio ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-gray-200'}`}>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                        OPERADOR <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        disabled={isServiceLocked}
                                        className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all disabled:bg-gray-100 disabled:text-gray-500"
                                        value={formData.tipo_servicio}
                                        onChange={(e) => setFormData({ ...formData, tipo_servicio: e.target.value, paquete_asignado: "" })}
                                    >
                                        <option value="">Seleccione...</option>
                                        {(() => {
                                            const activeSede = sedes.find(s => s.nombre === formData.fundo_planta);
                                            const allowedOps = activeSede?.operadores;
                                            const hasRestrictions = allowedOps && allowedOps.length > 0;
                                            const allOps = Array.from(new Set(telefoniaStore.planes.filter(p => p.active).map(p => p.operador)));

                                            return allOps.map(op => {
                                                if (hasRestrictions && !allowedOps.includes(op)) return null;
                                                return <option key={op} value={op}>{op}</option>;
                                            });
                                        })()}
                                    </select>
                                    {formData.fundo_planta && sedes.find(s => s.nombre === formData.fundo_planta)?.operadores?.length === 0 && (
                                        <p className="text-[10px] text-orange-500 mt-1">* Sede sin cobertura configurada (se muestran todos)</p>
                                    )}
                                </div>

                                {["CLARO", "ENTEL", "MOVISTAR"].includes(formData.tipo_servicio) && (
                                    <div className="animate-in fade-in zoom-in-95 data-[state=open]:animate-out data-[state=closed]:fade-out-0">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                            Paquete Asignado <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            disabled={isServiceLocked}
                                            className="block w-full rounded border-gray-300 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all shadow-sm disabled:bg-gray-100 disabled:text-gray-500"
                                            value={formData.paquete_asignado}
                                            onChange={(e) => setFormData({ ...formData, paquete_asignado: e.target.value })}
                                        >
                                            <option value="">Seleccione Plan...</option>
                                            {telefoniaStore.planes
                                                .filter(p => {
                                                    const matchOperator = p.operador === formData.tipo_servicio && p.active;
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
                            </div>

                            {/* OTHER INFOS */}
                            <div className="grid grid-cols-2 gap-4">
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
                                        disabled={formData.n_linea === "Renovación" || formData.n_linea === "Reposición"}
                                        className="block w-full rounded border-gray-300 border p-2 text-sm outline-none focus:border-indigo-500 transition-all disabled:bg-gray-100 disabled:text-gray-500"
                                        value={(formData.n_linea === "Renovación" || formData.n_linea === "Reposición") ? 1 : formData.cantidad_lineas}
                                        onChange={(e) => handleChange("cantidad_lineas", Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-2 grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fecha Inicio</label>
                                        <input
                                            type="date"
                                            className={`block w-full rounded border p-2 text-sm outline-none transition-all ${formData.fecha_inicio && formData.fecha_fin && formData.periodo_uso !== "PERMANENTE" && formData.fecha_inicio > formData.fecha_fin
                                                ? "border-red-300 bg-red-50 text-red-900 focus:border-red-500"
                                                : "border-gray-300 focus:border-indigo-500"
                                                }`}
                                            value={formData.fecha_inicio}
                                            onChange={(e) => handleChange("fecha_inicio", e.target.value)}
                                        />
                                        {formData.fecha_inicio && formData.fecha_fin && formData.periodo_uso !== "PERMANENTE" && formData.fecha_inicio > formData.fecha_fin && (
                                            <p className="text-[10px] text-red-600 font-bold mt-1">
                                                No puede ser mayor a Fecha Fin
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fecha Fin</label>
                                        <input
                                            type="date"
                                            disabled={formData.periodo_uso !== "CAMPAÑA"}
                                            className={`block w-full rounded border p-2 text-sm outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400 ${formData.fecha_inicio && formData.fecha_fin && formData.periodo_uso !== "PERMANENTE" && formData.fecha_inicio > formData.fecha_fin
                                                ? "border-red-300 bg-red-50 text-red-900 focus:border-red-500" // Highlight Error
                                                : "border-gray-300 focus:border-indigo-500"
                                                }`}
                                            value={formData.fecha_fin}
                                            onChange={(e) => handleChange("fecha_fin", e.target.value)}
                                        />
                                        {formData.fecha_inicio && formData.fecha_fin && formData.periodo_uso !== "PERMANENTE" && formData.fecha_inicio > formData.fecha_fin && (
                                            <p className="text-[10px] text-red-600 font-bold mt-1">
                                                No puede ser menor a Fecha Inicio
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300 pt-2">
                        {/* 1. Motivo de Solicitud (Moved from old Step 1) */}
                        {/* 1. Motivo de Solicitud */}
                        {/* 1. Motivo de Solicitud */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="w-full">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                    Motivo de Solicitud <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="block w-full rounded border-gray-200 border p-2 text-sm bg-white outline-none focus:border-indigo-500 transition-all font-medium"
                                    value={formData.n_linea}
                                    onChange={(e) => handleChange("n_linea", e.target.value)}
                                >
                                    <option value="">Seleccione...</option>
                                    <option value="Solicitar Equipo">Solicitar Equipo</option>
                                    <option value="Línea Nueva (SOLO CHIP)">Solicitar Línea Nueva (SOLO CHIP)</option>
                                    <option value="Renovación">Renovación de Equipo</option>
                                    <option value="Reposición">Reposición por Robo/Pérdida/Deterioro</option>
                                </select>
                            </div>
                        </div>

                        {/* 2. Validation / Phone Inputs (Conditional) */}
                        {(formData.n_linea === "Renovación" || formData.n_linea === "Reposición") && (
                            <div className="p-4 bg-white border border-gray-200 rounded-lg animate-in fade-in slide-in-from-top-2">
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
                                        placeholder="999 999 999"
                                    />
                                    <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />

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

                                {/* Validar Button for Reposición */}
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

                                {/* Validar Button for Renovación */}
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
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. Service Details Content (From old step 2) */}
                        {renderServiceDetails()}
                    </div>
                );
            case 2:
                return renderConfigurationDetails();

            case 3:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300 pt-2">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                                    {formData.n_linea === "Línea Nueva (SOLO CHIP)" ? "Equipos de Destino" : "Lista de Beneficiarios"}
                                </h3>
                                {formData.n_linea !== "Línea Nueva (SOLO CHIP)" && (
                                    <button
                                        type="button"
                                        onClick={() => setSkipBeneficiaries(!skipBeneficiaries)}
                                        className={`
                                            text-[10px] font-bold px-3 py-1 rounded transition-colors uppercase tracking-wider select-none
                                            ${skipBeneficiaries
                                                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                                : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                                            }
                                        `}
                                    >
                                        {skipBeneficiaries ? "Detalle Omitido" : "Omitir Detalle"}
                                    </button>
                                )}
                            </div>
                            <div className="text-xs text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                Total: {formData.cantidad_lineas}
                            </div>
                        </div>

                        {formData.n_linea === "Línea Nueva (SOLO CHIP)" ? (
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {chipTargets.map((target, idx) => (
                                    <div key={idx} className="bg-purple-50 rounded-lg border border-purple-100 p-4 relative">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold border border-purple-200">
                                                {idx + 1}
                                            </div>
                                            <h4 className="text-sm font-bold text-purple-900">Equipo de Destino</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">
                                                    Tipo <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    className="block w-full rounded border-purple-200 border p-2 text-sm bg-white outline-none focus:border-purple-500 transition-all cursor-pointer hover:border-purple-300"
                                                    value={target.type}
                                                    onChange={(e) => {
                                                        const newArr = [...chipTargets];
                                                        newArr[idx].type = e.target.value;
                                                        setChipTargets(newArr);
                                                    }}
                                                >
                                                    <option value="">Seleccione...</option>
                                                    <option value="EQUIPO">EQUIPO (Smartphone)</option>
                                                    <option value="DREAM">DREAM (Tableta/Dispositivo)</option>
                                                    <option value="SENSOR DE HUMEDAD">SENSOR DE HUMEDAD</option>
                                                    <option value="TABLET">TABLET</option>
                                                    <option value="OTRO">OTRO</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">
                                                    IMEI / Código <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="block w-full rounded border-purple-200 border p-2 text-sm outline-none focus:border-purple-500 transition-all font-mono placeholder-purple-300"
                                                    placeholder="Ingrese código o IMEI..."
                                                    value={target.imei}
                                                    onChange={(e) => {
                                                        const newArr = [...chipTargets];
                                                        newArr[idx].imei = e.target.value;
                                                        setChipTargets(newArr);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : skipBeneficiaries ? (
                            <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-lg border-dashed">
                                <p className="text-sm text-gray-500">Se ha omitido el registro detallado de beneficiarios.</p>
                                <p className="text-xs text-gray-400 mt-1">Podrá continuar al siguiente paso sin ingresar esta información pero deberas ingresarlo en la vista de Mis Equipos.</p>
                                <button
                                    onClick={() => setSkipBeneficiaries(false)}
                                    className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                                >
                                    Ingresar beneficiarios manualmente
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {beneficiaries.map((b, index) => (
                                    <div key={index} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm group hover:border-indigo-200 transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                BENEFICIARIO #{index + 1}
                                            </span>
                                            {index === 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newArr = [...beneficiaries];
                                                        const currentPuesto = newArr[0].puesto; // Preserve Puesto if it was auto-filled
                                                        newArr[0] = {
                                                            dni: formData.dni,
                                                            nombre: formData.nombre,
                                                            area: formData.area,
                                                            puesto: currentPuesto, // Keep the checked Puesto
                                                            sede: newArr[0].sede || "" // Keep existing or reset? 
                                                        };
                                                        // However, if the user manually typed something else we might want to overwrite.
                                                        // But effectively "Copiar datos" copies form data. Form data has "puesto" string.
                                                        // If profile is selected, Puesto is fixed.
                                                        // Let's just copy fields.
                                                        newArr[0].dni = formData.dni;
                                                        newArr[0].nombre = formData.nombre;
                                                        newArr[0].area = formData.area;
                                                        // Only overwrite puesto if not locked by profile
                                                        if (!formData.perfil_puesto) {
                                                            newArr[0].puesto = formData.puesto;
                                                        }
                                                        // Copy Sede from Fundo/Planta if available
                                                        if (formData.fundo_planta) {
                                                            newArr[0].sede = formData.fundo_planta;
                                                        }
                                                        setBeneficiaries(newArr);
                                                    }}
                                                    className="text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded hover:bg-indigo-100 transition-colors"
                                                >
                                                    Copiar mis datos
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">DNI <span className="text-red-500">*</span></label>
                                                <input
                                                    className="block w-full rounded border-gray-200 border p-2 text-xs outline-none focus:border-indigo-500 transition-all font-medium text-gray-700 placeholder-gray-300"
                                                    placeholder="00000000"
                                                    maxLength={8}
                                                    value={b.dni}
                                                    onChange={e => {
                                                        const newArr = [...beneficiaries];
                                                        newArr[index].dni = e.target.value.replace(/\D/g, '');
                                                        setBeneficiaries(newArr);
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                                                <input
                                                    className="block w-full rounded border-gray-200 border p-2 text-xs outline-none focus:border-indigo-500 transition-all font-medium text-gray-700 placeholder-gray-300 case-upper"
                                                    placeholder="Apellidos y Nombres"
                                                    value={b.nombre}
                                                    onChange={e => {
                                                        const newArr = [...beneficiaries];
                                                        newArr[index].nombre = e.target.value;
                                                        setBeneficiaries(newArr);
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Sede <span className="text-red-500">*</span></label>
                                                <select
                                                    className="block w-full rounded border-gray-200 border p-2 text-xs outline-none focus:border-indigo-500 transition-all font-medium text-gray-700 bg-white"
                                                    value={b.sede}
                                                    onChange={e => {
                                                        const newArr = [...beneficiaries];
                                                        newArr[index].sede = e.target.value;
                                                        setBeneficiaries(newArr);
                                                    }}
                                                >
                                                    <option value="">Seleccione...</option>
                                                    {sedes.map(s => (
                                                        <option key={s.id} value={s.nombre}>{s.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Área</label>
                                                <input
                                                    className="block w-full rounded border-gray-200 border p-2 text-xs outline-none focus:border-indigo-500 transition-all font-medium text-gray-700 placeholder-gray-300"
                                                    placeholder="Ej. Comercial"
                                                    value={b.area}
                                                    onChange={e => {
                                                        const newArr = [...beneficiaries];
                                                        newArr[index].area = e.target.value;
                                                        setBeneficiaries(newArr);
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                                                    Perfil de Puesto
                                                    {!!formData.perfil_puesto && <span className="text-[9px] bg-gray-100 text-gray-500 px-1 rounded border border-gray-200">AUTO</span>}
                                                </label>
                                                <input
                                                    disabled={!!formData.perfil_puesto}
                                                    className="block w-full rounded border-gray-200 border p-2 text-xs outline-none focus:border-indigo-500 transition-all font-medium text-gray-700 placeholder-gray-300 disabled:bg-gray-50 disabled:text-gray-500"
                                                    placeholder="Ej. Analista"
                                                    value={b.puesto}
                                                    onChange={e => {
                                                        const newArr = [...beneficiaries];
                                                        newArr[index].puesto = e.target.value;
                                                        setBeneficiaries(newArr);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 4:
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

                        {formData.n_linea !== "Línea Nueva" && formData.n_linea !== "Línea Nueva (SOLO CHIP)" && (
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
                        )}
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
                        className="inline-flex items-center gap-2 bg-[#FF0000] hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-200 pb-4">
                        <h2 className="text-lg font-bold text-gray-900">Nueva Solicitud</h2>

                        {/* Steps Group */}
                        <div className="flex items-center gap-2 overflow-x-auto">
                            <div className={`flex items-center gap-1 ${currentStep >= 1 ? "text-indigo-600 font-semibold" : ""}`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${currentStep >= 1 ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300"}`}>1</div>
                                <span className="whitespace-nowrap">Datos</span>
                            </div>
                            <ChevronRight className="w-3 h-3 text-gray-300" />
                            <div className={`flex items-center gap-1 ${currentStep >= 2 ? "text-indigo-600 font-semibold" : ""}`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${currentStep >= 2 ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300"}`}>2</div>
                                <span className="whitespace-nowrap">Config</span>
                            </div>
                            <ChevronRight className="w-3 h-3 text-gray-300" />
                            <div className={`flex items-center gap-1 ${currentStep >= 3 ? "text-indigo-600 font-semibold" : ""}`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${currentStep >= 3 ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300"}`}>3</div>
                                <span className="whitespace-nowrap">Beneficiarios</span>
                            </div>
                            <ChevronRight className="w-3 h-3 text-gray-300" />
                            <div className={`flex items-center gap-1 ${currentStep >= 4 ? "text-indigo-600 font-semibold" : ""}`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${currentStep >= 4 ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300"}`}>4</div>
                                <span className="whitespace-nowrap">Fin</span>
                            </div>
                        </div>
                    </div>
                    {/* Removed Old StepIndicator component */}

                    <form onSubmit={handleSubmit} className="mt-8">
                        <div className="min-h-[200px]">
                            {renderStepContent()}
                        </div>

                        <div className="flex justify-between pt-4 border-t border-gray-200 mt-6">
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
                                        className="px-4 py-1.5 border border-gray-200 rounded text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
                                    >
                                        Atrás
                                    </button>
                                )}

                                {currentStep < 4 ? (
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        disabled={
                                            (currentStep === 1 && formData.n_linea === "Renovación" && !validationResult?.valid) ||
                                            (currentStep === 1 && formData.n_linea === "Reposición" && !renewalCalculated.valid)
                                        }
                                        className="px-4 py-1.5 bg-[#FF0000] text-white rounded hover:bg-red-700 text-sm font-medium inline-flex items-center gap-2 disabled:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Siguiente <ChevronRight className="w-3 h-3" />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-4 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50 transition-colors"
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
                                    <div className="flex items-center gap-3 mb-6">
                                        <StatusBadge estado={t.estado} />
                                    </div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-sm text-gray-500">Fecha de Solicitud:</span>
                                        <span className="text-xs text-gray-400 font-medium border border-gray-100 px-2 py-0.5 rounded-md bg-gray-50 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(t.created_at).toLocaleDateString()}
                                        </span>

                                    </div>
                                    <h3 className="text-base font-bold text-gray-900 truncate" title={t.beneficiario_nombre || ""}>
                                        {t.beneficiario_nombre}
                                    </h3>
                                    <p className="text-sm text-gray-500">{t.beneficiario_puesto}{t.beneficiario_dni} | Responsable de Ticket</p>
                                </div>

                                {/* MIDDLE: Technial Details */}
                                <div className="md:flex-1 md:border-l md:border-r border-gray-100 md:px-6 py-2 md:py-0 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    <div>
                                        <span className="text-gray-400 text-xs block">Solicitud</span>
                                        <span className={`font-bold ${t.tipo_solicitud === "Reposición" ? "text-orange-700" :
                                            t.tipo_solicitud === "Renovación" ? "text-emerald-700" :
                                                "text-blue-700"
                                            }`}>
                                            {t.tipo_solicitud || "Línea Nueva"}
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
                                        <span className="text-gray-400 text-xs block">Planta/Fundo</span>
                                        <span className="font-medium text-gray-700 truncate">{t.fundo_planta}</span>
                                    </div>
                                </div>

                                {/* RIGHT: Action */}
                                <div className="w-full md:w-auto flex items-center justify-end gap-2">
                                    {(["Pendiente Gerencia", "Revisión Admin", "Pendiente IT"].includes(t.estado)) && (
                                        <>
                                            <button
                                                onClick={() => handleEditTicket(t)}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                                                title="Editar Solicitud"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleCancelClick(t)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                title="Cancelar Solicitud"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
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

            {/* CANCEL CONFIRMATION MODAL */}
            <Modal
                open={!!cancelTicketId}
                onClose={() => setCancelTicketId(null)}
                title="Confirmar Cancelación"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-4 p-2">
                        <div className="p-2 bg-red-100 rounded-full">
                            <Trash2 className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-900">¿Cancelar Solicitud?</h4>
                            <p className="text-sm text-gray-600 mt-1">
                                Esta acción Cancelará la solicitud y no podrá revertirse.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => setCancelTicketId(null)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                        >
                            No, mantener
                        </button>
                        <button
                            onClick={confirmCancelTicket}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
                        >
                            Sí, cancelar solicitud
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
