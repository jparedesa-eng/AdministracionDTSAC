import { useState, useEffect, useMemo } from "react";
// import html2canvas from 'html2canvas'; // Removing html2canvas
import { toPng } from 'html-to-image'; // Using html-to-image instead
import jsPDF from 'jspdf';
import {
    Activity,
    CheckSquare,
    X,
    Clock,
    User,
    ShieldCheck,
    Signal,
    MessageSquarePlus,
    Calendar,
    Filter,
    Building2,
    FileDown,
    Star,
    Eye,
    AlertTriangle,
    XCircle,
    Grid,
    List,
    Search,
    Trash2
} from 'lucide-react';
import { Toast, type ToastState } from "../../components/ui/Toast";
import { DateRangePicker } from "../../components/ui/DateRangePicker";
import { useAuth } from "../../auth/AuthContext";
import { getCentralesState, subscribeCentrales } from "../../store/cctvCentralesStore";
import { getCamarasState, subscribeCamaras } from "../../store/camarasStore";
import { getSedesState, subscribeSedes } from "../../store/sedesStore";
import {
    getChecklistState,
    subscribeChecklist,
    createChecklist,
    getChecklistByDateAndCentral,
    refreshDetalles,
    upsertChecklistDetalle,
    createReporte,
    refreshReportes,
    deleteReporte,
} from "../../store/checklistCamarasStore";

const QUALITY_LABELS = {
    5: { label: 'Good', color: 'text-emerald-600', icon: Star, bg: 'bg-emerald-500', bars: 4, barColor: 'bg-emerald-500' },
    3: { label: 'Fair', color: 'text-amber-600', icon: Eye, bg: 'bg-amber-500', bars: 3, barColor: 'bg-amber-500' },
    1: { label: 'Poor', color: 'text-rose-600', icon: AlertTriangle, bg: 'bg-rose-500', bars: 1, barColor: 'bg-rose-500' },
} as const;

type QualityValue = keyof typeof QUALITY_LABELS;


