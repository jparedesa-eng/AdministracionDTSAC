// src/pages/Seguridad/SeguridadContext.tsx
// Este archivo ahora solo exporta tipos compartidos
// Los datos vienen de Supabase stores

export type Turno = "DIA" | "NOCHE";

export type AbsenceType = "JUSTIFICADA" | "INJUSTIFICADA";
export type AssignmentStatus = "CUMPLIDO" | "FALTA" | "PENDING";

export type Assignment = {
    agenteId: string;
    status: AssignmentStatus;
    absenceType?: AbsenceType;
    absenceReason?: string;
};

// "YYYY-MM-DD|PUESTO_ID|TURNO"
export type AssignmentMap = Record<string, Assignment[]>;
