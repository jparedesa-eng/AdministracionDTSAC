import { useState, useEffect, useMemo } from "react";
import {
    Plus,
    Search,
    PencilLine,
    Power,
    Building2,
    Camera,
    MapPin,
    Activity,
    Monitor
} from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { PaginationFooter } from "../../components/ui/PaginationFooter";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { getSedesState, subscribeSedes } from "../../store/sedesStore";
import { getCentralesState, subscribeCentrales } from "../../store/cctvCentralesStore";
import { getCamarasState, subscribeCamaras, upsertCamara, type Camara } from "../../store/camarasStore";
import { getChecklistDataRange } from "../../store/checklistCamarasStore";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown } from "lucide-react";

export default function InventarioCamaras() {
    const [, setSedesVersion] = useState(0);
    const [, setCentralesVersion] = useState(0);
    const [, setCamarasVersion] = useState(0);

    useEffect(() => {
        const unsubSedes = subscribeSedes(() => setSedesVersion(prev => prev + 1));
        const unsubCentrales = subscribeCentrales(() => setCentralesVersion(prev => prev + 1));
        const unsubCamaras = subscribeCamaras(() => setCamarasVersion(prev => prev + 1));

        return () => {
            unsubSedes();
            unsubCentrales();
            unsubCamaras();
        };
    }, []);

    const { sedes } = getSedesState();
    const { centrales } = getCentralesState();
    const { camaras } = getCamarasState();

    const [toast, setToast] = useState<ToastState>(null);

    return (
        <div className="space-y-6 pb-20">
            <Toast toast={toast} onClose={() => setToast(null)} />

            {/* Header moved inside TabCamaras for layout alignment */}

            {/* Content */}
            <div className="min-h-[400px]">
                <TabCamaras
                    sedes={sedes}
                    centrales={centrales}
                    camaras={camaras}
                    setToast={setToast}
                    onAdd={async (data) => {
                        try {
                            await upsertCamara(data);
                            setToast({ type: "success", message: "Cámara creada correctamente." });
                        } catch (error: any) {
                            setToast({ type: "error", message: error.message || "Error al crear cámara." });
                        }
                    }}
                    onUpdate={async (id, data) => {
                        try {
                            const camara = camaras.find(c => c.id === id);
                            if (!camara) return;
                            await upsertCamara({
                                ...camara,
                                ...data,
                                id,
                            });
                            setToast({ type: "success", message: "Cámara actualizada." });
                        } catch (error: any) {
                            setToast({ type: "error", message: error.message || "Error al actualizar cámara." });
                        }
                    }}
                />
            </div>
        </div>
    );
}

// ===== TAB CAMARAS =====

