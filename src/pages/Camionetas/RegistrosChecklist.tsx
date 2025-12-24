// src/pages/Camionetas/RegistrosChecklist.tsx
import React from "react";
import { supabase } from "../../supabase/supabaseClient";
import {
  Calendar,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  FileDown,
  PlusCircle,
  PenLine,
  Eraser,
  CheckCircle,
  ChevronDown,
  FileSpreadsheet,
} from "lucide-react";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { guardarChecklist, actualizarChecklist } from "../../store/checklistStore";
import { camionetasStore } from "../../store/camionetasStore";
import { useAuth } from "../../auth/AuthContext";

/* =============== Tipos =============== */
type Grupo = {
  titulo: string;
  items: { name: string; ok: boolean; status?: string; nota?: string }[];
};

type ChecklistRow = {
  id: string;
  created_at: string;

  // Campos “generales”
  fecha?: string | null;
  hora?: string | null;
  sede?: string | null;
  placa?: string | null;
  kilometraje?: number | null;
  responsable_inspeccion?: string | null;

  // Variantes de nombres para usuario
  dni_usuario?: string | null;
  usuario_dni?: string | null;
  nombre_usuario?: string | null;
  usuario_nombre?: string | null;
  usuario_correo?: string | null; // nombre real en la BD
  correo_usuario?: string | null; // fallback si hay registros antiguos

  // Firma (dos variantes)
  firma_usuario_dataurl?: string | null;
  firma_base64?: string | null;

  observaciones?: string | null;
  aprobado?: boolean | null;
  fecha_ingreso?: string | null; // NUEVO CAMPO

  // Ítems embebidos (JSONB)
  grupos?: any;
  tipo?: "entrega" | "regular";
  codigo?: string; // Editado a string
};

type ChecklistItemRow = {
  id: number;
  checklist_id: string;
  grupo: string | null;
  name: string;
  ok: boolean | null;
  nota: string | null;
};

type CkItem = { name: string; ok: boolean; status?: string; nota?: string };
type CkGroup = { titulo: string; items: CkItem[] };

type Driver = {
  id: string;
  nombre: string;
  dni: string;
  activo: boolean;
};

/* =============== Grupos base =============== */
const GRUPOS: CkGroup[] = [
  {
    titulo: "DOCUMENTOS Y SEGURIDAD",
    items: [
      "DOCUMENTOS DE VEHÍCULO",
      "EXTINTOR",
      "BOTIQUÍN",
    ].map((name) => ({ name, ok: true, status: "vigente" })),
  },
  {
    titulo: "ACCESORIOS Y FUNCIONAMIENTO",
    items: [
      "SEGURO DE RUEDAS",
      "GATA",
      "LLAVE DE RUEDAS",
      "CONOS",
      "TACOS",
      "FORRO ASIENTOS",
      "PISOS",
      "LUNAS",
      "FUNCIONAMIENTO DE LUCES",
      "ALARMA DE RETROCESO",
    ].map((name) => ({ name, ok: true, status: "funcional" })),
  },
  {
    titulo: "PARTE FRONTAL",
    items: [
      "Parachoque delantero",
      "Parabrisa",
      "Antena",
      "Capot",
      "Tapas triangular LH",
      "Tapas triangular RH",
      "Faro direccional LH",
      "Faro direccional RH",
      "Espejo retrovisor LH",
      "Guardafango delantero LH",
      "Guardafango trasero LH",
    ].map((name) => ({ name, ok: true, status: "buen_estado" })),
  },
  {
    titulo: "PARTE LATERAL IZQUIERDA (LH)",
    items: [
      "Zocalo LH",
      "Puerta piloto LH",
      "Tapa de combustible LH",
      "Puerta trasera LH",
    ].map((name) => ({ name, ok: true, status: "buen_estado" })),
  },
  {
    titulo: "PARTE LATERAL DERECHA (RH)",
    items: [
      "Espejo retroviso RH",
      "Guardafango delantero RH",
      "Guardafango trasero RH",
      "Zocalo RH",
      "Puerta piloto RH",
    ].map((name) => ({ name, ok: true, status: "buen_estado" })),
  },
  {
    titulo: "PARTE POSTERIOR",
    items: [
      "Puerta trasera RH",
      "Compuerta de tolva",
      "Faros posterior LH",
      "Faros posterior RH",
      "Llanta de repuesto",
      "Parachoque posterior",
    ].map((name) => ({ name, ok: true, status: "buen_estado" })),
  },
];

/* =============== Hook SignaturePad sincronizado =============== */
function useSignaturePad(open: boolean) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    const c = canvasRef.current;
    const w = wrapRef.current;
    if (!c || !w) return;

    const setupSize = () => {
      const width = w.clientWidth || 400;
      // Ajuste de altura dinámica (más alto en mobile si se desea, pero el usuario pidió más grande)
      // Vamos a usar una altura mayor por defecto para mejorar la experiencia en móvil
      const height = window.innerWidth < 640 ? 300 : 200; // Más alto en móvil

      // Evitar resetear si el tamaño es el mismo (previene borrado al abrir/cerrar teclado)
      if (c.width === width && c.height === height) return;

      c.width = width;
      c.height = height;

      const ctx = c.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
    };

    setupSize();
    window.addEventListener("resize", setupSize);
    return () => window.removeEventListener("resize", setupSize);
  }, [open]);

  const getPoint = (ev: any) => {
    const c = canvasRef.current;
    if (!c) return null;
    const rect = c.getBoundingClientRect();

    let clientX: number;
    let clientY: number;

    if ("touches" in ev && ev.touches?.length) {
      clientX = ev.touches[0].clientX;
      clientY = ev.touches[0].clientY;
    } else {
      clientX = ev.clientX;
      clientY = ev.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    // Cerrar teclado en móviles quitando el foco del input anterior
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    e.preventDefault();
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const ev = (e as any).nativeEvent || e;
    const p = getPoint(ev);
    if (!p) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;

    const ev = (e as any).nativeEvent || e;
    const p = getPoint(ev);
    if (!p) return;

    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const end = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
  };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
  };

  const toDataURL = () => {
    if (!canvasRef.current) return null;
    return canvasRef.current.toDataURL("image/png");
  };

  return { canvasRef, wrapRef, start, move, end, clear, toDataURL };
}

/* =============== Constantes =============== */


/* =============== Utilidades =============== */
function formatFechaHoraLocal(valor?: string | null, fallback?: string): string {
  const src = valor ?? fallback;
  if (!src) return "—";
  const d = new Date(src);
  if (!isNaN(d.getTime())) return d.toLocaleString();
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(src);
  if (m) return `${m[1]} ${m[2]}`;
  return src;
}

/** Formatea una fecha ISO para inputs de tipo datetime-local (YYYY-MM-DDTHH:MM) */
function formatForDateTimeLocal(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";

    // Ajuste a la zona horaria local para obtener los componentes
    const pad = (n: number) => n.toString().padStart(2, '0');
    const Y = d.getFullYear();
    const M = pad(d.getMonth() + 1);
    const D = pad(d.getDate());
    const h = pad(d.getHours());
    const m = pad(d.getMinutes());

    return `${Y}-${M}-${D}T${h}:${m}`;
  } catch (e) {
    return "";
  }
}
const KNOWN_STATUSES = [
  "vigente", "por_vencer", "vencido", "faltante",
  "funcional", "defecto_leve", "deteriorado",
  "buen_estado", "rayado", "abollado", "danio_severo",
  "no_entregado"
];

