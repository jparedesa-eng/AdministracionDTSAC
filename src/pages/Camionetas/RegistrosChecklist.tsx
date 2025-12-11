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
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { guardarChecklist } from "../../store/checklistStore";
import { camionetasStore } from "../../store/camionetasStore";
import { useAuth } from "../../auth/AuthContext";

/* =============== Tipos =============== */
type Grupo = {
  titulo: string;
  items: { name: string; ok: boolean; nota?: string }[];
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

type CkItem = { name: string; ok: boolean; nota?: string };
type CkGroup = { title: string; items: CkItem[] };

type Driver = {
  id: string;
  nombre: string;
  dni: string;
  activo: boolean;
};

/* =============== Grupos base =============== */
const GRUPOS: CkGroup[] = [
  {
    title: "OTROS",
    items: [
      "EXTINTOR",
      "BOTIQUÍN",
      "SEGURO DE RUEDAS",
      "GATA",
      "LLAVE DE RUEDAS",
      "CONOS",
      "TACOS",
      "DOCUMENTOS DE VEHÍCULO",
      "FORRO ASIENTOS",
      "PISOS",
      "LUNAS",
      "FUNCIONAMIENTO DE LUCES",
      "ALARMA DE RETROCESO",
    ].map((name) => ({ name, ok: true })),
  },
  {
    title: "PARTE FRONTAL",
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
    ].map((name) => ({ name, ok: true })),
  },
  {
    title: "PARTE LATERAL IZQUIERDA (LH)",
    items: [
      "Zocalo LH",
      "Puerta piloto LH",
      "Tapa de combustible LH",
      "Puerta trasera LH",
    ].map((name) => ({ name, ok: true })),
  },
  {
    title: "PARTE LATERAL DERECHA (RH)",
    items: [
      "Espejo retroviso RH",
      "Guardafango delantero RH",
      "Guardafango trasero RH",
      "Zocalo RH",
      "Puerta piloto RH",
    ].map((name) => ({ name, ok: true })),
  },
  {
    title: "PARTE POSTERIOR",
    items: [
      "Puerta trasera RH",
      "Compuerta de tolva",
      "Faros posterior LH",
      "Faros posterior RH",
      "Llanta de repuesto",
      "Parachoque posterior",
    ].map((name) => ({ name, ok: true })),
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

function normalizeGruposFromRow(row: ChecklistRow): Grupo[] | null {
  if (!row || !row.grupos) return null;
  const raw = row.grupos as any;
  if (Array.isArray(raw)) {
    const grupos: Grupo[] = raw.map((g: any) => ({
      titulo: String(g.title ?? g.titulo ?? "OTROS"),
      items: Array.isArray(g.items)
        ? g.items.map((it: any) => ({
          name: String(it.name ?? ""),
          ok: Boolean(it.ok),
          ...(it.ok ? {} : { nota: it.nota ? String(it.nota) : "" }),
        }))
        : [],
    }));
    return grupos;
  }
  return null;
}

const getDni = (r: ChecklistRow) => r.usuario_dni ?? r.dni_usuario ?? "—";
const getNombre = (r: ChecklistRow) => r.usuario_nombre ?? r.nombre_usuario ?? "—";
const getCorreo = (r: ChecklistRow) => r.usuario_correo ?? r.correo_usuario ?? "—";
const getFirma = (r: ChecklistRow) => r.firma_base64 ?? r.firma_usuario_dataurl ?? null;

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
      <div>${new Date(row.created_at).toLocaleString()}</div>
    </div>
  </div>

  <!-- Datos generales -->
  <div style="font-size:14px; font-weight:700; margin: 10px 0 8px;">Datos generales</div>
  <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-bottom:12px;">
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
              (it) => `
              <div style="border:1px solid ${it.ok ? "#6EE7B7" : "#FCA5A5"
                }; border-radius:8px; padding:8px; font-size:12px; display:flex; justify-content:space-between; align-items:flex-start; background:${it.ok ? "#ECFDF5" : "#FEF2F2"
                };">
                <div style="max-width:55%;">
                  ${it.name}
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; max-width:45%;">
                  <span style="font-weight:700; font-size:11px; ${it.ok ? "color:#15803D" : "color:#B91C1C"
                }">${it.ok ? "OK" : "NO"}</span>
                  ${!it.ok && it.nota
                  ? `<span style="color:#6B7280; font-size:11px; text-align:right;">${it.nota}</span>`
                  : ""
                }
                </div>
              </div>`
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
    byGroup.get(key)!.items.push({
      name: r.name,
      ok: !!r.ok,
      ...(r.ok ? {} : { nota: r.nota ?? "" }),
    });
  });
  return Array.from(byGroup.values());
}

