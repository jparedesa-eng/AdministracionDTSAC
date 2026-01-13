import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Solicitud } from "../store/telefoniaStore";

// Helper para convertir imagen a DataURL
const getDataUrl = async (url: string): Promise<string | null> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Error loading image", e);
        return null;
    }
};

export const generateTicketPDF = async (ticket: Solicitud) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;



    // -- HEADER CON LOGO --
    // Intentar cargar logo
    const logoUrl = await getDataUrl("public/danper.svg");

    if (logoUrl) {
        // Asumiendo que es un SVG compatible o convertido. 
        // Si fetch devuelve el SVG como texto, jspdf addSvgAsImage (con plugin) o addImage (si es raster)
        // Como es un archivo .svg en public, fetch lo traerá.
        // jspdf 'addImage' con 'SVG' suele requerir 'canvg' si no está soportado nativamente.
        // Si falla, solo ponemos texto.
        try {
            doc.addImage(logoUrl, 'SVG', 14, 10, 30, 10);
        } catch (e) {
            // Fallback si SVG falla: Texto
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("DANPER", 14, 18);
        }
    } else {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("DANPER", 14, 18);
    }

    // Título alineado a la derecha
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    const tipoSolicitud = ticket.tipo_servicio?.toUpperCase() || "SOLICITUD DE SERVICIO";
    doc.text(`SOLICITUD: ${tipoSolicitud}`, pageWidth - 14, 15, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`ID: ${ticket.id.slice(0, 8).toUpperCase()}`, pageWidth - 14, 20, { align: 'right' });
    doc.text(`Fecha: ${new Date(ticket.created_at).toLocaleDateString()}`, pageWidth - 14, 24, { align: 'right' });

    // Línea separadora
    doc.setDrawColor(200);
    doc.line(14, 28, pageWidth - 14, 28);

    let currentY = 35;

    // Helper title
    const addSectionTitle = (title: string, y: number) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(title.toUpperCase(), 14, y);
        doc.setLineWidth(0.5);
        doc.setDrawColor(0); // Negro para seriedad
        doc.line(14, y + 2, pageWidth - 14, y + 2);
        return y + 7;
    };

    // 1. DATOS DEL BENEFICIARIO
    currentY = addSectionTitle("Información del Beneficiario", currentY);

    autoTable(doc, {
        startY: currentY,
        theme: 'plain',
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
                { content: 'Línea Ref.:', styles: { fontStyle: 'bold' } }, ticket.beneficiario_n_linea_ref || "NUEVA",
                { content: '', styles: { fontStyle: 'bold' } }, ""
            ]
        ],
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 30 }, 2: { cellWidth: 30 } }
    });

    // 2. DETALLE DEL REQUERIMIENTO
    currentY = (doc as any).lastAutoTable.finalY + 10;
    currentY = addSectionTitle("Detalle del Requerimiento", currentY);

    autoTable(doc, {
        startY: currentY,
        theme: 'grid',
        head: [['Periodo', 'Inicio', 'Fin', 'Fundo/Planta', 'Cultivo', 'Líneas']],
        body: [[
            ticket.periodo_uso || "Indefinido",
            ticket.fecha_inicio_uso || "-",
            ticket.fecha_fin_uso || "-",
            ticket.fundo_planta || "-",
            ticket.cultivo || "-",
            ticket.cantidad_lineas || "1"
        ]],
        styles: { fontSize: 8, halign: 'center', cellPadding: 3 },
        headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: 'bold' }
    });

    // 2.1 DETAILS FOR REPOSITION (Parsed from justification)
    const isReposicion = ticket.tipo_servicio === "REPOSICIÓN" || ticket.beneficiario_n_linea_ref === "Reposición";

    if (isReposicion) {
        // Parse metadata from JSON columns
        const detalle = ticket.detalle_reposicion || {};
        const simulacion = ticket.simulacion_descuento;

        const motivo = detalle.motivo || "-";
        const asume = detalle.asume || "-";
        const cuotas = detalle.cuotas || 0;
        const numRef = detalle.numero_afectado || "-";
        const equipoAnt = detalle.equipoAnterior || detalle.equipo_anterior || "No registrado";

        currentY = (doc as any).lastAutoTable.finalY + 10;
        currentY = addSectionTitle("Información de Reposición", currentY);

        autoTable(doc, {
            startY: currentY,
            theme: 'plain',
            body: [
                [
                    { content: 'Motivo:', styles: { fontStyle: 'bold' } }, motivo,
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
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 30 }, 2: { cellWidth: 30 } }
        });

        // SIMULATION TABLE IF USER PAYS
        if (asume === "USUARIO" && simulacion) {
            currentY = (doc as any).lastAutoTable.finalY + 5;

            autoTable(doc, {
                startY: currentY,
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
                        "A Pagar por Usuario (100%)",
                        `S/ ${simulacion.montoDescuento}`,
                        `${simulacion.cuotas} mes(es)`,
                        `S/ ${simulacion.cuotaMensual}`
                    ]
                ],
                styles: { fontSize: 8, halign: 'center', cellPadding: 2 },
                headStyles: { fillColor: [220, 50, 50], textColor: 255 }, // Red/Warn color
                foot: [['Nota: El descuento se aplicará en planilla según el periodo indicado: ' + simulacion.periodo]],
                footStyles: { fillColor: [255, 255, 255], textColor: 80, fontStyle: 'italic', fontSize: 7 }
            });
        }
    }


    // Justificación box style
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 4,
        theme: 'plain',
        body: [
            [{ content: 'JUSTIFICACIÓN:', styles: { fontStyle: 'bold' } }],
            [{ content: ticket.justificacion || "Sin justificación.", styles: { fontStyle: 'italic' } }]
        ],
        styles: { fontSize: 9, cellPadding: 1 }
    });

    // 3. APLICATIVOS (Lista simple)
    currentY = (doc as any).lastAutoTable.finalY + 10;
    currentY = addSectionTitle("Aplicativos Autorizados", currentY);

    const apps = ticket.aplicativos || [];
    const appBody = [];
    if (apps.length > 0) {
        // Grid de 3 columnas
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
        theme: 'grid',
        body: appBody,
        styles: { fontSize: 8, cellPadding: 3, halign: 'left' },
        headStyles: { fillColor: [240, 240, 240], textColor: 0 }
    });

    // 4. EQUIPAMIENTO (Modelo)
    currentY = (doc as any).lastAutoTable.finalY + 10;
    currentY = addSectionTitle("Equipamiento Asignado / Sugerido", currentY);

    autoTable(doc, {
        startY: currentY,
        theme: 'grid',
        head: [['Modelo', 'Estado Ticket']],
        body: [[
            ticket.alternativa_modelo || ticket.equipo?.modelo || "Estándar",
            ticket.estado.toUpperCase()
        ]],
        styles: { fontSize: 9, halign: 'center', cellPadding: 3 },
        headStyles: { fillColor: [60, 60, 60], textColor: 255 }
    });

    // 5. APROBACIONES (Gerencia y TI)
    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Tabla de aprobadores (Nombre y Estado)
    autoTable(doc, {
        startY: currentY,
        theme: 'grid',
        head: [['Nivel', 'Aprobado Por', 'Estado', 'Fecha']],
        body: [
            [
                'GERENCIA DE ÁREA',
                ticket.beneficiario_area || "Gerencia", // Placeholder nombre
                ticket.aprobacion_gerencia ? 'APROBADO' : 'PENDIENTE',
                ticket.fecha_aprobacion_gerencia ? new Date(ticket.fecha_aprobacion_gerencia).toLocaleDateString() : '-'
            ],
            [
                'TI / ADMINISTRACIÓN',
                'Administración Telefonia', // Placeholder nombre
                ticket.aprobacion_admin ? 'APROBADO' : 'PENDIENTE',
                ticket.fecha_aprobacion_admin ? new Date(ticket.fecha_aprobacion_admin).toLocaleDateString() : '-'
            ]
        ],
        styles: { fontSize: 9, halign: 'center', cellPadding: 3 },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold' } }
    });

    // 6. FIRMA DE RECEPCIÓN (Física o Digital)
    const finalY = (doc as any).lastAutoTable.finalY + 30; // Espacio para firma

    // Check space
    if (finalY + 40 > doc.internal.pageSize.height) {
        doc.addPage();
        currentY = 20;
    } else {
        currentY = finalY;
    }

    doc.setLineWidth(0.5);
    doc.line(70, currentY, 140, currentY);
    doc.setFontSize(9);
    doc.text("RECIBIDO CONFORME", 105, currentY + 5, { align: 'center' });
    doc.text(ticket.beneficiario_nombre || "", 105, currentY + 10, { align: 'center' });
    doc.text(`DNI: ${ticket.beneficiario_dni || ""}`, 105, currentY + 15, { align: 'center' });

    // Save
    doc.save(`Ticket_${ticket.beneficiario_dni}_${ticket.id.slice(0, 6)}.pdf`);
};
