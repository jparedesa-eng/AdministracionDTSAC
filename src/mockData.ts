import type { Agent, Post } from './pages/types';

export const INITIAL_AGENTS: Agent[] = [
    { id: 'A001', name: 'JUAN PEREZ', dni: '12345678' },
    { id: 'A002', name: 'MARIA GOMEZ', dni: '87654321' },
    { id: 'A003', name: 'CARLOS LOPEZ', dni: '11223344' },
    { id: 'A004', name: 'ANA RUIZ', dni: '55667788' },
    { id: 'A005', name: 'LUIS TORRES', dni: '99887766' },
];

export const INITIAL_POSTS: Post[] = [
    { id: 'P001', name: 'GARITA PRINCIPAL', site: 'LURIN', requiredShifts: 'BOTH' },
    { id: 'P002', name: 'ALMACEN CENTRAL', site: 'LIMA', requiredShifts: 'NIGHT' },
    { id: 'P003', name: 'PATIO DE MANIOBRAS', site: 'CALLAO', requiredShifts: 'DAY' },
    { id: 'P004', name: 'RECEPCION', site: 'SAN ISIDRO', requiredShifts: 'DAY' },
    { id: 'P005', name: 'CONTROL DE ACCESO', site: 'ATE', requiredShifts: 'BOTH' },
];
