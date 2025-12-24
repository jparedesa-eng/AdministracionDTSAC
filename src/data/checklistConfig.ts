export type ChecklistOption = {
    value: string;
    label: string;
    color: "green" | "yellow" | "orange" | "red" | "gray" | "slate";
    requiresObservation?: boolean;
    okValue: boolean;
    showForType?: "entrega" | "regular" | "always";
};

export type ChecklistItemConfig = {
    name: string;
    defaultStatus?: string;
    options: ChecklistOption[];
};

export type ChecklistGroupConfig = {
    title: string;
    items: ChecklistItemConfig[];
};

// --- Reusable Option Sets (Helper Generators) ---

const NO_ENTREGADO: ChecklistOption = { value: "no_entregado", label: "No Entregado", color: "slate", okValue: false, showForType: "entrega" };

// Documentos (Default for items not in user list but essential)
const OPTS_DOCS: ChecklistOption[] = [
    { value: "vigente", label: "Vigente", color: "green", okValue: true, showForType: "always" },
    { value: "por_vencer", label: "Por Vencer", color: "yellow", okValue: false, showForType: "always" },
    { value: "vencido", label: "Vencido", color: "orange", okValue: false, showForType: "always" },
    { value: "faltante", label: "Faltante", color: "red", okValue: false, showForType: "always" },
    NO_ENTREGADO
];

// Helper to create simple Conforme/Ausente/Deteriorado sets + custom additions
const createOpts = (extras: ChecklistOption[] = []): ChecklistOption[] => {
    return [
        { value: "conforme", label: "Conforme", color: "green", okValue: true, showForType: "always" },
        ...extras,
        NO_ENTREGADO
    ];
};

// Common Definitions from User Request
const OPT_AUSENTE: ChecklistOption = { value: "ausente", label: "Ausente", color: "red", okValue: false, showForType: "always" };
const OPT_DETERIORADO: ChecklistOption = { value: "deteriorado", label: "Deteriorado", color: "orange", okValue: false, showForType: "always" };
const OPT_ROTO: ChecklistOption = { value: "roto", label: "Roto", color: "red", okValue: false, showForType: "always" };
const OPT_CON_DANIO: ChecklistOption = { value: "con_danio", label: "Con daño", color: "orange", okValue: false, showForType: "always" };
const OPT_ABOLLADO: ChecklistOption = { value: "abollado", label: "Abollado", color: "orange", okValue: false, showForType: "always" };
const OPT_RAYADO: ChecklistOption = { value: "rayado", label: "Rayado", color: "yellow", okValue: false, showForType: "always" };
const OPT_RAJADO: ChecklistOption = { value: "rajado", label: "Rajado", color: "orange", okValue: false, showForType: "always" };
const OPT_QUINADO: ChecklistOption = { value: "quinado", label: "Quiñado", color: "yellow", okValue: false, showForType: "always" };
const OPT_INOPERATIVA: ChecklistOption = { value: "inoperativa", label: "Inoperativa", color: "red", okValue: false, showForType: "always" };
const OPT_DESGASTE: ChecklistOption = { value: "desgaste_uso", label: "Desgaste por uso", color: "yellow", okValue: false, showForType: "always" };
const OPT_TAPA_FALTANTE: ChecklistOption = { value: "tapa_faltante", label: "Tapa Faltante", color: "red", okValue: false, showForType: "always" };


// --- Configuration Structure ---

