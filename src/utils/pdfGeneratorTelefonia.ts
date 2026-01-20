import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Solicitud } from "../store/telefoniaStore";

// Helper para convertir imagen a DataURL (Robust handling via Canvas)
const getDataUrl = (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            } else {
                resolve(null);
            }
        };
        img.onerror = (e) => {
            console.error("Error loading logo image", e);
            resolve(null);
        };
        img.src = url;
    });
};

// Helper: Dibuja el contenido y retorna la altura final usada
const drawTicketContent = (doc: jsPDF, ticket: Solicitud, logoUrl: string | null, pageWidth: number) => {
    // -- HEADER --
    if (logoUrl) {
        try {
            doc.addImage(logoUrl, 'PNG', 14, 10, 30, 10);
        } catch (e) {
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 0, 0); // Danper Red #FF0000
            doc.text("DANPER", 14, 18);
        }
    } else {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 0, 0); // Danper Red #FF0000
        doc.text("DANPER", 14, 18);
    }

    // Título alineado a la derecha
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(44, 62, 80); // Dark Slate Professional

    // MOTIVO
    const motivo = ticket.tipo_solicitud?.toUpperCase() || ticket.tipo_servicio?.toUpperCase() || "SOLICITUD";
    doc.text(`TICKET: ${motivo}`, pageWidth - 14, 15, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`ID: ${ticket.id.slice(0, 8).toUpperCase()}`, pageWidth - 14, 20, { align: 'right' });

    const fechaCreacion = new Date(ticket.created_at).toLocaleDateString();
    doc.text(`Solicitado: ${fechaCreacion}`, pageWidth - 14, 24, { align: 'right' });

    if (ticket.fecha_entrega) {
        const fechaEntrega = new Date(ticket.fecha_entrega).toLocaleDateString();
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 100, 0); // Green for delivery
        doc.text(`Entregado: ${fechaEntrega}`, pageWidth - 14, 28, { align: 'right' });
    }

    doc.setDrawColor(220);
    doc.line(14, 32, pageWidth - 14, 32);

    let currentY = 40;

    // Helper title with Modern Look
    const addSectionTitle = (title: string, y: number) => {
        // Light Gray Background Strip
        doc.setFillColor(248, 248, 248);
        doc.rect(14, y - 4, pageWidth - 28, 7, 'F');

        // Red Accent Bar on Left
        doc.setFillColor(255, 0, 0); // #FF0000
        doc.rect(14, y - 4, 1, 7, 'F');

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 0, 0); // #FF0000
        doc.text(title.toUpperCase(), 18, y + 1); // Indent slightly

        return y + 8; // More spacing
    };

    // Estilos Globales Tablas
    const tableStyles: any = {
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, lineColor: [230, 230, 230], textColor: 50 },
        headStyles: {
            fillColor: [30, 30, 30], // Black/Dark Gray for high contrast with Red
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
        },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        columnStyles: { 0: { fontStyle: 'bold', textColor: [80, 80, 80] } }
    };

    // 1. INFO BENEFICIARIO
    currentY = addSectionTitle("Información del Beneficiario", currentY);

    autoTable(doc, {
        startY: currentY,
        ...tableStyles,
        theme: 'plain', // Plain for this one looks cleaner
        body: [
            [
                { content: 'Nombre:', styles: { fontStyle: 'bold' } }, ticket.beneficiario_nombre || "-",
                { content: 'DNI:', styles: { fontStyle: 'bold' } }, ticket.beneficiario_dni || "-"
            ],
            [
                { content: 'Área:', styles: { fontStyle: 'bold' } }, ticket.beneficiario_area || "-",
                { content: 'Puesto:', styles: { fontStyle: 'bold' } }, ticket.beneficiario_puesto || "-"
            ],
            [
                { content: 'Motivo:', styles: { fontStyle: 'bold' } }, motivo,
                { content: '', styles: { fontStyle: 'bold' } }, ""
            ]
        ],
        columnStyles: { 0: { cellWidth: 25 }, 2: { cellWidth: 25 } } // Adjusted widths
    });

    // 2. DETALLE REQUERIMIENTO
    currentY = (doc as any).lastAutoTable.finalY + 10;
    currentY = addSectionTitle("Detalle del Requerimiento", currentY);

    autoTable(doc, {
        startY: currentY,
        ...tableStyles,
        head: [['Periodo', 'Inicio', 'Fin', 'Fundo/Planta', 'Cultivo', 'Líneas']],
        body: [[
            ticket.periodo_uso || "Indefinido",
            ticket.fecha_inicio_uso || "-",
            ticket.fecha_fin_uso || "-",
            ticket.fundo_planta || "-",
            ticket.cultivo || "-",
            ticket.cantidad_lineas || "1"
        ]],
        columnStyles: {} // Reset from previous
    });

    // 2.1 DETAILS FOR REPOSITION
    const isReposicion = ticket.tipo_servicio === "REPOSICIÓN" || ticket.tipo_solicitud === "Reposición";

    if (isReposicion) {
        const detalle = ticket.detalle_reposicion || {};
        const simulacion = ticket.simulacion_descuento;

        const motivoRep = detalle.motivo || "-";
        const asume = detalle.asume || "-";
        const cuotas = detalle.cuotas || 0;
        const numRef = detalle.numero_afectado || "-";
        const equipoAnt = detalle.equipoAnterior || detalle.equipo_anterior || "No registrado";

        currentY = (doc as any).lastAutoTable.finalY + 10;
        currentY = addSectionTitle("Información de Reposición", currentY);

        autoTable(doc, {
            startY: currentY,
            ...tableStyles,
            theme: 'plain',
            body: [
                [
                    { content: 'Causa:', styles: { fontStyle: 'bold' } }, motivoRep,
                    { content: 'Línea Afectada:', styles: { fontStyle: 'bold' } }, numRef
                ],
                [
                    { content: 'Equipo Anterior:', styles: { fontStyle: 'bold' } }, equipoAnt,
                    { content: 'Asume Costo:', styles: { fontStyle: 'bold' } }, asume
                ],
                [
                    { content: 'Cuotas:', styles: { fontStyle: 'bold' } }, asume === "USUARIO" ? `${cuotas} Cuotas` : "-",
                    { content: '', styles: { fontStyle: 'bold' } }, ""
                ]
            ],
            columnStyles: { 0: { cellWidth: 30 }, 2: { cellWidth: 30 } }
        });

        if (asume === "USUARIO" && simulacion) {
            currentY = (doc as any).lastAutoTable.finalY + 5;
            autoTable(doc, {
                startY: currentY,
                ...tableStyles,
                theme: 'striped',
                head: [['Concepto', 'Monto Total', 'Cuotas', 'Mensual']],
                body: [
                    [
                        "Costo Equipo",
                        `S/ ${simulacion.costoEquipo}`,
                        "-",
                        "-"
                    ],
                    [
                        "A Pagar por Usuario",
                        `S/ ${simulacion.montoDescuento}`,
                        `${simulacion.cuotas} mes(es)`,
                        `S/ ${simulacion.cuotaMensual}`
                    ]
                ],
                headStyles: { fillColor: [255, 0, 0], textColor: 255 }, // Red for financial warning
                foot: [['El descuento se aplicará en planilla: ' + simulacion.periodo]],
                footStyles: { fillColor: [255, 255, 255], textColor: 80, fontStyle: 'italic', fontSize: 7 }
            });
        }
    }

    // Justificación
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 4,
        theme: 'plain',
        body: [
            [{ content: 'JUSTIFICACIÓN:', styles: { fontStyle: 'bold', textColor: [100, 100, 100] } }],
            [{ content: ticket.justificacion || "Sin justificación.", styles: { fontStyle: 'italic', textColor: [60, 60, 60] } }]
        ],
        styles: { fontSize: 9, cellPadding: 1 }
    });

    // 3. APLICATIVOS
    currentY = (doc as any).lastAutoTable.finalY + 10;
    currentY = addSectionTitle("Aplicativos Autorizados", currentY);

    const apps = ticket.aplicativos || [];
    const appBody = [];
    if (apps.length > 0) {
        for (let i = 0; i < apps.length; i += 3) {
            appBody.push([
                apps[i] || "",
                apps[i + 1] || "",
                apps[i + 2] || ""
            ]);
        }
    } else {
        appBody.push(["Ningún aplicativo adicional requerido", "", ""]);
    }

    autoTable(doc, {
        startY: currentY,
        ...tableStyles,
        theme: 'grid',
        body: appBody,
        headStyles: { fillColor: [240, 240, 240], textColor: 50 }, // Subtle header for simple list
        styles: { fontSize: 8, cellPadding: 3, halign: 'left' }
    });

    // 4. EQUIPAMIENTO
    currentY = (doc as any).lastAutoTable.finalY + 10;
    currentY = addSectionTitle("Equipamiento Entregado", currentY);

    const asignaciones = ticket.asignaciones || [];
    const equipamientoBody = [];

    if (asignaciones.length > 0) {
        asignaciones.forEach((a, i) => {
            equipamientoBody.push([
                i + 1,
                `${a.equipo?.marca || ""} ${a.equipo?.modelo || "Equipo"}`,
                `IMEI: ${a.equipo?.imei || "-"}`,
                a.equipo?.condicion || "-",
                a.chip?.numero_linea || "-"
            ]);
        });
    } else if (ticket.equipo) {
        equipamientoBody.push([
            "1",
            `${ticket.equipo.marca} ${ticket.equipo.modelo}`,
            `IMEI: ${ticket.equipo.imei}`,
            ticket.equipo.condicion || "-",
            ticket.chip?.numero_linea || "-"
        ]);
    } else {
        equipamientoBody.push(["-", "Pendiente de Asignación", "-", "-", "-"]);
    }

    autoTable(doc, {
        startY: currentY,
        ...tableStyles,
        head: [['#', 'Modelo', 'Detalle', 'Condición', 'Línea']],
        body: equipamientoBody,
        headStyles: { fillColor: [44, 62, 80], textColor: 255 }
    });

    // 5. APROBACIONES
    currentY = (doc as any).lastAutoTable.finalY + 15;

    autoTable(doc, {
        startY: currentY,
        ...tableStyles,
        head: [['Nivel', 'Aprobado Por', 'Estado', 'Fecha']],
        body: [
            [
                'GERENCIA ÁREA USUARIA',
                ticket.aprobacion_gerencia_nombre || "Gerencia Usuaria",
                ticket.aprobacion_gerencia ? 'APROBADO' : 'PENDIENTE',
                ticket.fecha_aprobacion_gerencia ? new Date(ticket.fecha_aprobacion_gerencia).toLocaleDateString() : '-'
            ],
            [
                'GERENCIA ADMINISTRACIÓN',
                ticket.aprobacion_admin_nombre || "Gerencia Admin",
                ticket.aprobacion_admin ? 'APROBADO' : 'PENDIENTE',
                ticket.fecha_aprobacion_admin ? new Date(ticket.fecha_aprobacion_admin).toLocaleDateString() : '-'
            ]
        ],
        headStyles: { fillColor: [52, 73, 94], textColor: 255 }, // Darker slate
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40 },
            2: { fontStyle: 'bold' }
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
                if (data.cell.raw === 'PENDIENTE') {
                    data.cell.styles.textColor = [200, 100, 0];
                } else if (data.cell.raw === 'APROBADO') {
                    data.cell.styles.textColor = [0, 150, 0];
                }
            }
        }
    });

    // 6. FIRMA
    let finalY = (doc as any).lastAutoTable.finalY + 20;

    // Check space on current page? Since we are calculating height, we just add.

    // Check signature
    if (ticket.recibido_por) {
        try {
            doc.addImage(ticket.recibido_por, 'PNG', 85, finalY, 40, 20);
            finalY += 20;
        } catch (e) {
            console.warn("Sig error");
        }
    } else {
        finalY += 15;
    }

    doc.setDrawColor(100);
    doc.setLineWidth(0.5);
    doc.line(70, finalY, 140, finalY);

    doc.setFontSize(8);
    doc.setTextColor(50);
    doc.text("RECIBIDO CONFORME", 105, finalY + 4, { align: 'center' });
    doc.setFont("helvetica", "bold");
    doc.text(ticket.beneficiario_nombre || "Beneficiario", 105, finalY + 9, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.text(`DNI: ${ticket.beneficiario_dni || ""}`, 105, finalY + 13, { align: 'center' });

    // Footer Timestamp
    finalY += 20;
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Generado el ${new Date().toLocaleString()}`, 14, finalY);

    return finalY + 10; // Return total required height including padding
};

export const generateTicketPDF = async (ticket: Solicitud) => {
    // PASS 1: Calculate Height using a dummy doc
    // Layout 210mm wide, arbitrary long height
    const dummyDoc = new jsPDF({ format: [210, 1500], unit: 'mm' });
    const logoUrl = await getDataUrl("/logo-rojo.svg");

    // DRY Run to get height
    const requiredHeight = drawTicketContent(dummyDoc, ticket, logoUrl, 210);

    // PASS 2: Custom sized document
    // Ensure min height of A5 approx (148) just in case, max whatever needed
    const finalHeight = Math.max(requiredHeight, 100);

    const doc = new jsPDF({
        format: [210, finalHeight],
        unit: 'mm'
    });

    drawTicketContent(doc, ticket, logoUrl, 210);

    doc.save(`Ticket_${ticket.beneficiario_dni}_${ticket.id.slice(0, 6)}.pdf`);
};
