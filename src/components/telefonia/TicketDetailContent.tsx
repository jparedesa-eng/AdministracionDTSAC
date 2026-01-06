import React from "react";
import {
    Calendar,
    User,
    Smartphone,
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    MapPin,
    Briefcase,
    Hash
} from "lucide-react";
import type { Solicitud } from "../../store/telefoniaStore";

interface TicketDetailContentProps {
    ticket: Solicitud;
}

export const TicketDetailContent: React.FC<TicketDetailContentProps> = ({ ticket }) => {

    // Helper para badge de estado general
    const StatusBadge = ({ estado }: { estado: string }) => {
        let color = "bg-gray-100 text-gray-800 border-gray-200";
        if (estado === "Entregado") color = "bg-emerald-100 text-emerald-800 border-emerald-200";
        else if (estado === "Rechazada") color = "bg-red-100 text-red-800 border-red-200";
        else if (estado === "Programar Entrega") color = "bg-indigo-100 text-indigo-800 border-indigo-200";
        else if (estado?.includes("Pendiente")) color = "bg-amber-100 text-amber-800 border-amber-200";

        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${color}`}>
                {estado}
            </span>
        );
    };

    // Helper para status de aprobación individual
    const ApprovalStatus = ({ title, approved, date }: { title: string, approved: boolean, date?: string | null }) => {
        // Lógica: Si está aprobado = Verde. Si no, y el ticket está rechazado o cancelado = Rojo/Gris?
        // Si no está aprobado, asumimos Pendiente (Ambar) salvo que el ticket global esté rechazado/cancelado.

        // Simplificamos: Boolean approved -> Verde. False -> Ambar (Pendiente).
        // (Podríamos refinar si tuviéramos estado "Rechazado por Gerencia" específico, pero usamos flags booleanos).

        const isPending = !approved;

        return (
            <div className={`flex items-center justify-between p-3 rounded-lg border ${isPending ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isPending ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                        {isPending ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">{title}</p>
                        <p className="text-xs text-gray-500">
                            {isPending ? "Pendiente de revisión" : `Aprobado el ${date ? new Date(date).toLocaleDateString() : '-'}`}
                        </p>
                    </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold ${isPending ? 'text-amber-700 bg-amber-100/50' : 'text-green-700 bg-green-100/50'}`}>
                    {isPending ? "PENDIENTE" : "APROBADO"}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* HEADER: User Info & Global Status */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 text-lg">
                        {ticket.beneficiario_nombre?.charAt(0) || "U"}
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900">{ticket.beneficiario_nombre}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Briefcase className="w-3 h-3" />
                            <span>{ticket.beneficiario_puesto || "Puesto no especificado"}</span>
                            <span className="text-gray-300">|</span>
                            <span>{ticket.beneficiario_area}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <Hash className="w-3 h-3" /> DNI: {ticket.beneficiario_dni}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <StatusBadge estado={ticket.estado} />
                    <span className="text-[10px] text-gray-400">ID: {ticket.id.slice(0, 8)}</span>
                </div>
            </div>

            {/* ERROR DISPLAY: If rejected */}
            {ticket.estado === "Rechazada" && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-red-800">Solicitud Rechazada</h4>
                        <p className="text-xs text-red-600 mt-0.5">Esta solicitud ha sido rechazada y no procederá.</p>
                    </div>
                </div>
            )}

            {/* APPROVAL STATUS SECTION (Requested explicitly) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ApprovalStatus
                    title="Aprobación Gerencia"
                    approved={ticket.aprobacion_gerencia}
                    date={ticket.fecha_aprobacion_gerencia}
                />
                <ApprovalStatus
                    title="Aprobación Administración"
                    approved={ticket.aprobacion_admin}
                    date={ticket.fecha_aprobacion_admin}
                />
            </div>

            {/* INFO GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <div className="space-y-3">
                    <div>
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">Tipo de Servicio</span>
                        <div className="font-semibold text-gray-800 flex items-center gap-2">
                            {ticket.tipo_servicio}
                        </div>
                    </div>
                    <div>
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">Periodo & Fechas</span>
                        <div className="font-medium text-gray-700 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {ticket.periodo_uso}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 pl-5">
                            {ticket.fecha_inicio_uso} {ticket.fecha_fin_uso ? ` → ${ticket.fecha_fin_uso}` : '(Indefinido)'}
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div>
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">Ubicación</span>
                        <div className="font-medium text-gray-700 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {ticket.fundo_planta || "No especificado"}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 pl-5">
                            Cultivo: {ticket.cultivo || "-"}
                        </div>
                    </div>

                    {ticket.beneficiario_n_linea_ref && ticket.beneficiario_n_linea_ref !== "Línea Nueva" && (
                        <div>
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">Referencia</span>
                            <div className="bg-white border border-gray-200 px-2 py-1 rounded text-xs font-mono text-gray-600 inline-block">
                                {ticket.beneficiario_n_linea_ref}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* JUSTIFICATION */}
            <div>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Justificación del Requerimiento
                </span>
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 border border-gray-100 italic">
                    {ticket.justificacion || "Sin justificación detallada."}
                </div>
            </div>

            {/* APPS & MODEL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* APPS */}
                <div>
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-2 flex items-center gap-1">
                        <Smartphone className="w-3 h-3" /> Aplicativos Solicitados
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {ticket.aplicativos && ticket.aplicativos.length > 0 ? (
                            ticket.aplicativos.map(app => (
                                <span key={app} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium border border-blue-100">
                                    {app}
                                </span>
                            ))
                        ) : (
                            <span className="text-gray-400 text-xs italic">Ningún aplicativo extra solicitado.</span>
                        )}
                    </div>
                </div>

                {/* MODELO */}
                <div>
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-2">
                        Modelo Sugerido / Asignado
                    </span>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                        <p className="text-sm font-bold text-emerald-800">
                            {ticket.alternativa_modelo || ticket.equipo?.modelo || "Estándar"}
                        </p>
                        <p className="text-[10px] text-emerald-600 mt-0.5">
                            Sujeto a disponibilidad de stock TI
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
