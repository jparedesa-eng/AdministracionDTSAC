
import React, { useState, useEffect } from 'react';
import { TransportTracker } from './MonitoreoPT';
import type { TransportUnit } from '../types';
import { fetchUnits, getMonitoreoState, subscribeMonitoreo } from '../../store/monitoreoStore';

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
    // Local state to hold the units for the tracker
    const [units, setUnits] = useState<TransportUnit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initial fetch
        fetchUnits();

        // Subscribe to store updates
        const unsubscribe = subscribeMonitoreo(() => {
            const state = getMonitoreoState();
            setUnits(state.units);
            setLoading(state.loading);
        });

        // Set initial state
        const state = getMonitoreoState();
        setUnits(state.units);
        setLoading(state.loading);

        return () => unsubscribe();
    }, []);

    if (loading && units.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Cargando unidades de transporte...</p>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <TransportTracker units={units} />
        </ErrorBoundary>
    );
}
