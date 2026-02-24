import React, { useEffect, useState } from "react";
import { User, Save, Loader2, Smartphone } from "lucide-react";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { Asignacion, Solicitud } from "../../store/telefoniaStore";
import { Toast } from "../ui/Toast";
import type { ToastState } from "../ui/Toast";
import { Modal } from "../ui/Modal";

interface RedistributionModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: Solicitud;
}

export const RedistributionModal: React.FC<RedistributionModalProps> = ({ isOpen, onClose, ticket }) => {
    const [loading, setLoading] = useState(false);
    const [assignments, setAssignments] = useState<Asignacion[]>([]);
    const [toast, setToast] = useState<ToastState>(null);
    const [saving, setSaving] = useState(false);

    // Load assignments when modal opens
    useEffect(() => {
        if (isOpen && ticket) {
            loadAssignments();
        }
    }, [isOpen, ticket]);

    const loadAssignments = async () => {
        setLoading(true);
        try {
            const data = await telefoniaStore.fetchAsignaciones(ticket.id);
            setAssignments(data);
        } catch (error) {
            console.error(error);
            setToast({ type: "error", message: "Error al cargar equipos asignados" });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateResponsible = async (asignacionId: string, dni: string, nombre: string, area: string) => {
        setSaving(true);
        try {
            await telefoniaStore.updateAsignacionResponsable(asignacionId, { dni, nombre, area });
            setToast({ type: "success", message: "Responsable actualizado correctamente" });
            // Update local state
            setAssignments(prev => prev.map(a =>
                a.id === asignacionId
                    ? { ...a, usuario_final_dni: dni, usuario_final_nombre: nombre, usuario_final_area: area }
                    : a
            ));
        } catch (error) {
            setToast({ type: "error", message: "Error al actualizar responsable" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title={`Distribución de Equipos - Ticket #${ticket.id.slice(0, 8)}`}
            size="lg"
            footer={
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-white text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    Cerrar
                </button>
            }
        >
            <div className="space-y-4">
                {/* Description Header */}
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                    <User className="w-4 h-4 text-indigo-500" />
                    <span>Asigna un responsable final para cada equipo entregado en este ticket.</span>
                </div>

                {toast && <div className="mb-4"><Toast toast={toast} onClose={() => setToast(null)} /></div>}

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                        No se encontraron equipos asignados a este ticket.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {assignments.map((assignment) => (
                            <AssignmentCard
                                key={assignment.id}
                                assignment={assignment}
                                onSave={handleUpdateResponsible}
                                saving={saving}
                            />
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

// Sub-component for individual card logic
const AssignmentCard = ({
    assignment,
    onSave,
    saving
}: {
    assignment: Asignacion;
    onSave: (id: string, dni: string, nombre: string, area: string) => Promise<void>;
    saving: boolean;
}) => {
    // Local state for editing form
    const [dni, setDni] = useState(assignment.usuario_final_dni || "");
    const [nombre, setNombre] = useState(assignment.usuario_final_nombre || "");
    const [area, setArea] = useState(assignment.usuario_final_area || "");
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setIsDirty(
            dni !== (assignment.usuario_final_dni || "") ||
            nombre !== (assignment.usuario_final_nombre || "") ||
            area !== (assignment.usuario_final_area || "")
        );
    }, [dni, nombre, area, assignment]);

    const handleSubmit = async () => {
        if (!dni || !nombre) return;
        await onSave(assignment.id, dni, nombre, area);
        setIsDirty(false);
    };

    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${!assignment.equipo_id && assignment.chip_id ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">
                            {!assignment.equipo_id && assignment.chip_id
                                ? `Chip: ${assignment.chip?.numero_linea || 'Sin número'}`
                                : `${assignment.equipo?.marca} ${assignment.equipo?.modelo}`}
                        </h4>
                        <p className="text-xs text-gray-500 font-mono">
                            {!assignment.equipo_id && assignment.chip_id
                                ? `Operador: ${assignment.chip?.operador || 'S/N'}`
                                : `IMEI: ${assignment.equipo?.imei}`}
                        </p>
                    </div>
                </div>
                <div className="flex text-xs gap-2">
                    <span className={`px-2 py-1 rounded-full border ${assignment.estado === 'Entregado' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-600'}`}>
                        {assignment.estado}
                    </span>
                </div>
            </div>

            {(!assignment.equipo_id && assignment.chip_id) ? (
                <div className="w-full bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <p className="text-xs text-orange-800 font-medium">Asignación de solo chip. No requiere usuario final específico.</p>
                </div>
            ) : (

                <div className="w-full bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Responsable Final (Usuario)</label>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-3">
                            <input
                                type="text"
                                placeholder="DNI"
                                value={dni}
                                maxLength={8}
                                onChange={(e) => setDni(e.target.value)}
                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                            />
                        </div>
                        <div className="md:col-span-4">
                            <input
                                type="text"
                                placeholder="Nombre Completo"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <input
                                type="text"
                                placeholder="Área"
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <button
                                onClick={handleSubmit}
                                disabled={!isDirty || saving || !dni || !nombre}
                                className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Guardar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