async function exportPdf(row: ChecklistRow) {
  try {
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
    const canvas = await html2canvas(pdfRoot, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [canvas.width, canvas.height],
      compress: true,
    });

    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height, "", "FAST");

    const nombre = `Checklist_${row.placa ?? "vehiculo"}_${new Date(
      row.created_at
    ).toISOString().slice(0, 10)}.pdf`;
    pdf.save(nombre);

    document.body.removeChild(host);
  } catch (e: any) {
    console.error(e);
    alert(e?.message ?? "No se pudo exportar el PDF.");
  }
}

/* =============== Modal: Crear nuevo checklist =============== */
type ChecklistCreateModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

const ChecklistCreateModal: React.FC<ChecklistCreateModalProps> = ({
  open,
  onClose,
  onSaved,
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
  const [grupos, setGrupos] = React.useState<CkGroup[]>(
    GRUPOS.map((g) => ({
      title: g.title,
      items: g.items.map((i) => ({ ...i })),
    }))
  );
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
    if (profile?.nombre) {
      setResponsable((prev) => prev || profile.nombre);
    }
  }, [profile]);

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

  const marcarGrupo = (gi: number, ok: boolean) => {
    setGrupos((prev) =>
      prev.map((g, idx) =>
        idx !== gi
          ? g
          : {
            ...g,
            items: g.items.map((it) => ({
              ...it,
              ok,
              nota: ok ? undefined : it.nota,
            })),
          }
      )
    );
  };

  // Filtrar ítems de OTROS según el último checklist (checklist de entrega)
  // Filtrar ítems de OTROS según el último checklist (checklist de entrega)
  React.useEffect(() => {
    // Si es tipo ENTREGA, mostramos TODOS los items siempre (para definir el inventario)
    if (tipo === "entrega") {
      setGrupos(
        GRUPOS.map((g) => ({
          title: g.title,
          items: g.items.map((i) => ({ ...i })),
        }))
      );
      return;
    }

    // Si es REGULAR, aplicamos el filtro basado en la última entrega
    // Si no hay placa, restauramos los grupos originales
    if (!placa) {
      setGrupos(
        GRUPOS.map((g) => ({
          title: g.title,
          items: g.items.map((i) => ({ ...i })),
        }))
      );
      return;
    }

    let active = true;
    (async () => {
      try {
        // Buscar el último checklist DE ENTREGA de esta placa
        const { data, error } = await supabase
          .from("checklists")
          .select("grupos")
          .eq("placa", placa)
          .eq("tipo", "entrega") // SOLO CHECKLISTS DE ENTREGA
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!active) return;
        if (error) {
          console.error("Error buscando checklist de entrega anterior:", error);
          return;
        }

        // Si no existe checklist de entrega previo, mostramos todo (fallback)
        if (!data || !data.grupos) {
          setGrupos(
            GRUPOS.map((g) => ({
              title: g.title,
              items: g.items.map((i) => ({ ...i })),
            }))
          );
          return;
        }

        // Si existe, filtramos el grupo "OTROS"
        const prevGrupos = Array.isArray(data.grupos) ? (data.grupos as any[]) : [];
        const prevOtros = prevGrupos.find(
          (pg) => String(pg.title || pg.titulo) === "OTROS"
        );

        if (!prevOtros || !Array.isArray(prevOtros.items)) {
          return;
        }

        // Obtenemos los nombres de ítems que NO fueron marcados como "NO ENTREGADO"
        const allowedItems = new Set<string>();
        prevOtros.items.forEach((it: any) => {
          const esNoCuenta = !it.ok && (it.nota === "NO CUENTA" || it.nota === "NO ENTREGADO");
          if (!esNoCuenta) {
            allowedItems.add(String(it.name));
          }
        });

        // Actualizamos el estado
        setGrupos((currentGrupos) => {
          return currentGrupos.map((g) => {
            if (g.title === "OTROS") {
              const baseItems = GRUPOS.find((x) => x.title === "OTROS")?.items || [];
              const newItems = baseItems
                .filter((baseItem) => allowedItems.has(baseItem.name))
                .map((baseItem) => ({ ...baseItem }));

              return {
                ...g,
                items: newItems,
              };
            }
            const baseG = GRUPOS.find((x) => x.title === g.title);
            if (baseG) {
              return {
                title: baseG.title,
                items: baseG.items.map(i => ({ ...i }))
              };
            }
            return g;
          });
        });
      } catch (err) {
        console.error(err);
      }
    })();

    return () => {
      active = false;
    };
  }, [placa, tipo]);

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
        title: g.title,
        items: g.items.map((i) => ({ ...i })),
      }))
    );
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

      await guardarChecklist({
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
        tipo, // Enviamos el tipo
      });

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
      <div className="absolute inset-0 grid place-items-center p-3 sm:p-4">
        <div className="w-full max-w-5xl overflow-hidden rounded-2xl border bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold">Nuevo checklist de vehículo</h3>
              <p className="text-xs text-gray-500">
                Registra la inspección antes de la entrega o uso.
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
          <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
            {/* Datos generales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="grid gap-1">
                <label className="text-sm font-medium">Fecha</label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={fecha}
                    readOnly
                    className="w-full rounded-xl border px-10 py-2.5 text-sm shadow-sm outline-none bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-sm font-medium">Sede</label>
                <select
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none"
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
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    Regular / Diario
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo("entrega")}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${tipo === "entrega"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-700 hover:bg-gray-50"
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
                    className="w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-400"
                    placeholder="Buscar placa..."
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {placaOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border bg-white shadow-lg overflow-hidden max-h-60 overflow-y-auto top-full">
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

              <div className="grid gap-1">
                <label className="text-sm font-medium">
                  Kilometraje
                  {lastKm !== null && <span className="ml-1 text-xs font-normal text-gray-500">(Último: {lastKm})</span>}
                </label>
                <input
                  type="number"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none"
                  placeholder="Ej: 45231"
                />
              </div>

              <div className="grid gap-1">
                <label className="text-sm font-medium">Responsable de la inspección</label>
                <input
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none"
                  placeholder="Nombre del responsable"
                />
              </div>

              <div className="grid gap-1">
                <label className="text-sm font-medium">DNI de usuario de unidad</label>
                <input
                  value={uDni}
                  onChange={(e) => handleUDniChange(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none"
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
                  className="w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none"
                  placeholder="Nombre y apellidos"
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
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    Limpiar
                  </button>
                </div>
                <div ref={sig.wrapRef} className="mt-2 rounded-xl border p-2">
                  <canvas
                    ref={sig.canvasRef}
                    onMouseDown={sig.start}
                    onMouseMove={sig.move}
                    onMouseUp={sig.end}
                    onMouseLeave={sig.end}
                    onTouchStart={sig.start}
                    onTouchMove={sig.move}
                    onTouchEnd={sig.end}
                    className="block w-full touch-none select-none"
                  // style={{ height: 180 }} // Height handled in hook logic now
                  />
                </div>
              </div>
            </div>

            {/* Grupos */}
            <div className="mt-5 grid gap-4">
              {grupos.map((g, gi) => (
                <div key={g.title} className="rounded-xl border">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <h4 className="text-sm font-semibold">{g.title}</h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => marcarGrupo(gi, true)}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        Marcar grupo OK
                      </button>
                      <button
                        type="button"
                        onClick={() => marcarGrupo(gi, false)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                      >
                        Marcar grupo NO
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 p-3 sm:grid-cols-2">
                    {g.items.map((it, ii) => (
                      <div
                        key={it.name}
                        className={`rounded-lg border p-3 transition ${it.ok
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-rose-300 bg-rose-50"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm">{it.name}</span>
                          {/* Renderizado condicional según tipo */}
                          {tipo === "entrega" && g.title === "OTROS" ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setItem(gi, ii, { ok: true, nota: undefined })
                                }
                                className={`rounded px-2 py-1 text-[10px] font-bold transition ${it.ok
                                  ? "bg-emerald-600 text-white"
                                  : "bg-white text-gray-500 border hover:bg-gray-50"
                                  }`}
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setItem(gi, ii, { ok: false, nota: "Malo" })
                                }
                                className={`rounded px-2 py-1 text-[10px] font-bold transition ${!it.ok && it.nota !== "NO ENTREGADO" && it.nota !== "NO CUENTA"
                                  ? "bg-rose-600 text-white"
                                  : "bg-white text-gray-500 border hover:bg-gray-50"
                                  }`}
                              >
                                NO OK
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setItem(gi, ii, { ok: false, nota: "NO ENTREGADO" })
                                }
                                className={`rounded px-2 py-1 text-[10px] font-bold transition ${!it.ok && it.nota === "NO ENTREGADO"
                                  ? "bg-gray-600 text-white"
                                  : "bg-white text-gray-500 border hover:bg-gray-50"
                                  }`}
                              >
                                NO ENTREGADO
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-semibold ${it.ok ? "text-emerald-700" : "text-rose-700"
                                  }`}
                              >
                                {it.ok ? "OK" : "NO"}
                              </span>
                              <label className="relative inline-flex cursor-pointer items-center select-none">
                                <input
                                  type="checkbox"
                                  className="peer sr-only"
                                  checked={it.ok}
                                  onChange={(e) =>
                                    setItem(gi, ii, {
                                      ok: (e.target as HTMLInputElement).checked,
                                      ...((e.target as HTMLInputElement).checked
                                        ? { nota: undefined }
                                        : {}),
                                    })
                                  }
                                />
                                <div className="h-5 w-9 rounded-full bg-rose-200 transition peer-checked:bg-emerald-500" />
                                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
                              </label>
                            </div>
                          )}
                        </div>

                        {!it.ok && (
                          <div className="mt-2">
                            <input
                              value={it.nota ?? ""}
                              onChange={(e) =>
                                setItem(gi, ii, {
                                  nota: (e.target as HTMLInputElement).value,
                                })
                              }
                              className="w-full rounded-lg border px-3 py-2 text-xs outline-none"
                              placeholder="Nota (opcional)…"
                            />
                          </div>
                        )}
                      </div>
                    ))}
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
              className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <CheckCircle className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar checklist"}
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
            itemsRows.push({
              ChecklistID: ck.id,
              Placa: ck.placa ?? "",
              Fecha: formatFechaHoraLocal(ck.fecha, ck.created_at),
              Grupo: g.titulo,
              Item: it.name,
              Estado: it.ok ? "OK" : "NO",
              Nota: it.nota ?? "",
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
      const inRow = normalizeGruposFromRow(row);
      if (inRow && inRow.length > 0) {
        setViewGrupos(inRow);
        return;
      }

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
        byGroup.get(key)!.items.push({
          name: r.name,
          ok: !!r.ok,
          ...(r.ok ? {} : { nota: r.nota ?? "" }),
        });
      });

      setViewGrupos(Array.from(byGroup.values()));
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
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 active:scale-[.99]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Nuevo checklist</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <section className="rounded-2xl px-5 py-4 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row flex-wrap sm:items-end gap-3">
          <div className="grid gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-gray-600">Desde</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
              }}
              className="w-full sm:w-[180px] rounded-xl border border-gray-100 px-3 py-2.5 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
              className="w-full sm:w-[180px] rounded-xl border border-gray-100 px-3 py-2.5 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
            />
          </div>

          <div className="grid gap-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-gray-600">Placa</label>
            <select
              value={placaFilter}
              onChange={(e) => setPlacaFilter(e.target.value)}
              className="w-full sm:w-[180px] rounded-xl border border-gray-100 px-3 py-2.5 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
              className="w-full sm:w-[140px] rounded-xl border border-gray-100 px-3 py-2.5 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            title="Aplicar filtros"
          >
            <Filter className="h-4 w-4" />
            <span>Aplicar</span>
          </button>

          <button
            type="button"
            onClick={exportExcel}
            disabled={exportingExcel}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
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
      </section>

      {/* Tabla */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            <div>
              <h2 className="text-lg font-semibold leading-tight">
                Lista de Checklists
              </h2>
              <p className="text-xs text-gray-500">
                Mostrando {rows.length} de {total} — Página {page} / {totalPages}
              </p>
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
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 active:scale-[.98]"
                        onClick={() => openDetails(c)}
                      >
                        <Eye className="h-4 w-4" />
                        Ver
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 active:scale-[.98]"
                        onClick={() => exportPdf(c)}
                        title="Exportar PDF"
                      >
                        <FileDown className="h-4 w-4" />
                        PDF
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
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              disabled={!canNext || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 shadow-sm hover:bg-gray-50 disabled:opacity-50"
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
      </section>

      {/* MODAL: Ver detalle */}
      {
        openView && viewRow && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setOpenView(false)}
              aria-hidden
            />
            <div className="absolute inset-0 grid place-items-center p-2 sm:p-4">
              <div className="w-full max-w-5xl overflow-hidden rounded-2xl border bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-4 sm:px-5 py-3 sm:py-4">
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

                <div className="px-4 sm:px-5 py-4 max-h-[80vh] overflow-y-auto">
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
                    ].map(([label, val]) => (
                      <div
                        key={label as string}
                        className="rounded-lg border px-3 py-2"
                      >
                        <span className="text-sm">
                          <span className="font-medium">{label}: </span>
                          {val as string}
                        </span>
                      </div>
                    ))}

                    <div className="rounded-lg border px-3 py-2 sm:col-span-2 lg:col-span-3">
                      <span className="text-sm font-medium block mb-2">
                        Firma de usuario
                      </span>
                      {getFirma(viewRow) ? (
                        <img
                          src={getFirma(viewRow)!}
                          alt="Firma del usuario"
                          className="h-24 w-auto rounded border bg-white md:h-24 lg:h-28"
                        />
                      ) : (
                        <span className="text-xs text-gray-500">Sin firma</span>
                      )}
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
                        <div key={g.titulo} className="rounded-2xl border">
                          <div className="border-b bg-gray-50 px-3 py-2 text-sm font-semibold">
                            {g.titulo}
                          </div>
                          <div className="grid gap-2 p-3 sm:grid-cols-2">
                            {g.items.map((it) => (
                              <div
                                key={it.name}
                                className="flex items-center justify-between rounded-lg border px-3 py-2"
                              >
                                <span className="text-sm">{it.name}</span>
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`text-xs font-medium ${it.ok ? "text-emerald-600" : "text-rose-600"
                                      }`}
                                  >
                                    {it.ok ? "OK" : "NO"}
                                  </span>
                                  {!it.ok && it.nota && (
                                    <span className="text-xs text-gray-500 max-w-[220px] truncate">
                                      {it.nota}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
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
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-gray-50 active:scale-[.98]"
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
        onClose={() => setOpenCreate(false)}
        onSaved={async () => {
          setPage(1);
          await fetchChecklists({ page: 1 });
        }}
      />
    </div >
  );
}