function normalizeItem(name: string, ok: boolean, rawStatus?: string, rawNota?: string): CkItem {
  let status = String(rawStatus ?? "");
  let nota = String(rawNota ?? "");

  if (!status && KNOWN_STATUSES.includes(nota)) {
    status = nota;
    nota = "";
  }
  return { name, ok, status, nota: nota || "" };
}

/** Calcula la antigüedad en años y meses */
function calculateSeniority(fechaIngreso?: string | null): string {
  if (!fechaIngreso) return "—";
  try {
    const start = new Date(fechaIngreso);
    const end = new Date();
    if (isNaN(start.getTime())) return "—";

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    const yearStr = years > 0 ? `${years} ${years === 1 ? "año" : "años"}` : "";
    const monthStr = months > 0 ? `${months} ${months === 1 ? "mes" : "meses"}` : "";

    if (yearStr && monthStr) return `${yearStr} y ${monthStr}`;
    return yearStr || monthStr || "Menos de un mes";
  } catch (e) {
    return "—";
  }
}
function normalizeGruposFromRow(row: ChecklistRow): Grupo[] | null {
  if (!row || !row.grupos) return null;
  const raw = row.grupos as any;
  if (Array.isArray(raw)) {
    const grupos: Grupo[] = raw.map((g: any) => ({
      titulo: String(g.title ?? g.titulo ?? "OTROS"),
      items: Array.isArray(g.items)
        ? g.items.map((it: any) => normalizeItem(
          String(it.name ?? ""),
          Boolean(it.ok),
          it.status,
          it.nota
        ))
        : [],
    }));
    return grupos;
  }
  return null;
}

const getDni = (r: ChecklistRow) => r.usuario_dni ?? r.dni_usuario ?? "—";
const getNombre = (r: ChecklistRow) => r.usuario_nombre ?? r.nombre_usuario ?? "—";
const getCorreo = (r: ChecklistRow) => r.usuario_correo ?? r.correo_usuario ?? "—";

/** Helper para asegurar que la firma sea un DataURL válido */
function resolveFirmaSource(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Step 1: Remove ALL whitespace
  let cleaned = raw.replace(/\s/g, "");
  if (!cleaned) return null;

  // Step 2: If it's an external URL, return as-is
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }

  // Step 3: AGGRESSIVE extraction - find where the actual base64 payload starts
  const base64Marker = "base64,";
  const markerIdx = cleaned.toLowerCase().indexOf(base64Marker);

  let payload: string;
  if (markerIdx !== -1) {
    // Extract everything AFTER "base64,"
    payload = cleaned.substring(markerIdx + base64Marker.length);
  } else if (cleaned.includes(",")) {
    // Has comma but no "base64" - split and take second part
    const parts = cleaned.split(",");
    payload = parts[parts.length - 1];
  } else {
    // No markers, assume entire string is the payload
    payload = cleaned;
  }

  // Step 4: Rebuild with guaranteed correct prefix
  return `data:image/png;base64,${payload}`;
}

const getFirma = (r: ChecklistRow) => {
  const raw = r.firma_base64 ?? r.firma_usuario_dataurl;
  return resolveFirmaSource(raw);
};

/** Convierte un data URL a Blob URL para mejor compatibilidad */
function dataURLtoBlob(dataURL: string): Blob {
  const parts = dataURL.split(',');
  const byteString = atob(parts[1]);
  const mimeString = parts[0].split(':')[1].split(';')[0];

  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeString });
}

function createBlobURL(dataURL: string | null): string | null {
  if (!dataURL) return null;
  try {
    const blob = dataURLtoBlob(dataURL);
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Error creating blob URL:", error);
    return dataURL; // Fallback to original data URL
  }
}


/* =============== Componentes auxiliares PDF =============== */
function cell(label: string, value: string | number) {
  return `<div style="border:1px solid #E5E7EB; border-radius:10px; padding:8px 10px; font-size:12px;">
      <span style="color:#6B7280; font-weight:600; margin-right:4px;">${label}</span>${value}
    </div>`;
}

function buildPdfHtml(row: ChecklistRow, grupos: Grupo[]) {
  const fechaStr = formatFechaHoraLocal(row.fecha, row.created_at);
  const firma = getFirma(row);

  return `
<div id="pdf-root" style="width:794px; box-sizing:border-box; padding:20mm; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111827; font-size:12px;">
  <!-- Encabezado con logo -->
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
    <div style="display:flex; align-items:center; gap:14px;">
      <img
        src="/logo-danper-rojo.png"
        alt="Logo Danper"
        style="width:62px; height:64px; object-fit:contain;"
      />
      <div>
        <div style="font-weight:700; font-size:20px; letter-spacing:0.03em; text-transform:uppercase;">
          Checklist del vehículo
        </div>
        <div style="color:#6B7280; font-size:11px; margin-top:2px;">
          Registro de inspección de unidad
        </div>
        <div style="color:#9CA3AF; font-size:10px; margin-top:4px;">
          N°: ${row.codigo ?? row.id.slice(0, 8)}
        </div>
      </div>
    </div>
    <div style="text-align:right; font-size:11px; color:#6B7280;">
      <div style="color:#4A5159; font-size:10px; margin-top:4px;">
        ${row.tipo ? row.tipo.toUpperCase() : "REGULAR"}
      </div>
      <div style="font-weight:600;">${row.placa ?? ""}</div>
      <div>${calculateSeniority(row.fecha_ingreso)}</div>
    </div>
  </div>

  <!-- Datos generales -->
  <div style="font-size:14px; font-weight:700; margin: 10px 0 8px;">Datos generales</div>
  <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:8px; margin-bottom:12px;">
    ${cell("Fecha:", fechaStr)}
    ${cell("Sede:", row.sede ?? "—")}
    ${cell("Kilometraje:", row.kilometraje ?? "—")}
    ${cell("Resp. Inspección:", row.responsable_inspeccion ?? "—")}
    ${cell("DNI Usuario:", getDni(row))}
    ${cell("Nombre Usuario:", getNombre(row))}
    ${cell("Correo Usuario:", getCorreo(row))}
    ${cell("Estado checklist:", row.aprobado ? "APROBADO" : "CON OBSERVACIONES")}
  </div>

  <!-- Firma -->
  <div style="font-size:13px; font-weight:700; margin: 12px 0 6px;">Firma de usuario</div>
  <div style="border:1px solid #E5E7EB; border-radius:10px; padding:10px;">
    <div style="border:1px dashed #D1D5DB; border-radius:10px; padding:10px; text-align:center; min-height:80px; display:flex; align-items:center; justify-content:center;">
      ${firma
      ? `<img src="${firma}" alt="Firma" style="height:70px;" />`
      : `<span style="color:#9CA3AF; font-size:12px;">Sin firma registrada</span>`
    }
    </div>
  </div>

  <!-- Ítems del vehículo -->
  <div style="font-size:14px; font-weight:700; margin: 18px 0 8px;">Ítems del vehículo</div>
  ${grupos
      .map(
        (g) => `
      <div style="border:1px solid #E5E7EB; border-radius:12px; margin-bottom:10px; overflow:hidden;">
        <div style="background:#F9FAFB; padding:8px 10px; font-weight:700; font-size:12px; border-bottom:1px solid #E5E7EB;">
          ${g.titulo}
        </div>
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:6px; padding:10px;">
          ${g.items
            .map(
              (it) => {
                // Mapeo de estados para el PDF
                const statusMap: Record<string, { label: string; text: string; bg: string; border: string }> = {
                  "vigente": { label: "Vigente", text: "#15803D", bg: "#ECFDF5", border: "#6EE7B7" },
                  "por_vencer": { label: "Por Vencer", text: "#A16207", bg: "#FEFCE8", border: "#FDE047" },
                  "vencido": { label: "Vencido", text: "#C2410C", bg: "#FFF7ED", border: "#FDBA74" },
                  "faltante": { label: "Faltante", text: "#BE123C", bg: "#FFF1F2", border: "#FDA4AF" },
                  "funcional": { label: "Funcional", text: "#15803D", bg: "#ECFDF5", border: "#6EE7B7" },
                  "defecto_leve": { label: "Defecto Leve", text: "#A16207", bg: "#FEFCE8", border: "#FDE047" },
                  "deteriorado": { label: "Deteriorado", text: "#C2410C", bg: "#FFF7ED", border: "#FDBA74" },
                  "buen_estado": { label: "Buen Estado", text: "#15803D", bg: "#ECFDF5", border: "#6EE7B7" },
                  "rayado": { label: "Rayado", text: "#A16207", bg: "#FEFCE8", border: "#FDE047" },
                  "abollado": { label: "Abollado", text: "#C2410C", bg: "#FFF7ED", border: "#FDBA74" },
                  "danio_severo": { label: "Daño Severo", text: "#BE123C", bg: "#FFF1F2", border: "#FDA4AF" },
                  "no_entregado": { label: "No Entregado", text: "#374151", bg: "#F3F4F6", border: "#D1D5DB" },
                };

                const statusKey = it.status || it.nota || "";

                const s = statusMap[statusKey] || (it.ok
                  ? { label: "OK", text: "#15803D", bg: "#ECFDF5", border: "#6EE7B7" }
                  : { label: it.nota || "NO", text: "#B91C1C", bg: "#FEF2F2", border: "#FCA5A5" });

                const hasPdfNote = it.nota && !statusMap[it.nota];

                return `
              <div style="border:1px solid ${s.border}; border-radius:8px; padding:8px; font-size:12px; display:flex; flex-direction:column; gap:4px; background:${s.bg};">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div style="max-width:70%;">
                    ${it.name}
                  </div>
                  <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                    <span style="font-weight:700; font-size:11px; color:${s.text}">${s.label}</span>
                  </div>
                </div>
                ${hasPdfNote ? `<div style="color:#6B7280; font-size:11px; border-top:1px solid ${s.border}; margin-top:2px; padding-top:2px; font-style:italic;">Obs: ${it.nota}</div>` : ""}
              </div>`;
              }
            )
            .join("")}
        </div>
      </div>`
      )
      .join("")}

  <!-- Observaciones -->
  <div style="font-size:14px; font-weight:700; margin: 18px 0 8px;">Observaciones generales</div>
  <div style="border:1px solid #E5E7EB; border-radius:10px; padding:10px; font-size:12px; min-height:60px;">
    ${(row.observaciones ?? "—").toString().trim() || "—"}
  </div>
</div>
`;
}


