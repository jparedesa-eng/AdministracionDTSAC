import { useEffect, useMemo, useState } from "react";
import {
    loadPropuestasBySolicitud,
    getPropuestasBySolicitud,
    type PropuestaAerea,
} from "../../store/propuestasStore";
import { getPropuestaSeleccion } from "../../store/pasajeStore";
import { Modal } from "../ui/Modal";
import { Plane, AlertCircle, Plus } from "lucide-react";

/* ---------------------------
   Utils
--------------------------- */
function fmtTime(dt?: Date | string | null) {
    if (!dt) return "--:--";
    const d = new Date(dt);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(dt?: Date | string | null) {
    if (!dt) return "";
    const d = new Date(dt);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function getDuration(start?: Date | string | null, end?: Date | string | null) {
    if (!start || !end) return "";
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
}

/* ---------------------------
   Component
--------------------------- */
interface PropuestasModalProps {
    open: boolean;
    onClose: () => void;
    solicitudId: string | null;
    showGerenciaSelection?: boolean;
    showAdminSelection?: boolean;
    onSelect?: (idaId: number | null, vueltaId: number | null) => void;
    readOnly?: boolean;
    onAdd?: (sentido: "IDA" | "VUELTA") => void;
}

export function PropuestasModal({
    open,
    onClose,
    solicitudId,
    showGerenciaSelection = true,
    showAdminSelection = true,
    onSelect,
    readOnly = false,
    onAdd,
}: PropuestasModalProps) {
    const [propuestas, setPropuestas] = useState<PropuestaAerea[]>([]);
    const [loading, setLoading] = useState(false);

    // Selección temporal para Ida/Vuelta
    const [selIda, setSelIda] = useState<number | null>(null);
    const [selVuelta, setSelVuelta] = useState<number | null>(null);

    useEffect(() => {
        if (open && solicitudId) {
            setLoading(true);
            loadPropuestasBySolicitud(solicitudId)
                .then(() => {
                    setPropuestas(getPropuestasBySolicitud(solicitudId));
                })
                .catch((err) => console.error(err))
                .finally(() => setLoading(false));

            // Reset modal state
            setSelIda(null);
            setSelVuelta(null);
        } else {
            setPropuestas([]);
        }
    }, [open, solicitudId]);

    // Get PropuestaSeleccion data for this solicitud
    const propuestaSeleccion = useMemo(() => {
        if (!solicitudId) return null;
        return getPropuestaSeleccion(solicitudId);
    }, [solicitudId]);

    // Group proposals
    const { idas, vueltas, ambos } = useMemo(() => {
        const idas = propuestas.filter((p) => p.sentido === "IDA");
        const vueltas = propuestas.filter((p) => p.sentido === "VUELTA");
        const ambos = propuestas.filter((p) => !p.sentido || p.sentido === "AMBOS");
        return { idas, vueltas, ambos };
    }, [propuestas]);

    // Handle selection - No crear propuestas combinadas, solo marcar selecciones
    const handleSelect = (nro: number, sentido?: "IDA" | "VUELTA" | "AMBOS") => {
        if (!onSelect) return;

        // Si es "AMBOS", seleccionar para ambos sentidos
        if (!sentido || sentido === "AMBOS") {
            onSelect(nro, nro);
            onClose();
            return;
        }

        // Si es IDA, actualizar selección de IDA
        if (sentido === "IDA") {
            const newSelIda = nro === selIda ? null : nro;
            setSelIda(newSelIda);
        }

        // Si es VUELTA, actualizar selección de VUELTA
        if (sentido === "VUELTA") {
            const newSelVuelta = nro === selVuelta ? null : nro;
            setSelVuelta(newSelVuelta);
        }
    };

    const Card = ({ p, isSelected, onClick, selectionType }: { p: PropuestaAerea, isSelected?: boolean, onClick?: () => void, selectionType?: "radio" | "button" }) => {
        // Verificar si esta propuesta está seleccionada por Gerencia o Admin
        const isSelGerencia =
            (p.sentido === "IDA" && propuestaSeleccion?.propuestaIdaGerencia === p.nroPropuesta) ||
            (p.sentido === "VUELTA" && propuestaSeleccion?.propuestaVueltaGerencia === p.nroPropuesta) ||
            (p.sentido === "AMBOS" && (
                propuestaSeleccion?.propuestaIdaGerencia === p.nroPropuesta ||
                propuestaSeleccion?.propuestaVueltaGerencia === p.nroPropuesta
            ));

        const isSelAdmin =
            (p.sentido === "IDA" && propuestaSeleccion?.propuestaIdaAdmin === p.nroPropuesta) ||
            (p.sentido === "VUELTA" && propuestaSeleccion?.propuestaVueltaAdmin === p.nroPropuesta) ||
            (p.sentido === "AMBOS" && (
                propuestaSeleccion?.propuestaIdaAdmin === p.nroPropuesta ||
                propuestaSeleccion?.propuestaVueltaAdmin === p.nroPropuesta
            ));

        let containerClasses =
            "relative overflow-hidden rounded-2xl border bg-white transition-all shadow-sm";

        if (isSelected) {
            containerClasses += " border-slate-800 ring-2 ring-slate-800";
        } else if (isSelAdmin && showAdminSelection) {
            containerClasses += " border-purple-500 ring-1 ring-purple-200";
        } else if (isSelGerencia && showGerenciaSelection) {
            containerClasses += " border-emerald-500 ring-1 ring-emerald-200";
        } else {
            containerClasses += " border-slate-200 hover:border-slate-300";
        }

        return (
            <div className={containerClasses}>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">
                                Opción #{p.nroPropuesta}
                            </span>
                            {/* Tags de selección histórica */}
                            {(isSelGerencia && showGerenciaSelection) && (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800 border border-emerald-200">
                                    Gerencia
                                </span>
                            )}
                            {(isSelAdmin && showAdminSelection) && (
                                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-800 border border-purple-200">
                                    Admin
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {p.proveedor || "Prov. desc."}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="block text-lg font-bold text-slate-900">
                            {p.moneda} {p.costoTotal?.toFixed(2)}
                        </span>
                    </div>
                    {/* Botón de selección si es directo (Ambos) */}
                    {onClick && selectionType === 'button' && (
                        <button
                            onClick={onClick}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 active:scale-95"
                        >
                            Seleccionar
                        </button>
                    )}
                    {/* Radio visual si es parcial */}
                    {onClick && selectionType === 'radio' && (
                        <div
                            onClick={onClick}
                            className={`h-5 w-5 rounded-full border cursor-pointer flex items-center justify-center ${isSelected ? 'border-slate-800 bg-slate-800' : 'border-slate-300 bg-white'}`}
                        >
                            {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                    )}
                </div>

                {/* Tramos */}
                <div className="divide-y divide-slate-50 px-4 py-2">
                    {p.tramos.map((t, idx) => (
                        <div key={idx} className="py-3">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-50 text-slate-600">
                                        <Plane className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-slate-900">{t.aerolinea}</span>
                                            <span className="text-[10px] text-slate-500">{t.vuelo}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                            <span>{fmtTime(t.salida)} {t.origenCiudad}</span>
                                            <span className="text-slate-300">→</span>
                                            <span>{fmtTime(t.llegada)} {t.destinoCiudad}</span>
                                            <span className="ml-1 text-[10px] text-slate-400">
                                                ({getDuration(t.salida, t.llegada)})
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            {fmtDate(t.salida)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* FOOTER: Observations */}
                {p.observaciones && (
                    <div className="border-t border-slate-100 bg-amber-50/50 px-4 py-2 text-xs text-slate-600">
                        <span className="font-semibold text-amber-700">Obs:</span> {p.observaciones}
                    </div>
                )}
            </div>
        );
    };

    if (!open) return null;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Propuestas de vuelo"
            size="lg"
            footer={
                <div className="flex gap-2 w-full justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Cerrar
                    </button>
                    {!readOnly && onSelect && (selIda || selVuelta) && (
                        <button
                            onClick={() => {
                                onSelect(selIda, selVuelta);
                                onClose();
                            }}
                            className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 active:scale-95"
                        >
                            Confirmar Selección
                        </button>
                    )}
                </div>
            }
        >
            <div className="space-y-6 px-1">
                {loading && <p className="text-center text-slate-500 py-4">Cargando...</p>}

                {!loading && propuestas.length === 0 && (
                    <p className="text-center text-slate-500 py-4">No hay propuestas registradas.</p>
                )}

                {/* Sección AMBOS (Ida y Vuelta directo) - Solo mostrar si NO es Provider View */}
                {ambos.length > 0 && !onAdd && (
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span className="h-1 w-1 bg-slate-900 rounded-full"></span>
                            Propuestas Integrales (Ida y Vuelta)
                        </h4>
                        <div className="grid gap-4">
                            {ambos.map(p => (
                                <Card
                                    key={p.nroPropuesta}
                                    p={p}
                                    onClick={(!readOnly && onSelect) ? () => handleSelect(p.nroPropuesta, "AMBOS") : undefined}
                                    selectionType="button"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Sección Separada (Ida / Vuelta) */}
                {(idas.length > 0 || vueltas.length > 0 || onAdd) && (
                    <div className="space-y-4 border-t border-slate-200 pt-4">
                        <div className="flex items-center gap-2 mb-2 p-3 bg-indigo-50 rounded-lg text-indigo-700 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <p>Puedes seleccionar una opción de IDA y una de VUELTA para combinar.</p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Columna IDA */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-center">Opciones IDA</h4>
                                {idas.map(p => (
                                    <Card
                                        key={p.nroPropuesta}
                                        p={p}
                                        isSelected={selIda === p.nroPropuesta}
                                        onClick={(!readOnly && onSelect) ? () => handleSelect(p.nroPropuesta, "IDA") : undefined}
                                        selectionType="radio"
                                    />
                                ))}
                                {idas.length === 0 && <p className="text-xs text-center text-slate-400">No hay opciones de Ida</p>}

                                {/* BUTTON ADD IDA */}
                                {onAdd && (
                                    <button
                                        onClick={() => onAdd("IDA")}
                                        className="mt-2 flex w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-3 text-slate-400 transition hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                    >
                                        <Plus className="h-6 w-6" />
                                    </button>
                                )}
                            </div>

                            {/* Columna VUELTA */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-center">Opciones VUELTA</h4>
                                {vueltas.map(p => (
                                    <Card
                                        key={p.nroPropuesta}
                                        p={p}
                                        isSelected={selVuelta === p.nroPropuesta}
                                        onClick={(!readOnly && onSelect) ? () => handleSelect(p.nroPropuesta, "VUELTA") : undefined}
                                        selectionType="radio"
                                    />
                                ))}
                                {vueltas.length === 0 && <p className="text-xs text-center text-slate-400">No hay opciones de Vuelta</p>}

                                {/* BUTTON ADD VUELTA */}
                                {onAdd && (
                                    <button
                                        onClick={() => onAdd("VUELTA")}
                                        className="mt-2 flex w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-3 text-slate-400 transition hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                    >
                                        <Plus className="h-6 w-6" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