function TabCamaras({
    sedes,
    centrales,
    camaras,
    onAdd,
    onUpdate,
    setToast
}: {
    sedes: { id: string, nombre: string }[];
    centrales: any[];
    camaras: Camara[];
    onAdd: (data: any) => void;
    onUpdate: (id: string, data: Partial<Camara>) => void;
    setToast: (toast: ToastState) => void;
}) {
    const [search, setSearch] = useState("");
    const [filterSede, setFilterSede] = useState("");
    const [filterCentral, setFilterCentral] = useState("");
    const [filterTipo, setFilterTipo] = useState("");
    const [filterUbicacion, setFilterUbicacion] = useState("");
    const [filterEstado, setFilterEstado] = useState<"all" | "activa" | "inactiva">("all");
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<Camara | null>(null);

    // Status Modal State
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [statusItem, setStatusItem] = useState<Camara | null>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Report State
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportWeek, setReportWeek] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const onejan = new Date(year, 0, 1);
        const week = Math.ceil((((now.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
        return `${year}-W${week.toString().padStart(2, '0')}`;
    });
    const [reportCentralId, setReportCentralId] = useState("");

    const handleDownloadWeeklyReport = async () => {
        if (!reportWeek || !reportCentralId) return;

        try {
            setToast({ type: "success", message: "Generando reporte PDF, por favor espere..." });

            // 1. Calculate Date Range
            const [yearStr, weekStr] = reportWeek.split("-W");
            const year = parseInt(yearStr);
            const week = parseInt(weekStr);

            const simple = new Date(year, 0, 1 + (week - 1) * 7);
            const dow = simple.getDay();
            const ISOweekStart = simple;
            if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
            else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

            const startDate = ISOweekStart.toISOString().split('T')[0];
            const endObj = new Date(ISOweekStart);
            endObj.setDate(endObj.getDate() + 6);
            const endDate = endObj.toISOString().split('T')[0];

            // 2. Fetch Data
            const data = await getChecklistDataRange(startDate, endDate, reportCentralId);

            // 3. Prepare PDF
            const doc = new jsPDF('l', 'mm', 'a4');
            const centralName = centrales.find(c => c.id === reportCentralId)?.nombre || "CENTRAL";

            // Load Logo
            try {
                const getImageData = (url: string) => {
                    return new Promise<HTMLImageElement>((resolve, reject) => {
                        const img = new Image();
                        img.crossOrigin = "Anonymous";
                        img.onload = () => resolve(img);
                        img.onerror = reject;
                        img.src = url;
                    });
                };

                // Using PNG for better PDF compatibility
                const logoImg = await getImageData('/logo-danper-rojo.png');
                const logoWidth = 20;
                const logoHeight = logoWidth * (logoImg.height / logoImg.width);
                doc.addImage(logoImg, 'PNG', 14, 15, logoWidth, logoHeight);
            } catch (e) {
                console.warn("No se pudo cargar el logo", e);
            }
            // Header Text (Shifted right to avoid logo)
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(0, 0, 0);
            doc.text(`REPORTE SEMANAL CCTV - ${centralName}`, 42, 22);

            doc.setFontSize(14);
            doc.text(`SEMANA: ${reportWeek}`, 42, 29);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.text(`Período: ${startDate} al ${endDate}`, 42, 35);

            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(`Generado: ${new Date().toLocaleString()}`, 280, 15, { align: 'right' });
            doc.setTextColor(0);



            // Matriz Operativa
            const days: string[] = [];
            const cur = new Date(ISOweekStart);

            // Header Row 1: Grouped Headers
            const headRow1: any[] = [
                { content: 'DATOS DE LA CÁMARA', colSpan: 3, styles: { halign: 'center', fillColor: [15, 23, 42] } }
            ];

            // Header Row 2: Sub Headers
            const headRow2: any[] = ["CÁMARA", "ÁREA", "NAVE"];

            for (let i = 0; i < 7; i++) {
                days.push(new Date(cur).toISOString().split('T')[0]);
                const dayName = cur.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });

                // Add Day Header spanning 2 cols
                headRow1.push({ content: dayName.toUpperCase(), colSpan: 2, styles: { halign: 'center', fillColor: [51, 65, 85] } });

                // Add Sub Headers
                headRow2.push("ESTADO\n(M / T)");
                headRow2.push("CALIDAD\n(M / T)");

                cur.setDate(cur.getDate() + 1);
            }

            const detailsMap: Record<string, Record<string, Record<string, any>>> = {};
            data.checklists.forEach(cl => {
                const clDetails = data.detalles.filter(d => d.checklist_id === cl.id);
                clDetails.forEach(d => {
                    if (!detailsMap[d.camara_id]) detailsMap[d.camara_id] = {};
                    if (!detailsMap[d.camara_id][cl.fecha]) detailsMap[d.camara_id][cl.fecha] = {};
                    detailsMap[d.camara_id][cl.fecha][cl.turno!] = {
                        operativa: d.operativa,
                        calidad: d.calidad_imagen
                    };
                });
            });

            const rows: any[] = [];
            const allCentralCameras = camaras.filter(c => c.central_id === reportCentralId && c.activa);

            const getQualityLabel = (q: number | null) => {
                if (q === null) return "-";
                if (q >= 4) return "Good";
                if (q === 3) return "Fair";
                return "Poor";
            };

            allCentralCameras.forEach(cam => {
                const row = [cam.nombre, cam.area || "-", cam.nave_fundo || "-"];
                days.forEach(d => {
                    const mInfo = detailsMap[cam.id]?.[d]?.["MAÑANA"];
                    const tInfo = detailsMap[cam.id]?.[d]?.["TARDE"];

                    // Col 1: Estado (M / T)
                    const mOp = mInfo ? (mInfo.operativa ? "OK" : "F") : "-";
                    const tOp = tInfo ? (tInfo.operativa ? "OK" : "F") : "-";
                    row.push(`${mOp} / ${tOp}`);

                    // Col 2: Calidad (M / T)
                    const mCal = mInfo ? getQualityLabel(mInfo.calidad) : "-";
                    const tCal = tInfo ? getQualityLabel(tInfo.calidad) : "-";
                    row.push(`${mCal}\n${tCal}`);
                });
                rows.push(row);
            });

            /* @ts-ignore */
            autoTable(doc, {
                startY: 45,
                head: [headRow1, headRow2],
                body: rows,
                theme: 'grid',
                styles: { fontSize: 5, cellPadding: 1, halign: 'center', valign: 'middle', lineWidth: 0.1 },
                headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 6 },
                columnStyles: {
                    0: { halign: 'left', cellWidth: 25, fontStyle: 'bold' }, // Camara
                    1: { halign: 'left', cellWidth: 15 }, // Area
                    2: { halign: 'left', cellWidth: 15 }, // Nave
                },
                didParseCell: function (data: any) {
                    if (data.section === 'body' && data.column.index > 2) {
                        const text = data.cell.raw as string;

                        // Check if it's an OP column (index 3, 5, 7...)
                        const isOpCol = (data.column.index - 3) % 2 === 0;

                        if (isOpCol) {
                            if (text.includes("F")) {
                                data.cell.styles.fillColor = [254, 202, 202]; // Light Red Bg
                                data.cell.styles.textColor = [185, 28, 28];
                                data.cell.styles.fontStyle = 'bold';
                            } else if (text.includes("OK")) {
                                data.cell.styles.fillColor = [220, 252, 231]; // Light Green Bg
                                data.cell.styles.textColor = [21, 128, 61];
                            }
                        } else {
                            // Quality Column
                            if (text.includes("Poor")) {
                                data.cell.styles.fillColor = [254, 202, 202]; // Light Red Bg
                                data.cell.styles.textColor = [185, 28, 28];
                                data.cell.styles.fontStyle = 'bold';
                            } else if (text.includes("Fair")) {
                                data.cell.styles.fillColor = [254, 249, 195]; // Light Yellow Bg
                                data.cell.styles.textColor = [161, 98, 7];
                            } else if (text.includes("Good")) {
                                data.cell.styles.fillColor = [220, 252, 231]; // Light Green Bg
                                data.cell.styles.textColor = [21, 128, 61];
                            }
                        }
                    }
                }

            });

            // Resumen Gerencial
            doc.addPage();
            doc.setFontSize(14);
            doc.text("Resumen Gerencial y Estadísticas", 14, 15);

            let totalChecks = 0;
            let totalFails = 0;
            data.checklists.forEach(cl => {
                const dets = data.detalles.filter(d => d.checklist_id === cl.id);
                totalChecks += dets.length;
                totalFails += dets.filter(d => !d.operativa).length;
            });
            const operability = totalChecks > 0 ? ((1 - (totalFails / totalChecks)) * 100).toFixed(2) + "%" : "0%";

            /* @ts-ignore */
            /* @ts-ignore */
            autoTable(doc, {
                startY: 20,
                head: [["INDICADOR", "VALOR"]],
                body: [
                    ["Total Revisiones Puntos de Control", totalChecks],
                    ["Total Fallas Detectadas", totalFails],
                    ["Operatividad Promedio Semanal", operability],
                    ["Total Incidentes Reportados", data.reportes.length],
                ],
                theme: 'striped',
                headStyles: { fillColor: [51, 65, 85] },
                tableWidth: 120
            });

            // Incidentes
            /* @ts-ignore */
            const finalY = (doc as any).lastAutoTable.finalY + 15;
            doc.setFontSize(12);
            doc.text("Historial de Incidencias", 14, finalY);

            const incidentRows = data.reportes
                .filter(rep => allCentralCameras.some(c => c.id === rep.camara_id))
                .map(rep => {
                    const cam = camaras.find(c => c.id === rep.camara_id);
                    return [
                        rep.fecha_reporte.split('T')[0],
                        new Date(rep.fecha_reporte).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        cam ? cam.nombre : "Desconocida",
                        rep.tipo_incidente,
                        rep.descripcion || ""
                    ];
                });

            /* @ts-ignore */
            /* @ts-ignore */
            autoTable(doc, {
                startY: finalY + 5,
                head: [["FECHA", "HORA", "CÁMARA", "TIPO", "DESCRIPCIÓN"]],
                body: incidentRows.length > 0 ? incidentRows : [["-", "-", "-", "Sin incidentes", "-"]],
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [180, 83, 9], textColor: 255 },
                columnStyles: { 4: { cellWidth: 'auto' } }
            });

            // Reportes Mayores (Eventos CCTV)
            /* @ts-ignore */
            const majorY = (doc as any).lastAutoTable.finalY + 15;

            // Check if we need new page
            let nextStart: number;
            if (majorY > 180) {
                doc.addPage();
                doc.text("Registro de Eventos Mayores", 14, 15);
                nextStart = 20;
            } else {
                doc.text("Registro de Eventos Mayores", 14, majorY);
                nextStart = majorY + 5;
            }

            const majorRows = (data.eventosMayores || []).map((ev: any) => {
                const sede = sedes.find(s => s.id === ev.sede_id)?.nombre || "---";
                return [
                    ev.fecha_evento,
                    new Date(ev.fecha_hora_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    sede,
                    ev.tipo_evento,
                    ev.descripcion || "",
                    ev.estado
                ];
            });

            /* @ts-ignore */
            autoTable(doc, {
                startY: nextStart,
                head: [["FECHA", "HORA", "SEDE", "EVENTO", "DETALLE", "ESTADO"]],
                body: majorRows.length > 0 ? majorRows : [["-", "-", "-", "Sin eventos mayores", "-", "-"]],
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [185, 28, 28] },
            });

            /* @ts-ignore */
            /* @ts-ignore */
            autoTable(doc, {
                startY: nextStart,
                head: [["FECHA", "CÁMARA", "TIPO", "DETALLE"]],
                body: majorRows.length > 0 ? majorRows : [["-", "-", "Sin reportes mayores", "-"]],
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [185, 28, 28] },
            });

            doc.save(`Reporte_Semanal_${reportWeek}_${centralName}.pdf`);
            setToast({ type: "success", message: "Reporte PDF descargado correctamente." });
            setReportModalOpen(false);

        } catch (error: any) {
            console.error(error);
            setToast({ type: "error", message: "Error al generar reporte: " + (error.message || "Error desconocido") });
        }
    };

    const [formData, setFormData] = useState({
        codigo: "",
        nombre: "",
        central_id: "",
        sede_id: "",
        nave_fundo: "",
        tiempo_respaldo: "",
        marca: "",
        tipo_componente: "" as "" | "CAMARA FIJA" | "CAMARA DOMO",
        ubicacion: "" as "" | "INTERIOR" | "EXTERIOR",
        fecha_instalacion: "",
        area: "",
    });

    const filtered = camaras.filter(c => {
        const matchSearch = c.codigo.toLowerCase().includes(search.toLowerCase()) ||
            c.nombre.toLowerCase().includes(search.toLowerCase());

        // Trim IDs for robust comparison
        const cSedeId = (c.sede_id || "").trim();
        const fSedeId = filterSede.trim();
        const cCentralId = (c.central_id || "").trim();
        const fCentralId = filterCentral.trim();

        const matchSede = !fSedeId || cSedeId === fSedeId;
        const matchCentral = !fCentralId || cCentralId === fCentralId;
        const matchTipo = !filterTipo || c.tipo_componente === filterTipo;
        const matchUbicacion = !filterUbicacion || c.ubicacion === filterUbicacion;
        const matchEstado = filterEstado === "all" ||
            (filterEstado === "activa" && c.activa) ||
            (filterEstado === "inactiva" && !c.activa);

        return matchSearch && matchSede && matchCentral && matchTipo && matchUbicacion && matchEstado;
    }).sort((a, b) => {
        const partsA = a.codigo.split('-');
        const partsB = b.codigo.split('-');

        // Try to extract the number part (CAM-XXX-...)
        if (partsA.length >= 2 && partsB.length >= 2) {
            const numA = parseInt(partsA[1], 10);
            const numB = parseInt(partsB[1], 10);

            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
        }

        return a.codigo.localeCompare(b.codigo);
    });

    // Pagination Logic
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const start = (page - 1) * pageSize;
    const currentRows = pageSize === -1 ? filtered : filtered.slice(start, start + pageSize);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    useEffect(() => {
        setPage(1);
    }, [search, filterSede, filterCentral, filterTipo, filterUbicacion, filterEstado]);

    const getCentralAbbr = (name: string) => {
        const parts = name.trim().split(/\s+/);
        // If it's "CCTV AQP" -> "AQP"
        // If it's "CCTV CONSERVA" -> "CONSERVA"
        if (parts.length > 1) {
            return parts[parts.length - 1].toUpperCase();
        }
        return name.substring(0, 3).toUpperCase();
    };

    const generateNextCodigo = (centralId: string) => {
        const central = centrales.find(c => c.id === centralId);
        if (!central) return "";

        const abbr = getCentralAbbr(central.nombre);
        const centralCamaras = camaras.filter(c => c.central_id === centralId);

        let maxNum = 0;
        centralCamaras.forEach(c => {
            const parts = c.codigo.split('-');
            // Expected format: CAM-01-ABBR
            if (parts.length >= 2) {
                const num = parseInt(parts[1], 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });

        return `CAM-${String(maxNum + 1).padStart(2, '0')}-${abbr}`;
    };

    // Update code when central changes for NEW items
    useEffect(() => {
        if (!editItem && formData.central_id && modalOpen) {
            const nextCodigo = generateNextCodigo(formData.central_id);
            if (nextCodigo !== formData.codigo) {
                setFormData(prev => ({ ...prev, codigo: nextCodigo }));
            }
        }
    }, [formData.central_id, modalOpen, editItem, camaras]);

    // Dependent Dropdown Logic: Filter sedes based on selected central
    const filteredSedes = useMemo(() => {
        if (!formData.central_id) return [];
        const central = centrales.find(c => c.id === formData.central_id);
        if (!central || !central.sedes) return [];
        return sedes.filter(s => central.sedes.includes(s.id));
    }, [formData.central_id, centrales, sedes]);

    // Added: Filtered Sedes for the main filter (dependent on filterCentral)
    const filteredSedesForFilter = useMemo(() => {
        if (!filterCentral) return sedes;
        const central = centrales.find(c => c.id === filterCentral);
        if (!central || !central.sedes) return [];
        return sedes.filter(s => central.sedes.includes(s.id));
    }, [filterCentral, centrales, sedes]);

    // Reset Sede if it's not valid for the selected Central
    useEffect(() => {
        if (formData.central_id && formData.sede_id) {
            const central = centrales.find(c => c.id === formData.central_id);
            if (central && central.sedes && !central.sedes.includes(formData.sede_id)) {
                setFormData(prev => ({ ...prev, sede_id: "" }));
            }
        }
    }, [formData.central_id, centrales]);

    // Added: Reset filterSede if selected filterCentral changes and current filterSede is invalid
    useEffect(() => {
        if (filterCentral && filterSede) {
            const central = centrales.find(c => c.id === filterCentral);
            if (central && central.sedes && !central.sedes.includes(filterSede)) {
                setFilterSede("");
            }
        }
    }, [filterCentral, centrales]);

    const handleOpen = (item?: Camara) => {
        if (item) {
            setEditItem(item);
            setFormData({
                codigo: item.codigo,
                nombre: item.nombre,
                central_id: item.central_id,
                sede_id: item.sede_id || "",
                nave_fundo: item.nave_fundo || "",
                tiempo_respaldo: item.tiempo_respaldo || "",
                marca: item.marca || "",
                tipo_componente: item.tipo_componente || "",
                ubicacion: item.ubicacion || "",
                fecha_instalacion: item.fecha_instalacion || "",
                area: item.area || "",
            });
        } else {
            const initialCentralId = filterCentral || centrales[0]?.id || "";
            const initialSedeId = filterSede || sedes[0]?.id || "";

            setEditItem(null);
            setFormData({
                codigo: generateNextCodigo(initialCentralId),
                nombre: "",
                central_id: initialCentralId,
                sede_id: initialSedeId,
                nave_fundo: "",
                tiempo_respaldo: "",
                marca: "",
                tipo_componente: "",
                ubicacion: "",
                fecha_instalacion: "",
                area: "",
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = () => {
        if (!formData.codigo.trim() || !formData.nombre.trim() || !formData.central_id) return;

        if (editItem) {
            const updateData: Partial<Camara> = {
                codigo: formData.codigo,
                nombre: formData.nombre,
                central_id: formData.central_id,
                sede_id: formData.sede_id || null,
                nave_fundo: formData.nave_fundo || null,
                tiempo_respaldo: formData.tiempo_respaldo || null,
                marca: formData.marca || null,
                tipo_componente: formData.tipo_componente || null,
                ubicacion: formData.ubicacion || null,
                fecha_instalacion: formData.fecha_instalacion || null,
                area: formData.area || null,
            };
            onUpdate(editItem.id, updateData);
        } else {
            onAdd({ ...formData, activa: true });
        }
        setModalOpen(false);
    };

    const handleStatusClick = (item: Camara) => {
        setStatusItem(item);
        setStatusModalOpen(true);
    };

    const handleConfirmStatus = () => {
        if (statusItem) {
            onUpdate(statusItem.id, { activa: !statusItem.activa });
            setStatusModalOpen(false);
            setStatusItem(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between gap-4 px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Inventario de cámaras CCTV
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Gestión técnica de infraestructura de video vigilancia
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setReportModalOpen(true)}
                        className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                    >
                        <FileDown className="h-4 w-4" />
                        Reporte Semanal
                    </button>
                    <button
                        onClick={() => handleOpen()}
                        className="flex items-center gap-2 bg-[#ff0000] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Nueva cámara
                    </button>
                </div>
            </div>

            {/* Filters Container */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200">
                <div className="flex flex-col gap-4">

                    {/* Filters Row */}
                    {/* Filters Row */}
                    <div className="flex flex-wrap items-center gap-6 mt-4">

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Central</label>
                            <div className="relative">
                                <Monitor size={14} className="absolute left-3 top-3 text-slate-400" />
                                <select
                                    value={filterCentral}
                                    onChange={e => setFilterCentral(e.target.value)}
                                    className="bg-white border border-slate-300 text-sm font-semibold pl-9 pr-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[180px] appearance-none"
                                >
                                    <option value="">Todas las Centrales</option>
                                    {centrales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Sede</label>
                            <div className="relative">
                                <Building2 size={14} className="absolute left-3 top-3 text-slate-400" />
                                <select
                                    value={filterSede}
                                    onChange={e => setFilterSede(e.target.value)}
                                    className="bg-white border border-slate-300 text-sm font-semibold pl-9 pr-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[180px] appearance-none"
                                >
                                    <option value="">Todas las Sedes</option>
                                    {filteredSedesForFilter.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tipo Equipo</label>
                            <div className="relative">
                                <Camera size={14} className="absolute left-3 top-3 text-slate-400" />
                                <select
                                    value={filterTipo}
                                    onChange={e => setFilterTipo(e.target.value)}
                                    className="bg-white border border-slate-300 text-sm font-semibold pl-9 pr-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[160px] appearance-none"
                                >
                                    <option value="">Todos los Tipos</option>
                                    <option value="CAMARA FIJA">Cámara Fija</option>
                                    <option value="CAMARA DOMO">Cámara Domo</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Ubicación</label>
                            <div className="relative">
                                <MapPin size={14} className="absolute left-3 top-3 text-slate-400" />
                                <select
                                    value={filterUbicacion}
                                    onChange={e => setFilterUbicacion(e.target.value)}
                                    className="bg-white border border-slate-300 text-sm font-semibold pl-9 pr-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[160px] appearance-none"
                                >
                                    <option value="">Todas las Ubicaciones</option>
                                    <option value="INTERIOR">Interior</option>
                                    <option value="EXTERIOR">Exterior</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Estado</label>
                            <div className="relative">
                                <Activity size={14} className="absolute left-3 top-3 text-slate-400" />
                                <select
                                    value={filterEstado}
                                    onChange={e => setFilterEstado(e.target.value as any)}
                                    className="bg-white border border-slate-300 text-sm font-semibold pl-9 pr-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[160px] appearance-none"
                                >
                                    <option value="all">Todos los Estados</option>
                                    <option value="activa">Activas</option>
                                    <option value="inactiva">Inactivas</option>
                                </select>
                            </div>
                        </div>



                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-1">
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por código o nombre..."
                        className="w-full bg-white border border-slate-200 text-sm font-semibold pl-11 pr-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table Section */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-none">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-2 text-[11px] uppercase tracking-wider">Código</th>
                                <th className="px-3 py-2 text-[11px] uppercase tracking-wider">Nombre</th>
                                <th className="px-3 py-2 text-[11px] uppercase tracking-wider text-center">Central</th>
                                <th className="px-3 py-2 text-[11px] uppercase tracking-wider text-center">Sede</th>
                                <th className="px-3 py-2 text-[11px] uppercase tracking-wider text-center">Tipo</th>
                                <th className="px-3 py-2 text-[11px] uppercase tracking-wider text-center">Ubicación</th>
                                <th className="px-3 py-2 text-[11px] uppercase tracking-wider text-center">Área</th>
                                <th className="px-3 py-2 text-[11px] uppercase tracking-wider text-center">Nave/Fundo</th>
                                <th className="px-3 py-2 text-[11px] uppercase tracking-wider text-center">Tiempo Respaldo (Dias)</th>
                                <th className="px-3 py-2 text-[11px] uppercase tracking-wider text-center">Marca</th>
                                <th className="px-3 py-2 text-[11px] uppercase tracking-wider text-center">Fecha Inst.</th>
                                <th className="px-3 py-2 text-[11px] uppercase tracking-wider text-center">Status</th>
                                <th className="px-3 py-2 text-[11px] uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentRows.map(c => {
                                const central = centrales.find(ct => ct.id === c.central_id);
                                const sede = sedes.find(s => s.id === c.sede_id);
                                return (
                                    <tr key={c.id} className="hover:bg-gray-50 group">
                                        <td className="px-3 py-1.5 font-mono font-medium text-gray-900 text-xs">{c.codigo}</td>
                                        <td className="px-3 py-1.5 font-medium text-gray-700 text-xs truncate max-w-[150px]">{c.nombre}</td>
                                        <td className="px-3 py-1.5 text-gray-600 text-[11px] text-center">{central?.nombre || "-"}</td>
                                        <td className="px-3 py-1.5 text-gray-600 text-[11px] text-center">{sede?.nombre || "-"}</td>
                                        <td className="px-3 py-1.5 text-center">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tighter ${c.tipo_componente === "CAMARA FIJA" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                                                {c.tipo_componente || "-"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-center">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tighter ${c.ubicacion === "INTERIOR" ? "bg-gray-100 text-gray-700" : "bg-green-50 text-green-700"}`}>
                                                {c.ubicacion || "-"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-center">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tighter bg-amber-50 text-amber-700 uppercase">
                                                {c.area || "-"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-600 text-[11px] text-center">
                                            {c.nave_fundo || "-"}
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-600 text-[11px] text-center">
                                            {c.tiempo_respaldo || "-"}
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-600 text-[11px] text-center">
                                            {c.marca || "-"}
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-600 text-[11px] text-center">
                                            {c.fecha_instalacion || "-"}
                                        </td>
                                        <td className="px-3 py-1.5 text-center">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tighter ${c.activa ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                                {c.activa ? "OK" : "OUT"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => handleStatusClick(c)}
                                                    className={`p-1 rounded transition-colors ${c.activa ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                                    title={c.activa ? "Desactivar Cámara" : "Activar Cámara"}
                                                >
                                                    <Power className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpen(c)}
                                                    className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                    title="Editar"
                                                >
                                                    <PencilLine className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {currentRows.length === 0 && (
                                <tr>
                                    <td colSpan={13} className="px-6 py-8 text-center text-gray-500 text-xs italic">
                                        No se encontraron cámaras.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <PaginationFooter
                    currentPage={page}
                    totalPages={totalPages}
                    itemsPerPage={pageSize}
                    setItemsPerPage={(n) => { setPageSize(n); setPage(1); }}
                    setCurrentPage={setPage}
                    totalItems={filtered.length}
                />
            </div>

            {/* Modal */}
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editItem ? "Editar Cámara" : "Nueva Cámara"}
                size="lg"
            >
                <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Código *
                                {!editItem && <span className="text-xs text-gray-500 ml-2">(Auto-generado)</span>}
                            </label>
                            <input
                                type="text"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 font-mono bg-gray-50 outline-none"
                                value={formData.codigo}
                                readOnly
                                placeholder="CAM-001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre *</label>
                            <input
                                type="text"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                placeholder="Cámara Principal Entrada"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Central CCTV *</label>
                            <select
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.central_id}
                                onChange={e => setFormData({ ...formData, central_id: e.target.value })}
                            >
                                <option value="">-- Seleccionar --</option>
                                {centrales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sede</label>
                            <select
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.sede_id}
                                onChange={e => setFormData({ ...formData, sede_id: e.target.value })}
                                disabled={!formData.central_id}
                            >
                                <option value="">-- Seleccionar --</option>
                                {filteredSedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nave/Fundo</label>
                            <input
                                type="text"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.nave_fundo}
                                onChange={e => setFormData({ ...formData, nave_fundo: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tiempo de Respaldo (Dias)</label>
                            <input
                                type="number"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.tiempo_respaldo}
                                onChange={e => setFormData({ ...formData, tiempo_respaldo: e.target.value })}
                                placeholder="24"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Marca</label>
                            <input
                                type="text"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.marca}
                                onChange={e => setFormData({ ...formData, marca: e.target.value })}
                                placeholder="Hikvision, Dahua, etc."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Componente</label>
                            <select
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.tipo_componente}
                                onChange={e => setFormData({ ...formData, tipo_componente: e.target.value as any })}
                            >
                                <option value="">-- Seleccionar --</option>
                                <option value="CAMARA FIJA">Cámara Fija</option>
                                <option value="CAMARA DOMO">Cámara Domo</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ubicación</label>
                            <select
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.ubicacion}
                                onChange={e => setFormData({ ...formData, ubicacion: e.target.value as any })}
                            >
                                <option value="">-- Seleccionar --</option>
                                <option value="INTERIOR">Interior</option>
                                <option value="EXTERIOR">Exterior</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de Instalación</label>
                            <input
                                type="date"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.fecha_instalacion}
                                onChange={e => setFormData({ ...formData, fecha_instalacion: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Área</label>
                            <input
                                type="text"
                                className="w-full h-11 rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 text-sm px-3 outline-none"
                                value={formData.area}
                                onChange={e => setFormData({ ...formData, area: e.target.value })}
                                placeholder="Eje: Empaque, Recepción, etc."
                            />
                        </div>
                    </div>



                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
                        <button onClick={handleSubmit} className="px-4 py-2 text-sm text-white bg-slate-800 hover:bg-slate-900 rounded-lg">Guardar</button>
                    </div>
                </div>
            </Modal>

            {/* Status Confirmation Modal */}
            <Modal
                open={statusModalOpen}
                onClose={() => setStatusModalOpen(false)}
                title={statusItem?.activa ? "Desactivar Cámara" : "Activar Cámara"}
                size="sm"
            >
                <div className="mt-2">
                    <p className="text-sm text-gray-500">
                        ¿Estás seguro que deseas {statusItem?.activa ? "desactivar" : "activar"} la cámara <strong>{statusItem?.codigo}</strong>?
                        {statusItem?.activa && " Esta acción ocultará la cámara de los checklists activos."}
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={() => setStatusModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirmStatus}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${statusItem?.activa
                                ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                : "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                                }`}
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Report Modal */}
            <Modal
                open={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
                title="Generar Reporte Semanal PDF"
                size="md"
            >
                <div className="space-y-6 mt-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                        <FileDown className="text-blue-600 shrink-0" size={24} />
                        <div>
                            <p className="text-sm font-bold text-blue-900">Configuración del Reporte</p>
                            <p className="text-xs text-blue-700 mt-1">Seleccione la semana y la central CCTV para generar el informe de operatividad y fallas.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Semana del Reporte</label>
                            <input
                                type="week"
                                value={reportWeek}
                                onChange={(e) => setReportWeek(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Central CCTV</label>
                            <select
                                value={reportCentralId}
                                onChange={e => setReportCentralId(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                            >
                                <option value="">-- Seleccionar Central --</option>
                                {centrales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                        <button
                            onClick={() => setReportModalOpen(false)}
                            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleDownloadWeeklyReport}
                            disabled={!reportWeek || !reportCentralId}
                            className="px-6 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <FileDown size={16} /> Descargar Reporte
                        </button>
                    </div>
                </div>
            </Modal>
        </div >
    );
}