export default function ChecklistCamaras() {
    const { user } = useAuth();
    const [, setVersion] = useState(0);

    useEffect(() => {
        const unsubCentrales = subscribeCentrales(() => setVersion(v => v + 1));
        const unsubCamaras = subscribeCamaras(() => setVersion(v => v + 1));
        const unsubChecklist = subscribeChecklist(() => setVersion(v => v + 1));
        const unsubSedes = subscribeSedes(() => setVersion(v => v + 1));

        refreshReportes();

        return () => {
            unsubCentrales();
            unsubCamaras();
            unsubChecklist();
            unsubSedes();
        };
    }, []);

    const { centrales } = getCentralesState();
    const { camaras } = getCamarasState();
    const { sedes } = getSedesState();
    const { detalles, reportes } = getChecklistState();

    // Filters State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedCentral, setSelectedCentral] = useState<string>("");
    const [selectedSede, setSelectedSede] = useState<string>("ALL");
    const [selectedZona, setSelectedZona] = useState<string>("ALL");
    const [selectedTurno, setSelectedTurno] = useState<string>("MAÑANA");
    const [searchText, setSearchText] = useState("");

    // Checklist State
    const [currentChecklistId, setCurrentChecklistId] = useState<string | null>(null);
    const [supervisorName, setSupervisorName] = useState("");
    const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS'); // Nuevo: Selector de vista
    const [localDetalles, setLocalDetalles] = useState<Record<string, { operativa: boolean, calidad: number | null }>>({});

    // UI State
    const [toast, setToast] = useState<ToastState>(null);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [optionsModalOpen, setOptionsModalOpen] = useState(false);
    const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'MENU' | 'STATUS' | 'ISSUES'>('MENU');
    const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);
    const [newIncidentDesc, setNewIncidentDesc] = useState('');

    const [tempOperativa, setTempOperativa] = useState(true);
    const [tempCalidad, setTempCalidad] = useState(5);
    const [isSavingModal, setIsSavingModal] = useState(false);

    // Modal UI Aux State
    const [incidentType, setIncidentType] = useState('Otros');

    useEffect(() => {
        if (optionsModalOpen) {
            setActiveTab('MENU');
            setIncidentType('Otros');
            setNewIncidentDesc('');
        }
    }, [optionsModalOpen]);

    const INCIDENT_TYPES = [
        "Caída de Señal",
        "Falla de Video / Negra",
        "Desenfoque / Borrosa",
        "Vandalismo / Daño Físico",
        "Obstrucción Visual",
        "PTZ No Responde",
        "Intermitencia",
        "Otros"
    ];

    // Auto-select first central
    useEffect(() => {
        if (centrales.length > 0 && !selectedCentral) {
            setSelectedCentral(centrales[0].id);
        }
    }, [centrales, selectedCentral]);

    // Load existing checklist
    const loadChecklist = async () => {
        if (!selectedCentral) return;
        try {
            const existing = await getChecklistByDateAndCentral(selectedDate, selectedCentral, selectedTurno);
            if (existing) {
                setCurrentChecklistId(existing.id);
                setSupervisorName(existing.supervisor_responsable || "");
                await refreshDetalles(existing.id);
            } else {
                setCurrentChecklistId(null);
                setSupervisorName("");
            }
        } catch (error) {
            console.error("Error loading checklist:", error);
        }
    };

    useEffect(() => {
        loadChecklist();
    }, [selectedDate, selectedCentral, selectedTurno]);

    // Sync local state when modal opens
    useEffect(() => {
        if (isAuditModalOpen) {
            const initial: Record<string, { operativa: boolean, calidad: number }> = {};
            if (currentChecklistId) {
                detalles.filter(d => d.checklist_id === currentChecklistId).forEach(d => {
                    initial[d.camara_id] = { operativa: d.operativa, calidad: d.calidad_imagen ?? 5 };
                });
            }
            setLocalDetalles(initial);
        }
    }, [isAuditModalOpen, currentChecklistId]);

    // Cascading Filters Logic
    const availableSedes = useMemo(() => {
        if (!selectedCentral) return [];
        const central = centrales.find(c => c.id === selectedCentral);
        if (!central || !central.sedes) return [];
        return sedes.filter(s => central.sedes?.includes(s.id)).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [centrales, sedes, selectedCentral]);

    const availableZonas = useMemo(() => {
        const filtered = camaras.filter(c => {
            const matchCentral = c.central_id === selectedCentral;
            const matchSede = selectedSede === 'ALL' || c.sede_id === selectedSede;
            return matchCentral && matchSede;
        });
        const zonas = Array.from(new Set(filtered.map(c => c.nave_fundo || "Sin Zona"))).filter(z => z !== null);
        return zonas.sort();
    }, [camaras, selectedCentral, selectedSede]);

    const statsCameras = useMemo(() => {
        return camaras.filter(c => {
            const matchCentral = c.central_id === selectedCentral;
            const matchSede = selectedSede === 'ALL' || c.sede_id === selectedSede;
            const matchZona = selectedZona === 'ALL' || (c.nave_fundo || "Sin Zona") === selectedZona;
            return matchCentral && matchSede && matchZona && c.activa;
        });
    }, [camaras, selectedCentral, selectedSede, selectedZona]);

    const filteredCameras = useMemo(() => {
        return statsCameras.filter(c => {
            const matchSearch = !searchText ||
                c.codigo.toLowerCase().includes(searchText.toLowerCase()) ||
                c.nombre.toLowerCase().includes(searchText.toLowerCase());

            return matchSearch;
        });
    }, [statsCameras, searchText]);

    const groupCamerasByZona = (cams: typeof camaras) => {
        return cams.reduce((acc, cam) => {
            const zona = cam.nave_fundo || "Sin Zona";
            if (!acc[zona]) acc[zona] = [];
            acc[zona].push(cam);
            return acc;
        }, {} as Record<string, typeof camaras>);
    };

    const handleToggleOperativa = async (camaraId: string, currentOperativa: boolean | undefined) => {
        const nextState = (currentOperativa === true) ? false : true;

        // Instant local update
        setLocalDetalles(prev => ({
            ...prev,
            [camaraId]: {
                ...prev[camaraId],
                operativa: nextState,
                // If switching to FAIL (false), quality becomes null.
                // If switching to OK (true), default to 5 if previous was null/undefined
                calidad: !nextState ? null : (prev[camaraId]?.calidad || getDetalleForCamara(camaraId)?.calidad_imagen || 5)
            }
        }));

        // Backwards compatibility/Direct update if NOT in audit modal
        if (currentChecklistId && !isAuditModalOpen) {
            try {
                const existing = detalles.find(d => d.checklist_id === currentChecklistId && d.camara_id === camaraId);
                await upsertChecklistDetalle({
                    id: existing?.id,
                    checklist_id: currentChecklistId,
                    camara_id: camaraId,
                    operativa: nextState,
                    // If FAIL, quality null. If OK, use existing or default 5
                    calidad_imagen: !nextState ? null : (existing?.calidad_imagen || 5),
                });
            } catch (error: any) {
                setToast({ type: "error", message: "Error al actualizar estado." });
            }
        }
    };

    const handleSetCalidad = async (camaraId: string, calidad: number) => {
        const isOperativa = getDetalleForCamara(camaraId)?.operativa !== false;
        if (!isOperativa) return; // Regla: No se registra calidad si está en falla

        // Instant local update
        setLocalDetalles(prev => ({
            ...prev,
            [camaraId]: {
                ...prev[camaraId],
                operativa: prev[camaraId]?.operativa !== undefined ? prev[camaraId].operativa : (getDetalleForCamara(camaraId)?.operativa !== false),
                calidad: calidad
            }
        }));

        if (currentChecklistId && !isAuditModalOpen) {
            try {
                const existing = detalles.find(d => d.checklist_id === currentChecklistId && d.camara_id === camaraId);
                await upsertChecklistDetalle({
                    id: existing?.id,
                    checklist_id: currentChecklistId,
                    camara_id: camaraId,
                    operativa: existing?.operativa !== undefined ? existing.operativa : true,
                    calidad_imagen: calidad,
                });
            } catch (error: any) {
                setToast({ type: "error", message: "Error al calificar." });
            }
        }
    };

    const getDetalleForCamara = (camaraId: string) => {
        const local = localDetalles[camaraId];
        const dbDetalle = detalles.find(d => d.checklist_id === currentChecklistId && d.camara_id === camaraId);

        if (local) {
            return {
                operativa: local.operativa,
                calidad_imagen: local.calidad,
                created_at: dbDetalle?.created_at || null
            } as any;
        }

        return dbDetalle;
    };

    const handleSaveAndFlush = async () => {
        if (!selectedCentral) return;
        if (!supervisorName) return setToast({ type: "error", message: "Ingrese el nombre del responsable." });

        try {
            setToast({ type: "success", message: "Sincronizando auditoría completa..." });

            let checklistId = currentChecklistId;
            if (!checklistId) {
                checklistId = await createChecklist({
                    fecha: selectedDate,
                    central_id: selectedCentral,
                    usuario_id: user?.id ?? null,
                    turno: selectedTurno,
                    supervisor_responsable: supervisorName,
                });
                setCurrentChecklistId(checklistId);
            }

            // Iterate over ALL stats cameras (current scope) to ensure complete snapshot
            const promises = statsCameras.map(async (cam) => {
                const camaraId = cam.id;

                // Determine source of truth: Local State -> DB State -> Default
                let finalOperativa = true;
                let finalCalidad = 5;

                const localState = localDetalles[camaraId];
                const dbState = detalles.find(d => d.checklist_id === checklistId && d.camara_id === camaraId);

                if (localState) {
                    finalOperativa = localState.operativa;
                    finalCalidad = localState.calidad ?? 5; // Default for saving if null and operative? Check rule below.
                } else if (dbState) {
                    finalOperativa = dbState.operativa;
                    finalCalidad = dbState.calidad_imagen ?? 5;
                }

                // RULE: If NOT operative, quality MUST be null
                if (!finalOperativa) {
                    finalCalidad = null as any; // Cast to any to satisfy the strict number check if implicit, but upsert allows null.
                } else {
                    // If operative and quality is null/undefined, default to 5
                    if (finalCalidad === null || finalCalidad === undefined) finalCalidad = 5;
                }

                await upsertChecklistDetalle({
                    id: dbState?.id,
                    checklist_id: checklistId!,
                    camara_id: camaraId,
                    operativa: finalOperativa,
                    calidad_imagen: finalCalidad,
                });
            });

            await Promise.all(promises);
            await refreshDetalles(checklistId);
            setToast({ type: "success", message: `Auditoría sincronizada: ${statsCameras.length} equipos procesados.` });
            setIsAuditModalOpen(false);
            setLocalDetalles({}); // Clear buffer
        } catch (error: any) {
            console.error(error);
            setToast({ type: "error", message: error.message || "Error al sincronizar." });
        }
    };


    const handleExportPdf = async () => {
        if (!selectedCentral) return;
        const central = centrales.find(c => c.id === selectedCentral);
        const centralName = central?.nombre || "CENTRAL";

        setToast({ type: "success", message: "Preparando documento... por favor espere." });

        // Summary Calculations
        let total = 0, ok = 0;
        let goodQ = 0, fairQ = 0, poorQ = 0;

        statsCameras.forEach(c => {
            total++;
            const d = getDetalleForCamara(c.id);
            if (d?.operativa !== false) {
                ok++;
                const qty = d?.calidad_imagen || 5;
                if (qty >= 5) goodQ++;
                else if (qty >= 3) fairQ++;
                else poorQ++;
            } else {
                poorQ++; // Count offline as poor for metrics
            }
        });

        const fallas = total - ok;
        const salud = total > 0 ? ((ok / total) * 100).toFixed(1) : "0.0";
        const incidentsForReport = reportes.filter(i => i.fecha_reporte.startsWith(selectedDate));
        const camarasByZonaPDF = groupCamerasByZona(statsCameras);

        // Create a hidden container for the report
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '0';
        container.style.top = '0';
        container.style.width = '1000px';
        container.style.zIndex = '-9999';
        container.style.opacity = '0';
        container.style.backgroundColor = 'white';
        document.body.appendChild(container);

        container.innerHTML = `
                <style>
                    /* STRICT RESET for html2canvas + Tailwind 4 compatibility */
                    * { 
                        box-sizing: border-box !important; 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                        border-color: #e2e8f0 !important;
                        -webkit-text-fill-color: initial !important;
                    }
                    *, ::before, ::after {
                        box-shadow: none !important;
                        text-decoration-color: #000000 !important;
                        outline-color: #000000 !important;
                    }
                    
                    .report-card { padding: 32px; background: #ffffff !important; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #0f172a !important; padding-bottom: 15px; margin-bottom: 24px; }
                    .logo-box { background: #0f172a !important; color: #ffffff !important; padding: 8px 12px; border-radius: 6px; font-weight: 900; font-size: 18px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
                    .stat-item { border: 2px solid #e2e8f0 !important; padding: 12px; border-radius: 12px; text-align: center; background: #ffffff !important; }
                    .stat-main { background: #0f172a !important; color: #ffffff !important; border-color: #0f172a !important; }
                    .report-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
                    .zona-card { border: 2px solid #f1f5f9 !important; border-radius: 12px; margin-bottom: 15px; overflow: hidden; break-inside: avoid; background: #ffffff !important; }
                    .zona-header { background: #f8fafc !important; padding: 6px 12px; border-bottom: 2px solid #f1f5f9 !important; display: flex; justify-content: space-between; font-weight: 800; font-size: 9px; text-transform: uppercase; color: #334155 !important; }
                    table { width: 100%; border-collapse: collapse; }
                    th { text-align: left; padding: 6px 8px; font-size: 8px; color: #64748b !important; text-transform: uppercase; border-bottom: 1px solid #f1f5f9 !important; background: #ffffff !important; }
                    td { padding: 6px 8px; font-size: 9px; border-bottom: 1px solid #f8fafc !important; color: #334155 !important; }
                    .badge { padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 7px; text-transform: uppercase; display: inline-block; }
                    .on { color: #10b981 !important; } .off { color: #ef4444 !important; }
                    .q-5 { background: #dcfce7 !important; color: #166534 !important; }
                    .q-3 { background: #fef3c7 !important; color: #92400e !important; }
                    .q-1 { background: #fee2e2 !important; color: #991b1b !important; }
                    .incidents-title { display: flex; align-items: center; gap: 10px; margin-top: 30px; margin-bottom: 10px; }
                    .title-dot { width: 4px; height: 16px; background: #ef4444 !important; border-radius: 2px; }
                </style>
            <div class="report-card" id="report-content">
                <div class="header">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="logo-box">C|C</div>
                        <div>
                            <h1 style="margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase;">Reporte Técnico de Operatividad</h1>
                            <p style="margin: 0; font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Auditoría Digital de Infraestructura</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 800; background: #f1f5f9; padding: 4px 12px; border-radius: 20px; display: inline-block;">SISTEMA: ${centralName} &nbsp; • &nbsp; TURNO: ${selectedTurno}</p>
                        <p style="margin: 0; font-size: 9px; font-weight: 700; color: #64748b;">${new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-item">
                        <p style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px 0;">Cámaras</p>
                        <p style="font-size: 20px; font-weight: 900; color: #1e293b; margin: 0;">${total}</p>
                    </div>
                    <div class="stat-item">
                        <p style="font-size: 8px; font-weight: 800; color: #10b981; text-transform: uppercase; margin: 0 0 4px 0;">Online</p>
                        <p style="font-size: 20px; font-weight: 900; color: #065f46; margin: 0;">${ok}</p>
                    </div>
                    <div class="stat-item">
                        <p style="font-size: 8px; font-weight: 800; color: #f43f5e; text-transform: uppercase; margin: 0 0 4px 0;">Offline</p>
                        <p style="font-size: 20px; font-weight: 900; color: #991b1b; margin: 0;">${fallas}</p>
                    </div>
                    <div class="stat-item stat-main">
                        <p style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px 0;">Salud Sistema</p>
                        <p style="font-size: 20px; font-weight: 900; margin: 0;">${salud}%</p>
                    </div>
                    <div class="stat-item" style="display: flex; flex-direction: column; justify-content: center; gap: 2px;">
                        <p style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px 0;">Calidad Imagen</p>
                        <div style="display: flex; justify-content: space-between; font-size: 8px; font-weight: 800;">
                            <span style="color: #10b981;">ÓPTIMA:</span> <span>${goodQ}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 8px; font-weight: 800;">
                            <span style="color: #f59e0b;">REGULAR:</span> <span>${fairQ}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 8px; font-weight: 800;">
                            <span style="color: #ef4444;">BAJA/OFF:</span> <span>${poorQ}</span>
                        </div>
                    </div>
                </div>

                <div class="report-columns">
                    ${Object.entries(camarasByZonaPDF).map(([zona, cams]) => `
                        <div class="zona-card">
                            <div class="zona-header">
                                <span>${zona}</span>
                                <span style="color: #94a3b8;">${cams.length} DISP.</span>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Equipo</th>
                                        <th style="text-align: left; width: 120px;">Área</th>
                                        <th style="text-align: center; width: 40px;">Status</th>
                                        <th style="text-align: center; width: 70px;">Calidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${cams.map(cam => {
            const d = getDetalleForCamara(cam.id);
            const qv = d?.calidad_imagen || 5;
            const isOnline = d?.operativa !== false;
            const label = QUALITY_LABELS[qv as QualityValue]?.label || 'ÓPTIMA';

            return `
                                            <tr>
                                                <td style="font-weight: 700; color: #334155;">${cam.nombre}</td>
                                                <td style="font-size: 8px; color: #475569; text-transform: uppercase;">${cam.area || '-'}</td>
                                                <td style="text-align: center; font-weight: 900; font-size: 8px;">
                                                    <span class="${isOnline ? 'on' : 'off'}">${isOnline ? 'ON' : 'OFF'}</span>
                                                </td>
                                                <td style="text-align: center;">
                                                    ${isOnline ? `<span class="badge q-${qv >= 5 ? '5' : (qv >= 3 ? '3' : '1')}">${label}</span>` : '<span style="color: #cbd5e1;">--</span>'}
                                                </td>
                                            </tr>
                                        `}).join('')}
                                </tbody>
                            </table>
                        </div>
                    `).join('')}
                </div>

                <div class="incidents-area" style="break-inside: avoid; margin-top: 30px;">
                    <div class="incidents-title">
                        <div class="title-dot"></div>
                        <h2 style="margin: 0; font-size: 13px; font-weight: 900; text-transform: uppercase;">Registro Histórico de Fallas e Incidencias</h2>
                    </div>
                    ${incidentsForReport.length > 0 ? `
                    <table style="border: 2px solid #f1f5f9; border-radius: 12px; overflow: hidden;">
                        <thead>
                            <tr style="background: #f8fafc;">
                                <th style="width: 70px;">Hora</th>
                                <th style="width: 150px;">Cámara / Punto</th>
                                <th>Descripción del Hallazgo Técnico</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${incidentsForReport.map(inc => {
                const cam = camaras.find(c => c.id === inc.camara_id);
                return `
                                <tr>
                                    <td style="font-weight: 800; color: #64748b;">${new Date(inc.fecha_reporte).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                                    <td style="font-weight: 800; color: #1e293b; text-transform: uppercase;">${cam ? cam.nombre : 'PANEL GENERAL'}</td>
                                    <td style="color: #475569; font-style: italic;">${inc.descripcion}</td>
                                </tr>
                              `;
            }).join('')}
                        </tbody>
                    </table>
                    ` : `
                        <div style="padding: 24px; border: 2px dashed #e2e8f0; border-radius: 12px; text-align: center; background: #f8fafc;">
                            <p style="margin: 0; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; font-style: italic;">Sin incidencias técnicas reportadas en la jornada.</p>
                        </div>
                    `}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 7px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">
                    <span>Forensic Security Report • Official Audit</span>
                    <span>Auditado por: ${supervisorName || 'SISTEMA'} • ${new Date().toLocaleString()}</span>
                </div>
            </div>
        `;

        // Shorter timeout as we don't have external CSS anymore
        setTimeout(async () => {
            try {
                const content = document.getElementById('report-content');
                if (!content) throw new Error("No se pudo generar el contenedor del reporte.");

                // Use html-to-image instead of html2canvas
                const dataUrl = await toPng(content, {
                    backgroundColor: '#ffffff',
                    cacheBust: true,
                    pixelRatio: 2, // Aumentar calidad
                    preferredFontFormat: 'woff2'
                });

                const pdf = new jsPDF('p', 'mm', 'a4');

                // Calculate dimensions
                const imgProps = pdf.getImageProperties(dataUrl);
                const pdfWidth = 210; // A4 width
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                // Re-initialize if height > A4 height (297) to match content
                // Or just use the custom size directly
                const dynamicPdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);

                dynamicPdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
                dynamicPdf.save(`REPORTE_${centralName}_${selectedDate}.pdf`);

                document.body.removeChild(container);
                setToast({ type: "success", message: "PDF descargado con éxito." });
            } catch (error) {
                console.error("Error generating PDF:", error);
                setToast({ type: "error", message: "No se pudo generar el PDF. Reintente." });
                if (document.body.contains(container)) document.body.removeChild(container);
            }
        }, 100);
    };

    // Excel Export Logic
    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [exportRange, setExportRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });

    const handleExportExcel = async () => {
        if (!selectedCentral) return setToast({ type: "error", message: "Seleccione una central." });
        if (!exportRange.start || !exportRange.end) return setToast({ type: "error", message: "Seleccione un rango de fechas." });

        try {
            setToast({ type: "success", message: "Generando Excel... por favor espere." });

            // Dynamic import to avoid heavy bundle if not used
            const XLSX = await import("xlsx");
            const { getChecklistDataRange } = await import("../../store/checklistCamarasStore");

            const startDateStr = exportRange.start.toISOString().split("T")[0];
            const endDateStr = exportRange.end.toISOString().split("T")[0];

            const { checklists, detalles } = await getChecklistDataRange(startDateStr, endDateStr, selectedCentral);

            // Construct the Flat Dataset
            const rows = [];

            // Map Sede IDs to Names for efficiency
            const sedeMap = sedes.reduce((acc, s) => { acc[s.id] = s.nombre; return acc; }, {} as Record<string, string>);

            // We iterate over ALL cameras in the current central, and for each day in range, we find if there was a checklist.
            // Requirement says: "REGISTROS DE CHECKLIST". This implies we iterate over the checklists found.
            // If we iterate over checklists, we get one row per camera per checklist? 
            // "NECESITO DESCARGAR UN EXCEL ENTRE RANGO DE FECHA LOS REGISTROS DE CHECKLIST" -> "SEDE, NAVE, FECHA, TURNO..."
            // Yes, one row per camera check.

            for (const checklist of checklists) {
                // For each checklist, we match against ALL cameras of the central to show their status in that checklist. 
                // Or only those that have a detail? The system creates details for all cameras when saving.
                // But to be safe and complete (as per "CALIDAD", "ESTADO"), we should look at the details.

                // However, user likely wants to see ALL cameras for that shift, even if some detail is missing (implicit check?).
                // But usually details are generated for all active cameras.
                // Let's iterate over the details found for this checklist.

                const checklistDetails = detalles.filter(d => d.checklist_id === checklist.id);

                // If we only iterate details, we might miss cameras if they weren't checked? 
                // But the save logic iterates all statsCameras.
                // Let's iterate central cameras and find their detail in this checklist to be robust.

                for (const cam of centrales.find(c => c.id === selectedCentral)?.id === checklist.central_id ? camaras.filter(c => c.central_id === checklist.central_id && c.activa) : []) { // Filter only active for report
                    const detail = checklistDetails.find(d => d.camara_id === cam.id);

                    // Mappings
                    const calidadLabel = detail?.calidad_imagen
                        ? (QUALITY_LABELS[detail.calidad_imagen as QualityValue]?.label || 'BUENA')
                        : (detail?.operativa === false ? 'MALA' : 'BUENA'); // Default if online but no quality (usually 5)

                    const estado = detail?.operativa === false ? 'FALLA' : 'OPERATIVA';
                    const activacion = cam.activa ? 'ACTIVO' : 'INACTIVO';

                    // Push Row
                    rows.push({
                        "SEDE": sedeMap[cam.sede_id || ""] || "SIN SEDE",
                        "NAVE - FUNDO": cam.nave_fundo || "-",
                        "FECHA": checklist.fecha,
                        "TURNO": checklist.turno || "-",
                        "TIPO DE COMPONENTE": cam.tipo_componente || "-",
                        "UBICACIÓN DE COMPONENTE": cam.ubicacion || "-",
                        "ÁREA": cam.area || "-",
                        "NOMBRE DE CAMARA": cam.nombre,
                        "CODIGO DE CAMARA": cam.codigo,
                        "ACTIVACION": activacion,
                        "ESTADO": estado,
                        "CALIDAD DE IMAGEN": detail?.operativa === false ? 'MALA' : calidadLabel // Override if fail
                    });
                }
            }

            if (rows.length === 0) {
                setToast({ type: "error", message: "No se encontraron registros en este rango." });
                return;
            }

            // Create Worksheet
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte CCTV");

            // Auto-width columns (basic approximation)
            const wscols = Object.keys(rows[0]).map(k => ({ wch: k.length + 5 }));
            worksheet['!cols'] = wscols;

            // Download
            XLSX.writeFile(workbook, `REPORTE_CCTV_${startDateStr}_${endDateStr}.xlsx`);
            setToast({ type: "success", message: "Excel descargado con éxito." });
            setIsExcelModalOpen(false);

        } catch (error) {
            console.error(error);
            setToast({ type: "error", message: "Error al generar Excel: " + (error as any).message });
        }
    };



    const SignalMeter = ({ quality, active = true, forceInactive = false }: { quality: number, active?: boolean, forceInactive?: boolean }) => {
        const meta = QUALITY_LABELS[quality as QualityValue] || QUALITY_LABELS[5];
        return (
            <div className="flex items-end gap-[3px] h-4">
                {[1, 2, 3, 4].map(bar => (
                    <div
                        key={bar}
                        className={`w-[4px] rounded-t-[1px] transition-all duration-300 ${!forceInactive && active && bar <= meta.bars ? meta.barColor : 'bg-slate-200'}`}
                        style={{ height: `${bar * 25}%` }}
                    />
                ))}
            </div>
        );
    };

    const renderCameraCard = (cam: any, inAudit: boolean = false) => {
        const d = getDetalleForCamara(cam.id);
        const isOperativa = d?.operativa !== false;
        const quality = d?.calidad_imagen ?? 5;
        const meta = QUALITY_LABELS[quality as QualityValue] || QUALITY_LABELS[5];
        const incidentCount = reportes.filter(r => r.camara_id === cam.id && r.fecha_reporte.startsWith(selectedDate)).length;

        const checklistTime = d?.created_at ? new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";

        return (
            <div
                key={cam.id}
                onClick={(e) => {
                    setMenuPosition({ x: e.clientX, y: e.clientY });
                    setSelectedCameraId(cam.id);
                    setTempOperativa(isOperativa);
                    setTempCalidad(quality);
                    setActiveTab('MENU');
                    setOptionsModalOpen(true);
                }}
                className={`group bg-white p-4 rounded-2xl border transition-all cursor-pointer relative ${!isOperativa
                    ? 'bg-rose-50/80 border-rose-200'
                    : 'border-slate-200 hover:shadow-lg hover:border-blue-400'
                    }`}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                    <div className="space-y-0">
                        <div className="flex items-center gap-2">
                            <p className={`text-[8px] font-bold uppercase tracking-widest ${!isOperativa ? 'text-rose-400' : 'text-slate-400'}`}>{cam.codigo}</p>
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[7px] font-black text-slate-500 uppercase">{selectedTurno}</span>
                        </div>
                        <h4 className={`text-[11px] font-black uppercase leading-tight truncate w-28 ${!isOperativa ? 'text-rose-800' : 'text-slate-800 group-hover:text-blue-600'}`}>{cam.nombre}</h4>
                    </div>

                    {/* Incident Badge */}
                    {incidentCount > 0 && (
                        <div className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 shadow-sm border border-amber-200">
                            <AlertTriangle size={10} /> {incidentCount}
                        </div>
                    )}
                </div>

                {/* Status Indicator / Actions Overlay */}
                {!inAudit ? (
                    <>
                        {!isOperativa ? (
                            <div className="py-2.5 flex items-center justify-center gap-2 border-t border-rose-100 mt-2">
                                <XCircle size={12} className="text-rose-500" />
                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Falla de Conexión</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100/50 mt-1">
                                <div className="flex items-center gap-2">
                                    <SignalMeter quality={quality} active={isOperativa} />
                                    <span className={`text-[8px] font-black uppercase ${meta.color}`}>
                                        {meta.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock size={8} className="text-slate-300" />
                                    <span className="text-[8px] font-bold text-slate-400">{checklistTime}</span>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Audit Mode Inline Actions */
                    <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                        <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200/50">
                            <button onClick={(e) => { e.stopPropagation(); if (!isOperativa) handleToggleOperativa(cam.id, isOperativa); }} className={`px-3 py-1.5 rounded-md font-black text-[9px] uppercase ${isOperativa ? 'bg-white shadow-sm' : 'text-slate-400'}`}>OK</button>
                            <button onClick={(e) => { e.stopPropagation(); if (isOperativa) handleToggleOperativa(cam.id, isOperativa); }} className={`px-3 py-1.5 rounded-md font-black text-[9px] uppercase ${!isOperativa ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400'}`}>FAIL</button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderMainTable = (cams: typeof camaras) => {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cámara / Punto</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Zona / Área</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nave / Fundo</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Turno</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Calidad</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Incidencias</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {cams.map(cam => {
                                const d = getDetalleForCamara(cam.id);
                                const isOperativa = d?.operativa !== false;
                                const quality = d?.calidad_imagen; // Can be null
                                const displayQuality = quality !== null && quality !== undefined;
                                const meta = displayQuality ? (QUALITY_LABELS[quality as QualityValue] || QUALITY_LABELS[5]) : null;

                                const incidentCount = reportes.filter(r => r.camara_id === cam.id && r.fecha_reporte.startsWith(selectedDate)).length;

                                return (
                                    <tr
                                        key={cam.id}
                                        onClick={(e) => {
                                            setMenuPosition({ x: e.clientX, y: e.clientY });
                                            setSelectedCameraId(cam.id);
                                            setTempOperativa(isOperativa);
                                            setTempCalidad(quality);
                                            setActiveTab('MENU');
                                            setOptionsModalOpen(true);
                                        }}
                                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{cam.codigo}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{cam.nombre}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-700 uppercase tracking-widest">{cam.area || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500 uppercase tracking-widest">{cam.nave_fundo}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="px-2 py-1 rounded-lg bg-blue-50 text-[10px] font-black text-blue-600 uppercase">{selectedTurno}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`px-2 py-1 inline-flex text-[10px] leading-5 font-black rounded-full uppercase ${isOperativa ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                {isOperativa ? 'Operativa' : 'Falla'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-500">
                                            {displayQuality && isOperativa && meta ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <SignalMeter quality={quality!} active={isOperativa} />
                                                    <span className={`text-[10px] font-black uppercase ${meta.color}`}>{meta.label}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-[10px] uppercase font-bold">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-500">
                                            {incidentCount > 0 ? (
                                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-[10px] font-black">
                                                    <AlertTriangle size={12} /> {incidentCount}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-[10px] uppercase font-bold">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div >
        );
    };

    const renderAuditTable = (cams: typeof camaras) => {
        const midIndex = Math.ceil(cams.length / 2);
        const leftCol = cams.slice(0, midIndex);
        const rightCol = cams.slice(midIndex);

        const renderSingleTable = (data: typeof camaras) => (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Cámara</th>
                            <th className="px-4 py-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                            <th className="px-4 py-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Calidad</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map(cam => {
                            const d = getDetalleForCamara(cam.id);
                            const isOperativa = d?.operativa !== false;
                            const quality = d?.calidad_imagen; // Can be null

                            return (
                                <tr key={cam.id} className={`hover:bg-slate-50/50 transition-colors ${!isOperativa ? 'bg-rose-50/30' : ''}`}>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">{cam.codigo}</span>
                                                <span className="px-1 py-0.5 rounded bg-slate-100 text-[7px] font-black text-slate-500 uppercase">{selectedTurno}</span>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-800 uppercase truncate max-w-[120px]">{cam.nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-center">
                                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 w-fit shrink-0">
                                                <button
                                                    onClick={() => { if (!isOperativa) handleToggleOperativa(cam.id, isOperativa); }}
                                                    className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${isOperativa ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'}`}
                                                >
                                                    OK
                                                </button>
                                                <button
                                                    onClick={() => { if (isOperativa) handleToggleOperativa(cam.id, isOperativa); }}
                                                    className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${!isOperativa ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400'}`}
                                                >
                                                    FAIL
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-center gap-1">
                                            {isOperativa ? (
                                                [1, 3, 5].map(q => (
                                                    <button
                                                        key={q}
                                                        onClick={() => handleSetCalidad(cam.id, q)}
                                                        className={`px-2 py-1.5 min-w-[45px] flex items-center justify-center rounded text-[9px] font-black uppercase transition-all ${quality === q
                                                            ? `${QUALITY_LABELS[q as QualityValue]?.bg} text-white shadow-md`
                                                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200/50'}`}
                                                    >
                                                        {QUALITY_LABELS[q as QualityValue]?.label}
                                                    </button>
                                                ))
                                            ) : (
                                                <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest py-1.5 flex items-center justify-center">Falla</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );

        return (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                {renderSingleTable(leftCol)}
                {rightCol.length > 0 && renderSingleTable(rightCol)}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Centro de Control CCTV
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Gestión operativa multisede y auditoría técnica de cámaras
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsExcelModalOpen(true)}
                        className="bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <Grid size={16} /> Exportar Excel
                    </button>
                    <button
                        onClick={handleExportPdf}
                        className="bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <FileDown size={16} /> Exportar PDF
                    </button>
                    <button
                        onClick={() => setIsAuditModalOpen(true)}
                        className="bg-[#ff0000] text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-all flex items-center gap-2"
                    >
                        <CheckSquare size={16} /> {currentChecklistId ? "Continuar Checklist" : "Iniciar Checklist"}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-6">

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Sistema</label>
                    <select
                        value={selectedCentral}
                        onChange={(e) => { setSelectedCentral(e.target.value); setSelectedSede('ALL'); setSelectedZona('ALL'); }}
                        className="bg-white border border-slate-300 text-sm font-semibold px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[150px] appearance-none"
                    >
                        {centrales.map(sys => <option key={sys.id} value={sys.id}>{sys.nombre}</option>)}
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Sede</label>
                    <div className="relative">
                        <Building2 size={14} className="absolute left-3 top-3 text-slate-400" />
                        <select
                            value={selectedSede}
                            onChange={(e) => { setSelectedSede(e.target.value); setSelectedZona('ALL'); }}
                            className="bg-white border border-slate-300 text-sm font-semibold pl-9 pr-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[200px] appearance-none"
                        >
                            <option value="ALL">Todas las sedes</option>
                            {availableSedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Zona</label>
                    <div className="relative">
                        <Filter size={14} className="absolute left-3 top-3 text-slate-400" />
                        <select
                            value={selectedZona}
                            onChange={(e) => setSelectedZona(e.target.value)}
                            className="bg-white border border-slate-300 text-sm font-semibold pl-9 pr-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[180px] appearance-none"
                        >
                            <option value="ALL">Todas las zonas</option>
                            {availableZonas.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Fecha</label>
                    <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-white border border-slate-300 text-sm font-semibold pl-9 pr-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Turno</label>
                    <div className="relative">
                        <Clock size={14} className="absolute left-3 top-3 text-slate-400" />
                        <select
                            value={selectedTurno}
                            onChange={(e) => setSelectedTurno(e.target.value)}
                            className="bg-white border border-slate-300 text-sm font-semibold pl-9 pr-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[120px] appearance-none"
                        >
                            <option value="MAÑANA">Mañana</option>
                            <option value="TARDE">Tarde</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 ml-auto">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Vista</label>
                    <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200/50 w-fit">
                        <button
                            onClick={() => setViewMode('CARDS')}
                            className={`w-12 h-9 flex items-center justify-center rounded-lg transition-all duration-200 ${viewMode === 'CARDS'
                                ? 'bg-white text-blue-600 shadow-md shadow-blue-900/5 border border-slate-200/50'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                            title="Tarjetas"
                        >
                            <Grid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('TABLE')}
                            className={`w-12 h-9 flex items-center justify-center rounded-lg transition-all duration-200 ${viewMode === 'TABLE'
                                ? 'bg-white text-blue-600 shadow-md shadow-blue-900/5 border border-slate-200/50'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                            title="Tabla"
                        >
                            <List size={20} />
                        </button>
                    </div>
                </div>

            </div>

            {/* Dashboard Stats */}
            {
                currentChecklistId && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 px-1 mt-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Equipos</p>
                            <p className="text-3xl font-black text-slate-900">{statsCameras.length}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Operativas</p>
                            <p className="text-3xl font-black text-emerald-600">
                                {statsCameras.filter(c => getDetalleForCamara(c.id)?.operativa !== false).length}
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200">
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Fallas</p>
                            <p className="text-3xl font-black text-rose-600">
                                {statsCameras.filter(c => getDetalleForCamara(c.id)?.operativa === false).length}
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-col justify-center gap-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Calidad Imagen</p>
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Óptima:</span>
                                <span>{statsCameras.filter(c => { const d = getDetalleForCamara(c.id); return d?.operativa !== false && (d?.calidad_imagen || 5) >= 5; }).length}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Regular:</span>
                                <span>{statsCameras.filter(c => { const d = getDetalleForCamara(c.id); return d?.operativa !== false && (d?.calidad_imagen || 5) === 3; }).length}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Baja:</span>
                                <span>{statsCameras.filter(c => { const d = getDetalleForCamara(c.id); return d?.operativa !== false && (d?.calidad_imagen || 5) === 1; }).length}</span>
                            </div>
                        </div>
                        <div className="bg-slate-900 p-5 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Salud General</p>
                            <div className="flex items-end gap-2">
                                <p className="text-3xl font-black text-white">
                                    {statsCameras.length > 0 ? ((statsCameras.filter(c => getDetalleForCamara(c.id)?.operativa !== false).length / statsCameras.length) * 100).toFixed(1) : "0.0"}%
                                </p>
                                <div className="h-8 w-px bg-slate-700 mx-2"></div>
                                <Activity className="text-blue-400 mb-1" size={24} />
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Search Bar - Relocated */}
            <div className="px-1 mt-4 mb-2">
                <div className="relative">
                    <Search size={16} className="absolute left-4 top-3.5 text-slate-400" />
                    <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Filtrar tarjetas o lista por código / nombre..."
                        className="w-full bg-white border border-slate-200 text-sm font-semibold pl-11 pr-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>
            </div>

            {/* Main Content Areas */}
            <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
                {!currentChecklistId ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <ShieldCheck size={40} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-2">Sin Checklist Registrado</h3>
                        <p className="text-xs font-bold text-slate-400 max-w-xs uppercase">Por favor, presione "Iniciar Checklist" para comenzar el registro de este turno.</p>
                    </div>
                ) : (
                    <div className="space-y-10 pb-20">
                        {viewMode === 'CARDS' ? (
                            (Object.entries(groupCamerasByZona(filteredCameras)) as [string, typeof camaras][]).map(([zona, cams]) => (
                                <div key={zona} className="space-y-5">
                                    <div className="flex items-center gap-4">
                                        <div className="h-px flex-1 bg-slate-200"></div>
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">{zona}</h3>
                                        <div className="h-px flex-1 bg-slate-200"></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                        {cams.map(cam => renderCameraCard(cam))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            (Object.entries(groupCamerasByZona(filteredCameras)) as [string, typeof camaras][]).map(([zona, cams]) => (
                                <div key={zona} className="space-y-4 mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-slate-100 p-1.5 rounded-lg">
                                            <Grid size={14} className="text-slate-400" />
                                        </div>
                                        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">{zona}</h3>
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                        <span className="text-[9px] font-bold text-slate-300 uppercase">{cams.length} Equipos</span>
                                    </div>
                                    {renderMainTable(cams)}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Modal Actions */}
            {
                optionsModalOpen && selectedCameraId && (
                    <>
                        {/* CONDITIONAL RENDERING: Context Menu vs Full Modal */}
                        {activeTab === 'MENU' ? (
                            /* CONTEXTUAL MENU (No Blur, Positioned) */
                            <>
                                {/* Transparent Backdrop to close on click-outside */}
                                <div
                                    className="fixed inset-0 z-[60]"
                                    onClick={() => setOptionsModalOpen(false)}
                                />

                                {/* Positioned Menu */}
                                <div
                                    style={{
                                        top: Math.min(menuPosition?.y || 0, window.innerHeight - 200), // Prevent going off bottom
                                        left: Math.min(menuPosition?.x || 0, window.innerWidth - 250) // Prevent going off right
                                    }}
                                    className="fixed z-[61] w-64 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1"
                                >
                                    <div className="px-3 py-2 border-b border-slate-50 mb-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{camaras.find(c => c.id === selectedCameraId)?.codigo}</p>
                                        <p className="text-[11px] font-bold text-slate-700 truncate">{camaras.find(c => c.id === selectedCameraId)?.nombre}</p>
                                    </div>

                                    <button
                                        onClick={() => setActiveTab('STATUS')}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 text-left transition-colors group"
                                    >
                                        <div className="bg-blue-50 text-blue-600 p-1.5 rounded-md group-hover:bg-blue-100 transition-colors"><Activity size={16} /></div>
                                        <div>
                                            <h4 className="text-[11px] font-black text-slate-700 uppercase">Estado y Calidad</h4>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('ISSUES')}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 text-left transition-colors group"
                                    >
                                        <div className="bg-amber-50 text-amber-600 p-1.5 rounded-md group-hover:bg-amber-100 transition-colors"><AlertTriangle size={16} /></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-[11px] font-black text-slate-700 uppercase">Reportar Incidencia</h4>
                                                {reportes.filter(r => r.camara_id === selectedCameraId && r.fecha_reporte.startsWith(selectedDate)).length > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 rounded text-[8px] font-black">{reportes.filter(r => r.camara_id === selectedCameraId && r.fecha_reporte.startsWith(selectedDate)).length}</span>}
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* FULL LARGE MODAL (Status or Issues) - WITH BLUR */
                            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
                                <div className="bg-white rounded-[2rem] w-full max-w-lg border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                                    {/* Modal Header */}
                                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${tempOperativa ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                                <Signal size={28} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{camaras.find(c => c.id === selectedCameraId)?.nombre}</h3>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{camaras.find(c => c.id === selectedCameraId)?.codigo} • {camaras.find(c => c.id === selectedCameraId)?.nave_fundo}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setOptionsModalOpen(false)} className="p-3 text-slate-400 hover:bg-slate-50 rounded-full transition-all"><X size={24} /></button>
                                    </div>

                                    {/* Modal Body */}
                                    <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 custom-scrollbar">

                                        {/* TAB: STATUS */}
                                        {activeTab === 'STATUS' && (
                                            <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
                                                <div className="grid grid-cols-2 gap-6">

                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estatus Operativo</label>
                                                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 h-14">
                                                            <button onClick={() => setTempOperativa(true)} className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-xs font-black uppercase transition-all ${tempOperativa ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>
                                                                <div className={`w-2 h-2 rounded-full ${tempOperativa ? 'bg-emerald-500' : 'bg-slate-300'}`} /> Online
                                                            </button>
                                                            <button onClick={() => setTempOperativa(false)} className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-xs font-black uppercase transition-all ${!tempOperativa ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>
                                                                <div className={`w-2 h-2 rounded-full ${!tempOperativa ? 'bg-rose-500' : 'bg-slate-300'}`} /> Falla
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Calidad de Video</label>
                                                        <select
                                                            disabled={!tempOperativa}
                                                            value={tempCalidad}
                                                            onChange={(e) => setTempCalidad(parseInt(e.target.value))}
                                                            className="w-full h-14 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100"
                                                        >
                                                            {Object.entries(QUALITY_LABELS).map(([v, data]) => <option key={v} value={v}>{data.label}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-blue-800 flex items-start gap-3">
                                                    <div className="mt-0.5"><ShieldCheck size={18} /></div>
                                                    <div>
                                                        <h4 className="text-[11px] font-black uppercase tracking-wider mb-1">Auditoría en Progreso</h4>
                                                        <p className="text-xs opacity-80 leading-relaxed">Cambios realizados aquí se reflejarán en el checklist actual ({selectedTurno}). Recuerde sincronizar al finalizar la ronda.</p>
                                                    </div>
                                                </div>

                                                <div className="pt-4 flex gap-3">
                                                    <button
                                                        disabled={isSavingModal}
                                                        onClick={async () => {
                                                            if (isSavingModal) return;
                                                            setIsSavingModal(true);
                                                            try {
                                                                const existing = detalles.find(d => d.checklist_id === currentChecklistId && d.camara_id === selectedCameraId);
                                                                await upsertChecklistDetalle({
                                                                    id: existing?.id,
                                                                    checklist_id: currentChecklistId!,
                                                                    camara_id: selectedCameraId!,
                                                                    operativa: tempOperativa,
                                                                    calidad_imagen: tempCalidad,
                                                                });
                                                                setToast({ type: "success", message: "Estado actualizado." });
                                                                setOptionsModalOpen(false);
                                                            } catch (error) {
                                                                setToast({ type: "error", message: "Error al guardar." });
                                                            } finally {
                                                                setIsSavingModal(false);
                                                            }
                                                        }}
                                                        className="w-full bg-slate-900 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                                                    >
                                                        {isSavingModal ? 'Guardando...' : 'Guardar Estado'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB: ISSUES & HISTORY */}
                                        {activeTab === 'ISSUES' && (
                                            <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">

                                                {/* New Report Form */}
                                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="bg-amber-100 text-amber-600 p-1.5 rounded-lg"><MessageSquarePlus size={16} /></div>
                                                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Nuevo Reporte Técnico</h4>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase">Tipo de Incidente</label>
                                                            <select
                                                                value={incidentType}
                                                                onChange={e => setIncidentType(e.target.value)}
                                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                                                            >
                                                                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase">Descripción / Observaciones</label>
                                                            <textarea
                                                                value={newIncidentDesc}
                                                                onChange={e => setNewIncidentDesc(e.target.value)}
                                                                placeholder="Detalles técnicos de la falla..."
                                                                className="w-full h-20 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    <button
                                                        disabled={!newIncidentDesc.trim() || isSavingModal}
                                                        onClick={async () => {
                                                            if (isSavingModal) return;
                                                            setIsSavingModal(true);
                                                            try {
                                                                await createReporte({
                                                                    camara_id: selectedCameraId!,
                                                                    tipo_incidente: incidentType,
                                                                    descripcion: newIncidentDesc,
                                                                    usuario_id: user?.id || null
                                                                });
                                                                setNewIncidentDesc('');
                                                                setToast({ type: "success", message: "Incidencia reportada." });
                                                            } catch (error) {
                                                                setToast({ type: "error", message: "Error al crear reporte." });
                                                            } finally {
                                                                setIsSavingModal(false);
                                                            }
                                                        }}
                                                        className="w-full bg-amber-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isSavingModal ? 'Registrando...' : 'Registrar Incidencia'}
                                                    </button>
                                                </div>

                                                {/* History List */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historial de Reportes</h4>
                                                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px] font-bold">{reportes.filter(r => r.camara_id === selectedCameraId && r.fecha_reporte.startsWith(selectedDate)).length} Total</span>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {reportes.filter(r => r.camara_id === selectedCameraId && r.fecha_reporte.startsWith(selectedDate)).length === 0 ? (
                                                            <div className="text-center py-8 opacity-50">
                                                                <ShieldCheck size={32} className="mx-auto text-slate-300 mb-2" />
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Sin historial de fallas</p>
                                                            </div>
                                                        ) : (
                                                            reportes.filter(r => r.camara_id === selectedCameraId && r.fecha_reporte.startsWith(selectedDate)).map(rep => (
                                                                <div key={rep.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 group">
                                                                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${rep.resuelto ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                                    <div className="flex-1 space-y-1">
                                                                        <div className="flex justify-between items-start">
                                                                            <span className="text-[10px] font-black uppercase text-slate-800">{rep.tipo_incidente}</span>
                                                                            <span className="text-[9px] font-bold text-slate-400">{new Date(rep.fecha_reporte).toLocaleDateString()}</span>
                                                                        </div>
                                                                        <p className="text-[11px] text-slate-600 leading-snug">{rep.descripcion}</p>
                                                                        <div className="pt-2 flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${rep.resuelto ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                                                    {rep.resuelto ? 'Resuelto' : 'Pendiente'}
                                                                                </span>
                                                                                {rep.usuario_id && <span className="text-[8px] text-slate-400 uppercase font-bold flex items-center gap-1"><User size={8} /> Tech ID: {rep.usuario_id.slice(0, 4)}</span>}
                                                                            </div>
                                                                            <button
                                                                                onClick={async (e) => {
                                                                                    e.stopPropagation();
                                                                                    if (confirm("¿Estás seguro de eliminar este reporte permanentemente?")) {
                                                                                        try {
                                                                                            await deleteReporte(rep.id);
                                                                                            setToast({ type: "success", message: "Reporte eliminado." });
                                                                                        } catch (err) {
                                                                                            setToast({ type: "error", message: "Error al eliminar." });
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                                                                                title="Eliminar Reporte"
                                                                            >
                                                                                <Trash2 size={12} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )
            }

            {/* Modal: Checklist Auditoría */}
            {
                isAuditModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[70] animate-in fade-in duration-300">
                        <div className="bg-white rounded-[1.5rem] w-full max-w-7xl max-h-[95vh] flex flex-col border border-slate-300 overflow-hidden">
                            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-600 p-2.5 rounded-xl text-white"><ShieldCheck size={20} /></div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Checklist de Auditoría Técnica</h3>
                                        <p className="text-blue-600 text-[9px] font-bold uppercase tracking-[0.3em] mt-0.5">{centrales.find(c => c.id === selectedCentral)?.nombre} • Ronda de Seguridad</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                                        <button
                                            onClick={() => setViewMode('CARDS')}
                                            className={`w-10 h-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'CARDS'
                                                ? 'bg-white shadow-sm text-blue-600 border border-slate-200/50'
                                                : 'text-slate-400 hover:text-slate-600'}`}
                                            title="Vista Tarjetas"
                                        >
                                            <Grid size={18} />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('TABLE')}
                                            className={`w-10 h-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'TABLE'
                                                ? 'bg-white shadow-sm text-blue-600 border border-slate-200/50'
                                                : 'text-slate-400 hover:text-slate-600'}`}
                                            title="Vista Tabla"
                                        >
                                            <List size={18} />
                                        </button>
                                    </div>
                                    <button onClick={() => setIsAuditModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={24} /></button>
                                </div>
                            </div>

                            <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
                                    <User size={16} className="text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Nombre del Operador Responsable..."
                                        className="flex-1 bg-transparent text-xs font-bold outline-none text-slate-800"
                                        value={supervisorName}
                                        onChange={e => setSupervisorName(e.target.value)}
                                    />
                                </div>
                                <div className="flex bg-white border border-slate-200 p-1 rounded-lg h-11">
                                    <div className="flex-1 flex items-center justify-center text-[10px] font-black uppercase rounded text-slate-900">
                                        Turno: {selectedTurno}
                                    </div>
                                    <div className="w-px bg-slate-100 h-full mx-2"></div>
                                    <div className="flex-1 flex items-center justify-center text-[10px] font-black uppercase rounded text-slate-400">
                                        {selectedDate}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white custom-scrollbar">
                                {viewMode === 'CARDS' ? (
                                    (Object.entries(groupCamerasByZona(filteredCameras)) as [string, typeof camaras][]).map(([zona, cams]) => (
                                        <div key={zona} className="space-y-4">
                                            <div className="flex flex-col border-l-[3px] border-blue-600 pl-3">
                                                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">{zona}</h4>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">{centrales.find(c => c.id === selectedCentral)?.nombre}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                                {cams.map(cam => (
                                                    <div key={cam.id} className="transform scale-[0.95] origin-top-left">
                                                        {renderCameraCard(cam, true)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    (Object.entries(groupCamerasByZona(filteredCameras)) as [string, typeof camaras][]).map(([zona, cams]) => (
                                        <div key={zona} className="space-y-4">
                                            <div className="flex flex-col border-l-[3px] border-blue-600 pl-3">
                                                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">{zona}</h4>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">{centrales.find(c => c.id === selectedCentral)?.nombre}</span>
                                            </div>
                                            {renderAuditTable(cams)}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-5 border-t border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <ShieldCheck size={16} className="text-emerald-500" />
                                    <p className="text-[10px] font-bold uppercase tracking-wider">Sincronización en tiempo real.</p>
                                </div>
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button onClick={() => setIsAuditModalOpen(false)} className="px-6 py-2.5 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600">Abortar</button>
                                    <button onClick={handleSaveAndFlush} className="px-10 py-2.5 bg-slate-900 text-white font-black rounded-lg text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">Sincronizar Auditoría</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            {/* Excel Export Modal */}
            {isExcelModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase">Exportar a Excel</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Seleccione Rango de Fechas</p>
                            </div>
                            <button onClick={() => setIsExcelModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-8 flex flex-col items-center gap-6">
                            <div className="w-full flex justify-center">
                                <DateRangePicker
                                    onChange={(range) => setExportRange(range)}
                                    initialStart={exportRange.start}
                                    initialEnd={exportRange.end}
                                />
                            </div>

                            <div className="w-full bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <p className="text-xs text-blue-800 font-medium text-center">
                                    Se descargará el reporte detallado de auditorías para la central <strong>{centrales.find(c => c.id === selectedCentral)?.nombre}</strong>.
                                </p>
                            </div>

                            <button
                                onClick={handleExportExcel}
                                disabled={!exportRange.start || !exportRange.end}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                <FileDown size={20} />
                                Descargar Reporte
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