export const CHECKLIST_CONFIG: ChecklistGroupConfig[] = [
    {
        title: "DOCUMENTOS Y SEGURIDAD",
        items: [
            { name: "DOCUMENTOS DE VEHÍCULO", options: OPTS_DOCS },
            { name: "EXTINTOR", options: OPTS_DOCS },
            { name: "BOTIQUÍN", options: OPTS_DOCS },
        ],
    },
    {
        title: "ACCESORIOS Y FUNCIONAMIENTO",
        items: [
            {
                name: "SEGURO DE RUEDAS",
                options: createOpts([OPT_AUSENTE, OPT_DETERIORADO])
            },
            {
                name: "GATA",
                options: createOpts([OPT_AUSENTE, OPT_DETERIORADO])
            },
            {
                name: "LLAVE DE RUEDAS",
                options: createOpts([OPT_AUSENTE, OPT_DETERIORADO]) // "Deteriorado" implied typical for accessories if not explicitly Roto
            },
            {
                name: "CONOS",
                options: createOpts([OPT_AUSENTE, OPT_DETERIORADO, OPT_ROTO])
            },
            {
                name: "TACOS",
                options: createOpts([OPT_AUSENTE, OPT_DETERIORADO, OPT_ROTO])
            },
            {
                name: "FORRO ASIENTOS",
                options: createOpts([OPT_AUSENTE, OPT_DETERIORADO, OPT_ROTO, OPT_DESGASTE])
            },
            {
                name: "PISOS",
                options: createOpts([OPT_AUSENTE, OPT_DETERIORADO, OPT_ROTO, OPT_DESGASTE])
            },
            {
                name: "LUNAS",
                options: createOpts([OPT_CON_DANIO, OPT_RAYADO, OPT_QUINADO])
            },
            {
                name: "FUNCIONAMIENTO DE LUCES",
                options: createOpts([OPT_INOPERATIVA])
            },
            {
                name: "ALARMA DE RETROCESO",
                options: createOpts([OPT_INOPERATIVA])
            },
        ],
    },
    {
        title: "PARTE FRONTAL",
        items: [
            {
                name: "Parachoque delantero",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO])
            },
            {
                name: "Parabrisa",
                options: createOpts([OPT_QUINADO]) // User said "Parabrisas: Conforme / Quiñado/"
            },
            {
                name: "Antena",
                options: createOpts([OPT_AUSENTE])
            },
            {
                name: "Capot",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO])
            },
            {
                name: "Tapas triangular LH",
                options: createOpts([OPT_AUSENTE])
            },
            {
                name: "Tapas triangular RH",
                options: createOpts([OPT_AUSENTE])
            },
            {
                name: "Faro direccional LH",
                options: createOpts([OPT_AUSENTE, OPT_DETERIORADO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO, OPT_ROTO])
            },
            {
                name: "Faro direccional RH",
                options: createOpts([OPT_AUSENTE, OPT_DETERIORADO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO, OPT_ROTO])
            },
            {
                name: "Espejo retrovisor LH",
                options: createOpts([OPT_AUSENTE, OPT_ROTO])
            },
            {
                name: "Guardafango delantero LH",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO])
            },
            {
                name: "Guardafango trasero LH",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO])
            },
        ],
    },
    {
        title: "PARTE LATERAL IZQUIERDA (LH)",
        items: [
            {
                name: "Zocalo LH",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO])
            },
            {
                name: "Tapa de combustible LH",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO, OPT_ROTO])
            },
            {
                name: "Puerta piloto LH",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO])
            },
            {
                name: "Puerta trasera LH",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO])
            },
        ],
    },
    {
        title: "PARTE LATERAL DERECHA (RH)",
        items: [
            {
                name: "Espejo retroviso RH",
                options: createOpts([OPT_CON_DANIO, OPT_ROTO, OPT_TAPA_FALTANTE])
            },
            {
                name: "Guardafango trasero RH",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO, OPT_ROTO])
            },
            {
                name: "Puerta piloto RH",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO])
            },
            {
                name: "Guardafango delantero RH",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO, OPT_ROTO])
            },
            {
                name: "Zocalo RH",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO])
            },
        ],
    },
    {
        title: "PARTE POSTERIOR",
        items: [
            {
                name: "Puerta trasera RH",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO, OPT_ROTO])
            },
            {
                name: "Faros posterior LH",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO, OPT_ROTO])
            },
            {
                name: "Llanta de repuesto",
                options: createOpts([OPT_AUSENTE, OPT_CON_DANIO, OPT_ROTO])
            },
            {
                name: "Compuerta de tolva",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO, OPT_ROTO])
            },
            {
                name: "Faros posterior RH",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO, OPT_ROTO])
            },
            {
                name: "Parachoque posterior",
                options: createOpts([OPT_CON_DANIO, OPT_ABOLLADO, OPT_RAYADO, OPT_RAJADO, OPT_ROTO])
            },
        ],
    },
];
