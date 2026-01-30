
export interface IncidentType {
    tipo: string;
    subtipos: {
        nombre: string;
        categoria: string;
    }[];
}

export const RISP_INCIDENT_CATALOG: IncidentType[] = [
    {
        tipo: "Patrimonial",
        subtipos: [
            { nombre: "Robo", categoria: "Delito" },
            { nombre: "Hurto", categoria: "Delito" },
            { nombre: "Daños a la Propiedad", categoria: "Falta" },
            { nombre: "Pérdida de Activo", categoria: "Incidente" }
        ]
    },
    {
        tipo: "Seguridad Física",
        subtipos: [
            { nombre: "Intrusión", categoria: "Incidente Crítico" },
            { nombre: "Presencia Sospechosa", categoria: "Observación" },
            { nombre: "Falla de Control de Acceso", categoria: "Falta" }
        ]
    },
    {
        tipo: "Normativo",
        subtipos: [
            { nombre: "Incumplimiento de Procedimiento", categoria: "Falta Administrativa" },
            { nombre: "Falta de EPP", categoria: "Seguridad Laboral" },
            { nombre: "Comportamiento Inapropiado", categoria: "Falta" }
        ]
    },
    {
        tipo: "Otros",
        subtipos: [
            { nombre: "Hallazgo de Material", categoria: "Incidente" },
            { nombre: "Otro", categoria: "General" }
        ]
    }
];

export function getSubtypes(tipo: string) {
    const found = RISP_INCIDENT_CATALOG.find(t => t.tipo === tipo);
    return found ? found.subtipos : [];
}

export function getCategoria(tipo: string, subtipo: string) {
    const t = RISP_INCIDENT_CATALOG.find(x => x.tipo === tipo);
    if (!t) return "";
    const s = t.subtipos.find(x => x.nombre === subtipo);
    return s ? s.categoria : "";
}
