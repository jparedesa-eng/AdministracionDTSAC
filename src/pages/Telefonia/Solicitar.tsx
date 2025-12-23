import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../auth/AuthContext";
import { telefoniaStore } from "../../store/telefoniaStore";

import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import {
    Loader2,
    CheckCircle2,
    LayoutGrid,
    Search,
    User,
    Smartphone,
    FileText,
    History,
    ChevronRight,
    Plus,
    Calendar,
    MapPin
} from "lucide-react";
import { supabase } from "../../supabase/supabaseClient";

// Pasos del Wizard
const STEPS = [
    { id: 1, label: "Beneficiario", icon: User },
    { id: 2, label: "Servicio", icon: Smartphone },
    { id: 3, label: "Justificación", icon: FileText },
];

export default function SolicitarTelefonia() {
    const { user } = useAuth();

    // Hooks
    const [toast, setToast] = useState<ToastState>(null);
    const [submitting, setSubmitting] = useState(false);
    const [searchingDni, setSearchingDni] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Modal controls
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        dni: "",
        nombre: "",
        area: "",
        puesto: "",
        n_linea: "",
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

    const AVAILABLE_APPS = [
        "WhatsApp",
        "Correo Corporativo",
        "Teams",
        "NISIRA",
        "AgroMaps",
        "Checklist App",
        "Google Maps",
        "Waze",
    ];

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

    // Filtrar mis tickets
    const myTickets = useMemo(() => {
        if (!user?.id) return [];
        return telefoniaStore.solicitudes.filter(s => s.created_by === user.id);
    }, [user?.id, telefoniaStore.solicitudes]); // Re-added dependency to ensure updates


    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
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
                justificacion: formData.justificacion,
                aplicativos: selectedApps,
                estado: "Pendiente IT",
                created_by: user?.id,
            });

            setToast({ type: "success", message: "Solicitud creada correctamente" });
            // Reset form
            setFormData({
                dni: "", nombre: "", area: "", puesto: "", n_linea: "",
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
    const StepIndicator = () => (
        <div className="flex border-b mb-8">
            {STEPS.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                return (
                    <div
                        key={step.id}
                        className={`flex-1 flex flex-col items-center p-3 border-b-2 transition-colors ${isActive ? "border-indigo-600 text-indigo-600" :
                            isCompleted ? "border-green-500 text-green-600" : "border-transparent text-gray-400"
                            }`}
                    >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full mb-1 ${isActive ? "bg-indigo-100" : isCompleted ? "bg-green-100" : "bg-gray-100"
                            }`}>
                            <step.icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs md:text-sm font-medium">{step.label}</span>
                    </div>
                );
            })}
        </div>
    );

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">DNI (Trabajador)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        maxLength={8}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                        value={formData.dni}
                                        onChange={(e) => handleChange("dni", e.target.value)}
                                        placeholder="Ingrese DOI/DNI"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSearchDni}
                                        disabled={searchingDni}
                                        className="mt-1 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        {searchingDni ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Nombre del Trabajador</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-gray-50"
                                    value={formData.nombre}
                                    onChange={(e) => handleChange("nombre", e.target.value)}
                                // readOnly // Let users edit if they want, or keep readOnly if strictly from DNI
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Área / Gerencia</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-gray-50"
                                    value={formData.area}
                                    onChange={(e) => handleChange("area", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Puesto</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-gray-50"
                                    value={formData.puesto}
                                    onChange={(e) => handleChange("puesto", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">N° Línea (Referencia)</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    placeholder="Opcional"
                                    value={formData.n_linea}
                                    onChange={(e) => handleChange("n_linea", e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo de Servicio</label>
                                <select
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    value={formData.tipo_servicio}
                                    onChange={(e) => handleChange("tipo_servicio", e.target.value)}
                                >
                                    <option value="PAQUETE ASIGNADO">PAQUETE ASIGNADO</option>
                                    <option value="SOLO CHIP">SOLO CHIP</option>
                                    <option value="REPOSICIÓN">REPOSICIÓN DE EQUIPO</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Periodo de Uso</label>
                                <select
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    value={formData.periodo_uso}
                                    onChange={(e) => handleChange("periodo_uso", e.target.value)}
                                >
                                    <option value="PERMANENTE">PERMANENTE</option>
                                    <option value="CAMPAÑA">CAMPAÑA</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
                                <input
                                    type="date"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    value={formData.fecha_inicio}
                                    onChange={(e) => handleChange("fecha_inicio", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fecha Término</label>
                                <input
                                    type="date"
                                    disabled={formData.periodo_uso !== "CAMPAÑA"}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 disabled:bg-gray-100"
                                    value={formData.fecha_fin}
                                    onChange={(e) => handleChange("fecha_fin", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fundo / Planta</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    value={formData.fundo_planta}
                                    onChange={(e) => handleChange("fundo_planta", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cultivo</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    value={formData.cultivo}
                                    onChange={(e) => handleChange("cultivo", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                                <input
                                    type="number"
                                    min={1}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    value={formData.cantidad_lineas}
                                    onChange={(e) => handleChange("cantidad_lineas", e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Justificación</label>
                            <textarea
                                rows={3}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                placeholder="Motivo de la solicitud..."
                                value={formData.justificacion}
                                onChange={(e) => handleChange("justificacion", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccione los Aplicativos Requeridos</label>
                            <p className="text-xs text-gray-500 mb-3">Marque los aplicativos que necesita tener instalados o configurados.</p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {AVAILABLE_APPS.map((app) => {
                                    const isSelected = selectedApps.includes(app);
                                    return (
                                        <div
                                            key={app}
                                            onClick={() => toggleApp(app)}
                                            className={`relative cursor-pointer rounded-lg border p-3 flex flex-col items-center justify-center text-center gap-2 transition-all ${isSelected
                                                ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500"
                                                : "border-gray-200 hover:bg-gray-50 text-gray-600"
                                                }`}
                                        >
                                            <LayoutGrid className={`h-6 w-6 ${isSelected ? "text-indigo-600" : "text-gray-400"}`} />
                                            <span className="text-xs font-medium">{app}</span>
                                            {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-600 absolute top-2 right-2" />}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            {/* Header + Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Solicitud de Telefonía</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Gestione sus requerimientos de equipos y líneas.
                    </p>
                </div>
                {!isWizardOpen && (
                    <button
                        onClick={() => {
                            setIsWizardOpen(true);
                            setCurrentStep(1);
                        }}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Ticket
                    </button>
                )}
            </div>

            {isWizardOpen && (
                // WIZARD FORM VIEW
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="mb-8 border-b pb-4">
                        <h2 className="text-xl font-bold text-gray-900">Nueva Solicitud</h2>
                        <p className="text-gray-500 text-sm mt-1">
                            Complete los pasos para registrar un requerimiento.
                        </p>
                    </div>

                    <StepIndicator />

                    <form onSubmit={handleSubmit} className="mt-6">
                        <div className="min-h-[320px]">
                            {renderStepContent()}
                        </div>

                        <div className="flex justify-between pt-6 border-t mt-8">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsWizardOpen(false);
                                        setCurrentStep(1);
                                    }}
                                    className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
                                >
                                    Cancelar
                                </button>

                                {currentStep > 1 && (
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
                                    >
                                        Atrás
                                    </button>
                                )}
                            </div>

                            {currentStep < 3 ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium inline-flex items-center gap-2 transition-colors"
                                >
                                    Siguiente <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50 transition-colors"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Finalizar Solicitud
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* List of Requests */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                    <History className="h-5 w-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Mis Solicitudes</h2>
                </div>

                {historyLoading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    </div>
                ) : myTickets.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                            <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No tienes solicitudes</h3>
                        <p className="text-gray-500 mt-1 max-w-sm mx-auto">
                            Aún no has registrado solicitudes de telefonía. Presiona "Nuevo Ticket" para comenzar.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiario</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicio</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lugar/Cultivo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {myTickets.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {new Date(t.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{t.beneficiario_nombre}</div>
                                            <div className="text-xs text-gray-500">{t.beneficiario_puesto}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{t.tipo_servicio}</div>
                                            <div className="text-xs text-gray-500">{t.cantidad_lineas} Línea(s) - {t.periodo_uso}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-gray-400" />
                                                {t.fundo_planta}
                                            </div>
                                            <div className="text-xs text-gray-400 ml-4">{t.cultivo}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.estado === 'Entregado' ? 'bg-green-100 text-green-800' :
                                                t.estado === 'Rechazada' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {t.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
