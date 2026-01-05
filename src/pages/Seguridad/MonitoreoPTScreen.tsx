
import React, { useState } from 'react';
import { TransportTracker } from './MonitoreoPT';
import type { TransportUnit } from '../types';

class ErrorBoundary extends React.Component<any, { hasError: boolean, error: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("MonitoreoPT Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 text-red-600 border border-red-300 bg-red-50 rounded">
                    <h2>Algo salió mal en el módulo de Monitoreo.</h2>
                    <pre>{this.state.error?.toString()}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function MonitoreoPTScreen() {
    const [units, setUnits] = useState<TransportUnit[]>([
        {
            id: '1',
            solicitudId: 'REQ-2024-001',
            unitName: 'TRACTO ABC-123',
            plateRemolque: 'ABC-123',
            plateSemiRemolque: 'REM-456',
            conductor: 'Juan Perez',
            transportista: 'Transportes Rápidos',
            telefono: '987654321',
            origin: 'LIMA',
            destination: 'AREQUIPA',
            proceso: 'CONSERVA',
            tipoEnvio: 'TERRESTRE',
            operadorLogistico: 'Ransa',
            booking: 'BK-2024-999',
            fechaIngresoPlanta: new Date(Date.now() - 4000000).toISOString(),
            fechaSalidaPlanta: new Date(Date.now() - 3600000).toISOString(),
            fechaEstimadaLlegada: new Date(Date.now() + 86400000).toISOString(),
            lastUpdate: new Date().toISOString(),
            status: 'En Ruta', // Updated to match UnitStatus.TRANSIT
            ubicacionActual: 'En tránsito por Panamericana Sur',
            controles: [],
            paradasProg: [],
            paradasNoProg: [],
            path: [],
            // New required fields
            transportistaEstandar: 'STANDAR',
            almacenDestino1: 'Almacen A',
            fechaLlegadaDestino1: '',
            tiempoTotal1: '',
            tiempoNeto1: '',
            almacenDestino2: '',
            fechaLlegadaDestino2: '',
            tiempoTotal2: '',
            calificacionTNeto: '',
            calificacionTTotal: '',
            incidente: '',
            detalleIncidente: '',
            rutaName: 'Ruta 1',
            tiempoTransitoMin: '',
            tiempoTransitoMax: '',
            año: 2024,
            mes: 'ENERO',
            fecha: new Date().toISOString(),
            tipoViaje: 'IDA',
            cumplimiento: 'PENDIENTE',
            unidadEstandar: 'SI',
            area: 'LOGISTICA',
            lastLocation: 'Lima',
            departureTime: '10:00'
        }
    ]);

    return (
        <ErrorBoundary>
            <TransportTracker units={units} setUnits={setUnits} />
        </ErrorBoundary>
    );
}