/* =============== Export PDF =============== */
async function fetchGruposFor(row: ChecklistRow): Promise<Grupo[]> {
  const inRow = normalizeGruposFromRow(row);
  if (inRow && inRow.length > 0) return inRow;

  const { data, error } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("checklist_id", row.id)
    .order("id", { ascending: true });

  if (error) throw error;
  const byGroup = new Map<string, Grupo>();
  (data as ChecklistItemRow[]).forEach((r) => {
    const key = (r.grupo ?? "OTROS").toString();
    if (!byGroup.has(key)) byGroup.set(key, { titulo: key, items: [] });
    byGroup.get(key)!.items.push(normalizeItem(
      r.name,
      !!r.ok,
      undefined, // From flat table, we only have nota
      r.nota ?? ""
    ));
  });
  return Array.from(byGroup.values());
}

async function exportPdf(row: ChecklistRow, setToast: (t: ToastState) => void) {
  try {
    setToast({ type: "info", message: "Generando PDF, por favor espere..." });
    const grupos = await fetchGruposFor(row);

    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-99999px";
    host.style.top = "0";
    host.style.width = "794px";
    host.style.zIndex = "-1";
    host.innerHTML = buildPdfHtml(row, grupos);
    document.body.appendChild(host);

    const pdfRoot = host.querySelector("#pdf-root") as HTMLElement;
    // Wait for images
    await new Promise((resolve) => setTimeout(resolve, 500));

    const canvas = await html2canvas(pdfRoot, {
      scale: 3, // Increased scale for better quality
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [canvas.width, canvas.height],
      compress: true,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95); // JPEG slightly smaller/faster than PNG
    pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height, undefined, "FAST");

    const nombre = `Checklist_${row.placa ?? "vehiculo"}_${new Date(
      row.created_at
    ).toISOString().slice(0, 10)}.pdf`;
    pdf.save(nombre);

    document.body.removeChild(host);
    setToast({ type: "success", message: "PDF descargado correctamente." });
  } catch (e: any) {
    console.error(e);
    setToast({ type: "error", message: e?.message ?? "No se pudo exportar el PDF." });
  }
}

/* =============== Modal: Crear nuevo checklist =============== */
type ChecklistCreateModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  editingRow?: ChecklistRow | null; // Nuevo prop para edición
};

