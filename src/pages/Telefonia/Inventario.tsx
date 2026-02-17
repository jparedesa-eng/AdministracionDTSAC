import React, { useEffect, useState } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { Equipo, Chip, PlanTelefonico } from "../../store/telefoniaStore";
import { Modal } from "../../components/ui/Modal";
import { ConfirmationModal } from "../../components/ui/ConfirmationModal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import {
    Smartphone,
    Plus,
    Pencil,
    Loader2,
    Search,
    History,
    Calendar,
    Link,
    Unlink,
    Wifi,
    Trash2,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,

    ArrowLeftRight,
    MapPin,
    UserPlus,
    AlertTriangle,
    Building2,
    ChevronDown,
    Activity,
    Signal,
    Inbox,
    ClipboardCheck,
    Clock,
    CardSim,
    Sprout,
    ScanBarcode
} from "lucide-react";

import { getSedesState, subscribeSedes } from "../../store/sedesStore";
import { getGerenciasState, subscribeGerencias } from "../../store/gerenciasStore";
import { getPersonalState, subscribePersonal } from "../../store/personalStore"; // NEW: Import Personal Store
import { useAuth } from "../../auth/AuthContext";
import { BarcodeScanner } from "../../components/ui/BarcodeScanner";

export default function InventarioTelefonia() {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState<"equipos" | "chips" | "planes">("equipos");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);
    const [submitting, setSubmitting] = useState(false);

    // Search
    const [q, setQ] = useState("");

    // Filters Equipos
    const [filterEstado, setFilterEstado] = useState("");
    const [filterFundo, setFilterFundo] = useState("");
    const [filterAnio, setFilterAnio] = useState("");

    // Filters Chips
    const [filterChipEstado, setFilterChipEstado] = useState("");
    const [filterChipOperador, setFilterChipOperador] = useState("");
    const [filterChipPlan, setFilterChipPlan] = useState("");

    // New Filter
    const [filterVencimiento, setFilterVencimiento] = useState("");
    const [filterCultivo, setFilterCultivo] = useState("");
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Autocomplete State
    const [responsableSuggestions, setResponsableSuggestions] = useState<any[]>([]);
    const [usuarioFinalSuggestions, setUsuarioFinalSuggestions] = useState<any[]>([]);


    // Reset filters on tab change
    useEffect(() => {
        setFilterEstado("");
        setFilterFundo("");
        setFilterAnio("");
        setFilterChipEstado("");
        setFilterChipOperador("");
        setFilterChipPlan("");
        setFilterChipPlan("");
        setQ("");
        setFilterVencimiento("");
        setFilterCultivo("");
    }, [activeTab]);


    // Sedes
    const [, setSedesVersion] = useState(0);
    const { sedes } = getSedesState();

    useEffect(() => {
        const unsub = subscribeSedes(() => setSedesVersion(prev => prev + 1));
        return () => unsub();
    }, []);

    // Gerencias
    const [, setGerenciasVersion] = useState(0);
    const { gerencias } = getGerenciasState();

    useEffect(() => {
        const unsub = subscribeGerencias(() => setGerenciasVersion(prev => prev + 1));
        return () => unsub();
    }, []);

    // Modals CRUD
    const [openEquipo, setOpenEquipo] = useState(false);
    const [openChip, setOpenChip] = useState(false);
    const [openPlan, setOpenPlan] = useState(false);

    // Modals Actions
    const [openDevolucion, setOpenDevolucion] = useState(false);
    const [openAsignacion, setOpenAsignacion] = useState(false);
    const [openBaja, setOpenBaja] = useState(false);
    const [modalActionItem, setModalActionItem] = useState<Equipo | null>(null);

    // Action Form States
    const [devolucionData, setDevolucionData] = useState({ estado: "Bueno", observaciones: "" });
    const [asignacionData, setAsignacionData] = useState({ dni: "", nombre: "", area: "", puesto: "", sede: "" }); // Usuario Final
    const [responsableData, setResponsableData] = useState({ dni: "", nombre: "", area: "", puesto: "" }); // Responsable
    const [asignacionTicketData, setAsignacionTicketData] = useState({
        ceco: "",
        justificacion: "Asignación Directa de Inventario",
        tipo_servicio: "", // Operador
        fundo_planta: "",
        categoria: "",
        proyecto: "",
        gr: "",
        perfil_puesto: "",
        periodo: "PERMANENTE",
        fecha_inicio: new Date().toISOString().slice(0, 10),
        fecha_fin: "",
        cultivo: "",
        paquete_asignado: ""
    });
    const [sameAsResponsable, setSameAsResponsable] = useState(true);
    const [bajaData, setBajaData] = useState({ motivo: "" });

    // Scanner
    const [openScanner, setOpenScanner] = useState(false);
    const [scannerTarget, setScannerTarget] = useState<'imei' | 'search'>('imei');

    const handleScan = (decodedText: string) => {
        const cleanText = decodedText.replace(/\D/g, "");
        if (scannerTarget === 'imei') {
            setDraftEquipo(prev => ({ ...prev, imei: cleanText }));
        } else {
            setQ(cleanText);
        }
        setOpenScanner(false);
        setToast({ type: "success", message: "Código escaneado correctamente" });
    };

    // Drafts
    const [draftEquipo, setDraftEquipo] = useState<Partial<Equipo>>({ estado: "Disponible", condicion: "Nuevo", fecha_compra: "", categoria: "TELEFONIA", ubicacion: "BASE" });
    const [draftChip, setDraftChip] = useState<Partial<Chip>>({ estado: "Disponible" });
    const [draftPlan, setDraftPlan] = useState<Partial<PlanTelefonico>>({
        operador: "CLARO",
        active: true,
        costo: 0,
        gigas: "Ilimitado",
        llamadas: "Ilimitadas",
        sms: "Ilimitados"
    });

    // Revision Logic (Unchanged for now, keeping place holders)

    useEffect(() => {
        loadData();
        const unsub = subscribePersonal(() => { /* Force Update */ });
        return () => unsub();
    }, []);
    const [openRevision, setOpenRevision] = useState(false);
    const [revisionData, setRevisionData] = useState<{ estado: "Disponible" | "Mantenimiento", obs: string }>({ estado: "Disponible", obs: "" });

    // History View
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Linking View
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkTarget, setLinkTarget] = useState<{ type: 'equipo' | 'chip', item: any } | null>(null);
    const [selectedLinkOption, setSelectedLinkOption] = useState("");

    // Chips Actions
    const [openAsignacionChip, setOpenAsignacionChip] = useState(false);
    const [openDevolucionChip, setOpenDevolucionChip] = useState(false);
    const [modalActionChip, setModalActionChip] = useState<Chip | null>(null);
    const [deviceDataChip, setDeviceDataChip] = useState({ tipo_equipo: "Smartphone", codigo: "" });
    const [linkSearchTerm, setLinkSearchTerm] = useState("");

    // Linking Plan View
    const [openLinkPlan, setOpenLinkPlan] = useState(false);
    const [selectedChipLink, setSelectedChipLink] = useState<Chip | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string>("");

    // Chip History View
    const [showChipHistory, setShowChipHistory] = useState(false);
    const [chipHistoryData, setChipHistoryData] = useState<any[]>([]);
    const [chipHistoryLoading, setChipHistoryLoading] = useState(false);

    // eSIM / New Line flow
    const [includeEsim, setIncludeEsim] = useState(false);
    const [esimData, setEsimData] = useState({ numero: "", operador: "" });

    // Confirmation Modal State
    const [confirmation, setConfirmation] = useState<{
        open: boolean;
        title: string;
        message: string;
        onConfirm: () => Promise<void>;
        variant?: 'danger' | 'warning' | 'info';
        loading?: boolean;
    }>({
        open: false,
        title: "",
        message: "",
        onConfirm: async () => { },
        variant: 'danger',
        loading: false
    });

    const closeConfirmation = () => setConfirmation(prev => ({ ...prev, open: false }));

    // EDIT ASSIGNMENT STATE
    const [openEditAssign, setOpenEditAssign] = useState(false);
    const [editAssignData, setEditAssignData] = useState<any>(null);

    const handleEditAssignment = async (assign: any) => {
        try {
            // Find Ticket
            let ticket = telefoniaStore.solicitudes.find(s => s.id === assign.solicitud_id);

            // If not found in store (rare), we can't edit without ticket data.
            if (!ticket) throw new Error("No se encontraron los detalles del ticket (Solicitud) de esta asignación.");

            setEditAssignData({
                assignment: assign,
                ticket: ticket,
                formData: {
                    ticket: {
                        ceco: ticket.ceco || "",
                        fundo_planta: ticket.fundo_planta || "",
                        cultivo: ticket.cultivo || "",
                        categoria: ticket.categoria || "TELEFONIA",
                        proyecto: ticket.proyecto || "",
                        periodo: ticket.periodo_uso || "PERMANENTE",
                        fecha_inicio: ticket.fecha_inicio_uso || "",
                        fecha_fin: ticket.fecha_fin_uso || "",
                        gr: ticket.gr || "",
                        beneficiario_puesto: ticket.beneficiario_puesto || ""
                    },
                    beneficiario: {
                        dni: ticket.beneficiario_dni || "",
                        nombre: ticket.beneficiario_nombre || "",
                        area: ticket.beneficiario_area || "",
                        puesto: ticket.beneficiario_puesto || ""
                    },
                    usuario_final: {
                        dni: assign.usuario_final_dni || "",
                        nombre: assign.usuario_final_nombre || "",
                        area: assign.usuario_final_area || "",
                        puesto: assign.usuario_final_puesto || "",
                        sede: assign.usuario_final_sede || ""
                    },
                    dispositivo: {
                        tipo_equipo: assign.tipo_equipo_destino || "Smartphone",
                        codigo: assign.codigo_equipo_destino || ""
                    },
                    plan_id: assign.chip?.plan_id || ""
                },
                isChipAssignment: !assign.equipo_id && assign.chip_id
            });
            setOpenEditAssign(true);
        } catch (e: any) {
            setToast({ type: "error", message: e.message || "Error cargando datos" });
        }
    };

    const submitEditAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (!editAssignData) return;

            const formData = { ...editAssignData.formData };
            if (formData.ticket.fecha_inicio) {
                formData.ticket.fecha_inicio = `${formData.ticket.fecha_inicio}T12:00:00`;
            }
            if (formData.ticket.fecha_fin) {
                formData.ticket.fecha_fin = `${formData.ticket.fecha_fin}T12:00:00`;
            }

            await telefoniaStore.updateSolicitudAsignacion(
                editAssignData.assignment.id,
                editAssignData.ticket.id,
                formData
            );
            setToast({ type: "success", message: "Asignación actualizada correctamente" });
            setOpenEditAssign(false);

            // Refresh history view if open
            if (showHistory && modalActionItem) handleViewHistory(modalActionItem.id);
            if (showChipHistory && modalActionChip) handleViewChipHistory(modalActionChip.id);

            // Refresh main data to show updates in table
            loadData(true);

        } catch (e: any) {
            setToast({ type: "error", message: e.message || "Error actualizando" });
        } finally {
            setSubmitting(false);
        }
    };

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // 10, 20, 50, 0 (Todos)

    // Reset page on tab/search change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, q, itemsPerPage]);

    const loadData = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            await Promise.all([
                telefoniaStore.fetchEquipos(),
                telefoniaStore.fetchChips(),
                telefoniaStore.fetchPlanes(),
                telefoniaStore.fetchModelos(),
                telefoniaStore.fetchPuestos(),
                telefoniaStore.fetchProyectos(),
                telefoniaStore.fetchFacturas(), // [NEW] Fetch Invoices
                telefoniaStore.fetchSolicitudes(), // [NEW] Fetch Tickets for linking
            ]);
        } catch (e: any) {
            setToast({ type: "error", message: e.message || "Error cargando datos" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // --- ACCIONES DE EQUIPO (Devolución, Asignación, Baja) ---

    const handleOpenDevolucion = (eq: Equipo) => {
        setModalActionItem(eq);
        setDevolucionData({ estado: "Bueno", observaciones: "" });
        setOpenDevolucion(true);
    };

    const submitDevolucion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalActionItem?.asignacion_activa) return;
        setSubmitting(true);
        try {
            await telefoniaStore.registrarDevolucion(
                modalActionItem.asignacion_activa.id,
                modalActionItem.id,
                devolucionData.estado,
                devolucionData.observaciones
            );
            setToast({ type: "success", message: "Devolución registrada correctamente" });
            setOpenDevolucion(false);
        } catch (error: any) {
            setToast({ type: "error", message: error.message || "Error al registrar devolución" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenAsignacion = (eq: Equipo) => {
        setModalActionItem(eq);
        setAsignacionData({ dni: "", nombre: "", area: "", puesto: "", sede: "" });
        setResponsableData({ dni: "", nombre: "", area: "", puesto: "" });
        setAsignacionTicketData({
            ceco: "",
            justificacion: "Asignación Directa de Inventario",
            tipo_servicio: eq.chip?.operador || "", // Auto-fill Operator
            fundo_planta: "",
            categoria: "",
            proyecto: "",
            gr: "",
            perfil_puesto: "",
            periodo: "PERMANENTE",
            fecha_inicio: new Date().toISOString().slice(0, 10),
            fecha_fin: "",
            cultivo: "",
            paquete_asignado: eq.chip?.plan?.nombre || "" // Auto-fill Plan
        });
        setSameAsResponsable(true);
        setOpenAsignacion(true);
    };

    const submitAsignacion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalActionItem) return;
        // Validation
        const errors: Record<string, string> = {};
        if (!asignacionTicketData.ceco) {
            errors.ceco = "Ingrese el CECO.";
        } else if (asignacionTicketData.ceco.length !== 10) {
            errors.ceco = "El CECO debe tener 10 dígitos.";
            setToast({ type: "error", message: "Corrija los errores marcados." });
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);
        try {
            // Find Puesto Name
            const puestoObj = telefoniaStore.puestos.find(p => p.id === asignacionTicketData.perfil_puesto);
            const puestoNombre = puestoObj ? puestoObj.nombre : "";

            // Find Plan Details
            const planObj = telefoniaStore.planes.find(p => p.nombre === asignacionTicketData.paquete_asignado);

            // If check is true, Usuario Final = Responsable (with Ticket Location as Sede)
            const usuarioFinal = sameAsResponsable
                ? { ...responsableData, sede: asignacionTicketData.fundo_planta }
                : asignacionData;

            // --- BLOCKING VALIDATION ---
            if (usuarioFinal.dni && usuarioFinal.dni.length === 8) {
                const check = await telefoniaStore.checkActiveAssignment(usuarioFinal.dni);
                if (check.exists) {
                    setToast({ type: 'error', message: check.message || "Usuario ya tiene asignación." });
                    setFormErrors({ dni: "Usuario ya con equipo asignado." });
                    setSubmitting(false);
                    return;
                }
            }
            // ---------------------------

            await telefoniaStore.asignarDirectamente(
                modalActionItem.id,
                usuarioFinal,
                responsableData,
                {
                    ceco: asignacionTicketData.ceco,
                    justificacion: asignacionTicketData.justificacion,
                    tipo_servicio: asignacionTicketData.tipo_servicio, // Operador
                    fundo_planta: asignacionTicketData.fundo_planta,
                    categoria: asignacionTicketData.categoria,
                    proyecto: asignacionTicketData.proyecto,
                    gr: asignacionTicketData.gr,
                    beneficiario_puesto_nombre: puestoNombre, // Send Name
                    periodo: asignacionTicketData.periodo,
                    fecha_inicio: asignacionTicketData.fecha_inicio,
                    fecha_fin: asignacionTicketData.fecha_fin,
                    cultivo: asignacionTicketData.cultivo,
                    cantidad_lineas: 1,
                    paquete_asignado: asignacionTicketData.paquete_asignado,
                    plan_costo: planObj?.costo || 0,
                    plan_datos: planObj?.gigas || "",
                    usuario_creador_id: user?.id
                }
            );
            setToast({ type: "success", message: "Equipo asignado y ticket generado correctamente" });
            setOpenAsignacion(false);
        } catch (error: any) {
            setToast({ type: "error", message: error.message || "Error al asignar equipo" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenBaja = (eq: Equipo) => {
        if (eq.chip_id) {
            setToast({ type: "error", message: "El equipo tiene línea asignada. Desvincule la línea primero." });
            return;
        }
        if (eq.asignacion_activa) {
            setToast({ type: "error", message: "El equipo está asignado. Debe registrar la devolución primero." });
            return;
        }
        setModalActionItem(eq);
        setBajaData({ motivo: "" });
        setOpenBaja(true);
    };

    const submitBajaSolicitud = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalActionItem) return;
        try {
            if (!user?.id) throw new Error("Usuario no identificado");

            await telefoniaStore.solicitarBajaDirecta(
                modalActionItem.id,
                bajaData.motivo,
                {
                    id: user.id,
                    dni: profile?.dni || "",
                    nombre: profile?.nombre || "Usuario"
                }
            );
            // We need profile access here. Inventario used `useAuth` but destructured `user`. Let's check imports.
            setToast({ type: "success", message: "Solicitud de baja creada. Equipo en Mantenimiento." });
            setOpenBaja(false);
        } catch (error: any) {
            setToast({ type: "error", message: error.message || "Error al solicitar baja" });
        }
    };

    // Removed handleProcesarBaja as approval is now in Admin View


    // --- RECEPTION & REVISION FLOW ---
    const handleRecepcionar = (eq: Equipo) => {
        setConfirmation({
            open: true,
            title: "Recepcionar Equipo",
            message: `¿Confirmar que el equipo ${eq.marca} ${eq.modelo} ha llegado a base? Pasará a estado "Para Revisión".`,
            variant: "info",
            onConfirm: async () => {
                setConfirmation(prev => ({ ...prev, loading: true }));
                try {
                    if (!eq.asignacion_activa) throw new Error("No hay asignación activa para este equipo");
                    // Use asignacion_id (mapped in store) or fallback to id if not present (legacy)
                    const asigId = eq.asignacion_activa.asignacion_id || eq.asignacion_activa.id;
                    await telefoniaStore.recepcionarEquipo(asigId, eq.id);
                    setToast({ type: "success", message: "Equipo recepcionado. Listo para revisión." });
                    await loadData(true);
                    closeConfirmation();
                } catch (e: any) {
                    setToast({ type: "error", message: e.message || "Error al recepcionar" });
                    setConfirmation(prev => ({ ...prev, loading: false }));
                }
            }
        });
    };

    const handleOpenRevision = (eq: Equipo) => {
        setModalActionItem(eq);
        setRevisionData({ estado: "Disponible", obs: "" });
        setOpenRevision(true);
    };

    const submitRevision = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalActionItem?.asignacion_activa) return;
        setSubmitting(true);
        try {
            const asigId = modalActionItem.asignacion_activa.asignacion_id || modalActionItem.asignacion_activa.id;
            await telefoniaStore.finalizarRevision(
                asigId,
                modalActionItem.id,
                revisionData.estado
            );
            setToast({ type: "success", message: "Revisión finalizada. Equipo actualizado." });
            setOpenRevision(false);
            loadData(true);
        } catch (error: any) {
            setToast({ type: "error", message: error.message || "Error al finalizar revisión" });
        } finally {
            setSubmitting(false);
        }
    };


    // --- EQUIPOS HANDLERS ---
    const handleEditEquipo = (eq: Equipo) => {
        setDraftEquipo({ ...eq });
        setOpenEquipo(true);
    };

    const handleNewEquipo = () => {
        setDraftEquipo({
            estado: "Disponible",
            marca: "",
            modelo: "",
            imei: "",
            color: "",
            condicion: "Nuevo",
            fecha_compra: "",
            categoria: "TELEFONIA",
            ubicacion: "BASE",
            factura_id: null, // [NEW]
            solicitud_compra_id: null // [NEW]
        });
        setIncludeEsim(false);
        setEsimData({ numero: "", operador: "" });
        setOpenEquipo(true);
    };

    const saveEquipo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let newChipId = null;

            // Ensure IMEI has no spaces
            if (draftEquipo.imei) {
                draftEquipo.imei = draftEquipo.imei.replace(/\s/g, "");
            }

            // [NEW] Validation: Invoice Quota
            if (draftEquipo.factura_id) {
                const factura = telefoniaStore.facturas.find(f => f.id === draftEquipo.factura_id);
                if (factura) {
                    // Find item for this model
                    const item = factura.items?.find(i => i.nombre_modelo === draftEquipo.modelo);
                    if (!item) {
                        // Warn but allow? Or Block? Block is safer.
                        // "El modelo X no está registrado en la factura seleccionada."
                        throw new Error(`El modelo '${draftEquipo.modelo}' no figura en la factura seleccionada.`);
                    }

                    // Check Current Count
                    const currentCount = telefoniaStore.equipos.filter(e =>
                        e.factura_id === factura.id &&
                        e.modelo === draftEquipo.modelo &&
                        e.id !== draftEquipo.id // Exclude self if editing
                    ).length;

                    if (currentCount >= item.cantidad) {
                        throw new Error(`La factura no tiene saldo disponible para '${draftEquipo.modelo}' (${currentCount}/${item.cantidad} registrados).`);
                    }
                }
            }

            if (!draftEquipo.id && includeEsim) {
                if (!esimData.numero || !esimData.operador) {
                    setToast({ type: "error", message: "Complete los datos de la eSIM" });
                    return;
                }
                const newChip = await telefoniaStore.createChip({
                    numero_linea: esimData.numero,
                    operador: esimData.operador,
                    estado: "Disponible"
                });
                newChipId = newChip.id;
            }

            // Sanitize payload
            const payload = {
                ...draftEquipo,
                factura_id: draftEquipo.factura_id || null,
                solicitud_compra_id: draftEquipo.solicitud_compra_id || null
            };

            if (draftEquipo.id) {
                await telefoniaStore.updateEquipo(draftEquipo.id, payload);
                setToast({ type: "success", message: "Equipo actualizado" });
            } else {
                const newEquipo = await telefoniaStore.createEquipo(payload as any);

                if (newChipId) {
                    await telefoniaStore.vincular(newEquipo.id, newChipId);
                }

                setToast({ type: "success", message: "Equipo creado" });
            }
            setOpenEquipo(false);
        } catch (err: any) {
            let msg = err.message || "Error al guardar equipo";
            if (msg.includes("telefonia_chips_numero_linea_key") || msg.includes("duplicate key")) {
                msg = "El número de línea ya se encuentra registrado.";
            }
            setToast({ type: "error", message: msg });
        }
    };

    // --- CHIPS HANDLERS ---
    const handleEditChip = (chip: Chip) => {
        setDraftChip({ ...chip });
        setOpenChip(true);
    };

    const handleNewChip = () => {
        setDraftChip({ estado: "Disponible", numero_linea: "", operador: "" });
        setOpenChip(true);
    };

    const saveChip = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (draftChip.id) {
                await telefoniaStore.updateChip(draftChip.id, draftChip);
                setToast({ type: "success", message: "Chip actualizado" });
            } else {
                await telefoniaStore.createChip(draftChip as any);
                setToast({ type: "success", message: "Chip creado" });
            }
            setOpenChip(false);
        } catch (err: any) {
            let msg = err.message || "Error al guardar chip";
            if (msg.includes("telefonia_chips_numero_linea_key") || msg.includes("duplicate key")) {
                msg = "El número de línea ya se encuentra registrado.";
            }
            setToast({ type: "error", message: msg });
        }
    };

    // --- PLANES HANDLERS ---
    const handleEditPlan = (plan: PlanTelefonico) => {
        setDraftPlan({ ...plan });
        setOpenPlan(true);
    };

    const handleNewPlan = () => {
        setDraftPlan({
            operador: "CLARO",
            active: true,
            costo: 0,
            gigas: "Ilimitado",
            llamadas: "Ilimitadas",
            sms: "Ilimitados",
            nombre: ""
        });
        setOpenPlan(true);
    };

    const savePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!draftPlan.nombre) {
                draftPlan.nombre = `S/ ${draftPlan.costo}`;
            }

            if (draftPlan.id) {
                await telefoniaStore.updatePlan(draftPlan.id, draftPlan);
                setToast({ type: "success", message: "Plan actualizado" });
            } else {
                await telefoniaStore.createPlan(draftPlan as any);
                setToast({ type: "success", message: "Plan creado" });
            }
            setOpenPlan(false);
        } catch (err: any) {
            setToast({ type: "error", message: err.message || "Error al guardar plan" });
        }
    };

    const handleDeletePlan = (id: string) => {
        setConfirmation({
            open: true,
            title: "Eliminar Plan",
            message: "¿Seguro que desea eliminar este plan? Esta acción no se puede deshacer.",
            variant: "danger",
            onConfirm: async () => {
                setConfirmation(prev => ({ ...prev, loading: true }));
                try {
                    await telefoniaStore.deletePlan(id);
                    setToast({ type: "success", message: "Plan eliminado" });
                    closeConfirmation();
                } catch (error) {
                    setToast({ type: "error", message: "Error al eliminar plan" });
                    setConfirmation(prev => ({ ...prev, loading: false }));
                }
            }
        });
    };

    const handleViewHistory = async (equipoId: string) => {
        setHistoryLoading(true);
        setShowHistory(true);
        setHistoryData([]);
        try {
            const data = await telefoniaStore.fetchHistorialEquipo(equipoId);
            setHistoryData(data);
        } catch (e) {
            setToast({ type: "error", message: "Error cargando historial" });
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleViewChipHistory = async (chipId: string) => {
        setChipHistoryLoading(true);
        setShowChipHistory(true);
        setChipHistoryData([]);
        try {
            const data = await telefoniaStore.fetchHistorialChip(chipId);
            setChipHistoryData(data);
        } catch (e) {
            setToast({ type: "error", message: "Error cargando historial del chip" });
        } finally {
            setChipHistoryLoading(false);
        }
    };

    // --- LINKING HANDLERS ---
    const handleOpenLink = (type: 'equipo' | 'chip', item: any) => {
        setLinkTarget({ type, item });
        setSelectedLinkOption("");
        setLinkSearchTerm("");
        setShowLinkModal(true);
    };

    const handleUnlink = (type: 'equipo' | 'chip', item: any) => {
        setConfirmation({
            open: true,
            title: type === 'equipo' ? "Desvincular Línea" : "Desvincular Equipo",
            message: `¿Seguro que deseas desvincular ${type === 'equipo' ? 'la línea del equipo' : 'el equipo de la línea'}?`,
            variant: "warning",
            onConfirm: async () => {
                setConfirmation(prev => ({ ...prev, loading: true }));
                try {
                    if (type === 'equipo') {
                        await telefoniaStore.desvincular(item.id, item.chip_id);
                    } else {
                        await telefoniaStore.desvincular(item.equipo_id, item.id);
                    }
                    setToast({ type: "success", message: "Desvinculado correctamente" });
                    loadData(true);
                    closeConfirmation();
                } catch (e: any) {
                    setToast({ type: "error", message: "Error al desvincular" });
                    setConfirmation(prev => ({ ...prev, loading: false }));
                }
            }
        });
    };

    const handleSaveLink = async () => {
        if (!linkTarget || !selectedLinkOption) return;
        try {
            setLoading(true);
            if (linkTarget.type === 'equipo') {
                await telefoniaStore.vincular(linkTarget.item.id, selectedLinkOption);
            } else {
                await telefoniaStore.vincular(selectedLinkOption, linkTarget.item.id);
            }
            setToast({ type: "success", message: "Vinculado correctamente" });
            setShowLinkModal(false);
            loadData(true);
        } catch (e) {
            setToast({ type: "error", message: "Error al vincular" });
        } finally {
            setLoading(false);
        }
    };

    // --- PLAN LINKING HANDLERS ---
    const handleOpenLinkPlan = (chip: Chip) => {
        setSelectedChipLink(chip);
        setSelectedPlanId(chip.plan_id || "");
        setOpenLinkPlan(true);
    };

    const submitLinkPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChipLink) return;
        try {
            await telefoniaStore.updateChip(selectedChipLink.id, { plan_id: selectedPlanId || null });
            setToast({ type: "success", message: "Plan actualizado" });
            setOpenLinkPlan(false);
            loadData(true);
        } catch (error) {
            setToast({ type: "error", message: "Error al vincular plan" });
        }
    };

    // --- CHIP ASSIGNMENT / RETURN HANDLERS ---
    const handleOpenAsignacionChip = (chip: Chip) => {
        setModalActionChip(chip);
        setDeviceDataChip({ tipo_equipo: "Smartphone", codigo: "" });
        // Reset Responsable Data
        setResponsableData({ dni: "", nombre: "", area: "", puesto: "" });
        setAsignacionTicketData({
            ceco: "",
            justificacion: "Asignación Directa de Chip - Solo Sim",
            tipo_servicio: chip.operador,
            fundo_planta: "",
            categoria: "",
            proyecto: "",
            gr: "",
            perfil_puesto: "",
            periodo: "PERMANENTE",
            fecha_inicio: new Date().toISOString().slice(0, 10),
            fecha_fin: "",
            cultivo: "",
            paquete_asignado: chip.plan?.nombre || ""
        });

        setOpenAsignacionChip(true);
    };

    const submitAsignacionChip = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalActionChip) return;

        // Validation
        if (!asignacionTicketData.ceco || asignacionTicketData.ceco.length !== 10) {
            setToast({ type: "error", message: "El CECO debe tener 10 dígitos" });
            return;
        }

        try {
            setSubmitting(true);

            // --- BLOCKING VALIDATION REMOVED FOR CHIPS ---
            // Chips can be assigned even if user has other assignments
            // ---------------------------

            await telefoniaStore.asignarChipDirectamente(
                modalActionChip.id,
                responsableData,
                {
                    ceco: asignacionTicketData.ceco,
                    fundo_planta: asignacionTicketData.fundo_planta,
                    categoria: asignacionTicketData.categoria,
                    proyecto: asignacionTicketData.proyecto,
                    gr: asignacionTicketData.gr,
                    fecha_inicio: asignacionTicketData.fecha_inicio,

                    periodo: asignacionTicketData.periodo,
                    fecha_fin: asignacionTicketData.fecha_fin, // Pass to store
                    cultivo: asignacionTicketData.cultivo,

                    usuario_creador_id: user?.id
                },
                deviceDataChip
            );

            setToast({ type: "success", message: "Chip asignado correctamente" });
            setOpenAsignacionChip(false);
            loadData(true);
        } catch (error: any) {
            setToast({ type: "error", message: error.message || "Error al asignar chip" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenDevolucionChip = (chip: Chip) => {
        setModalActionChip(chip);
        setDevolucionData({ estado: "Bueno", observaciones: "" });
        setOpenDevolucionChip(true);
    };

    const submitDevolucionChip = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalActionChip) return;
        try {
            await telefoniaStore.registrarDevolucionChip(
                modalActionChip.id,
                devolucionData.observaciones
            );
            setToast({ type: "success", message: "Devolución de chip registrada" });
            setOpenDevolucionChip(false);
            loadData(true);
        } catch (error: any) {
            setToast({ type: "error", message: error.message || "Error al registrar devolución" });
        }
    };

    // --- RENDER HELPERS ---
    const EstadoBadge = ({ estado }: { estado: string }) => {
        let color = "bg-gray-100 text-gray-800";
        if (estado === "Disponible") color = "bg-emerald-100 text-emerald-800";
        if (estado === "Asignado") color = "bg-blue-100 text-blue-800";
        if (estado === "Mantenimiento") color = "bg-amber-100 text-amber-800";
        if (estado === "Baja") color = "bg-rose-100 text-rose-800";
        if (estado === "Para Devolucion") color = "bg-orange-100 text-orange-800 border-orange-200 animate-pulse";
        if (estado === "Para Revisión") color = "bg-purple-100 text-purple-800 border-purple-200";

        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
                {estado}
            </span>
        );
    };

    const filteredEquipos = telefoniaStore.equipos.filter((e) => {
        const term = q.toLowerCase();
        const matchesTerm = (
            e.marca.toLowerCase().includes(term) ||
            e.modelo.toLowerCase().includes(term) ||
            e.imei.toLowerCase().includes(term) ||
            (e.asignacion_activa?.beneficiario_nombre?.toLowerCase() || "").includes(term) ||
            (e.asignacion_activa?.usuario_final_nombre?.toLowerCase() || "").includes(term) ||
            (e.asignacion_activa?.usuario_final_dni?.toLowerCase() || "").includes(term) ||
            (e.asignacion_activa?.beneficiario_dni?.toLowerCase() || "").includes(term) ||
            (e.chip?.numero_linea?.toLowerCase() || "").includes(term)
        );

        if (!matchesTerm) return false;

        // Apply Filters
        if (filterEstado && e.estado !== filterEstado) return false;

        if (filterFundo) {
            const fundo = e.asignacion_activa?.fundo_planta || "Sin Asignar";
            if (fundo !== filterFundo) return false;
        }

        if (filterAnio) {
            const anio = e.fecha_compra ? new Date(e.fecha_compra).getFullYear().toString() : "Sin fecha";
            if (anio !== filterAnio) return false;
        }

        if (filterVencimiento) {
            if (!e.asignacion_activa) return false;
            const periodo = e.asignacion_activa.periodo_uso || "PERMANENTE";
            const fechaFin = e.asignacion_activa.fecha_fin_uso ? new Date(e.asignacion_activa.fecha_fin_uso) : null;
            const now = new Date();

            if (filterVencimiento === "PERMANENTES") {
                if (periodo !== "PERMANENTE") return false;
            } else if (filterVencimiento === "VENCIDOS") {
                // Expired if not permanente and date < now
                if (periodo === "PERMANENTE") return false;
                if (!fechaFin || fechaFin >= now) return false;
            } else if (filterVencimiento === "POR_VENCER") {
                // Expiring within 30 days
                if (periodo === "PERMANENTE") return false;
                if (!fechaFin) return false;
                const diffTime = fechaFin.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                // Show if future but within 30 days. Also include if expiring today (diffDays >= 0).
                if (diffDays < 0 || diffDays > 30) return false;
            }
        }

        if (filterCultivo) {
            const cultivo = e.asignacion_activa?.cultivo || "Sin Cultivo";
            if (cultivo !== filterCultivo) return false;
        }

        return true;
    });


    // Unique Values for Filters
    const uniqueFundos = Array.from(new Set(telefoniaStore.equipos.map(e => e.asignacion_activa?.fundo_planta || "Sin Asignar"))).sort();
    const uniqueAnios = Array.from(new Set(telefoniaStore.equipos.map(e => e.fecha_compra ? new Date(e.fecha_compra).getFullYear().toString() : "Sin fecha"))).sort((a, b) => b.localeCompare(a));
    const uniqueEstados = Array.from(new Set(telefoniaStore.equipos.map(e => e.estado))).sort();
    const uniqueCultivosEquipos = React.useMemo(() => {
        return Array.from(new Set(
            (telefoniaStore.equipos || [])
                .filter(e => !filterFundo || e.asignacion_activa?.fundo_planta === filterFundo)
                .map(e => e.asignacion_activa?.cultivo)
                .filter(Boolean)
        )).sort();
    }, [telefoniaStore.equipos, filterFundo]);

    // Unique Values for Chips Filters
    const uniqueChipEstados = Array.from(new Set(telefoniaStore.chips.map(c => c.estado))).sort();
    const uniqueChipOperadores = Array.from(new Set(telefoniaStore.chips.map(c => c.operador))).sort();
    const uniqueChipPlanes = Array.from(new Set(telefoniaStore.chips.map(c => c.plan?.nombre || "Sin Plan"))).sort();
    const uniquePlanOperadores = Array.from(new Set(telefoniaStore.planes.map(p => p.operador))).sort();
    const uniqueCultivosChips = React.useMemo(() => {
        return Array.from(new Set(
            (telefoniaStore.chips || [])
                .map(c => c.asignacion_activa?.cultivo)
                .filter(Boolean)
        )).sort();
    }, [telefoniaStore.chips]);

    const filteredChips = telefoniaStore.chips.filter((c) => {
        const term = q.toLowerCase();
        // Normalize for phone number search: remove spaces and hyphens
        const cleanTerm = term.replace(/[\s-]/g, "");
        const cleanNumero = c.numero_linea.toLowerCase().replace(/[\s-]/g, "");

        return (
            (cleanNumero.includes(cleanTerm) ||
                c.operador.toLowerCase().includes(term) ||
                c.numero_linea.toLowerCase().includes(term)) &&
            // Filters
            (!filterChipEstado || c.estado === filterChipEstado) &&
            (!filterChipOperador || c.operador === filterChipOperador) &&
            (!filterChipPlan || (filterChipPlan === "Sin Plan" ? !c.plan : c.plan?.nombre === filterChipPlan))
        );
    }).filter(c => {
        if (filterVencimiento) {
            if (!c.asignacion_activa) return false;
            const periodo = c.asignacion_activa.periodo_uso || "PERMANENTE";
            const fechaFin = c.asignacion_activa.fecha_fin_uso ? new Date(c.asignacion_activa.fecha_fin_uso) : null;
            const now = new Date();

            if (filterVencimiento === "PERMANENTES") {
                if (periodo !== "PERMANENTE") return false;
            } else if (filterVencimiento === "VENCIDOS") {
                if (periodo === "PERMANENTE") return false;
                if (!fechaFin || fechaFin >= now) return false;
            } else if (filterVencimiento === "POR_VENCER") {
                if (periodo === "PERMANENTE") return false;
                if (!fechaFin) return false;
                const diffTime = fechaFin.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 0 || diffDays > 30) return false;
            }
        }
        if (filterCultivo) {
            const cultivo = c.asignacion_activa?.cultivo || "Sin Cultivo";
            if (cultivo !== filterCultivo) return false;
        }
        return true;
    });


    const filteredPlanes = telefoniaStore.planes?.filter((p) => {
        const term = q.toLowerCase();
        return (
            p.nombre.toLowerCase().includes(term) ||
            p.operador.toLowerCase().includes(term)
        );
    }) || [];

    // Pagination Logic
    const getCurrentData = () => {
        const data = activeTab === "equipos" ? filteredEquipos :
            activeTab === "chips" ? filteredChips :
                filteredPlanes;

        if (itemsPerPage === 0) return data;

        const start = (currentPage - 1) * itemsPerPage;
        return data.slice(start, start + itemsPerPage);
    };

    const currentData = getCurrentData();
    const totalItems = activeTab === "equipos" ? filteredEquipos.length :
        activeTab === "chips" ? filteredChips.length :
            filteredPlanes.length;

    const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(totalItems / itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="space-y-6">
            {/* HEADER */}
            {/* HEADER & COUNTER CARD */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Inventario de Telefonía
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Gestiona los equipos celulares y chips telefónicos.
                    </p>
                </div>

                {/* Total Counters (Unfiltered) */}
                <div className="flex gap-3">
                    {/* Equipos */}
                    <div className="rounded-xl border border-gray-200 bg-white p-3 flex items-center gap-3 min-w-[140px]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                            <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Equipos</p>
                            <div className="flex items-baseline gap-1">
                                <p className="text-xl font-bold text-gray-900">{telefoniaStore.equipos.length}</p>
                                <span className="text-xs text-gray-500 font-medium">
                                    ({telefoniaStore.equipos.filter(e => e.estado === "Asignado").length} asig.)
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Chips */}
                    <div className="rounded-xl border border-gray-200 bg-white p-3 flex items-center gap-3 min-w-[140px]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <CardSim className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Chips</p>
                            <div className="flex items-baseline gap-1">
                                <p className="text-xl font-bold text-gray-900">{telefoniaStore.chips.length}</p>
                                <span className="text-xs text-gray-500 font-medium">
                                    ({telefoniaStore.chips.filter(c => c.estado === "Asignado").length} asig.)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            {/* TABS */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab("equipos")}
                        className={`${activeTab === "equipos" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <Smartphone className="h-5 w-5" />
                        Equipos
                    </button>
                    <button
                        onClick={() => setActiveTab("chips")}
                        className={`${activeTab === "chips" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <CardSim className="h-5 w-5" />
                        Chips
                    </button>
                    <button
                        onClick={() => setActiveTab("planes")}
                        className={`${activeTab === "planes" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <Wifi className="h-5 w-5" />
                        Planes
                    </button>
                </nav>
            </div>

            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-2 w-full overflow-x-auto sm:flex-wrap pb-2 sm:pb-0 order-last sm:order-none">
                    <div className="relative w-full sm:max-w-xs shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-20 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            placeholder={
                                activeTab === "equipos" ? "Buscar..." :
                                    activeTab === "chips" ? "Buscar..." :
                                        "Buscar..."
                            }
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">
                            {totalItems} Res.
                        </div>
                    </div>
                    <button
                        onClick={() => { setScannerTarget('search'); setOpenScanner(true); }}
                        className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                        title="Escanear a Buscador"
                    >
                        <ScanBarcode className="w-5 h-5" />
                    </button>

                    {/* FILTERS IN TOOLBAR */}
                    {activeTab === "equipos" && (
                        <>
                            <div className="h-6 w-px bg-gray-300 mx-1 hidden sm:block"></div>

                            {/* Filter: Estado */}
                            <div className="relative group min-w-[160px]">
                                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10" />
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                                <select
                                    className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-8 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors cursor-pointer"
                                    value={filterEstado}
                                    onChange={(e) => setFilterEstado(e.target.value)}
                                >
                                    <option value="">Todos los Estados</option>
                                    {uniqueEstados.map(e => (e && <option key={e} value={e}>{e}</option>))}
                                </select>
                            </div>

                            {/* Filter: Fundo/Planta */}
                            <div className="relative group min-w-[180px]">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10" />
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                                <select
                                    className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-8 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors cursor-pointer"
                                    value={filterFundo}
                                    onChange={(e) => {
                                        setFilterFundo(e.target.value);
                                        setFilterCultivo("");
                                    }}
                                >
                                    <option value="">Todas las Sedes</option>
                                    {uniqueFundos.map(f => (f && <option key={f} value={f}>{f}</option>))}
                                </select>
                            </div>

                            {/* Filter: Año */}
                            <div className="relative group min-w-[140px]">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10" />
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                                <select
                                    className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-8 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors cursor-pointer"
                                    value={filterAnio}
                                    onChange={(e) => setFilterAnio(e.target.value)}
                                >
                                    <option value="">Todos los Años</option>
                                    {uniqueAnios.map(a => (a && <option key={a} value={a}>{a}</option>))}
                                </select>
                            </div>

                            {/* Filter: Cultivo */}
                            <div className="relative group min-w-[140px]">
                                <Sprout className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10" />
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                                <select
                                    className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-8 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors cursor-pointer"
                                    value={filterCultivo}
                                    onChange={(e) => setFilterCultivo(e.target.value)}
                                >
                                    <option value="">Todos los Cultivos</option>
                                    {uniqueCultivosEquipos.map(c => (c && <option key={c} value={c}>{c}</option>))}
                                </select>
                            </div>

                            {(filterEstado || filterFundo || filterAnio || filterCultivo) && (
                                <button
                                    onClick={() => { setFilterEstado(""); setFilterFundo(""); setFilterAnio(""); setFilterCultivo(""); }}
                                    className="h-10 px-4 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100 transition-colors whitespace-nowrap"
                                >
                                    Limpiar
                                </button>
                            )}
                        </>

                    )}

                    {/* FILTERS IN TOOLBAR (CHIPS) */}
                    {activeTab === "chips" && (
                        <>
                            <div className="h-6 w-px bg-gray-300 mx-1 hidden sm:block"></div>

                            {/* Filter: Estado */}
                            <div className="relative group min-w-[160px]">
                                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10" />
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                                <select
                                    className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-8 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors cursor-pointer"
                                    value={filterChipEstado}
                                    onChange={(e) => setFilterChipEstado(e.target.value)}
                                >
                                    <option value="">Todos los Estados</option>
                                    {uniqueChipEstados.map(e => (e && <option key={e} value={e}>{e}</option>))}
                                </select>
                            </div>

                            {/* Filter: Operador */}
                            <div className="relative group min-w-[140px]">
                                <Signal className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10" />
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                                <select
                                    className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-8 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors cursor-pointer"
                                    value={filterChipOperador}
                                    onChange={(e) => setFilterChipOperador(e.target.value)}
                                >
                                    <option value="">Operador</option>
                                    {uniqueChipOperadores.map(op => (op && <option key={op} value={op}>{op}</option>))}
                                </select>
                            </div>

                            {/* Filter: Plan */}
                            <div className="relative group min-w-[160px]">
                                <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10" />
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                                <select
                                    className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-8 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors cursor-pointer"
                                    value={filterChipPlan}
                                    onChange={(e) => setFilterChipPlan(e.target.value)}
                                >
                                    <option value="">Plan</option>
                                    {uniqueChipPlanes.map(p => (p && <option key={p} value={p}>{p}</option>))}
                                </select>
                            </div>

                            {/* Filter: Cultivo */}
                            <div className="relative group min-w-[140px]">
                                <Sprout className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10" />
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                                <select
                                    className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-8 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors cursor-pointer"
                                    value={filterCultivo}
                                    onChange={(e) => setFilterCultivo(e.target.value)}
                                >
                                    <option value="">Todos los Cultivos</option>
                                    {uniqueCultivosChips.map(c => (c && <option key={c} value={c}>{c}</option>))}
                                </select>
                            </div>

                            {(filterChipEstado || filterChipOperador || filterChipPlan || filterCultivo) && (
                                <button
                                    onClick={() => { setFilterChipEstado(""); setFilterChipOperador(""); setFilterChipPlan(""); setFilterCultivo(""); }}
                                    className="h-10 px-4 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100 transition-colors whitespace-nowrap"
                                >
                                    Limpiar
                                </button>
                            )}
                        </>
                    )}


                    {/* Filter Vencimiento Selector */}
                    {(activeTab === "equipos" || activeTab === "chips") && (
                        <div className="relative group min-w-[200px]">
                            <History className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10" />
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                            <select
                                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-8 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors cursor-pointer"
                                value={filterVencimiento}
                                onChange={(e) => setFilterVencimiento(e.target.value)}
                            >
                                <option value="">Estado Asignación</option>
                                <option value="PERMANENTES">Permanentes</option>
                                <option value="VENCIDOS">Vencidos</option>
                                <option value="POR_VENCER">Por Vencer (30 días)</option>
                            </select>
                        </div>
                    )}

                </div>

                <button
                    onClick={
                        activeTab === "equipos" ? handleNewEquipo :
                            activeTab === "chips" ? handleNewChip :
                                handleNewPlan
                    }
                    className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors order-first sm:order-none w-full sm:w-auto justify-center"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo {
                        activeTab === "equipos" ? "Equipo" :
                            activeTab === "chips" ? "Chip" : "Plan"
                    }
                </button>
            </div>

            {/* CONTENT */}
            {
                loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden text-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    {activeTab === "equipos" && (
                                        <tr>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Equipo</th>
                                            {/* Removed F. Compra */}
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Estado / Categoria</th>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Ubicación</th>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Línea</th>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Plan</th>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Resp del Equipo</th>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Usuario Final</th>

                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Fin Periodo</th>
                                            <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acciones</th>

                                        </tr>
                                    )}
                                    {activeTab === "chips" && (
                                        <tr>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Número</th>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Operador</th>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Plan</th>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Equipo Vinculado</th>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Estado</th>

                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Fin Periodo</th>
                                            <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acciones</th>

                                        </tr>
                                    )}
                                    {activeTab === "planes" && (
                                        <tr>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Operador</th>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Plan (Costo)</th>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Detalles</th>
                                            <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Estado</th>
                                            <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Acciones</th>
                                        </tr>
                                    )}
                                </thead>
                                {/* CUERPO */}
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {activeTab === "equipos" ? (currentData as Equipo[]).map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{item.marca} {item.modelo}</div>
                                                <div className="text-gray-500 font-mono text-xs mt-0.5">IMEI: {item.imei}</div>
                                                {(item.ram || item.almacenamiento || item.pantalla || item.color) && (
                                                    <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-gray-500">
                                                        {item.color && <span className="px-1 rounded border border-gray-200">{item.color}</span>}
                                                        {item.ram && <span className="bg-gray-100 px-1 rounded border border-gray-200">{item.ram}</span>}
                                                        {item.almacenamiento && <span className="bg-gray-100 px-1 rounded border border-gray-200">{item.almacenamiento}</span>}
                                                        {item.pantalla && <span className="bg-gray-100 px-1 rounded border border-gray-200">{item.pantalla}</span>}
                                                    </div>
                                                )}
                                                <div className="mt-1 flex items-center gap-2">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                        {item.condicion || "CONDICION"}
                                                    </span>
                                                    {item.fecha_compra && (
                                                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(item.fecha_compra + 'T00:00:00').toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Removed F. Compra Cell */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-2 items-center">
                                                    <EstadoBadge estado={item.estado} />
                                                    <span className="text-xs text-gray-400 px-1 border rounded bg-gray-50">
                                                        {item.categoria || "Nuevo"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-5 w-5 text-gray-400" />
                                                    <span className="font-medium">
                                                        {item.asignacion_activa?.fundo_planta || item.ubicacion}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.chip ? (
                                                    <div className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 w-fit">
                                                        <CardSim className="w-3 h-3" />
                                                        <span className="font-mono font-medium">{item.chip.numero_linea}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">Sin vincular</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.chip ? (
                                                    item.chip.plan ? (
                                                        <div className="text-xs">
                                                            <div className={`font-bold text-[10px] uppercase mb-0.5 ${item.chip.plan.operador === 'CLARO' ? 'text-red-600' :
                                                                item.chip.plan.operador === 'MOVISTAR' ? 'text-blue-600' :
                                                                    item.chip.plan.operador === 'ENTEL' ? 'text-orange-600' : 'text-gray-600'
                                                                }`}>
                                                                {item.chip.plan.operador}
                                                            </div>
                                                            <div className="font-semibold text-gray-800">{item.chip.plan.nombre}</div>
                                                            <div className="text-gray-500 text-[10px]">S/ {item.chip.plan.costo.toFixed(2)} - {item.chip.plan.gigas}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic text-xs">Sin Plan</span>
                                                    )
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {(item.estado === "Asignado" || item.estado === "Para Devolucion" || item.estado === "Para Revisión") && item.asignacion_activa ? (
                                                    <div>
                                                        <div className="font-medium text-gray-900">{item.asignacion_activa.beneficiario_nombre}</div>
                                                        <div className="text-xs text-gray-500">{item.asignacion_activa.beneficiario_area}</div>
                                                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(item.asignacion_activa.fecha_entrega || '').toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                            {/* New Usuario Final Column */}
                                            <td className="px-6 py-4">
                                                {(item.estado === "Asignado" || item.estado === "Para Devolucion" || item.estado === "Para Revisión") && item.asignacion_activa && (item.asignacion_activa.usuario_final_nombre || item.asignacion_activa.usuario_final_dni) ? (
                                                    <div>
                                                        <div className="font-medium text-gray-900">{item.asignacion_activa.usuario_final_nombre || "Sin Nombre"}</div>
                                                        <div className="text-xs text-gray-500 font-mono">{item.asignacion_activa.usuario_final_dni || "Sin DNI"}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {(item.estado === "Asignado" || item.estado === "Para Devolucion" || item.estado === "Para Revisión") && item.asignacion_activa ? (
                                                    <div className="text-xs">
                                                        {item.asignacion_activa.periodo_uso === "PERMANENTE" ? (
                                                            <span className="font-bold text-gray-600">PERMANENTE</span>
                                                        ) : (
                                                            <div className={`flex items-center gap-1 ${item.asignacion_activa.fecha_fin_uso && new Date(item.asignacion_activa.fecha_fin_uso) < new Date() ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                                                {item.asignacion_activa.fecha_fin_uso ? new Date(item.asignacion_activa.fecha_fin_uso).toLocaleDateString() : "-"}
                                                                {item.asignacion_activa.fecha_fin_uso && new Date(item.asignacion_activa.fecha_fin_uso) < new Date() && (
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">

                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Botones de acción principales */}
                                                    {item.estado === "Asignado" && (
                                                        <button
                                                            onClick={() => handleOpenDevolucion(item)}
                                                            className="p-1.5 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 transition-colors"
                                                            title="Registrar Devolución"
                                                        >
                                                            <ArrowLeftRight className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    {item.estado === "Disponible" && (
                                                        <>
                                                            <button
                                                                onClick={() => handleOpenAsignacion(item)}
                                                                className="p-1.5 rounded-md bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-colors"
                                                                title="Asignar Manualmente"
                                                            >
                                                                <UserPlus className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenBaja(item)}
                                                                className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors"
                                                                title="Solicitar Baja (Dañado/Obsoleto)"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}

                                                    {item.estado === "Mantenimiento" && (
                                                        <div className="flex gap-1">
                                                            <span className="p-1.5 rounded-md bg-amber-50 text-amber-700 text-xs flex items-center gap-1" title="Pendiente de Aprobación">
                                                                <Clock className="h-3 w-3" /> En Proceso de Baja
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Tools */}
                                                    <div className="h-4 w-px bg-gray-200 mx-1"></div>

                                                    {(item.estado === "Baja" || (item.estado === 'Mantenimiento' && item.estado_actual === 'Proceso de Baja')) ? (
                                                        <span className="p-1.5 rounded-md text-gray-300 cursor-not-allowed" title="Equipo en Baja - No editable">
                                                            <Pencil className="h-4 w-4" />
                                                        </span>
                                                    ) : (
                                                        <button onClick={() => handleEditEquipo(item)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" title="Editar">
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    <button onClick={() => handleViewHistory(item.id)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" title="Historial">
                                                        <History className="h-4 w-4" />
                                                    </button>


                                                    {item.estado === "Para Devolucion" && (
                                                        <button
                                                            onClick={() => handleRecepcionar(item)}
                                                            className="p-1.5 rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                                                            title="Recepcionar en Base"
                                                        >
                                                            <Inbox className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    {item.estado === "Para Revisión" && (
                                                        <button
                                                            onClick={() => handleOpenRevision(item)}
                                                            className="p-1.5 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                                                            title="Realizar Revisión Técnica"
                                                        >
                                                            <ClipboardCheck className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    {(item.estado === "Baja" || (item.estado === 'Mantenimiento' && item.estado_actual === 'Proceso de Baja')) ? (
                                                        <span className="p-1.5 rounded-md text-gray-300 cursor-not-allowed" title="Equipo en Baja - No editable">
                                                            <Link className="h-4 w-4" />
                                                        </span>
                                                    ) : !item.chip ? (
                                                        <button onClick={() => handleOpenLink('equipo', item)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" title="Vincular Línea">
                                                            <Link className="h-4 w-4" />
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => handleUnlink('equipo', item)} className="p-1.5 rounded-md hover:bg-red-50 text-red-500" title="Desvincular Línea">
                                                            <Unlink className="h-4 w-4" />
                                                        </button>
                                                    )}


                                                </div>
                                            </td>
                                        </tr>
                                    )) : null}

                                    {activeTab === "chips" ? (currentData as Chip[]).map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium">{item.numero_linea}</td>
                                            <td className="px-6 py-4 text-gray-600">{item.operador}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {item.plan ? (
                                                        <div className="text-xs">
                                                            <div className="font-semibold text-gray-800">{item.plan.nombre}</div>
                                                            <div className="text-gray-500 text-[10px]">{item.plan.gigas} - S/ {item.plan.costo}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs italic">Sin Plan</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.equipo ? (
                                                    <div className="flex items-center gap-1 text-gray-700 text-xs">
                                                        <Smartphone className="w-3 h-3" />
                                                        {item.equipo.marca} {item.equipo.modelo}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">Sin vincular</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4"><EstadoBadge estado={item.estado} /></td>
                                            <td className="px-6 py-4">
                                                {item.estado === "Asignado" && item.asignacion_activa ? (
                                                    <div className="text-xs">
                                                        {item.asignacion_activa.periodo_uso === "PERMANENTE" ? (
                                                            <span className="font-bold text-gray-600">PERMANENTE</span>
                                                        ) : (
                                                            <div className={`flex items-center gap-1 ${item.asignacion_activa.fecha_fin_uso && new Date(item.asignacion_activa.fecha_fin_uso) < new Date() ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                                                {item.asignacion_activa.fecha_fin_uso ? new Date(item.asignacion_activa.fecha_fin_uso).toLocaleDateString() : "-"}
                                                                {item.asignacion_activa.fecha_fin_uso && new Date(item.asignacion_activa.fecha_fin_uso) < new Date() && (
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">

                                                <div className="flex items-center justify-end gap-2">
                                                    {item.estado === "Disponible" && !item.equipo && (
                                                        <button
                                                            onClick={() => handleOpenAsignacionChip(item)}
                                                            className="p-1.5 rounded-md bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-colors"
                                                            title="Asignar Chip Directamente"
                                                        >
                                                            <UserPlus className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    {item.estado === "Asignado" && !item.equipo && (
                                                        <button
                                                            onClick={() => handleOpenDevolucionChip(item)}
                                                            className="p-1.5 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 transition-colors"
                                                            title="Registrar Devolución Chip"
                                                        >
                                                            <ArrowLeftRight className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    <button onClick={() => handleEditChip(item)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" title="Editar Chip"><Pencil className="h-4 w-4" /></button>

                                                    <button onClick={() => handleViewChipHistory(item.id)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" title="Historial">
                                                        <History className="h-4 w-4" />
                                                    </button>

                                                    {/* Botón Vincular Plan */}
                                                    <button
                                                        onClick={() => handleOpenLinkPlan(item)}
                                                        className={`p-1.5 rounded-md transition-colors ${item.plan ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'hover:bg-gray-100 text-gray-500'}`}
                                                        title={item.plan ? "Cambiar Plan" : "Vincular Plan"}
                                                    >
                                                        <Wifi className="h-4 w-4" />
                                                    </button>

                                                    {/* Botón Vincular Equipo */}
                                                    {!item.equipo ? (
                                                        <button onClick={() => handleOpenLink('chip', item)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" title="Vincular Equipo"><Link className="h-4 w-4" /></button>
                                                    ) : (
                                                        <button onClick={() => handleUnlink('chip', item)} className="p-1.5 rounded-md hover:bg-red-50 text-red-500" title="Desvincular Equipo"><Unlink className="h-4 w-4" /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : null}

                                    {activeTab === "planes" && (currentData as PlanTelefonico[]).map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${item.operador === 'CLARO' ? 'bg-red-100 text-red-800' :
                                                    item.operador === 'MOVISTAR' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-orange-100 text-orange-800'
                                                    }`}>
                                                    {item.operador}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-bold text-gray-900">{item.nombre}</div>
                                                <div className="text-xs text-gray-500">S/ {item.costo.toFixed(2)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                <div className="flex flex-col">
                                                    <span>Datos: {item.gigas}</span>
                                                    <span className="text-xs text-gray-400">Min: {item.llamadas} | SMS: {item.sms}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {item.active ? (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Activo</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold">Inactivo</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditPlan(item)}
                                                        className="p-1.5 rounded-md bg-gray-50 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePlan(item.id)}
                                                        className="p-1.5 rounded-md bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination Controls */}
                        {!loading && totalItems > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 p-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 font-medium uppercase">Filas:</span>
                                    <select
                                        className="rounded border-none text-gray-500 py-1 pl-2 pr-6 text-sm focus:ring-0 bg-transparent cursor-pointer hover:text-gray-700"
                                        value={itemsPerPage}
                                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={0}>Todos</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        title="Primera Página"
                                    >
                                        <ChevronsLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        title="Página Anterior"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>

                                    <span className="text-xs font-medium px-4 text-gray-400">
                                        {currentPage} / {totalPages}
                                    </span>

                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        title="Página Siguiente"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        title="Última Página"
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }

            {/* --- MODALS DE ACCIÓN --- */}

            {/* 1. Modal Devolución */}
            <Modal
                open={openDevolucion}
                onClose={() => setOpenDevolucion(false)}
                title="Registrar Devolución"
            >
                <form onSubmit={submitDevolucion} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Equipo: <strong>{modalActionItem?.marca} {modalActionItem?.modelo}</strong>
                        <br />
                        Responsable: {modalActionItem?.asignacion_activa?.beneficiario_nombre}
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Estado del Equipo al Retorno</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={devolucionData.estado}
                            onChange={(e) => setDevolucionData({ ...devolucionData, estado: e.target.value })}
                        >
                            <option value="Bueno">Bueno (Operativo)</option>
                            <option value="Dañado">Dañado (Pasará a Mantenimiento)</option>
                            <option value="Robado">Robado (Pasará a Mantenimiento)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                        <textarea
                            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            rows={3}
                            value={devolucionData.observaciones}
                            onChange={(e) => setDevolucionData({ ...devolucionData, observaciones: e.target.value })}
                            placeholder="Detalles sobre el estado, accesorios faltantes, etc."
                        />
                    </div>
                    {devolucionData.estado !== "Bueno" && (
                        <div className="bg-amber-50 p-3 rounded-md text-sm text-amber-800 flex gap-2">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <p>Este equipo quedará en estado <strong>Mantenimiento</strong> hasta que un administrador apruebe la baja o confirme la reparación.</p>
                        </div>
                    )}
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Confirmar Devolución
                        </button>
                    </div>
                </form>
            </Modal>

            {/* 2. Modal Asignación Directa */}
            <Modal
                open={openAsignacion}
                onClose={() => setOpenAsignacion(false)}
                title="Asignación Directa de Equipo"
            >
                <form onSubmit={submitAsignacion} className="space-y-6">
                    <p className="text-sm text-gray-600">
                        Equipo: <strong>{modalActionItem?.marca} {modalActionItem?.modelo}</strong>
                    </p>

                    {/* RESPONSABLE */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                        <h4 className="text-sm font-semibold text-blue-900 border-b border-blue-200 pb-1">Datos del Responsable</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                required
                                className={`block w-full rounded-md sm:text-sm border p-2 ${formErrors.responsable_dni_error ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                                value={responsableData.dni}
                                maxLength={8}
                                onChange={async (e) => {
                                    const val = e.target.value.replace(/\D/g, '');

                                    // Local update
                                    let newData = { ...responsableData, dni: val };

                                    // Auto-fill Logic
                                    if (val.length === 8) {
                                        const person = getPersonalState().personal.find(p => p.dni === val);
                                        if (person) {
                                            newData.nombre = person.nombre;
                                            // newData.area = person.gerenciaNombre || ""; // Removed
                                        }
                                    } else {
                                        // If DNI is incomplete/edited, clear the name (reset)
                                        newData.nombre = "";
                                    }

                                    setResponsableData(newData);

                                    // Removed validation as per user request (only validate final user)
                                }}
                                placeholder="DNI Responsable"
                            />
                            {formErrors.responsable_dni_error && <p className="text-xs text-red-600 mt-1 col-span-2">{formErrors.responsable_dni_error}</p>}
                            <div className="relative">
                                <input
                                    required
                                    className={`block w-full rounded-md border-gray-300 sm:text-sm border p-2 case-upper ${getPersonalState().personal.some(p => p.dni === responsableData.dni && responsableData.dni.length === 8) ? "bg-gray-100 cursor-not-allowed" : ""
                                        }`}
                                    value={responsableData.nombre}
                                    placeholder="Nombre Responsable"
                                    disabled={getPersonalState().personal.some(p => p.dni === responsableData.dni && responsableData.dni.length === 8)}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        setResponsableData({ ...responsableData, nombre: val });

                                        // Autocomplete
                                        if (val.length > 2) {
                                            const matches = getPersonalState().personal.filter(p => p.nombre.toUpperCase().includes(val)).slice(0, 5);
                                            setResponsableSuggestions(matches);
                                        } else {
                                            setResponsableSuggestions([]);
                                        }
                                    }}
                                    onBlur={() => setTimeout(() => setResponsableSuggestions([]), 200)}
                                />
                                {responsableSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                                        {responsableSuggestions.map((p) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 text-gray-700 transition-colors border-b border-gray-50 last:border-0"
                                                onClick={() => {
                                                    setResponsableData(prev => ({ ...prev, dni: p.dni || prev.dni, nombre: p.nombre }));
                                                    setResponsableSuggestions([]);
                                                }}
                                            >
                                                <div className="font-bold">{p.nombre}</div>
                                                <div className="text-[9px] text-gray-400">DNI: {p.dni}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <select
                                required
                                className="block w-full rounded-md border-gray-300 sm:text-sm border p-2"
                                value={responsableData.area}
                                onChange={(e) => {
                                    setResponsableData({ ...responsableData, area: e.target.value });
                                }}
                            >
                                <option value="">Seleccione Gerencia...</option>
                                {gerencias.map(g => (
                                    <option key={g.id} value={g.nombre}>{g.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* USUARIO FINAL CHECKBOX */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="sameUser"
                            checked={sameAsResponsable}
                            onChange={(e) => setSameAsResponsable(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="sameUser" className="block text-sm font-medium text-gray-900">
                            El Responsable es el mismo Usuario Final
                        </label>
                    </div>

                    {/* USUARIO FINAL (Conditional) */}
                    {!sameAsResponsable && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                            <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-1">Datos del Usuario Final</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <input

                                    className={`block w-full rounded-md sm:text-sm border p-2 ${formErrors.dni ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                                    value={asignacionData.dni}
                                    maxLength={8}
                                    onChange={async (e) => {
                                        const val = e.target.value.replace(/\D/g, '');

                                        // Local Update
                                        let newData = { ...asignacionData, dni: val };

                                        // Auto-fill Logic
                                        if (val.length === 8) {
                                            const person = getPersonalState().personal.find(p => p.dni === val);
                                            if (person) {
                                                newData.nombre = person.nombre;
                                                // newData.area = person.gerenciaNombre || ""; // Removed
                                            }
                                        } else {
                                            // If DNI is incomplete/edited, clear the name (reset)
                                            newData.nombre = "";
                                        }

                                        setAsignacionData(newData);

                                        if (val.length === 8) {
                                            const check = await telefoniaStore.checkActiveAssignment(val);
                                            if (check.exists) {
                                                setFormErrors(prev => ({ ...prev, dni: check.message || "Usuario ya tiene asignación." }));
                                            } else {
                                                setFormErrors(prev => { const n = { ...prev }; delete n.dni; return n; });
                                            }
                                        } else {
                                            if (formErrors.dni) {
                                                setFormErrors(prev => { const n = { ...prev }; delete n.dni; return n; });
                                            }
                                        }
                                    }}
                                    placeholder="DNI Usuario"
                                />
                                {formErrors.dni && <p className="text-xs text-red-600 mt-1 col-span-2">{formErrors.dni}</p>}
                                <div className="relative">
                                    <input
                                        className={`block w-full rounded-md border-gray-300 sm:text-sm border p-2 case-upper ${getPersonalState().personal.some(p => p.dni === asignacionData.dni && asignacionData.dni.length === 8) ? "bg-gray-100 cursor-not-allowed" : ""
                                            }`}
                                        value={asignacionData.nombre}
                                        placeholder="Nombre Usuario"
                                        disabled={getPersonalState().personal.some(p => p.dni === asignacionData.dni && asignacionData.dni.length === 8)}
                                        onChange={(e) => {
                                            const val = e.target.value.toUpperCase();
                                            setAsignacionData({ ...asignacionData, nombre: val });

                                            // Autocomplete
                                            if (val.length > 2) {
                                                const matches = getPersonalState().personal.filter(p => p.nombre.toUpperCase().includes(val)).slice(0, 5);
                                                setUsuarioFinalSuggestions(matches);
                                            } else {
                                                setUsuarioFinalSuggestions([]);
                                            }
                                        }}
                                        onBlur={() => setTimeout(() => setUsuarioFinalSuggestions([]), 200)}
                                    />
                                    {usuarioFinalSuggestions.length > 0 && (
                                        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                                            {usuarioFinalSuggestions.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 text-gray-700 transition-colors border-b border-gray-50 last:border-0"
                                                    onClick={() => {
                                                        setAsignacionData(prev => ({ ...prev, dni: p.dni || prev.dni, nombre: p.nombre }));
                                                        setUsuarioFinalSuggestions([]);
                                                    }}
                                                >
                                                    <div className="font-bold">{p.nombre}</div>
                                                    <div className="text-[9px] text-gray-400">DNI: {p.dni}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input

                                    className="block w-full rounded-md border-gray-300 sm:text-sm border p-2"
                                    placeholder="Ingrese el Área..."
                                    value={asignacionData.area}
                                    onChange={(e) => setAsignacionData({ ...asignacionData, area: e.target.value })}
                                />
                                <input
                                    className="block w-full rounded-md border-gray-300 sm:text-sm border p-2 bg-white disabled:bg-gray-100"
                                    disabled={!!asignacionTicketData.perfil_puesto} // Lock if Ticket Profile is set
                                    value={asignacionData.puesto}
                                    onChange={(e) => setAsignacionData({ ...asignacionData, puesto: e.target.value })}
                                    placeholder="Ingrese Puesto..."
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <label className="block text-sm font-medium text-gray-700">Sede del Usuario</label>
                                <select
                                    className="block w-full rounded-md border-gray-300 sm:text-sm border p-2"

                                    value={asignacionData.sede}
                                    onChange={(e) => setAsignacionData({ ...asignacionData, sede: e.target.value })}
                                >
                                    <option value="">Seleccione Sede...</option>
                                    <option value="BASE">BASE</option>
                                    {sedes.map(s => (
                                        <option key={s.id} value={s.nombre}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* DATOS DEL TICKET (CECO, JUSTIFICACIÓN, ETC) */}
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 space-y-3">
                        <h4 className="text-sm font-semibold text-indigo-900 border-b border-indigo-200 pb-1">Datos del Ticket / Costos</h4>

                        {/* Fundo / Planta & Cultivo */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-indigo-800 uppercase">Fundo / Planta</label>
                                <select
                                    className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                    value={asignacionTicketData.fundo_planta}
                                    onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, fundo_planta: e.target.value, cultivo: "" })}
                                >
                                    <option value="">Seleccione Fundo/Planta...</option>
                                    <option value="BASE">BASE</option>
                                    {sedes.map(sede => (
                                        <option key={sede.id} value={sede.nombre}>{sede.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-indigo-800 uppercase">Cultivo</label>
                                <select
                                    className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                    value={asignacionTicketData.cultivo}
                                    onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, cultivo: e.target.value })}
                                >
                                    <option value="">Seleccione Cultivo...</option>
                                    {(() => {
                                        const activeSede = sedes.find(s => s.nombre === asignacionTicketData.fundo_planta);
                                        const availableCultivos = activeSede?.cultivos || [];

                                        if (availableCultivos.length > 0) {
                                            return availableCultivos.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ));
                                        }
                                        return null;
                                    })()}
                                </select>
                            </div>
                        </div>

                        {/* Categoria / Descripcion */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-indigo-800 uppercase">Categoría</label>
                                <select
                                    className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                    value={asignacionTicketData.categoria}
                                    onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, categoria: e.target.value })}
                                >
                                    <option value="">Seleccione...</option>
                                    <option value="PROYECTO">PROYECTO</option>
                                    <option value="TELEFONIA">TELEFONIA</option>
                                </select>
                            </div>
                            <div>
                                {asignacionTicketData.categoria === "PROYECTO" ? (
                                    <>
                                        <label className="block text-xs font-medium text-indigo-800 uppercase">Proyecto</label>
                                        <select
                                            className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                            value={asignacionTicketData.proyecto}
                                            onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, proyecto: e.target.value })}
                                        >
                                            <option value="">Seleccione Proyecto...</option>
                                            {telefoniaStore.proyectos
                                                .filter(p => p.active)
                                                .map(p => (
                                                    <option key={p.id} value={p.nombre}>{p.nombre}</option>
                                                ))}
                                        </select>
                                    </>
                                ) : (
                                    <div className="h-full"></div> // Spacer
                                )}
                            </div>
                        </div>

                        {/* Perfil Puesto / Periodo */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-indigo-800 uppercase">Perfil de Puesto</label>
                                <select
                                    className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                    value={asignacionTicketData.perfil_puesto}
                                    onChange={(e) => {
                                        const pid = e.target.value;
                                        setAsignacionTicketData({ ...asignacionTicketData, perfil_puesto: pid });

                                        // Sync to End User Puesto
                                        const pName = telefoniaStore.puestos.find(p => p.id === pid)?.nombre || "";
                                        setAsignacionData(prev => ({ ...prev, puesto: pName }));
                                    }}
                                >
                                    <option value="">Seleccione Perfil...</option>
                                    {telefoniaStore.puestos.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-indigo-800 uppercase">Periodo</label>
                                <select
                                    className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                    value={asignacionTicketData.periodo}
                                    onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, periodo: e.target.value })}
                                >
                                    <option value="PERMANENTE">PERMANENTE</option>
                                    <option value="CAMPAÑA">CAMPAÑA</option>
                                </select>
                            </div>
                        </div>

                        {/* Fechas */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-indigo-800 uppercase">Fecha Inicio</label>
                                <input
                                    type="date"
                                    className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                    value={asignacionTicketData.fecha_inicio}
                                    onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, fecha_inicio: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-indigo-800 uppercase">Fecha Fin</label>
                                <input
                                    type="date"
                                    className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                    disabled={asignacionTicketData.periodo !== "CAMPAÑA"}
                                    value={asignacionTicketData.fecha_fin}
                                    onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, fecha_fin: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Operator / Plan - Only if Chip exists */}
                        {modalActionItem?.chip && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-indigo-800 uppercase">Operador</label>
                                    <select
                                        className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                        value={asignacionTicketData.tipo_servicio}
                                        onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, tipo_servicio: e.target.value, paquete_asignado: "" })}
                                    >
                                        <option value="">Seleccione...</option>
                                        <option value="Línea Nueva">Línea Nueva (Generico)</option>
                                        {uniquePlanOperadores.map(op => (
                                            op && <option key={op} value={op}>{op}</option>
                                        ))}
                                    </select>
                                </div>

                                {["CLARO", "ENTEL", "MOVISTAR"].includes(asignacionTicketData.tipo_servicio) && (
                                    <div>
                                        <label className="block text-xs font-medium text-indigo-800 uppercase">Plan / Paquete</label>
                                        <select
                                            className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                            value={asignacionTicketData.paquete_asignado}
                                            onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, paquete_asignado: e.target.value })}
                                        >
                                            <option value="">Seleccione Plan...</option>
                                            {telefoniaStore.planes
                                                .filter(p => p.operador === asignacionTicketData.tipo_servicio && p.active)
                                                .map(p => (
                                                    <option key={p.id} value={p.nombre}>{p.nombre} ({p.gigas})</option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-indigo-800 uppercase">CECO</label>
                                <input
                                    required
                                    maxLength={10}
                                    className={`block w-full rounded-md border p-2 mt-1 sm:text-sm outline-none transition-all ${formErrors.ceco ? "border-red-500 bg-red-50 focus:border-red-600" : "border-indigo-300"
                                        }`}
                                    value={asignacionTicketData.ceco}
                                    onChange={(e) => {
                                        setAsignacionTicketData({ ...asignacionTicketData, ceco: e.target.value.replace(/\D/g, '').slice(0, 10) });
                                        if (formErrors.ceco) setFormErrors({ ...formErrors, ceco: "" });
                                    }}
                                    onBlur={() => {
                                        if (asignacionTicketData.ceco && asignacionTicketData.ceco.length !== 10) {
                                            setFormErrors({ ...formErrors, ceco: "El CECO debe tener 10 dígitos." });
                                        }
                                    }}
                                    placeholder="Centro de Costos"
                                />
                                {formErrors.ceco && (
                                    <p className="text-[10px] text-red-600 font-bold mt-1 animate-in fade-in slide-in-from-top-1">
                                        {formErrors.ceco}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-indigo-800 uppercase">GR</label>
                            <input
                                className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                value={asignacionTicketData.gr}
                                onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, gr: e.target.value })}
                                placeholder="GR..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-indigo-800 uppercase">Justificación</label>
                            <textarea
                                required
                                rows={2}
                                className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                value={asignacionTicketData.justificacion}
                                onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, justificacion: e.target.value })}
                                placeholder="Motivo de la asignación..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Asignar y Entregar
                        </button>
                    </div>
                </form>
            </Modal>

            {/* 3. Modal Solicitud Baja */}
            <Modal
                open={openBaja}
                onClose={() => setOpenBaja(false)}
                title="Solicitar Baja de Equipo"
            >
                <form onSubmit={submitBajaSolicitud} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Equipo: <strong>{modalActionItem?.marca} {modalActionItem?.modelo}</strong> (IMEI: {modalActionItem?.imei})
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Motivo de la Baja</label>
                        <textarea
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            rows={3}
                            value={bajaData.motivo}
                            onChange={(e) => setBajaData({ ...bajaData, motivo: e.target.value })}
                            placeholder="Ej: Pantalla rota irreparable, equipo obsoleto..."
                        />
                    </div>
                    <div className="bg-red-50 p-3 rounded-md text-sm text-red-800 flex gap-2">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <p>El equipo pasará a estado <strong>Mantenimiento</strong>. Un administrador deberá aprobar la baja definitiva.</p>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium">
                            Solicitar Baja
                        </button>
                    </div>
                </form>
            </Modal>


            {/* MODAL EQUIPO (CRUD) */}
            <Modal
                open={openEquipo}
                onClose={() => setOpenEquipo(false)}
                title={draftEquipo.id ? "Editar Equipo" : "Nuevo Equipo"}
            >
                <form onSubmit={saveEquipo} className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                            Seleccionar Modelo del Catálogo
                        </label>
                        <select
                            className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            onChange={(e) => {
                                const mod = telefoniaStore.modelos.find(m => m.id === e.target.value);
                                if (mod) {
                                    setDraftEquipo({
                                        ...draftEquipo,
                                        marca: mod.marca,
                                        modelo: mod.nombre,
                                        ram: mod.ram,
                                        almacenamiento: mod.almacenamiento,
                                        pantalla: mod.pantalla
                                    });
                                }
                            }}
                            defaultValue=""
                        >
                            <option value="">-- Buscar Modelo --</option>
                            {telefoniaStore.modelos.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.marca} - {m.nombre}
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">
                            Al seleccionar un modelo, los datos técnicos se completarán automáticamente.
                        </p>
                    </div>

                    {/* [NEW] Invoice Selection */}
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Factura de Compra</label>
                            <select
                                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftEquipo.factura_id || ""}
                                onChange={(e) => {
                                    const val = e.target.value || null;
                                    const factura = telefoniaStore.facturas.find(f => f.id === val);

                                    setDraftEquipo(prev => ({
                                        ...prev,
                                        factura_id: val,
                                        // Auto-fill date if invoice selected
                                        fecha_compra: factura ? factura.fecha_compra : prev.fecha_compra
                                    }));
                                }}
                            >
                                <option value="">-- Sin Factura (Inventario Inicial) --</option>
                                {telefoniaStore.facturas.map(f => (
                                    <option key={f.id} value={f.id}>
                                        {f.numero_factura} - {f.proveedor} ({f.fecha_compra})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Marca</label>
                            <input
                                required
                                readOnly
                                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 cursor-not-allowed"
                                value={draftEquipo.marca || ""}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Modelo</label>
                            <input
                                required
                                readOnly
                                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 cursor-not-allowed"
                                value={draftEquipo.modelo || ""}
                            />
                        </div>
                    </div>

                    {/* SPECS */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 uppercase">RAM</label>
                            <input
                                readOnly
                                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 cursor-not-allowed"
                                value={draftEquipo.ram || ""}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 uppercase">Almacenamiento</label>
                            <input
                                readOnly
                                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 cursor-not-allowed"
                                value={draftEquipo.almacenamiento || ""}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 uppercase">Pantalla</label>
                            <input
                                readOnly
                                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 cursor-not-allowed"
                                value={draftEquipo.pantalla || ""}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">IMEI</label>
                        <div className="flex gap-2">
                            <input
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 font-mono"
                                value={draftEquipo.imei || ""}
                                onChange={(e) => setDraftEquipo({ ...draftEquipo, imei: e.target.value.replace(/\D/g, "") })}
                            />
                            <button
                                type="button"
                                onClick={() => { setScannerTarget('imei'); setOpenScanner(true); }}
                                className="mt-1 p-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-gray-700 transition-colors"
                                title="Escanear Código de Barras"
                            >
                                <ScanBarcode className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Color</label>
                            <select
                                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftEquipo.color || ""}
                                onChange={(e) => setDraftEquipo({ ...draftEquipo, color: e.target.value })}
                            >
                                <option value="">Seleccione...</option>
                                <option value="Negro">Negro</option>
                                <option value="Blanco">Blanco</option>
                                <option value="Gris">Gris</option>
                                <option value="Azul">Azul</option>
                                <option value="Dorado">Dorado</option>
                                <option value="Plateado">Plateado</option>
                                <option value="Rojo">Rojo</option>
                                <option value="Verde">Verde</option>
                                <option value="Otro">Otro</option>
                                <option value="Morado Estelar">Morado Estelar</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Condición Inicial</label>
                            <select
                                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftEquipo.condicion || "Nuevo"}
                                onChange={(e) => setDraftEquipo({ ...draftEquipo, condicion: e.target.value as any })}
                            >
                                <option value="Nuevo">Nuevo</option>
                                <option value="Segundo Uso">Segundo Uso</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha de Compra</label>
                        <input
                            type="date"
                            className={`mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${draftEquipo.factura_id ? "bg-gray-100 cursor-not-allowed" : ""}`}
                            value={draftEquipo.fecha_compra || ""}
                            onChange={(e) => setDraftEquipo({ ...draftEquipo, fecha_compra: e.target.value })}
                            disabled={!!draftEquipo.factura_id}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Estado</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={draftEquipo.estado}
                            onChange={(e) => setDraftEquipo({ ...draftEquipo, estado: e.target.value as any })}
                        >
                            <option value="Disponible">Disponible</option>
                            <option value="Asignado">Asignado</option>
                            <option value="Mantenimiento">Mantenimiento</option>
                            <option value="Baja">Baja</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Categoría</label>
                            <select
                                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftEquipo.categoria || "TELEFONIA"}
                                onChange={(e) => setDraftEquipo({ ...draftEquipo, categoria: e.target.value })}
                            >
                                <option value="TELEFONIA">TELEFONIA</option>
                                <option value="PROYECTO">PROYECTO</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ubicación Inicial</label>
                            <input
                                readOnly
                                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 sm:text-sm border p-2 cursor-not-allowed"
                                value={draftEquipo.ubicacion || "BASE"}
                            />
                            <p className="text-[10px] text-gray-400 mt-0.5">Siempre 'BASE' al registro inicial.</p>
                        </div>
                    </div>

                    {!draftEquipo.id && (
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    id="esimToggle"
                                    checked={includeEsim}
                                    onChange={(e) => setIncludeEsim(e.target.checked)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor="esimToggle" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                                    Incluir eSIM / Número de Línea
                                </label>
                            </div>

                            {includeEsim && (
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Número</label>
                                        <input
                                            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-white"
                                            value={esimData.numero}
                                            onChange={(e) => setEsimData({ ...esimData, numero: e.target.value.replace(/\s/g, "") })}
                                            placeholder="999..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Operador</label>
                                        <select
                                            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-white"
                                            value={esimData.operador}
                                            onChange={(e) => setEsimData({ ...esimData, operador: e.target.value })}
                                        >
                                            <option value="">Seleccione...</option>
                                            <option value="MOVISTAR">MOVISTAR</option>
                                            <option value="CLARO">CLARO</option>
                                            <option value="ENTEL">ENTEL</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL CHIP */}
            <Modal
                open={openChip}
                onClose={() => setOpenChip(false)}
                title={draftChip.id ? "Editar Chip" : "Nuevo Chip"}
            >
                <form onSubmit={saveChip} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Número de Línea</label>
                        <input
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={draftChip.numero_linea || ""}
                            onChange={(e) => setDraftChip({ ...draftChip, numero_linea: e.target.value.replace(/\s/g, "") })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Operador</label>
                        <select
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={draftChip.operador || ""}
                            onChange={(e) => setDraftChip({ ...draftChip, operador: e.target.value })}
                        >
                            <option value="">Seleccione...</option>
                            <option value="MOVISTAR">MOVISTAR</option>
                            <option value="CLARO">CLARO</option>
                            <option value="ENTEL">ENTEL</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Estado</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={draftChip.estado}
                            onChange={(e) => setDraftChip({ ...draftChip, estado: e.target.value as any })}
                        >
                            <option value="Disponible">Disponible</option>
                            <option value="Asignado">Asignado</option>
                            <option value="Baja">Baja</option>
                        </select>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>


            {/* MODAL PLAN */}
            <Modal
                open={openPlan}
                onClose={() => setOpenPlan(false)}
                title={draftPlan.id ? "Editar Plan" : "Nuevo Plan"}
            >
                <form onSubmit={savePlan} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Operador</label>
                        <select
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={draftPlan.operador}
                            onChange={(e) => setDraftPlan({ ...draftPlan, operador: e.target.value as any })}
                        >
                            <option value="CLARO">CLARO</option>
                            <option value="MOVISTAR">MOVISTAR</option>
                            <option value="ENTEL">ENTEL</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Costo (S/)</label>
                            <input
                                type="number"
                                step="0.10"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftPlan.costo}
                                onChange={(e) => setDraftPlan({ ...draftPlan, costo: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Gigas (Datos)</label>
                            <input
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftPlan.gigas}
                                onChange={(e) => setDraftPlan({ ...draftPlan, gigas: e.target.value })}
                                placeholder="Ej: 10GB o Ilimitado"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Minutos</label>
                            <input
                                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftPlan.llamadas}
                                onChange={(e) => setDraftPlan({ ...draftPlan, llamadas: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">SMS</label>
                            <input
                                className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                value={draftPlan.sms}
                                onChange={(e) => setDraftPlan({ ...draftPlan, sms: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nombre Visible (Opcional)</label>
                        <input
                            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={draftPlan.nombre || ""}
                            onChange={(e) => setDraftPlan({ ...draftPlan, nombre: e.target.value })}
                            placeholder={`Ej: Plan ${draftPlan.costo || 0}`}
                        />
                        <p className="text-xs text-gray-500 mt-1">Si se deja vacío se usará "S/ [Costo]"</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="planActive"
                            checked={draftPlan.active}
                            onChange={(e) => setDraftPlan({ ...draftPlan, active: e.target.checked })}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="planActive" className="block text-sm text-gray-900">
                            Plan Activo (Visible en solicitudes)
                        </label>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>


            {/* MODAL HISTORY */}
            <Modal
                open={showHistory}
                onClose={() => setShowHistory(false)}
                title="Historial de Equipo"
                size="xl"
            >
                <div>
                    {historyLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : historyData.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">
                            <p>Este equipo no tiene historial de asignaciones registrado.</p>
                        </div>

                    ) : (
                        <div className="overflow-hidden border border-gray-200 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsable Ticket</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario Final</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fechas</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {historyData.map((assign: any) => (
                                        <tr key={assign.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 align-top">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {assign.solicitud?.beneficiario_nombre || "N/A"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {assign.solicitud?.beneficiario_area || assign.solicitud?.beneficiario_puesto || "-"}
                                                </div>
                                                {assign.solicitud_id && (
                                                    <div className="mt-1">
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200 font-mono">
                                                            #{assign.solicitud_id.substring(0, 8)}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="text-sm font-medium text-indigo-700">
                                                    {assign.usuario_final_nombre || "Mismo Beneficiario"}
                                                </div>
                                                <div className="text-xs text-gray-500 font-bold">
                                                    {assign.usuario_final_area || "-"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {assign.usuario_final_sede || "-"}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                        <span>Entrega: {assign.fecha_entrega ? new Date(assign.fecha_entrega).toLocaleDateString() : "Pendiente"}</span>
                                                    </div>
                                                    {assign.fecha_devolucion && (
                                                        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded w-fit">
                                                            <ArrowLeftRight className="w-3.5 h-3.5" />
                                                            <span>Devolución: {new Date(assign.fecha_devolucion).toLocaleDateString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${assign.fecha_devolucion ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}`}>
                                                        {assign.fecha_devolucion ? "Devuelto" : "Activo"}
                                                    </span>
                                                    {!assign.fecha_devolucion && (
                                                        <button
                                                            onClick={() => handleEditAssignment(assign)}
                                                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 transition-colors"
                                                            title="Editar Datos de Asignación"
                                                        >
                                                            <Pencil className="w-3 h-3" /> Editar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Modal>

            {/* MODAL CHIP HISTORY */}
            <Modal
                open={showChipHistory}
                onClose={() => setShowChipHistory(false)}
                title="Historial de Chip"
                size="xl"
            >
                <div>
                    {chipHistoryLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : chipHistoryData.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">
                            <p>Este chip no tiene historial de asignaciones registrado.</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden border border-gray-200 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsable / Usuario</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalle Equipo</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fechas</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {chipHistoryData.map((assign: any) => (
                                        <tr key={assign.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 align-top">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {assign.usuario_final_nombre || assign.solicitud?.beneficiario_nombre || "N/A"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {assign.usuario_final_area || assign.solicitud?.beneficiario_area || "-"}
                                                </div>
                                                {assign.solicitud_id && (
                                                    <div className="mt-1">
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200 font-mono">
                                                            #{assign.solicitud_id.substring(0, 8)}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-col gap-1">
                                                    {assign.tipo_equipo_destino ? (
                                                        <div className="text-xs">
                                                            <div className="font-semibold text-gray-700">{assign.tipo_equipo_destino}</div>
                                                            <div className="text-gray-500 font-mono">{assign.codigo_equipo_destino || "S/N"}</div>
                                                        </div>
                                                    ) : assign.equipo ? (
                                                        <div className="text-xs">
                                                            <div className="font-semibold text-gray-700">{assign.equipo.marca} {assign.equipo.modelo}</div>
                                                            <div className="text-gray-500 font-mono">IMEI: {assign.equipo.imei}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Sin equipo vinculado</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                        <span>{assign.fecha_entrega ? new Date(assign.fecha_entrega).toLocaleDateString() : "Pendiente"}</span>
                                                    </div>
                                                    {assign.fecha_devolucion && (
                                                        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded w-fit">
                                                            <ArrowLeftRight className="w-3.5 h-3.5" />
                                                            <span>Retorno: {new Date(assign.fecha_devolucion).toLocaleDateString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${assign.fecha_devolucion ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}`}>
                                                        {assign.fecha_devolucion ? "Devuelto" : "Activo"}
                                                    </span>
                                                    {!assign.fecha_devolucion && (
                                                        <button
                                                            onClick={() => handleEditAssignment(assign)}
                                                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 transition-colors"
                                                            title="Editar Datos de Asignación"
                                                        >
                                                            <Pencil className="w-3 h-3" /> Editar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Modal>

            {/* MODAL LINKING */}
            <Modal
                open={showLinkModal}
                onClose={() => setShowLinkModal(false)}
                title={linkTarget?.type === 'equipo' ? 'Vincular Línea' : 'Vincular Equipo'}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Seleccione el {linkTarget?.type === 'equipo' ? 'chip/línea' : 'equipo'} que desea asociar.
                        Solo se muestran los ítems disponibles (sin asignar).
                    </p>

                    <div className="mb-2">
                        <input
                            type="text"
                            placeholder={linkTarget?.type === 'equipo' ? "Buscar número o operador..." : "Buscar equipo..."}
                            className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={linkSearchTerm}
                            onChange={(e) => setLinkSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        value={selectedLinkOption}
                        onChange={(e) => setSelectedLinkOption(e.target.value)}
                        size={5} // Show multiple items to make it easier to see results
                    >
                        <option value="">
                            {linkSearchTerm ? "-- Seleccione --" : "-- Escriba para buscar --"}
                        </option>
                        {linkSearchTerm && (
                            linkTarget?.type === 'equipo'
                                ? telefoniaStore.chips
                                    .filter(c => !c.equipo_id) // Only available chips
                                    .filter(c => {
                                        const term = linkSearchTerm.toLowerCase().replace(/[\s-]/g, "");
                                        const num = c.numero_linea.toLowerCase().replace(/[\s-]/g, "");
                                        const op = c.operador.toLowerCase();
                                        return num.includes(term) || op.includes(linkSearchTerm.toLowerCase());
                                    })
                                    .map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.numero_linea} - {c.operador}
                                        </option>
                                    ))
                                : telefoniaStore.equipos
                                    .filter(e => !e.chip_id) // Only available equipos
                                    .filter(e => e.estado !== 'Baja' && !(e.estado === 'Mantenimiento' && e.estado_actual === 'Proceso de Baja')) // Exclude Baja
                                    .filter(e => {
                                        const term = linkSearchTerm.toLowerCase().replace(/[\s-]/g, "");
                                        const modelo = e.modelo.toLowerCase().replace(/[\s-]/g, "");
                                        const marca = e.marca.toLowerCase().replace(/[\s-]/g, "");
                                        const imei = e.imei.toLowerCase().replace(/[\s-]/g, "");

                                        return modelo.includes(term) || marca.includes(term) || imei.includes(term);
                                    })
                                    .map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.marca} {e.modelo} (IMEI: {e.imei})
                                        </option>
                                    ))
                        )}
                    </select>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setShowLinkModal(false)}
                            className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 border border-gray-200"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveLink}
                            disabled={!selectedLinkOption || loading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Vincular'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODAL LINK PLAN */}
            <Modal
                open={openLinkPlan}
                onClose={() => setOpenLinkPlan(false)}
                title="Vincular Plan Telefónico"
            >
                <form onSubmit={submitLinkPlan} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Selecciona el plan para el chip <strong>{selectedChipLink?.numero_linea}</strong> ({selectedChipLink?.operador})
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Plan</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                        >
                            <option value="">-- Sin Plan --</option>
                            {telefoniaStore.planes
                                .filter(p => !selectedChipLink?.operador || p.operador === selectedChipLink.operador)
                                .map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nombre} (S/ {p.costo.toFixed(2)}) - {p.gigas}
                                    </option>
                                ))
                            }
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Mostrando planes de {selectedChipLink?.operador}.
                        </p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                            Guardar Vinculación
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL ASIGNACION CHIP */}
            <Modal
                open={openAsignacionChip}
                onClose={() => setOpenAsignacionChip(false)}
                title="Asignación Directa de Chip"
            >
                <form onSubmit={submitAsignacionChip} className="space-y-6">
                    <p className="text-sm text-gray-600">
                        Chip: <strong>{modalActionChip?.numero_linea}</strong> - {modalActionChip?.operador}
                    </p>

                    {/* RESPONSABLE */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                        <h4 className="text-sm font-semibold text-blue-900 border-b border-blue-200 pb-1">Datos del Responsable</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                required
                                className={`block w-full rounded-md sm:text-sm border p-2 ${formErrors.responsable_dni_error ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                                value={responsableData.dni}
                                maxLength={8}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setResponsableData({ ...responsableData, dni: val });
                                }}
                                placeholder="DNI Responsable"
                            />
                            <input
                                required
                                className="block w-full rounded-md border-gray-300 sm:text-sm border p-2"
                                value={responsableData.nombre}
                                onChange={(e) => setResponsableData({ ...responsableData, nombre: e.target.value })}
                                placeholder="Nombre Responsable"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <select
                                required
                                className="block w-full rounded-md border-gray-300 sm:text-sm border p-2"
                                value={responsableData.area}
                                onChange={(e) => {
                                    setResponsableData({ ...responsableData, area: e.target.value });
                                }}
                            >
                                <option value="">Seleccione Gerencia...</option>
                                {gerencias.map(g => (
                                    <option key={g.id} value={g.nombre}>{g.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* DATOS DEL EQUIPO DESTINO */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-1">Datos del Equipo Destino</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 uppercase">Tipo de Equipo</label>
                                <select
                                    required
                                    className="block w-full rounded-md border-gray-300 sm:text-sm border p-2 mt-1"
                                    value={deviceDataChip.tipo_equipo}
                                    onChange={(e) => setDeviceDataChip({ ...deviceDataChip, tipo_equipo: e.target.value })}
                                >
                                    <option value="Smartphone">Smartphone</option>
                                    <option value="Tablet">Tablet</option>
                                    <option value="Modem">Modem</option>
                                    <option value="Router">Router</option>
                                    <option value="Otros">Otros</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 uppercase">IMEI / Serie / Código</label>
                                <input
                                    required
                                    className="block w-full rounded-md border-gray-300 sm:text-sm border p-2 mt-1"
                                    value={deviceDataChip.codigo}
                                    onChange={(e) => setDeviceDataChip({ ...deviceDataChip, codigo: e.target.value })}
                                    placeholder="Ingrese identificador"
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-500">
                            La Sede del usuario final será la misma que la del Ticket (Fundo/Planta).
                        </p>
                    </div>

                    {/* DATOS DEL TICKET */}
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 space-y-3">
                        <h4 className="text-sm font-semibold text-indigo-900 border-b border-indigo-200 pb-1">Ubicación y Ticket</h4>

                        {/* Fundo / Planta & Cultivo */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-indigo-800 uppercase">Fundo / Planta</label>
                                <select
                                    className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                    value={asignacionTicketData.fundo_planta}
                                    onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, fundo_planta: e.target.value, cultivo: "" })}
                                >
                                    <option value="">Seleccione Fundo/Planta...</option>
                                    <option value="BASE">BASE</option>
                                    {sedes.map(sede => (
                                        <option key={sede.id} value={sede.nombre}>{sede.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-indigo-800 uppercase">Cultivo</label>
                                <select
                                    className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                    value={asignacionTicketData.cultivo}
                                    onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, cultivo: e.target.value })}
                                >
                                    <option value="">Seleccione Cultivo...</option>
                                    {(() => {
                                        const activeSede = sedes.find(s => s.nombre === asignacionTicketData.fundo_planta);
                                        const availableCultivos = activeSede?.cultivos || [];

                                        if (availableCultivos.length > 0) {
                                            return availableCultivos.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ));
                                        }
                                        return null;
                                    })()}
                                </select>
                            </div>
                        </div>

                        {/* Categoria / Descripcion */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-indigo-800 uppercase">Categoría</label>
                                <select
                                    className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                    value={asignacionTicketData.categoria}
                                    onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, categoria: e.target.value })}
                                >
                                    <option value="">Seleccione...</option>
                                    <option value="PROYECTO">PROYECTO</option>
                                    <option value="TELEFONIA">TELEFONIA</option>
                                </select>
                            </div>
                            <div>
                                {asignacionTicketData.categoria === "PROYECTO" ? (
                                    <>
                                        <label className="block text-xs font-medium text-indigo-800 uppercase">Proyecto</label>
                                        <select
                                            className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                            value={asignacionTicketData.proyecto}
                                            onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, proyecto: e.target.value })}
                                        >
                                            <option value="">Seleccione Proyecto...</option>
                                            {telefoniaStore.proyectos
                                                .filter(p => p.active)
                                                .map(p => (
                                                    <option key={p.id} value={p.nombre}>{p.nombre}</option>
                                                ))}
                                        </select>
                                    </>
                                ) : (
                                    <div className="h-full"></div> // Spacer
                                )}
                            </div>
                        </div>

                        {/* Periodo */}
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-indigo-800 uppercase">Periodo</label>
                                <select
                                    className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                    value={asignacionTicketData.periodo}
                                    onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, periodo: e.target.value })}
                                >
                                    <option value="PERMANENTE">PERMANENTE</option>
                                    <option value="CAMPAÑA">CAMPAÑA</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-indigo-800 uppercase">CECO</label>
                                <input
                                    required
                                    className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                    value={asignacionTicketData.ceco}
                                    onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, ceco: e.target.value })}
                                    placeholder="Centro de Costos"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-indigo-800 uppercase">GR</label>
                            <input
                                className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                value={asignacionTicketData.gr}
                                onChange={(e) => setAsignacionTicketData({ ...asignacionTicketData, gr: e.target.value })}
                                placeholder="GR..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Asignar Chip
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL DEVOLUCION CHIP */}
            <Modal
                open={openDevolucionChip}
                onClose={() => setOpenDevolucionChip(false)}
                title="Registrar Devolución de Chip"
            >
                <form onSubmit={submitDevolucionChip} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Chip: <strong>{modalActionChip?.numero_linea}</strong> - {modalActionChip?.operador}
                        <br />
                        <span className="text-xs">Al devolver, el chip pasará a estado <strong>Disponible</strong> y se desvinculará del usuario actual.</span>
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                        <textarea
                            className="mt-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            rows={3}
                            value={devolucionData.observaciones}
                            onChange={(e) => setDevolucionData({ ...devolucionData, observaciones: e.target.value })}
                            placeholder="Razón de la devolución..."
                        />
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
                            Confirmar Devolución
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal de Revision (Added) */}
            <Modal
                open={openRevision}
                onClose={() => setOpenRevision(false)}
                title="Revisión Técnica de Equipo"
            >
                <form onSubmit={submitRevision} className="space-y-4">
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-sm mb-4">
                        <p className="font-semibold text-purple-900">Equipo en Revisión</p>
                        <p className="text-purple-700">{modalActionItem?.marca} {modalActionItem?.modelo}</p>
                        <p className="text-xs text-purple-600 mt-1">IMEI: {modalActionItem?.imei}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Resultado de la Revisión
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRevisionData({ ...revisionData, estado: "Disponible" })}
                                className={`p-3 rounded-lg border text-sm font-medium transition-all ${revisionData.estado === "Disponible"
                                    ? "bg-green-50 border-green-200 text-green-700 ring-1 ring-green-500"
                                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                    }`}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <CheckCircle className="h-5 w-5" />
                                    <span>Equipo Bueno</span>
                                    <span className="text-[10px] text-gray-400 font-normal">Pasa a Disponibles</span>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setRevisionData({ ...revisionData, estado: "Mantenimiento" })}
                                className={`p-3 rounded-lg border text-sm font-medium transition-all ${revisionData.estado === "Mantenimiento"
                                    ? "bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-500"
                                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                    }`}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <Activity className="h-5 w-5" />
                                    <span>Requiere Reparación</span>
                                    <span className="text-[10px] text-gray-400 font-normal">Pasa a Mantenimiento</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Observaciones Técnicas (Opcional)
                        </label>
                        <textarea
                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            rows={3}
                            placeholder="Detalle el estado del equipo, fallas encontradas o reparaciones necesarias..."
                            value={revisionData.obs}
                            onChange={(e) => setRevisionData({ ...revisionData, obs: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setOpenRevision(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Finalizar Revisión
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL EDIT ASSIGNMENT */}
            <Modal
                open={openEditAssign}
                onClose={() => setOpenEditAssign(false)}
                title="Editar Asignación / Ticket"
                size="lg" // Wider modal
            >
                {/* Re-using logic similar to AsignacionDirecta but bound to editAssignData */}
                {editAssignData && (
                    <form onSubmit={submitEditAssignment} className="space-y-6">
                        <div className="bg-amber-50 p-3 rounded-md border border-amber-200 text-xs text-amber-800 mb-4">
                            <p><strong>Atención:</strong> Estás editando una asignación activa. Los cambios se reflejarán en el historial y en los reportes actuales. Asegúrate de verificar los datos.</p>
                        </div>

                        {/* RESPONSABLE */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                            <h4 className="text-sm font-semibold text-blue-900 border-b border-blue-200 pb-1">Datos del Responsable (Beneficiario del Ticket)</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase">DNI</label>
                                    <input
                                        required
                                        className="block w-full rounded-md sm:text-sm border p-2 mt-1 border-gray-300"
                                        value={editAssignData.formData.beneficiario.dni}
                                        maxLength={8}
                                        onChange={(e) => {
                                            // Handle DNI change & autofill
                                            const val = e.target.value.replace(/\D/g, '');
                                            const newData = { ...editAssignData };
                                            newData.formData.beneficiario.dni = val;
                                            if (val.length === 8) {
                                                const person = getPersonalState().personal.find(p => p.dni === val);
                                                if (person) {
                                                    newData.formData.beneficiario.nombre = person.nombre;
                                                }
                                            }
                                            setEditAssignData(newData);
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase">Nombre</label>
                                    <input
                                        required
                                        className="block w-full rounded-md border-gray-300 sm:text-sm border p-2 mt-1"
                                        value={editAssignData.formData.beneficiario.nombre}
                                        onChange={(e) => {
                                            const newData = { ...editAssignData };
                                            newData.formData.beneficiario.nombre = e.target.value.toUpperCase();
                                            setEditAssignData(newData);
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase">Área / Gerencia</label>
                                    <select
                                        required
                                        className="block w-full rounded-md border-gray-300 sm:text-sm border p-2 mt-1"
                                        value={editAssignData.formData.beneficiario.area}
                                        onChange={(e) => {
                                            const newData = { ...editAssignData };
                                            newData.formData.beneficiario.area = e.target.value;
                                            setEditAssignData(newData);
                                        }}
                                    >
                                        <option value="">Seleccione...</option>
                                        {gerencias.map(g => (
                                            <option key={g.id} value={g.nombre}>{g.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* DATOS DEL EQUIPO DESTINO (SOLO CHIPS) */}
                        {editAssignData.isChipAssignment && (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                                <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-1">Datos del Equipo Destino</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 uppercase">Tipo de Equipo</label>
                                        <select
                                            required
                                            className="block w-full rounded-md border-gray-300 sm:text-sm border p-2 mt-1"
                                            value={editAssignData.formData.dispositivo.tipo_equipo}
                                            onChange={(e) => {
                                                const newData = { ...editAssignData };
                                                newData.formData.dispositivo.tipo_equipo = e.target.value;
                                                setEditAssignData(newData);
                                            }}
                                        >
                                            <option value="Smartphone">Smartphone</option>
                                            <option value="Tablet">Tablet</option>
                                            <option value="Modem">Modem</option>
                                            <option value="Router">Router</option>
                                            <option value="Otros">Otros</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 uppercase">IMEI / Serie / Código</label>
                                        <input
                                            required
                                            className="block w-full rounded-md border-gray-300 sm:text-sm border p-2 mt-1"
                                            value={editAssignData.formData.dispositivo.codigo}
                                            onChange={(e) => {
                                                const newData = { ...editAssignData };
                                                newData.formData.dispositivo.codigo = e.target.value;
                                                setEditAssignData(newData);
                                            }}
                                            placeholder="Ingrese identificador"
                                        />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <label className="block text-xs font-medium text-gray-700 uppercase">Plan de Datos</label>
                                    <select
                                        className="block w-full rounded-md border-gray-300 sm:text-sm border p-2 mt-1"
                                        value={editAssignData.formData.plan_id || ""}
                                        onChange={(e) => {
                                            const newData = { ...editAssignData };
                                            newData.formData.plan_id = e.target.value;
                                            setEditAssignData(newData);
                                        }}
                                    >
                                        <option value="">-- Sin Plan --</option>
                                        {telefoniaStore.planes.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.nombre} ({p.operador}) - {p.gigas}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* USUARIO FINAL */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                            <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-1">Datos del Usuario Final</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase">DNI</label>
                                    <input
                                        className="block w-full rounded-md sm:text-sm border p-2 mt-1 border-gray-300"
                                        value={editAssignData.formData.usuario_final.dni}
                                        maxLength={8}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            const newData = { ...editAssignData };
                                            newData.formData.usuario_final.dni = val;
                                            if (val.length === 8) {
                                                const person = getPersonalState().personal.find(p => p.dni === val);
                                                if (person) {
                                                    newData.formData.usuario_final.nombre = person.nombre;
                                                }
                                            }
                                            setEditAssignData(newData);
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase">Nombre</label>
                                    <input
                                        className="block w-full rounded-md border-gray-300 sm:text-sm border p-2 mt-1"
                                        value={editAssignData.formData.usuario_final.nombre}
                                        onChange={(e) => {
                                            const newData = { ...editAssignData };
                                            newData.formData.usuario_final.nombre = e.target.value.toUpperCase();
                                            setEditAssignData(newData);
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase">Área</label>
                                    <input
                                        className="block w-full rounded-md border-gray-300 sm:text-sm border p-2 mt-1"
                                        value={editAssignData.formData.usuario_final.area}
                                        onChange={(e) => {
                                            const newData = { ...editAssignData };
                                            newData.formData.usuario_final.area = e.target.value;
                                            setEditAssignData(newData);
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase">Puesto</label>
                                    <input
                                        className="block w-full rounded-md border-gray-300 sm:text-sm border p-2 mt-1"
                                        value={editAssignData.formData.usuario_final.puesto}
                                        onChange={(e) => {
                                            const newData = { ...editAssignData };
                                            newData.formData.usuario_final.puesto = e.target.value;
                                            setEditAssignData(newData);
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 uppercase">Sede</label>
                                <select
                                    className="block w-full rounded-md border-gray-300 sm:text-sm border p-2 mt-1"
                                    value={editAssignData.formData.usuario_final.sede}
                                    onChange={(e) => {
                                        const newData = { ...editAssignData };
                                        newData.formData.usuario_final.sede = e.target.value;
                                        setEditAssignData(newData);
                                    }}
                                >
                                    <option value="">Seleccione Sede...</option>
                                    <option value="BASE">BASE</option>
                                    {sedes.map(s => (
                                        <option key={s.id} value={s.nombre}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* TICKET DETAILS */}
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 space-y-3">
                            <h4 className="text-sm font-semibold text-indigo-900 border-b border-indigo-200 pb-1">Datos del Ticket / Costos</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-indigo-800 uppercase">Fundo / Planta</label>
                                    <select
                                        className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                        value={editAssignData.formData.ticket.fundo_planta}
                                        onChange={(e) => {
                                            const newData = { ...editAssignData };
                                            newData.formData.ticket.fundo_planta = e.target.value;
                                            newData.formData.ticket.cultivo = ""; // Reset
                                            setEditAssignData(newData);
                                        }}
                                    >
                                        <option value="">Seleccione Fundo/Planta...</option>
                                        <option value="BASE">BASE</option>
                                        {sedes.map(sede => (
                                            <option key={sede.id} value={sede.nombre}>{sede.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-indigo-800 uppercase">Cultivo</label>
                                    <select
                                        className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                        value={editAssignData.formData.ticket.cultivo}
                                        onChange={(e) => {
                                            const newData = { ...editAssignData };
                                            newData.formData.ticket.cultivo = e.target.value;
                                            setEditAssignData(newData);
                                        }}
                                    >
                                        <option value="">Seleccione Cultivo...</option>
                                        {(() => {
                                            const activeSede = sedes.find(s => s.nombre === editAssignData.formData.ticket.fundo_planta);
                                            const availableCultivos = activeSede?.cultivos || [];
                                            if (availableCultivos.length > 0) {
                                                return availableCultivos.map(c => <option key={c} value={c}>{c}</option>);
                                            }
                                            return null;
                                        })()}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-indigo-800 uppercase">Categoría</label>
                                    <select
                                        className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                        value={editAssignData.formData.ticket.categoria}
                                        onChange={(e) => {
                                            const newData = { ...editAssignData };
                                            newData.formData.ticket.categoria = e.target.value;
                                            setEditAssignData(newData);
                                        }}
                                    >
                                        <option value="TELEFONIA">TELEFONIA</option>
                                        <option value="PROYECTO">PROYECTO</option>
                                    </select>
                                </div>
                                <div>
                                    {editAssignData.formData.ticket.categoria === "PROYECTO" && (
                                        <>
                                            <label className="block text-xs font-medium text-indigo-800 uppercase">Proyecto</label>
                                            <select
                                                className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                                value={editAssignData.formData.ticket.proyecto}
                                                onChange={(e) => {
                                                    const newData = { ...editAssignData };
                                                    newData.formData.ticket.proyecto = e.target.value;
                                                    setEditAssignData(newData);
                                                }}
                                            >
                                                <option value="">Seleccione Proyecto...</option>
                                                {telefoniaStore.proyectos.filter(p => p.active).map(p => (
                                                    <option key={p.id} value={p.nombre}>{p.nombre}</option>
                                                ))}
                                            </select>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* PERIODO & FECHAS */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-indigo-800 uppercase">Periodo</label>
                                    <select
                                        className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                        value={editAssignData.formData.ticket.periodo}
                                        onChange={(e) => {
                                            const newData = { ...editAssignData };
                                            newData.formData.ticket.periodo = e.target.value;
                                            setEditAssignData(newData);
                                        }}
                                    >
                                        <option value="PERMANENTE">PERMANENTE</option>
                                        <option value="CAMPAÑA">CAMPAÑA</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-indigo-800 uppercase">Inicio</label>
                                        <input
                                            type="date"
                                            className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                            value={editAssignData.formData.ticket.fecha_inicio}
                                            onChange={(e) => {
                                                const newData = { ...editAssignData };
                                                newData.formData.ticket.fecha_inicio = e.target.value;
                                                setEditAssignData(newData);
                                            }}
                                        />
                                    </div>
                                    <div>
                                        {editAssignData.formData.ticket.periodo === "CAMPAÑA" && (
                                            <>
                                                <label className="block text-xs font-medium text-indigo-800 uppercase">Fin</label>
                                                <input
                                                    type="date"
                                                    required={editAssignData.formData.ticket.periodo === "CAMPAÑA"}
                                                    className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                                    value={editAssignData.formData.ticket.fecha_fin}
                                                    onChange={(e) => {
                                                        const newData = { ...editAssignData };
                                                        newData.formData.ticket.fecha_fin = e.target.value;
                                                        setEditAssignData(newData);
                                                    }}
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-indigo-800 uppercase">CECO</label>
                                    <input
                                        required
                                        className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                        value={editAssignData.formData.ticket.ceco}
                                        maxLength={10}
                                        onChange={(e) => {
                                            const newData = { ...editAssignData };
                                            newData.formData.ticket.ceco = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            setEditAssignData(newData);
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-indigo-800 uppercase">GR</label>
                                    <input
                                        className="block w-full rounded-md border-indigo-300 sm:text-sm border p-2 mt-1"
                                        value={editAssignData.formData.ticket.gr}
                                        onChange={(e) => {
                                            const newData = { ...editAssignData };
                                            newData.formData.ticket.gr = e.target.value;
                                            setEditAssignData(newData);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setOpenEditAssign(false)}
                                className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Guardar Cambios
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            <ConfirmationModal
                open={confirmation.open}
                onClose={closeConfirmation}
                onConfirm={confirmation.onConfirm}
                title={confirmation.title}
                variant={confirmation.variant}
                loading={confirmation.loading}
            >
                {confirmation.message}
            </ConfirmationModal>

            {/* SCANNER MODAL */}
            {openScanner && (
                <BarcodeScanner
                    onScan={handleScan}
                    onClose={() => setOpenScanner(false)}
                />
            )}
        </div >
    );
}
