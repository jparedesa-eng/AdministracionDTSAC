import React from "react";
import {
    Calendar,
    Smartphone,
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    MapPin,
    Briefcase,
    Blocks,
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
    const ApprovalStatus = ({ title, approved, date }: { title: string, approved?: boolean | null, date?: string | null }) => {
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
                            <span className="text-gray-300">|</span>
                            <span>{ticket.beneficiario_area} </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            DNI: {ticket.beneficiario_dni}
                            <span className="text-grau-600">| RESPONSABLE DE LA SOLICITUD</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    {/* REQUEST TYPE BADGE */}
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border  
                        ${ticket.tipo_solicitud === "Reposición" ? "bg-orange-100 text-orange-800 border-orange-200" :
                            ticket.tipo_solicitud === "Renovación" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                                "bg-blue-100 text-blue-800 border-blue-200"
                        }`}>
                        {ticket.tipo_solicitud || "Línea Nueva"}
                    </span>

                    <div className="flex items-center gap-2 mt-1">
                        <StatusBadge estado={ticket.estado} />
                    </div>
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
                    title="Aprobación Usuario"
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
                        <div className="font-semibold text-gray-800 flex flex-col gap-0.5 mt-0.5">
                            <span>{ticket.tipo_servicio}</span>
                            {ticket.paquete_asignado && (
                                <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 w-fit">
                                    {ticket.paquete_asignado}
                                </span>
                            )}
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

                    {/* REPLACED: Contexto de Cantidad */}
                    <div>
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">Cantidad</span>
                        <div className="font-medium text-gray-700 flex items-center gap-1">
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-bold border border-gray-200">
                                {ticket.cantidad_lineas || 1} Línea(s)
                            </span>
                        </div>
                    </div>
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
                        <Blocks className="w-3 h-3" /> Aplicativos Solicitados
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
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-2 flex items-center gap-1">
                        <Smartphone className="w-3 h-3" /> Modelo Sugerido / Asignado
                    </span>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                        <p className="text-sm font-bold text-emerald-800">
                            {ticket.alternativa_modelo || ticket.equipo?.modelo || "Estándar"}
                        </p>
                        <p className="text-[10px] text-emerald-600 mt-0.5">
                            Sujeto a disponibilidad de stock
                        </p>
                    </div>
                </div>
            </div>
            {/* DETAIL REPOSICION */}
            {ticket.detalle_reposicion && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-4">
                    <h4 className="text-sm font-bold text-orange-900 flex items-center gap-2 border-b border-orange-200 pb-2">
                        <Smartphone className="w-4 h-4" /> Detalle de Reposición
                    </h4>

                    <div className="grid grid-cols-2 gap-4 text-sm text-orange-950">
                        {/* Row 1 */}
                        <div>
                            <span className="block text-xs text-orange-600/80 font-semibold uppercase tracking-wider mb-0.5">Motivo</span>
                            <span className="font-bold">{ticket.detalle_reposicion.motivo}</span>
                        </div>
                        <div>
                            <span className="block text-xs text-orange-600/80 font-semibold uppercase tracking-wider mb-0.5">Línea Afectada</span>
                            <span className="font-bold font-mono text-orange-900">{ticket.detalle_reposicion.numero_afectado || "-"}</span>
                        </div>

                        {/* Row 2 */}
                        <div>
                            <span className="block text-xs text-orange-600/80 font-semibold uppercase tracking-wider mb-0.5">Asume Costo</span>
                            <span className="font-medium">{ticket.detalle_reposicion.asume || "-"}</span>
                        </div>
                        <div>
                            <span className="block text-xs text-orange-600/80 font-semibold uppercase tracking-wider mb-0.5">Cuotas</span>
                            <span className="font-medium">
                                {ticket.detalle_reposicion.cuotas ? `${ticket.detalle_reposicion.cuotas} Cuotas` : "-"}
                            </span>
                        </div>

                        {/* Row 3 */}
                        <div>
                            <span className="block text-xs text-orange-600/80 font-semibold uppercase tracking-wider mb-0.5">Equipo Anterior</span>
                            <span className="font-medium">{ticket.detalle_reposicion.equipoAnterior || "No registrado"}</span>
                        </div>
                    </div>


                </div>
            )}

            {/* SIMULACION DESCUENTO */}
            {ticket.simulacion_descuento && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" /> Simulación de Descuento
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-white p-2 rounded border border-gray-200">
                            <span className="block text-xs text-gray-500">Costo Equipo</span>
                            <span className="font-bold text-gray-900">S/ {ticket.simulacion_descuento.costoEquipo}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-200">
                            <span className="block text-xs text-gray-500">Monto a Descontar (50%)</span>
                            <span className="font-bold text-red-600">S/ {ticket.simulacion_descuento.montoDescuento}</span>
                        </div>
                        <div className="col-span-2 bg-blue-50 p-3 rounded border border-blue-100">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-blue-700 font-semibold uppercase">Cuota Mensual</span>
                                <span className="font-bold text-blue-800 text-lg">S/ {ticket.simulacion_descuento.cuotaMensual}</span>
                            </div>
                            <div className="text-xs text-blue-600 mt-1 flex justify-between">
                                <span>Plazo: {ticket.simulacion_descuento.cuotas} meses</span>
                                <span>Total: S/ {ticket.simulacion_descuento.montoDescuento}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