const ChecklistCreateModal: React.FC<ChecklistCreateModalProps> = ({
  open,
  onClose,
  onSaved,
  editingRow,
}) => {
  const { profile } = useAuth();
  const sig = useSignaturePad(open);

  const [tipo, setTipo] = React.useState<"entrega" | "regular">("regular"); // NUEVO ESTADO

  const [fecha, setFecha] = React.useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [sede, setSede] = React.useState("Trujillo");
  const [placa, setPlaca] = React.useState("");
  const [km, setKm] = React.useState<string>("");
  const [lastKm, setLastKm] = React.useState<number | null>(null); // Nuevo estado para validación
  const [responsable, setResponsable] = React.useState("");
  const [uDni, setUDni] = React.useState("");
  const [uNombre, setUNombre] = React.useState("");
  const [fechaIngreso, setFechaIngreso] = React.useState<string | null>(null); // NUEVO ESTADO
  const [grupos, setGrupos] = React.useState<CkGroup[]>(
    GRUPOS.map((g) => ({
      titulo: g.titulo,
      items: g.items.map((i) => ({ ...i })),
    }))
  );
  const [observaciones, setObservaciones] = React.useState(""); // Nuevo estado para observaciones
  const [saving, setSaving] = React.useState(false);

  const [conductores, setConductores] = React.useState<Driver[]>([]);
  const [placasInventario, setPlacasInventario] = React.useState<string[]>([]);

  // Combobox placa
  const [placaOpen, setPlacaOpen] = React.useState(false);
  const [placaSearch, setPlacaSearch] = React.useState("");
  const placaRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const { data: drvData, error: drvError } = await supabase
          .from("conductores")
          .select("id,nombre,dni,activo")
          .eq("activo", true)
          .order("nombre", { ascending: true });

        if (drvError) throw drvError;
        setConductores((drvData as Driver[]) ?? []);
      } catch (err) {
        console.error("Error cargando conductores:", err);
      }
    })();

    (async () => {
      try {
        if (!camionetasStore.inventario || camionetasStore.inventario.length === 0) {
          await camionetasStore.syncInventario();
        }
        const placas = camionetasStore.inventario
          .map((v: any) => v.placa as string)
          .filter(Boolean);
        setPlacasInventario(placas);
      } catch (err) {
        console.error("Error cargando inventario de placas:", err);
      }
    })();
  }, []);

  React.useEffect(() => {
    if (profile?.nombre && !editingRow) {
      setResponsable((prev) => prev || profile.nombre);
    }
  }, [profile, editingRow]);

  // Cargar datos si estamos editando
  React.useEffect(() => {
    if (editingRow && open) {
      setTipo(editingRow.tipo ?? "regular");
      // Importante: formatear para datetime-local
      setFecha(formatForDateTimeLocal(editingRow.fecha ?? editingRow.created_at));
      setSede(editingRow.sede ?? "Trujillo");
      setPlaca(editingRow.placa ?? "");
      setKm(editingRow.kilometraje?.toString() ?? "");
      setResponsable(editingRow.responsable_inspeccion ?? "");
      setUDni(getDni(editingRow));
      setUNombre(getNombre(editingRow));
      setObservaciones(editingRow.observaciones ?? "");
      setFechaIngreso(editingRow.fecha_ingreso ?? null);

      const inRow = normalizeGruposFromRow(editingRow);
      if (inRow && inRow.length > 0) {
        setGrupos(inRow);
      }
    } else if (!editingRow && open) {
      resetForm();
    }
  }, [editingRow, open]);

  // Cerrar dropdown placa cuando se hace click fuera
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!placaRef.current) return;
      if (!placaRef.current.contains(e.target as Node)) {
        setPlacaOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPlacas = React.useMemo(() => {
    const q = placaSearch.trim().toUpperCase();
    if (!q) return placasInventario;
    return placasInventario.filter((p) => p.toUpperCase().includes(q));
  }, [placaSearch, placasInventario]);

  const setItem = (gi: number, ii: number, patch: Partial<CkItem>) => {
    setGrupos((prev) =>
      prev.map((g, idx) =>
        idx !== gi
          ? g
          : {
            ...g,
            items: g.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)),
          }
      )
    );
  };

  // Filtrar ítems según el último checklist (checklist de entrega)
  React.useEffect(() => {
    // Si estamos editando, NO aplicamos filtros de inventario automático
    // para no sobreescribir los datos guardados del registro.
    if (editingRow) return;

    // Si es tipo ENTREGA, mostramos TODOS los items siempre (para definir el inventario)
    if (tipo === "entrega") {
      setGrupos(
        GRUPOS.map((g) => ({
          titulo: g.titulo,
          items: g.items.map((i) => ({ ...i })),
        }))
      );
      return;
    }

    // Si es REGULAR, aplicamos el filtro basado en la última entrega
    if (!placa) {
      setGrupos(
        GRUPOS.map((g) => ({
          titulo: g.titulo,
          items: g.items.map((i) => ({ ...i })),
        }))
      );
      return;
    }

    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("checklists")
          .select("grupos")
          .eq("placa", placa)
          .eq("tipo", "entrega")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!active) return;
        if (error) {
          console.error("Error buscando checklist de entrega anterior:", error);
          return;
        }

        if (!data || !data.grupos) {
          setGrupos(
            GRUPOS.map((g) => ({
              titulo: g.titulo,
              items: g.items.map((i) => ({ ...i })),
            }))
          );
          return;
        }

        const prevGrupos = Array.isArray(data.grupos) ? (data.grupos as any[]) : [];

        // Mapeamos los ítems que NO deben aparecer (los marcados como no entregados)
        const noEntregados = new Set<string>();
        prevGrupos.forEach((pg: any) => {
          if (Array.isArray(pg.items)) {
            pg.items.forEach((it: any) => {
              const isNoEntregado =
                it.status === "no_entregado" ||
                (it.nota && (it.nota.toUpperCase() === "NO ENTREGADO" || it.nota.toUpperCase() === "NO CUENTA"));

              if (isNoEntregado) {
                noEntregados.add(String(it.name));
              }
            });
          }
        });

        setGrupos((currentGrupos) => {
          return currentGrupos.map((g) => {
            const baseItems = GRUPOS.find((x) => x.titulo === g.titulo)?.items || [];
            const filteredItems = baseItems
              .filter((item) => !noEntregados.has(item.name))
              .map((item) => ({ ...item }));

            return {
              ...g,
              items: filteredItems,
            };
          });
        });
      } catch (err) {
        console.error(err);
      }
    })();

    return () => {
      active = false;
    };
  }, [placa, tipo, editingRow, open]);

  // Nuevo efecto para obtener el último kilometraje
  React.useEffect(() => {
    if (!placa) {
      setLastKm(null);
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase
          .from("checklists")
          .select("kilometraje")
          .eq("placa", placa)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error fetching last km:", error);
          return;
        }

        if (data && data.kilometraje) {
          setLastKm(data.kilometraje);
        } else {
          setLastKm(null);
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, [placa]);

  // Buscar fecha_ingreso del inventario cuando cambia la placa (solo si no estamos editando o si cambia manualmente)
  React.useEffect(() => {
    if (!placa) {
      setFechaIngreso(null);
      return;
    }
    const vehiculo = camionetasStore.inventario.find(v => v.placa === placa);
    if (vehiculo && vehiculo.fechaIngreso) {
      setFechaIngreso(vehiculo.fechaIngreso);
    } else {
      setFechaIngreso(null);
    }
  }, [placa]);

  const aprobado = React.useMemo(
    () => grupos.every((g) => g.items.every((it) => it.ok)),
    [grupos]
  );

  const resetForm = () => {
    setFecha(new Date().toISOString().slice(0, 16));
    setSede("Trujillo");
    setPlaca("");
    setKm("");
    setResponsable(profile?.nombre ?? "");
    setUDni("");
    setUNombre("");
    setGrupos(
      GRUPOS.map((g) => ({
        titulo: g.titulo,
        items: g.items.map((i) => ({ ...i })),
      }))
    );
    setObservaciones("");
    setPlacaSearch("");
    setPlacaOpen(false);
    sig.clear();
  };

  const handleUDniChange = (raw: string) => {
    const cleaned = raw.replace(/\D+/g, "").slice(0, 8);
    setUDni(cleaned);

    if (cleaned.length === 8) {
      const driver = conductores.find((d) => d.dni === cleaned);
      if (driver) {
        setUNombre(driver.nombre);
      }
    }
  };

  const guardar = async () => {
    if (saving) return; // Prevent double submission
    if (!fecha) {
      alert("Fecha requerida.");
      return;
    }
    if (!placa.trim()) {
      alert("La placa es obligatoria.");
      return;
    }
    if (!responsable.trim()) {
      alert("Responsable de inspección es obligatorio.");
      return;
    }
    if (!uDni.trim() || !uNombre.trim()) {
      alert("DNI y nombre de usuario de unidad son obligatorios.");
      return;
    }

    const valKm = km ? Number(km) : 0;
    if (valKm < 0) {
      alert("El kilometraje no puede ser negativo.");
      return;
    }
    if (lastKm !== null && valKm < lastKm) {
      alert(`El kilometraje ingresado (${valKm}) no puede ser menor al último registrado (${lastKm}).`);
      return;
    }

    try {
      setSaving(true);
      const firma = sig.toDataURL();

      const payload: any = {
        placa: placa.trim().toUpperCase(),
        fecha,
        sede: sede || null,
        kilometraje: valKm || null,
        responsable_inspeccion: responsable.trim(),
        usuario_dni: uDni.trim(),
        usuario_nombre: uNombre.trim(),
        firma_base64: firma,
        grupos,
        aprobado,
        tipo,
        observaciones: observaciones.trim(), // Enviamos observaciones
        fecha_ingreso: fechaIngreso, // Enviamos fecha de ingreso
      };

      if (editingRow) {
        await actualizarChecklist(editingRow.id, payload);
      } else {
        await guardarChecklist(payload);
      }

      await onSaved();
      resetForm();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "No se pudo guardar el checklist.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {editingRow ? "Editar checklist" : "Nuevo checklist de vehículo"}
              </h3>
              <p className="text-xs text-gray-600">
                {editingRow ? "Corrige o actualiza los datos del registro." : "Registra la inspección antes de la entrega o uso."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* Datos generales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="grid gap-1">
                <label className="text-sm font-medium">Fecha</label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-10 py-2.5 text-sm outline-none focus:ring-1 focus:ring-gray-200"
                  />
                </div>
              </div>

              <div className="grid gap-1 ">
                <label className="text-sm font-medium">Sede</label>
                <select
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-gray-200"
                >
                  <option value="Trujillo">Trujillo</option>
                  <option value="Arequipa">Arequipa</option>
                </select>
              </div>

              <div className="grid gap-1">
                <label className="text-sm font-medium">Tipo de Checklist</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTipo("regular")}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${tipo === "regular"
                      ? "bg-blue-900 text-white border-blue-900"
                      : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
                      }`}
                  >
                    Regular / Diario
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo("entrega")}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${tipo === "entrega"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
                      }`}
                  >
                    Entrega
                  </button>
                </div>
              </div>

              {/* Combobox de placa */}
              <div className="relative grid gap-1" ref={placaRef}>
                <label className="text-sm font-medium">Placa</label>
                <div className="relative">
                  <input
                    type="text"
                    value={placa}
                    onChange={(e) => {
                      setPlaca(e.target.value.toUpperCase());
                      setPlacaSearch(e.target.value);
                      setPlacaOpen(true);
                    }}
                    onFocus={() => {
                      setPlacaSearch(placa);
                      setPlacaOpen(true);
                    }}
                    className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 placeholder:text-gray-400"
                    placeholder="Buscar placa..."
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {placaOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-100 bg-white overflow-hidden max-h-60 overflow-y-auto top-full shadow-md">
                    {filteredPlacas.length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-400">
                        Sin resultados
                      </div>
                    )}
                    {filteredPlacas.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPlaca(p);
                          setPlacaSearch(p);
                          setPlacaOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 ${p === placa ? "bg-gray-100 font-medium" : ""
                          }`}
                      >
                        <span>{p}</span>
                        {p === placa && (
                          <span className="text-[10px] text-gray-500">
                            seleccionado
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mostrar Tiempo de Antigüedad debajo de la Placa si existe */}
              {fechaIngreso && (
                <div className="mt-1 px-1">
                  <p className="text-[11px] font-medium text-blue-700 bg-blue-50/50 px-2 py-1 rounded-lg border border-blue-100/50 inline-block">
                    <span className="opacity-70">Tiempo de antigüedad: </span>
                    {calculateSeniority(fechaIngreso)}
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium">
                Kilometraje
                {lastKm !== null && <span className="ml-1 text-xs font-normal text-gray-500">(Último: {lastKm})</span>}
              </label>
              <input
                type="number"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-gray-200"
                placeholder="Ej: 45231"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium">Responsable de la inspección</label>
              <input
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-gray-200"
                placeholder="Nombre del responsable"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium">DNI de usuario de unidad</label>
              <input
                value={uDni}
                onChange={(e) => handleUDniChange(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-gray-200"
                placeholder="00000000"
                inputMode="numeric"
                maxLength={8}
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium">Nombre de usuario de unidad</label>
              <input
                value={uNombre}
                onChange={(e) => setUNombre(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-gray-200"
                placeholder="Nombre y apellidos"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-sm font-medium">Observaciones generales</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gray-200"
                placeholder="Observaciones o notas sobre el estado general de la unidad..."
              />
            </div>

            {/* Firma */}
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <PenLine className="h-4 w-4 text-gray-500" />
                  Firma de usuario de unidad
                </label>
                <button
                  type="button"
                  onClick={sig.clear}
                  className="inline-flex items-center gap-2 rounded-lg border b px-3 py-1.5 text-xs hover:bg-gray-50"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Limpiar
                </button>
              </div>
              <div ref={sig.wrapRef} className="mt-2 rounded-xl border border-gray-600 p-2">
                <canvas
                  ref={sig.canvasRef}
                  onMouseDown={sig.start}
                  onMouseMove={sig.move}
                  onMouseUp={sig.end}
                  onMouseLeave={sig.end}
                  onTouchStart={sig.start}
                  onTouchMove={sig.move}
                  onTouchEnd={sig.end}
                  onTouchCancel={sig.end}
                  className="block w-full select-none"
                  style={{ touchAction: 'none' }}
                />
              </div>
            </div>

            {/* Grupos */}
            <div className="mt-5 grid gap-4">
              {grupos.map((g, gi) => (
                <div key={g.titulo} className="rounded-xl border">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <h4 className="text-sm font-semibold">{g.titulo}</h4>
                  </div>

                  <div className="grid gap-2 p-3 sm:grid-cols-2">
                    {g.items.map((it, ii) => {
                      // Determinar color según estado
                      const getItemColor = () => {
                        const status = it.status || "";
                        if (it.ok && (status === "vigente" || status === "funcional" || status === "buen_estado" || !status)) {
                          return "border-emerald-300 bg-emerald-50";
                        }
                        if (status === "por_vencer" || status === "defecto_leve" || status === "rayado") {
                          return "border-yellow-300 bg-yellow-50";
                        }
                        if (status === "vencido" || status === "deteriorado" || status === "abollado") {
                          return "border-orange-300 bg-orange-50";
                        }
                        if (status === "faltante" || status === "danio_severo") {
                          return "border-rose-300 bg-rose-50";
                        }
                        if (status === "no_entregado") {
                          return "border-slate-300 bg-slate-50";
                        }
                        return it.ok ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50";
                      };

                      return (
                        <div
                          key={it.name}
                          className={`rounded-lg border p-3 transition ${getItemColor()}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <span className="text-sm font-medium">{it.name}</span>
                            {/* Selector de estado según grupo */}
                            {g.titulo === "DOCUMENTOS Y SEGURIDAD" ? (
                              // Estados para items con vencimiento
                              <div className="flex flex-wrap gap-1 sm:justify-end">
                                <button
                                  type="button"
                                  onClick={() => setItem(gi, ii, { ok: true, status: "vigente" })}
                                  className={`rounded px-2 py-1.5 text-[10px] font-bold transition flex-1 sm:flex-initial text-center ${it.ok && it.status === "vigente"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-white text-gray-600 border hover:bg-gray-50"
                                    }`}
                                >
                                  Vigente
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItem(gi, ii, { ok: false, status: "por_vencer" })}
                                  className={`rounded px-2 py-1.5 text-[10px] font-bold transition flex-1 sm:flex-initial text-center ${!it.ok && it.status === "por_vencer"
                                    ? "bg-yellow-500 text-white"
                                    : "bg-white text-gray-600 border hover:bg-gray-50"
                                    }`}
                                >
                                  Por Vencer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItem(gi, ii, { ok: false, status: "vencido" })}
                                  className={`rounded px-2 py-1.5 text-[10px] font-bold transition flex-1 sm:flex-initial text-center ${!it.ok && it.status === "vencido"
                                    ? "bg-orange-500 text-white"
                                    : "bg-white text-gray-600 border hover:bg-gray-50"
                                    }`}
                                >
                                  Vencido
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItem(gi, ii, { ok: false, status: "faltante" })}
                                  className={`rounded px-2 py-1.5 text-[10px] font-bold transition flex-1 sm:flex-initial text-center ${!it.ok && it.status === "faltante"
                                    ? "bg-rose-600 text-white"
                                    : "bg-white text-gray-600 border hover:bg-gray-50"
                                    }`}
                                >
                                  Faltante
                                </button>
                                {tipo === "entrega" && (
                                  <button
                                    type="button"
                                    onClick={() => setItem(gi, ii, { ok: false, status: "no_entregado" })}
                                    className={`rounded px-2 py-1.5 text-[10px] font-bold transition flex-1 sm:flex-initial text-center ${!it.ok && it.status === "no_entregado"
                                      ? "bg-slate-700 text-white"
                                      : "bg-white text-gray-600 border hover:bg-gray-50"
                                      }`}
                                  >
                                    No entregado
                                  </button>
                                )}
                              </div>
                            ) : g.titulo === "ACCESORIOS Y FUNCIONAMIENTO" ? (
                              // Estados para items funcionales
                              <div className="flex flex-wrap gap-1 sm:justify-end">
                                <button
                                  type="button"
                                  onClick={() => setItem(gi, ii, { ok: true, status: "funcional" })}
                                  className={`rounded px-2 py-1.5 text-[10px] font-bold transition flex-1 sm:flex-initial text-center ${it.ok && it.status === "funcional"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-white text-gray-600 border hover:bg-gray-50"
                                    }`}
                                >
                                  Funcional
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItem(gi, ii, { ok: false, status: "defecto_leve" })}
                                  className={`rounded px-2 py-1.5 text-[10px] font-bold transition flex-1 sm:flex-initial text-center ${!it.ok && it.status === "defecto_leve"
                                    ? "bg-yellow-500 text-white"
                                    : "bg-white text-gray-600 border hover:bg-gray-50"
                                    }`}
                                >
                                  Defecto Leve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItem(gi, ii, { ok: false, status: "deteriorado" })}
                                  className={`rounded px-2 py-1.5 text-[10px] font-bold transition flex-1 sm:flex-initial text-center ${!it.ok && it.status === "deteriorado"
                                    ? "bg-orange-500 text-white"
                                    : "bg-white text-gray-600 border hover:bg-gray-50"
                                    }`}
                                >
                                  Deteriorado
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItem(gi, ii, { ok: false, status: "faltante" })}
                                  className={`rounded px-2 py-1.5 text-[10px] font-bold transition flex-1 sm:flex-initial text-center ${!it.ok && it.status === "faltante"
                                    ? "bg-rose-600 text-white"
                                    : "bg-white text-gray-600 border hover:bg-gray-50"
                                    }`}
                                >
                                  Faltante
                                </button>
                                {tipo === "entrega" && (
                                  <button
                                    type="button"
                                    onClick={() => setItem(gi, ii, { ok: false, status: "no_entregado" })}
                                    className={`rounded px-2 py-1.5 text-[10px] font-bold transition flex-1 sm:flex-initial text-center ${!it.ok && it.status === "no_entregado"
                                      ? "bg-slate-700 text-white"
                                      : "bg-white text-gray-600 border hover:bg-gray-50"
                                      }`}
                                  >
                                    No entregado
                                  </button>
                                )}
                              </div>
                            ) : (
                              // Estados para inspección visual
                              <div className="flex flex-wrap gap-1 sm:justify-end">
                                <button
                                  type="button"
                                  onClick={() => setItem(gi, ii, { ok: true, status: "buen_estado" })}
                                  className={`rounded px-2 py-1.5 text-[10px] font-bold transition flex-1 sm:flex-initial text-center ${it.ok && it.status === "buen_estado"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-white text-gray-600 border hover:bg-gray-50"
                                    }`}
                                >
                                  Buen Estado
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItem(gi, ii, { ok: false, status: "rayado" })}
                                  className={`rounded px-2 py-1.5 text-[10px] font-bold transition flex-1 sm:flex-initial text-center ${!it.ok && it.status === "rayado"
                                    ? "bg-yellow-500 text-white"
                                    : "bg-white text-gray-600 border hover:bg-gray-50"
                                    }`}
                                >
                                  Rayado
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItem(gi, ii, { ok: false, status: "abollado" })}
                                  className={`rounded px-2 py-1.5 text-[10px] font-bold transition flex-1 sm:flex-initial text-center ${!it.ok && it.status === "abollado"
                                    ? "bg-orange-500 text-white"
                                    : "bg-white text-gray-600 border hover:bg-gray-50"
                                    }`}
                                >
                                  Abollado
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItem(gi, ii, { ok: false, status: "danio_severo" })}
                                  className={`rounded px-2 py-1.5 text-[10px] font-bold transition flex-1 sm:flex-initial text-center ${!it.ok && it.status === "danio_severo"
                                    ? "bg-rose-600 text-white"
                                    : "bg-white text-gray-600 border hover:bg-gray-50"
                                    }`}
                                >
                                  Daño Severo
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Campo de observación: visible si el estado NO es verde */}
                          {it.status && !["vigente", "funcional", "buen_estado"].includes(it.status) && (
                            <div className="mt-2 text-[11px] font-medium text-gray-600">
                              Observación adicional:
                              <input
                                value={it.nota ?? ""}
                                onChange={(e) =>
                                  setItem(gi, ii, {
                                    nota: (e.target as HTMLInputElement).value,
                                  })
                                }
                                className="mt-1 w-full rounded-lg border px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-gray-200"
                                placeholder="Escribe aquí observaciones adicionales..."
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
            >
              <CheckCircle className="h-4 w-4" />
              {saving ? "Guardando..." : editingRow ? "Actualizar checklist" : "Guardar checklist"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =============== Componente principal =============== */
export default function RegistrosChecklist() {
  const [rows, setRows] = React.useState<ChecklistRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState<ToastState>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = React.useState(today);
  const [toDate, setToDate] = React.useState(today);

  const [placasInventario, setPlacasInventario] = React.useState<string[]>([]);
  const [placaFilter, setPlacaFilter] = React.useState<string>("");
  const [tipoFilter, setTipoFilter] = React.useState<string>(""); // NUEVO FILTRO

  const [exportingExcel, setExportingExcel] = React.useState(false);

  const [openView, setOpenView] = React.useState(false);
  const [viewRow, setViewRow] = React.useState<ChecklistRow | null>(null);
  const [viewGrupos, setViewGrupos] = React.useState<Grupo[]>([]);
  const [loadingView, setLoadingView] = React.useState(false);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [editingRow, setEditingRow] = React.useState<ChecklistRow | null>(null);

  const openEditModal = (row: ChecklistRow) => {
    setEditingRow(row);
    setOpenCreate(true);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // Cargar placas desde inventarioStore
  React.useEffect(() => {
    (async () => {
      try {
        if (!camionetasStore.inventario || camionetasStore.inventario.length === 0) {
          await camionetasStore.syncInventario();
        }
        const placas = camionetasStore.inventario
          .map((v: any) => v.placa as string)
          .filter(Boolean);
        setPlacasInventario(placas);
      } catch (err) {
        console.error("Error cargando inventario de placas:", err);
      }
    })();
  }, []);

  const fetchChecklists = React.useCallback(
    async (opts?: { page?: number; silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const usePage = opts?.page ?? page;
        const fromISO = new Date(`${fromDate}T00:00:00`).toISOString();
        const toISO = new Date(`${toDate}T23:59:59`).toISOString();
        const from = (usePage - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from("checklists")
          .select("*", { count: "exact" })
          .gte("created_at", fromISO)
          .lte("created_at", toISO)
          .order("created_at", { ascending: false });

        if (placaFilter) {
          query = query.eq("placa", placaFilter);
        }
        if (tipoFilter) {
          query = query.eq("tipo", tipoFilter);
        }

        const { data, error, count } = await query.range(from, to);

        if (error) throw error;
        setRows((data as ChecklistRow[]) ?? []);
        setTotal(count || 0);
      } catch (e: any) {
        alert(e?.message ?? "No se pudo cargar el historial de checklist.");
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [fromDate, toDate, page, pageSize, placaFilter, tipoFilter]
  );

  React.useEffect(() => {
    fetchChecklists({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    fetchChecklists({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const exportExcel = async () => {
    try {
      setExportingExcel(true);

      const fromISO = new Date(`${fromDate}T00:00:00`).toISOString();
      const toISO = new Date(`${toDate}T23:59:59`).toISOString();

      // Consulta TODOS los checklists que cumplen los filtros actuales (sin paginación)
      let query = supabase
        .from("checklists")
        .select("*")
        .gte("created_at", fromISO)
        .lte("created_at", toISO)
        .order("created_at", { ascending: false });

      if (placaFilter) {
        query = query.eq("placa", placaFilter);
      }
      if (tipoFilter) {
        query = query.eq("tipo", tipoFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const allRows = (data as ChecklistRow[]) ?? [];

      if (allRows.length === 0) {
        alert("No hay registros para exportar con los filtros actuales.");
        return;
      }

      // ===== Hoja 1: resumen por checklist =====
      const exportData = allRows.map((r) => ({
        ID: r.id,
        Codigo: r.codigo ?? "",
        Tipo: r.tipo ?? "REGULAR",
        Fecha: formatFechaHoraLocal(r.fecha, r.created_at),
        Sede: r.sede ?? "",
        Placa: r.placa ?? "",
        Kilometraje: r.kilometraje ?? "",
        "Resp. Inspección": r.responsable_inspeccion ?? "",
        "DNI Usuario": getDni(r),
        "Nombre Usuario": getNombre(r),
        "Correo Usuario": getCorreo(r),
        Estado: r.aprobado ? "Aprobado" : "Observaciones",
        Observaciones: r.observaciones ?? "",
        "Antigüedad Unidad": calculateSeniority(r.fecha_ingreso),
      }));

      const sheetResumen = XLSX.utils.json_to_sheet(exportData);

      // ===== Hoja 2: detalle de ítems (OK / NO OK / nota) =====
      const itemsRows: {
        ChecklistID: string;
        Placa: string;
        Fecha: string;
        Grupo: string;
        Item: string;
        Estado: string;
        Nota: string;
      }[] = [];

      for (const ck of allRows) {
        const grupos = await fetchGruposFor(ck);
        grupos.forEach((g) => {
          g.items.forEach((it) => {
            const statusKey = it.status || (it.nota && {
              "vigente": 1, "por_vencer": 1, "vencido": 1, "faltante": 1, "funcional": 1, "defecto_leve": 1, "deteriorado": 1, "buen_estado": 1, "rayado": 1, "abollado": 1, "danio_severo": 1
            }[it.nota] ? it.nota : "");

            const statusMap: Record<string, string> = {
              "vigente": "Vigente", "por_vencer": "Por Vencer", "vencido": "Vencido", "faltante": "Faltante",
              "funcional": "Funcional", "defecto_leve": "Defecto Leve", "deteriorado": "Deteriorado",
              "buen_estado": "Buen Estado", "rayado": "Rayado", "abollado": "Abollado", "danio_severo": "Daño Severo",
              "no_entregado": "No Entregado"
            };

            const estadoLabel = statusMap[statusKey] || (it.ok ? "OK" : "NO");
            const manualNote = it.nota && it.nota !== statusKey ? it.nota : "";

            itemsRows.push({
              ChecklistID: ck.id,
              Placa: ck.placa ?? "",
              Fecha: formatFechaHoraLocal(ck.fecha, ck.created_at),
              Grupo: g.titulo,
              Item: it.name,
              Estado: estadoLabel,
              Nota: manualNote,
            });
          });
        });
      }

      const sheetItems = XLSX.utils.json_to_sheet(itemsRows);

      // Crear libro y añadir ambas hojas
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheetResumen, "Checklists");
      XLSX.utils.book_append_sheet(workbook, sheetItems, "Items");

      const filename = `Checklists_${fromDate}_a_${toDate}${placaFilter ? `_placa_${placaFilter}` : ""
        }.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "No se pudo exportar el Excel.");
    } finally {
      setExportingExcel(false);
    }
  };

  const openDetails = async (row: ChecklistRow) => {
    setViewRow(row);
    setOpenView(true);
    setViewGrupos([]);
    setLoadingView(true);
    try {
      const grupos = await fetchGruposFor(row);
      setViewGrupos(grupos);
    } catch (e: any) {
      alert(e?.message ?? "No se pudieron cargar los ítems del checklist.");
    } finally {
      setLoadingView(false);
    }
  };

  const estadoPill = (aprobado: boolean | null | undefined) =>
    aprobado ? (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
        Aprobado
      </span>
    ) : (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
        Observaciones
      </span>
    );

  return (
    <div className="grid gap-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Registros de Checklist
          </h1>
          <p className="text-sm text-gray-600">
            Historial con paginación y filtro por fecha y placa.
          </p>
        </div>
        <div className="flex w-full sm:w-auto flex-col items-center sm:items-end gap-2">
          <button
            type="button"
            onClick={() => setOpenCreate(true)}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#ff0000] px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 active:scale-[.99]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Nuevo checklist</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl px-5 py-4 border border-gray-200 bg-white">
        <div className="flex flex-col sm:flex-row flex-wrap sm:items-end gap-3">
          <div className="grid gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-gray-600">Desde</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
              }}
              className="w-full sm:w-[180px] rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-gray-200"
            />
          </div>
          <div className="grid gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-gray-600">Hasta</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
              }}
              className="w-full sm:w-[180px] rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-gray-200"
            />
          </div>

          <div className="grid gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-gray-600">Placa</label>
            <select
              value={placaFilter}
              onChange={(e) => setPlacaFilter(e.target.value)}
              className="w-full sm:w-[180px] rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-gray-200"
            >
              <option value="">Todas</option>
              {placasInventario.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-gray-600">Tipo</label>
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="w-full sm:w-[140px] rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-gray-200"
            >
              <option value="">Todos</option>
              <option value="entrega">Entrega</option>
              <option value="regular">Regular</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setPage(1);
              fetchChecklists({ page: 1 });
            }}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Aplicar filtros"
          >
            <Filter className="h-4 w-4" />
            <span>Aplicar</span>
          </button>

          <button
            type="button"
            onClick={exportExcel}
            disabled={exportingExcel}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            title="Exportar a Excel todos los registros filtrados"
          >
            {exportingExcel ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            <span>{exportingExcel ? "Exportando..." : "Excel"}</span>
          </button>

          {loading && (
            <div className="inline-flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            <div>
              <h2 className="text-lg font-semibold leading-tight">
                Lista de Checklists
              </h2>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-6 py-3 font-medium">Cód</th>
                <th className="px-6 py-3 font-medium">Fecha/Hora</th>
                <th className="px-6 py-3 font-medium">Tipo</th>
                <th className="px-6 py-3 font-medium">Placa</th>
                <th className="px-6 py-3 font-medium">DNI usuario</th>
                <th className="px-6 py-3 font-medium">Nombre usuario</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr
                  key={c.id}
                  className={`border-t border-gray-100 ${i % 2 ? "bg-gray-50/40" : "bg-white"}`}
                >
                  <td className="px-6 py-3 font-medium text-gray-900">
                    {c.codigo ?? "—"}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {new Date(c.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${c.tipo === "entrega" ? "bg-purple-50 text-purple-700 ring-purple-600/20" : "bg-gray-50 text-gray-600 ring-gray-500/10"
                      }`}>
                      {c.tipo ? c.tipo.toUpperCase() : "REGULAR"}
                    </span>
                  </td>
                  <td className="px-6 py-3">{c.placa || "—"}</td>
                  <td className="px-6 py-3">{getDni(c)}</td>
                  <td className="px-6 py-3">{getNombre(c)}</td>
                  <td className="px-6 py-3">{estadoPill(!!c.aprobado)}</td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        onClick={() => openDetails(c)}
                        title="Ver detalles"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                        onClick={() => exportPdf(c, setToast)}
                        title="Descargar PDF"
                      >
                        <FileDown className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                        onClick={() => openEditModal(c)}
                        title="Editar checklist"
                      >
                        <PenLine className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {(!rows || rows.length === 0) && !loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    No hay checklists para el rango seleccionado.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8">
                    <div className="flex items-center justify-center gap-2 text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 text-sm">
          <div className="text-gray-600">
            Página {page} de {totalPages} ({total} registros)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canPrev || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              disabled={!canNext || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-gray-600">Filas:</span>
            <select
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 outline-none focus:ring-2 focus:ring-blue-200"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.currentTarget.value));
                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MODAL: Ver detalle */}
      {openView && viewRow && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpenView(false)}
            aria-hidden
          />
          <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
            <div className="w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 sm:px-5 py-3 sm:py-4">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold">
                    Detalle de checklist
                  </h3>
                  <p className="text-xs text-gray-500">
                    Registrado: {new Date(viewRow.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenView(false)}
                  className="rounded-lg p-1 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
                {/* Datos generales */}
                <h4 className="mb-2 text-sm font-semibold text-gray-700">
                  Datos generales
                </h4>
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Fecha", formatFechaHoraLocal(viewRow.fecha, viewRow.created_at)],
                    ["Sede", viewRow.sede ?? "—"],
                    ["Placa", viewRow.placa ?? "—"],
                    ["Kilometraje", viewRow.kilometraje?.toString() ?? "—"],
                    ["Resp. Inspección", viewRow.responsable_inspeccion ?? "—"],
                    ["DNI Usuario", getDni(viewRow)],
                    ["Nombre Usuario", getNombre(viewRow)],
                    ["Correo Usuario", getCorreo(viewRow)],
                    ["Tipo", viewRow.tipo ? viewRow.tipo.toUpperCase() : "REGULAR"], // Mostrar tipo
                    ["Tiempo de antigüedad", calculateSeniority(viewRow.fecha_ingreso)],
                  ].map(([label, val]) => (
                    <div
                      key={label as string}
                      className="rounded-lg border border-gray-100 px-3 py-2"
                    >
                      <span className="text-sm">
                        <span className="font-medium">{label}: </span>
                        {val as string}
                      </span>
                    </div>
                  ))}

                  <div className="rounded-lg border border-gray-100 px-3 py-2 sm:col-span-2 lg:col-span-3">
                    <span className="text-sm font-medium block mb-2">
                      Firma de usuario
                    </span>
                    {(() => {
                      const dataUrl = getFirma(viewRow);
                      if (!dataUrl) return <span className="text-xs text-gray-500">Sin firma</span>;

                      const blobUrl = createBlobURL(dataUrl);
                      return (
                        <img
                          src={blobUrl!}
                          alt="Firma del usuario"
                          className="h-24 w-auto rounded border border-gray-100 bg-white md:h-24 lg:h-28"
                          onError={() => {
                            console.error("Error al cargar la firma");
                          }}
                        />
                      );
                    })()}
                  </div>
                </div>

                {/* Estado y observaciones */}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {estadoPill(!!viewRow.aprobado)}
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Observaciones: </span>
                    {viewRow.observaciones?.trim() || "—"}
                  </span>
                </div>

                {/* Ítems */}
                <h4 className="mt-6 mb-2 text-sm font-semibold text-gray-700">
                  Ítems del vehículo
                </h4>

                {loadingView && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando ítems…
                  </div>
                )}

                {!loadingView && (
                  <div className="grid gap-4">
                    {viewGrupos.map((g) => (
                      <div key={g.titulo} className="rounded-2xl border border-gray-100">
                        <div className="border-b border-gray-100 bg-gray-50/50 px-3 py-2 text-sm font-semibold">
                          {g.titulo}
                        </div>
                        <div className="grid gap-2 p-3 sm:grid-cols-2">
                          {g.items.map((it) => {
                            const getStatusDisplay = () => {
                              const statusKey = it.status || it.nota || "";
                              const statusMap: Record<string, { label: string; color: string }> = {
                                "vigente": { label: "Vigente", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
                                "por_vencer": { label: "Por Vencer", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
                                "vencido": { label: "Vencido", color: "bg-orange-100 text-orange-700 border-orange-200" },
                                "faltante": { label: "Faltante", color: "bg-rose-100 text-rose-700 border-rose-200" },
                                "funcional": { label: "Funcional", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
                                "defecto_leve": { label: "Defecto Leve", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
                                "deteriorado": { label: "Deteriorado", color: "bg-orange-100 text-orange-700 border-orange-200" },
                                "buen_estado": { label: "Buen Estado", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
                                "rayado": { label: "Rayado", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
                                "abollado": { label: "Abollado", color: "bg-orange-100 text-orange-700 border-orange-200" },
                                "danio_severo": { label: "Daño Severo", color: "bg-rose-100 text-rose-700 border-rose-200" },
                                "no_entregado": { label: "No Entregado", color: "bg-slate-100 text-slate-700 border-slate-200" }
                              };
                              if (statusMap[statusKey]) return statusMap[statusKey];
                              return it.ok
                                ? { label: "OK", color: "bg-emerald-100 text-emerald-700 border-emerald-200" }
                                : { label: it.nota || "NO", color: "bg-rose-100 text-rose-700 border-rose-200" };
                            };
                            const status = getStatusDisplay();
                            const hasObservation = it.nota && ![
                              "vigente", "por_vencer", "vencido", "faltante", "funcional", "defecto_leve", "deteriorado", "buen_estado", "rayado", "abollado", "danio_severo", "no_entregado"
                            ].includes(it.nota);

                            return (
                              <div key={it.name} className="flex flex-col gap-1 rounded-lg border border-gray-100 px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">{it.name}</span>
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${status.color}`}>
                                    {status.label}
                                  </span>
                                </div>
                                {hasObservation && (
                                  <div className="text-[11px] text-gray-500 italic border-t border-gray-50 mt-1 pt-1">
                                    Obs: {it.nota}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {viewGrupos.length === 0 && (
                      <div className="text-sm text-gray-500">
                        Sin ítems registrados.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t px-4 sm:px-5 py-3 sm:py-4">
                <button
                  type="button"
                  onClick={() => setOpenView(false)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-50 active:scale-[.98]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )
      }

      {/* MODAL: Crear checklist */}
      <ChecklistCreateModal
        open={openCreate}
        editingRow={editingRow}
        onClose={() => {
          setOpenCreate(false);
          setEditingRow(null);
        }}
        onSaved={async () => {
          setPage(1);
          await fetchChecklists({ page: 1 });
          setToast({ type: "success", message: "Checklist guardado correctamente." });
        }}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
