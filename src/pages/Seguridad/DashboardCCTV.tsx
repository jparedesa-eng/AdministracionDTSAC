import { useState, useEffect, useMemo } from "react";
import {
    Activity,
    Video,
    HardDrive,
    Monitor,
    LayoutDashboard,
    Building2
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LabelList
} from "recharts";

// Stores
import { getCamarasState, subscribeCamaras } from "../../store/camarasStore";
import { getSedesState, subscribeSedes } from "../../store/sedesStore";
import { getCentralesState, subscribeCentrales } from "../../store/cctvCentralesStore";
import { getNVRState, subscribeNVR } from "../../store/nvrStore";
import { getPantallasState, subscribePantallas } from "../../store/pantallasStore";
import { getSensoresState, subscribeSensores } from "../../store/sensoresStore";

// Utils


const COLORS = {
    primary: "#6366f1",   // Indigo 500
    secondary: "#8b5cf6", // Violet 500
    success: "#10b981",   // Emerald 500
    danger: "#f43f5e",    // Rose 500
    warning: "#f59e0b",   // Amber 500
    info: "#3b82f6",      // Blue 500
    slate: "#64748b",     // Slate 500
    chart: [
        "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"
    ]
};

export default function DashboardCCTV() {
    const [, setTick] = useState(0);

    // Subscriptions
    useEffect(() => {
        const unsubs = [
            subscribeCamaras(() => setTick(t => t + 1)),
            subscribeSedes(() => setTick(t => t + 1)),
            subscribeCentrales(() => setTick(t => t + 1)),
            subscribeNVR(() => setTick(t => t + 1)),
            subscribePantallas(() => setTick(t => t + 1)),
            subscribeSensores(() => setTick(t => t + 1)),
        ];
        return () => unsubs.forEach(u => u());
    }, []);

    // Get Data
    const { camaras } = getCamarasState();
    const { sedes } = getSedesState();
    const { centrales } = getCentralesState();
    const { nvrs } = getNVRState();
    const { pantallas } = getPantallasState();
    const { sensores } = getSensoresState();

    // Local State (Filters)
    const [filterCentral, setFilterCentral] = useState("");
    const [filterSede, setFilterSede] = useState("");

    // --- Derived Data & Filtering ---

    // 1. Filtered Items
    const filteredCamaras = useMemo(() => {
        return camaras.filter(c => {
            if (filterCentral && c.central_id !== filterCentral) return false;
            if (filterSede && c.sede_id !== filterSede) return false;
            return true;
        });
    }, [camaras, filterCentral, filterSede]);

    const filteredNVRs = useMemo(() => {
        return nvrs.filter(n => {
            if (filterCentral && n.central_id !== filterCentral) return false;
            // NVRs typically don't have sede_id directly in some models, but let's assume filtering by central is primary
            // If the model has sede_id (not in the one I saw but just in case), add it.
            // Based on file read, NVR has central_id, but NO sede_id explicity in type def unless added recently.
            // So we primarily filter by Central.
            return true;
        });
    }, [nvrs, filterCentral]);

    const filteredPantallas = useMemo(() => {
        return pantallas.filter(p => {
            if (filterCentral && p.central_id !== filterCentral) return false;
            if (filterSede && p.sede_id !== filterSede) return false;
            return true;
        });
    }, [pantallas, filterCentral, filterSede]);

    const filteredSensores = useMemo(() => {
        return sensores.filter(s => {
            if (filterCentral && s.central_id !== filterCentral) return false;
            if (filterSede && s.sede_id !== filterSede) return false;
            return true;
        });
    }, [sensores, filterCentral, filterSede]);


    // 2. KPI Metrics
    const totalCameras = filteredCamaras.length;
    const activeCameras = filteredCamaras.filter(c => c.activa).length;
    const inactiveCameras = totalCameras - activeCameras;
    const activePercentage = totalCameras > 0 ? ((activeCameras / totalCameras) * 100).toFixed(1) : "0";

    const totalNVR = filteredNVRs.length;
    const totalScreens = filteredPantallas.length;

    // 3. Charts Preparation

    // Chart: Inventory Summary
    const inventoryData = [
        { name: "Cámaras", count: totalCameras, fill: COLORS.primary },
        { name: "NVRs", count: totalNVR, fill: COLORS.secondary },
        { name: "Pantallas", count: totalScreens, fill: COLORS.info },
        { name: "Sensores", count: filteredSensores.length, fill: COLORS.warning },
    ];

    // Chart: Camera Status
    const statusData = [
        { name: "Activas", value: activeCameras, color: COLORS.success },
        { name: "Inactivas", value: inactiveCameras, color: COLORS.danger },
    ];

    // Chart: Distribution by Sede (Top 7)
    // Only meaningful if we haven't filtered by a single Sede, OR if we want to show relative distribution within central
    const distributionData = useMemo(() => {
        const counts: Record<string, number> = {};

        filteredCamaras.forEach(c => {
            const sedeName = sedes.find(s => s.id === c.sede_id)?.nombre || "Sin Sede";
            counts[sedeName] = (counts[sedeName] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [filteredCamaras, sedes]);

    const dynamicHeight = Math.max(350, distributionData.length * 35);

    // Chart: Distribution by Central (if no central selected)
    const centralDistributionData = useMemo(() => {
        if (filterCentral) return []; // Don't show if already filtered by central
        const counts: Record<string, number> = {};
        camaras.forEach(c => {
            const centralName = centrales.find(ct => ct.id === c.central_id)?.nombre || "Unknown";
            counts[centralName] = (counts[centralName] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, count }));
    }, [camaras, centrales, filterCentral]);


    // Dependent Dropdown for Sede
    const filteredSedesOptions = useMemo(() => {
        if (!filterCentral) return sedes;
        const central = centrales.find(c => c.id === filterCentral);
        if (!central || !central.sedes) return [];
        return sedes.filter(s => central.sedes?.includes(s.id));
    }, [filterCentral, sedes, centrales]);


    return (
        <div className="space-y-4 pb-4 animate-in fade-in duration-500 max-w-[1800px] mx-auto p-4">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <LayoutDashboard className="h-6 w-6 text-indigo-600" />
                        Dashboard CCTV
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Visión general del sistema de videovigilancia</p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <Monitor className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <select
                            value={filterCentral}
                            onChange={e => {
                                setFilterCentral(e.target.value);
                                setFilterSede("");
                            }}
                            className="pl-9 pr-8 py-2 bg-slate-50 text-sm font-medium text-slate-700 outline-none cursor-pointer hover:bg-slate-100 rounded-lg border border-slate-200 transition-all appearance-none min-w-[180px]"
                        >
                            <option value="">Todas las Centrales</option>
                            {centrales.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-3 pointer-events-none opacity-50">
                            <div className="h-0 w-0 border-x-4 border-x-transparent border-t-[5px] border-t-slate-600"></div>
                        </div>
                    </div>

                    <div className="relative group">
                        <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <select
                            value={filterSede}
                            onChange={e => setFilterSede(e.target.value)}
                            className="pl-9 pr-8 py-2 bg-slate-50 text-sm font-medium text-slate-700 outline-none cursor-pointer hover:bg-slate-100 rounded-lg border border-slate-200 transition-all appearance-none min-w-[180px]"
                        >
                            <option value="">Todas las Sedes</option>
                            {filteredSedesOptions.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-3 pointer-events-none opacity-50">
                            <div className="h-0 w-0 border-x-4 border-x-transparent border-t-[5px] border-t-slate-600"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Strip - Compact & Tech */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICardCompact title="Total Cámaras" value={totalCameras} icon={Video} color="indigo" />
                <KPICardCompact
                    title="Operatividad"
                    value={`${activePercentage}%`}
                    icon={Activity}
                    color={Number(activePercentage) > 90 ? "emerald" : "rose"}
                    subValue={`${activeCameras} / ${totalCameras}`}
                />
                <KPICardCompact title="Grabadores (NVR)" value={totalNVR} icon={HardDrive} color="violet" />
                <KPICardCompact title="Monitor Wall" value={totalScreens} icon={Monitor} color="amber" />
            </div>

            {/* Main Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* Left Column: Summary & Status (Span 4) */}
                <div className="lg:col-span-4 space-y-4">
                    {/* Camera Status */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col h-[320px]">
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-widest mb-4">Estado del Sistema</h3>
                        <div className="flex-1 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                        label={({ value }: any) => value}
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'none' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                                <span className="text-3xl font-mono font-bold text-slate-800">{activePercentage}%</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Operativo</span>
                            </div>
                        </div>
                    </div>

                    {/* Central Distribution */}
                    {!filterCentral && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col h-[320px]">
                            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-widest mb-4">Participación Central</h3>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={centralDistributionData}
                                            cx="50%"
                                            cy="45%"
                                            outerRadius={70}
                                            fill="#8884d8"
                                            dataKey="count"
                                            labelLine={false}
                                            label={({ percent }: any) => `${((percent || 0) * 100).toFixed(0)}%`}
                                        >
                                            {centralDistributionData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'none' }} />
                                        <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Detailed Charts (Span 8) */}
                <div className="lg:col-span-8 space-y-4">

                    {/* Main Inventory Bar Chart */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-widest">Distribución de Inventario</h3>
                            <div className="flex gap-2 text-xs font-mono text-slate-400">
                                <span>TOTAL ASSETS: {totalCameras + totalNVR + totalScreens}</span>
                            </div>
                        </div>
                        <div className="h-[250px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={inventoryData} layout="vertical" margin={{ left: 0, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600, fontFamily: 'monospace' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={80}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'none' }}
                                    />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28}>
                                        {inventoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                        <LabelList dataKey="count" position="right" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#64748b', fontFamily: 'monospace' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Cameras by Sede */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-widest mb-4">Desglose por Sede</h3>
                        <div style={{ height: `${dynamicHeight}px`, minHeight: '300px' }} className="transition-all duration-300">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={distributionData} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                                        width={140}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'none' }}
                                    />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18} fill={COLORS.primary}>
                                        <LabelList dataKey="count" position="right" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748b', fontFamily: 'monospace' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// --- Components ---

function KPICardCompact({ title, value, icon: Icon, color = "indigo", subValue }: any) {
    const colorStyles: any = {
        indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
        violet: "text-violet-600 bg-violet-50 border-violet-100",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
        rose: "text-rose-600 bg-rose-50 border-rose-100",
        amber: "text-amber-600 bg-amber-50 border-amber-100",
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors">
            <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{title}</span>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold text-slate-800">{value}</span>
                    {subValue && <span className="text-[10px] text-slate-400 font-medium">{subValue}</span>}
                </div>
            </div>
            <div className={`p-2.5 rounded-lg border ${colorStyles[color]} flex items-center justify-center`}>
                <Icon className="h-5 w-5" />
            </div>
        </div>
    );
}


