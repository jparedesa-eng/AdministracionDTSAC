import React, { useState, useMemo } from 'react';
import { Search, Truck, Ship, Plane, Navigation2 } from 'lucide-react';

export const ROUTE_MATRIX = [
    { proceso: 'CONSERVA', ruta: 'PLANTA AREQUIPA - CALLAO', origen: 'PLANTA AREQUIPA', destino: 'CALLAO', min: '34:00', max: '36:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'FRESCO', ruta: 'PLANTA LA VENTUROSA - CALLAO', origen: 'PLANTA LA VENTUROSA', destino: 'CALLAO', min: '20:00', max: '22:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'FRESCO', ruta: 'PLANTA MUCHIK - CALLAO', origen: 'PLANTA MUCHIK', destino: 'CALLAO', min: '18:00', max: '20:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'FRESCO', ruta: 'PLANTA MUCHIK - CALLAO', origen: 'PLANTA MUCHIK', destino: 'CALLAO', min: '13:00', max: '15:00', tipoEnvio: 'AEREO', tipoViaje: 'REGULAR' },
    { proceso: 'CONSERVA', ruta: 'APT GRAU - CALLAO', origen: 'APT GRAU', destino: 'CALLAO', min: '19:00', max: '21:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'CONGELADO', ruta: 'TRUJILLO - CHANCAY', origen: 'TRUJILLO', destino: 'CHANCHAY', min: '16:00', max: '18:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'CONGELADO', ruta: 'TRUJILLO - CALLAO', origen: 'TRUJILLO', destino: 'CALLAO', min: '19:00', max: '21:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'FRESCO', ruta: 'PLANTA ARANDANO - CALLAO', origen: 'PLANTA ARANDANO', destino: 'CALLAO', min: '18:00', max: '20:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'FRESCO', ruta: 'PLANTA ARANDANO - CALLAO', origen: 'PLANTA ARANDANO', destino: 'CALLAO', min: '13:00', max: '15:00', tipoEnvio: 'AEREO', tipoViaje: 'REGULAR' },
    { proceso: 'CONGELADO', ruta: 'CALLAO - CALLAO', origen: 'CALLAO', destino: 'CALLAO', min: '19:00', max: '21:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'CONGELADO', ruta: 'PLANTA TRUJILLO - CALLAO', origen: 'PLANTA TRUJILLO', destino: 'CALLAO', min: '19:00', max: '21:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'CONSERVA', ruta: 'CHINCHA AIB - CALLAO', origen: 'CHINCHA AIB', destino: 'CALLAO', min: '4:00', max: '6:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'FRESCO', ruta: 'CHEPEN - CHILE', origen: 'CHEPEN', destino: 'CHILE', min: '86:00', max: '88:00', tipoEnvio: 'TERRESTRE', tipoViaje: 'REGULAR' },
    { proceso: 'FRESCO', ruta: 'PLANTA MUCHIK - CHILE', origen: 'PLANTA MUCHIK', destino: 'CHILE', min: '82:00', max: '84:00', tipoEnvio: 'TERRESTRE', tipoViaje: 'REGULAR' },
    { proceso: 'CONSERVA', ruta: 'PLANTA AREQUIPA - LIMA', origen: 'PLANTA AREQUIPA', destino: 'LIMA', min: '24:00', max: '26:00', tipoEnvio: 'MARITIMO', tipoViaje: 'EXPRESS' },
    { proceso: 'FRESCO', ruta: 'PLANTA LA VENTUROSA - PAITA', origen: 'PLANTA LA VENTUROSA', destino: 'PAITA', min: '8:00', max: '10:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'FRESCO', ruta: 'PLANTA MUCHIK - PAITA', origen: 'PLANTA MUCHIK', destino: 'PAITA', min: '17:00', max: '19:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'CONSERVA', ruta: 'APT GRAU - PAITA', origen: 'APT GRAU', destino: 'PAITA', min: '16:00', max: '18:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'FRESCO', ruta: 'PLANTA ARANDANO - PAITA', origen: 'PLANTA ARANDANO', destino: 'PAITA', min: '17:00', max: '19:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'CONGELADO', ruta: 'PLANTA CONSERVA - PAITA', origen: 'PLANTA CONSERVA', destino: 'PAITA', min: '16:00', max: '18:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'FRESCO', ruta: 'PLANTA MUCHIK - QUITO', origen: 'PLANTA MUCHIK', destino: 'QUITO', min: '30:00', max: '32:00', tipoEnvio: 'BIMODAL', tipoViaje: 'REGULAR' },
    { proceso: 'FRESCO', ruta: 'PLANTA LA VENTUROSA - SALAVERRY', origen: 'PLANTA LA VENTUROSA', destino: 'SALAVERRY', min: '5:00', max: '7:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'CONGELADO', ruta: 'PLANTA CONSERVA - SALAVERRY', origen: 'PLANTA CONSERVA', destino: 'SALAVERRY', min: '0:30', max: '0:45', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'FRESCO', ruta: 'PLANTA MUCHIK - SALAVERRY', origen: 'PLANTA MUCHIK', destino: 'SALAVERRY', min: '0:30', max: '0:45', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'CONSERVA', ruta: 'APT GRAU - SALAVERRY', origen: 'APT GRAU', destino: 'SALAVERRY', min: '0:30', max: '0:45', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'CONGELADO', ruta: 'PLANTA TRUJILLO - SALAVERRY', origen: 'PLANTA TRUJILLO', destino: 'SALAVERRY', min: '0:30', max: '0:45', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'CONGELADO', ruta: 'TRUJILLO - SALAVERRY', origen: 'TRUJILLO', destino: 'SALAVERRY', min: '0:30', max: '0:45', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'CONGELADO', ruta: 'TRUJILLO - PAITA', origen: 'TRUJILLO', destino: 'PAITA', min: '16:00', max: '18:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'CONSERVA', ruta: 'CALLAO - CHANCAY', origen: 'CALLAO', destino: 'CHANCHAY', min: '2:00', max: '3:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
    { proceso: 'CONSERVA', ruta: 'CHINCHA - CALLAO', origen: 'CHINCHA', destino: 'CALLAO', min: '5:00', max: '6:00', tipoEnvio: 'MARITIMO', tipoViaje: 'REGULAR' },
];

export const TravelTimesTable: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredRoutes = useMemo(() => {
        return ROUTE_MATRIX.filter(r =>
            r.ruta.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.origen.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.destino.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.proceso.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    const getEnvioIcon = (tipo: string) => {
        switch (tipo) {
            case 'MARITIMO': return <Ship size={14} className="text-blue-500" />;
            case 'AEREO': return <Plane size={14} className="text-sky-400" />;
            case 'BIMODAL': return <Navigation2 size={14} className="text-purple-500" />;
            default: return <Truck size={14} className="text-slate-500" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estándares Operativos</p>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Tiempos de Viaje</h2>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por origen, destino o proceso..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-slate-300 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-tl-xl">Proceso</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Punto Origen</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Punto Destino</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Min (HH:mm)</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Max (HH:mm)</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Transporte</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-tr-xl">Prioridad</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRoutes.map((route, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-black rounded uppercase tracking-wider">{route.proceso}</span>
                                    </td>
                                    <td className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase">{route.origen}</td>
                                    <td className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase">{route.destino}</td>
                                    <td className="px-4 py-3 text-sm font-black text-slate-900">{route.min}</td>
                                    <td className="px-4 py-3 text-sm font-black text-red-600">{route.max}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {getEnvioIcon(route.tipoEnvio)}
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{route.tipoEnvio}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">
                                        {route.tipoViaje === 'EXPRESS' ? <span className="text-amber-600">EXPRESS</span> : 'REGULAR'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
