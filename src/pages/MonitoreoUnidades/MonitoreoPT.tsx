
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createUnit, updateUnit, UnitStatus, addEventToDB, updateEventInDB, deleteEventFromDB } from '../../store/monitoreoStore';
import type { TransportUnit, LatLng } from '../../store/monitoreoStore';
import { getTravelTimesState, subscribeTravelTimes, fetchTravelTimes } from '../../store/travelTimesStore';
import { getDestinationsState, subscribeDestinations, fetchDestinations } from '../../store/destinationStore';
import { getTransportEntitiesState, fetchAllEntities } from "../../store/transportEntitiesStore";
import type { LogisticOperator, TransportProvider, TransportUnitCatalog, TransportDriver } from "../../store/transportEntitiesStore";
import { Toast } from '../../components/ui/Toast';
import type { ToastState } from '../../components/ui/Toast';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import {
    Truck,
    Plus,
    X,
    Locate,
    Route as RouteIcon,
    Edit2,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Save,
    PlusCircle,
    Trash2,
    Package,
    LayoutList,
    Search,
    Flag,
    CalendarRange,
    Ban,
    Edit3,
    FileSpreadsheet,
    MapPin,
    PlayCircle,
    Monitor,
    Loader2,
    Phone,
    Calendar
} from 'lucide-react';

const GLOBAL_ORIGIN: LatLng = { lat: -8.13038471878842, lng: -79.01637350220241 };
// Coordenada destino solicitada para finalización
const DESTINATION_GPS: LatLng = { lat: -11.9462474113332, lng: -77.13176486382004 };

interface TransportTrackerProps {
    units: TransportUnit[];
}

type TabType = 'CONTROLES' | 'PARADAS' | 'DETALLE' | 'RESUMEN';
type FilterStatus = 'ALL' | 'TRANSIT' | 'ARRIVED' | 'CANCELLED';

export const TransportTracker: React.FC<TransportTrackerProps> = ({ units }) => {
    // Travel Times Store Integration
    const [routeMatrix, setRouteMatrix] = useState(getTravelTimesState().travelTimes);

    // NEW STATE for Transport Entities
    const [transportEntities, setTransportEntities] = useState<{
        operators: LogisticOperator[];
        providers: TransportProvider[];
        units: TransportUnitCatalog[];
        drivers: TransportDriver[];
    }>({
        operators: [],
        providers: [],
        units: [],
        drivers: []
    });

    useEffect(() => {
        const loadEntities = async () => {
            await fetchAllEntities();
            const state = getTransportEntitiesState();
            setTransportEntities({
                operators: state.operators,
                providers: state.providers,
                units: state.units,
                drivers: state.drivers
            });
        };
        loadEntities();
    }, []);
    useEffect(() => {
        const unsubscribe = subscribeTravelTimes(() => {
            setRouteMatrix(getTravelTimesState().travelTimes);
        });
        const unsubscribeDest = subscribeDestinations(() => { /* force re-render if needed or just let store handle it */ });

        fetchTravelTimes().catch(console.error);
        fetchDestinations().catch(console.error);

        return () => { unsubscribe(); unsubscribeDest(); };
    }, []);

    const { destinations } = getDestinationsState();

    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    // State for Finish Stop/Incident
    const [finishStopModal, setFinishStopModal] = useState<{ open: boolean, type: 'PROG' | 'NOPROG', endDate: string, index: number | null }>({
        open: false,
        type: 'PROG',
        endDate: '',
        index: null
    });

    // State for Finish Trip
    // type: 'SINGLE' | 'DEST1' | 'DEST2'
    const [finishTripModal, setFinishTripModal] = useState({
        open: false,
        date: '',
        type: 'SINGLE',
        dateExitD1: '',
        dateArriveD2: ''
    });

    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('CONTROLES');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<FilterStatus>('TRANSIT');
    const [dateRange, setDateRange] = useState(() => {
        const curr = new Date();
        const day = curr.getDay() || 7; // Get current day number, converting Sun (0) to 7
        const first = curr.getDate() - day + 1;
        const last = first + 6;
        const firstDay = new Date(curr.setDate(first)).toISOString().split('T')[0];
        const lastDay = new Date(curr.setDate(last)).toISOString().split('T')[0];
        return { start: firstDay, end: lastDay };
    });

    const [editingControlIndex, setEditingControlIndex] = useState<number | null>(null);
    const [showAddStopProg, setShowAddStopProg] = useState(false);
    const [showAddStopNoProg, setShowAddStopNoProg] = useState(false);
    const [isStopOngoing, setIsStopOngoing] = useState(false);

    const [newStopForm, setNewStopForm] = useState<{ location: string, start: string, end: string, time: string, cause: string, lat: string, lng: string }>({ location: '', start: '', end: '', time: '', cause: '', lat: '', lng: '' });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const mapRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const unitLayersRef = useRef<Record<string, { polyline: any, marker: any }>>({});
    const dateInputRef = useRef<HTMLInputElement>(null);

    const [toast, setToast] = useState<ToastState>(null);
    const [alertConfig, setAlertConfig] = useState<{ open: boolean; title: string; message: string; variant: "danger" | "warning" | "info" }>({
        open: false,
        title: '',
        message: '',
        variant: 'danger'
    });

    const showAlert = (title: string, message: string, variant: "danger" | "warning" | "info" = 'danger') => {
        setAlertConfig({ open: true, title, message, variant });
    };

    const [isExporting, setIsExporting] = useState(false);
    const [isSavingControl, setIsSavingControl] = useState(false);

    const [form, setForm] = useState({
        unitName: '',
        proceso: 'CONSERVA',
        fechaIngreso: '',
        fechaSalida: '',
        tipoEnvio: 'TERRESTRE',
        operador: '',
        booking: '',
        conductor: '',
        plateRemolque: '',
        plateSemi: '',
        transportista: '',
        telefono: '',
        origin: '',
        destination: '',
        almacenDestino1: '',
        almacenDestino2: '',
        area: 'INDUSTRIAL',
        eta: ''
    });

    const [reportForm, setReportForm] = useState({
        location: '',
        lat: '',
        lng: '',
        eta: '',
        reportDateTime: ''
    });

    const resetReportForm = () => {
        const now = new Date();
        const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setReportForm({ location: '', lat: '', lng: '', eta: '', reportDateTime: localIso });
    };

    const formatDate = (isoString: string) => {
        if (!isoString) return '-';
        try {
            const date = new Date(isoString);
            return date.toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).replace(',', ' -');
        } catch (e) { return isoString; }
    };

    const filteredUnits = useMemo(() => {
        return units.filter(u => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                (u.plateRemolque || '').toLowerCase().includes(searchLower) ||
                (u.conductor || '').toLowerCase().includes(searchLower) ||
                (u.transportista || '').toLowerCase().includes(searchLower) ||
                (u.proceso || '').toLowerCase().includes(searchLower);

            if (!matchesSearch) return false;

            if ((statusFilter === 'ALL' || statusFilter === 'ARRIVED' || statusFilter === 'CANCELLED') && (dateRange.start || dateRange.end)) {
                const unitDate = new Date(u.fechaSalidaPlanta);
                const start = dateRange.start ? new Date(dateRange.start) : new Date('2000-01-01');
                const end = dateRange.end ? new Date(dateRange.end) : new Date('2100-01-01');
                end.setHours(23, 59, 59);
                if (unitDate < start || unitDate > end) return false;
            }

            if (statusFilter === 'ALL') return true;
            if (statusFilter === 'TRANSIT') return u.status === UnitStatus.TRANSIT || u.status === UnitStatus.PLANT || u.status === 'EN PARADA' || u.status === 'INCIDENTE';
            if (statusFilter === 'ARRIVED') return u.status === UnitStatus.DELIVERED;
            if (statusFilter === 'CANCELLED') return u.status === 'CANCELADO';

            return true;
        });
    }, [units, searchTerm, statusFilter, dateRange]);

    const selectedUnit = useMemo(() => units.find(u => u.id === selectedUnitId) || null, [units, selectedUnitId]);

    const checkMonitoringAlert = (lastUpdate: string) => {
        if (!lastUpdate) return false;
        const last = new Date(lastUpdate);
        const now = new Date();
        const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
        return diffHours >= 3;
    };

    useEffect(() => {
        if (form.origin && form.destination && form.fechaSalida) {
            const matched = routeMatrix.find(r => r.origen === form.origin && r.destino === form.destination);
            if (matched && matched.max_time) {
                const parts = matched.max_time.split(':');
                const hours = parseInt(parts[0], 10) || 0;
                const minutes = parseInt(parts[1], 10) || 0;

                const departureDate = new Date(form.fechaSalida);

                if (!isNaN(departureDate.getTime())) {
                    const arrivalDate = new Date(departureDate.getTime() + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000));

                    if (!isNaN(arrivalDate.getTime())) {
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        const formattedETA = `${arrivalDate.getFullYear()}-${pad(arrivalDate.getMonth() + 1)}-${pad(arrivalDate.getDate())}T${pad(arrivalDate.getHours())}:${pad(arrivalDate.getMinutes())}`;
                        setForm(prev => ({ ...prev, eta: formattedETA }));
                    }
                }
            }
        }
    }, [form.origin, form.destination, form.fechaSalida, routeMatrix]);

    const fetchRoadRoute = async (points: LatLng[]): Promise<LatLng[]> => {
        if (points.length < 2) return points;
        const coordsString = points.map(p => `${p.lng},${p.lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.code === 'Ok' && data.routes.length > 0) {
                return data.routes[0].geometry.coordinates.map((c: [number, number]) => ({ lat: c[1], lng: c[0] }));
            }
        } catch (error) { console.error("OSRM Error:", error); }
        return points;
    };

    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const map = L.map(mapContainerRef.current, {
                zoomControl: false,
                attributionControl: false,
                preferCanvas: true
            }).setView([GLOBAL_ORIGIN.lat, GLOBAL_ORIGIN.lng], 12);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19, crossOrigin: true }).addTo(map);
            L.control.zoom({ position: 'bottomright' }).addTo(map);
            mapRef.current = map;
            setTimeout(() => map.invalidateSize(), 300);
        }
    }, []);

    useEffect(() => {
        const errors: Record<string, string> = {};
        const now = new Date();

        if (form.fechaIngreso) {
            const ingresoDate = new Date(form.fechaIngreso);
            if (ingresoDate > now) errors.fechaIngreso = "La fecha de ingreso no puede ser futura.";
        }

        if (form.fechaSalida) {
            const salidaDate = new Date(form.fechaSalida);
            if (salidaDate > now) errors.fechaSalida = "La fecha de salida no puede ser futura.";

            if (form.fechaIngreso) {
                const ingresoDate = new Date(form.fechaIngreso);
                if (salidaDate < ingresoDate) errors.fechaSalida = "La salida no puede ser antes del ingreso.";
            }
        }

        if (form.eta && form.fechaSalida) {
            const etaDate = new Date(form.eta);
            const salidaDate = new Date(form.fechaSalida);
            if (etaDate < salidaDate) errors.eta = "El ETA no puede ser antes de la salida.";
        }

        setFormErrors(errors);

    }, [form.fechaIngreso, form.fechaSalida, form.eta]);

    useEffect(() => {
        const currentMap = mapRef.current;
        if (!currentMap) return;
        setTimeout(() => currentMap.invalidateSize(), 100);

        const activeBounds: any[] = [];

        // 1. Identify units to retain/render
        // Only show units that are in filteredUnits AND match the rule "In Route" (or if user selected filter explicitly allows others)
        // Note: filteredUnits already respects the statusFilter logic (which defaults to 'TRANSIT' or user choice).
        // The user request "solo se deben marcar los viajes que se encuentran en ruta" implies default behavior,
        // but "si cambiamos filtro solo los seleccionados" implies respecting the filter.
        // Therefore, we just render filteredUnits.

        const visibleUnitIds = new Set(filteredUnits.map(u => u.id));

        // 2. Remove markers that are no longer visible
        Object.keys(unitLayersRef.current).forEach(id => {
            if (!visibleUnitIds.has(id)) {
                const layer = unitLayersRef.current[id];
                currentMap.removeLayer(layer.polyline);
                currentMap.removeLayer(layer.marker);
                delete unitLayersRef.current[id];
            }
        });

        // 3. Render visible units
        filteredUnits.forEach(unit => {
            const coords: [number, number][] = (unit.path || []).map(p => [p.lat, p.lng]);
            if (coords.length === 0) return;

            const isSelected = selectedUnitId === unit.id;
            const isArrived = unit.status === UnitStatus.DELIVERED;
            const needsAlert = checkMonitoringAlert(unit.lastUpdate);
            const isStopped = unit.status === 'EN PARADA' || unit.status === 'INCIDENTE';

            let routeColor = '#3b82f6';
            if (isSelected) routeColor = '#1a73e8';
            else if (isStopped) routeColor = '#ef4444'; // Red for stopped
            else if (needsAlert && !isArrived) routeColor = '#f97316';
            else if (isArrived) routeColor = '#94a3b8';

            const opacity = isSelected ? 1 : 0.6;
            const weight = isSelected ? 5 : 3;

            const tooltipContent = `
        <div class="px-1.5 py-1 bg-white border border-slate-200 rounded-md font-sans z-[1000] shadow-sm">
             <div class="text-[10px] font-bold text-gray-900 leading-tight text-center">${unit.plateRemolque}</div>
             <div class="text-[9px] font-medium text-gray-400 truncate max-w-[100px] text-center">${unit.ubicacionActual}</div>
             ${isStopped ? `<div class="text-[8px] font-bold text-red-600 text-center mt-0.5">${unit.status}</div>` : ''}
             ${needsAlert && !isArrived && !isStopped ? '<div class="text-[8px] font-bold text-orange-500 text-center mt-0.5 animate-pulse">RETRASO</div>' : ''}
        </div>
      `;

            if (unitLayersRef.current[unit.id]) {
                // Update existing
                unitLayersRef.current[unit.id].polyline.setLatLngs(coords);
                unitLayersRef.current[unit.id].marker.setLatLng(coords[coords.length - 1]);
                unitLayersRef.current[unit.id].polyline.setStyle({ color: routeColor, weight, opacity });
                unitLayersRef.current[unit.id].marker.setStyle({ fillColor: routeColor, radius: isSelected ? 8 : 5, color: '#fff', weight: 1 });
                if (unitLayersRef.current[unit.id].marker.getTooltip()) {
                    unitLayersRef.current[unit.id].marker.setTooltipContent(tooltipContent);
                }
                if (isSelected) {
                    unitLayersRef.current[unit.id].polyline.bringToFront();
                    unitLayersRef.current[unit.id].marker.bringToFront();
                    unitLayersRef.current[unit.id].marker.openTooltip();
                }
            } else {
                // Create new
                const polyline = L.polyline(coords, { color: routeColor, weight, opacity }).addTo(currentMap);
                const marker = L.circleMarker(coords[coords.length - 1], { radius: isSelected ? 8 : 5, fillColor: routeColor, color: "#fff", weight: 1, fillOpacity: 1 }).addTo(currentMap);
                marker.bindTooltip(tooltipContent, { permanent: true, direction: 'top', className: 'custom-leaflet-tooltip', offset: [0, -6], opacity: 0.95 });
                unitLayersRef.current[unit.id] = { polyline, marker };
            }

            if (isSelected || (!selectedUnitId && !isArrived)) {
                activeBounds.push(coords[coords.length - 1]);
            }
        });

        if (activeBounds.length > 0 && !selectedUnitId) {
            const bounds = L.latLngBounds(activeBounds);
            currentMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
        }
    }, [filteredUnits, selectedUnitId]);

    const handleCoordPaste = (e: React.ClipboardEvent) => {
        const pastedData = e.clipboardData.getData('Text');
        if (pastedData.includes(',')) {
            e.preventDefault();
            const parts = pastedData.split(',');
            if (parts.length >= 2) setReportForm(prev => ({ ...prev, lat: parts[0].trim(), lng: parts[1].trim() }));
        }
    };

    const handleStopCoordPaste = (e: React.ClipboardEvent) => {
        const pastedData = e.clipboardData.getData('Text');
        if (pastedData.includes(',')) {
            e.preventDefault();
            const parts = pastedData.split(',');
            if (parts.length >= 2) setNewStopForm(prev => ({ ...prev, lat: parts[0].trim(), lng: parts[1].trim() }));
        }
    };

    const handleInitiateFinishTrip = () => {
        if (!selectedUnitId) return;
        const unit = units.find(u => u.id === selectedUnitId);
        if (!unit) return;

        const now = new Date();
        const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

        // Determine Type
        let type = 'SINGLE';
        if (unit.almacenDestino2) {
            if (!unit.fechaLlegadaDestino1) {
                type = 'DEST1';
            } else {
                type = 'DEST2';
            }
        }

        setFinishTripModal({
            open: true,
            date: localIso,
            type: type,
            dateExitD1: localIso,
            dateArriveD2: localIso
        });
    };

    const handleConfirmFinishTrip = async () => {
        if (!selectedUnitId) return;

        const unit = units.find(u => u.id === selectedUnitId);
        if (!unit) return;

        const now = new Date();
        const departureDate = new Date(unit.fechaSalidaPlanta);
        const lastUpdateDate = new Date(unit.lastUpdate);

        const type = finishTripModal.type;



        // --- HELPER: Calculate Metrics ---
        // Calculates Time/Score based on Arrival Date relative to Departure
        // deductMs: Optional time to subtract from Net Time (e.g., dead time at D1)
        const calculateMetrics = (arrivalDate: Date, deductMs: number = 0) => {
            const totalMs = arrivalDate.getTime() - departureDate.getTime();
            const totalMins = Math.floor(totalMs / 60000);

            // Total Time String
            const totalH = Math.floor(totalMins / 60);
            const totalM = totalMins % 60;
            const tiempoTotal = `${totalH}h ${totalM}m`;

            // Net Time (Total - Stops - Deductions)
            const stopsMins = [...unit.paradasProg, ...unit.paradasNoProg].reduce((acc, stop) => {
                if (!stop.time) return acc;
                let m = 0;
                const hMatch = stop.time.match(/(\d+)h/);
                const mMatch = stop.time.match(/(\d+)m/);
                if (hMatch) m += parseInt(hMatch[1]) * 60;
                if (mMatch) m += parseInt(mMatch[1]);
                return acc + m;
            }, 0);

            // Subtract extra deduction (converted to minutes)
            const deductMins = Math.floor(deductMs / 60000);
            const netMins = Math.max(0, totalMins - stopsMins - deductMins);
            const netH = Math.floor(netMins / 60);
            const netM = netMins % 60;
            const tiempoNeto = `${netH}h ${netM}m`;

            // Score Logic (Always based on Net Time vs Checkpoints)
            const parseMinMax = (s: string) => {
                if (!s) return 0;
                const parts = s.split(':').map(Number);
                return (parts[0] * 60) + (parts[1] || 0);
            };
            const min = parseMinMax(unit.tiempoTransitoMin);
            const max = parseMinMax(unit.tiempoTransitoMax);

            let score = 'BUENO';
            if (min !== 0 || max !== 0) {
                if (netMins < min) score = 'EXCELENTE';
                else if (netMins > max) score = 'DEFICIENTE';
            } else {
                score = 'PENDIENTE';
            }

            return { tiempoTotal, tiempoNeto, score };
        };

        // --- SCENARIO 1: SINGLE DESTINATION ---
        if (type === 'SINGLE') {
            const finishDate = new Date(finishTripModal.date);
            if (finishDate < departureDate) { alert("ERROR: La fecha de llegada no puede ser anterior a la salida de planta."); return; }
            if (finishDate < lastUpdateDate) { alert("ERROR: La fecha de llegada no puede ser anterior al último reporte."); return; }
            if (finishDate > now) { alert("ERROR: La fecha de llegada no puede ser futura."); return; }

            // Calculate everything based on Single/D1 logic
            const metrics = calculateMetrics(finishDate);
            await finalizeTrip(unit, finishDate.toISOString(), unit.almacenDestino1 || unit.destination, metrics);
        }

        // --- SCENARIO 2: ARRIVAL AT DESTINATION 1 (INTERMEDIATE) ---
        else if (type === 'DEST1') {
            const finishDate = new Date(finishTripModal.date);
            if (finishDate < departureDate) { alert("ERROR: La fecha de llegada no puede ser anterior a la salida de planta."); return; }
            if (finishDate < lastUpdateDate) { alert("ERROR: La fecha de llegada no puede ser anterior al último reporte."); return; }
            if (finishDate > now) { alert("ERROR: La fecha de llegada no puede ser futura."); return; }

            // Always calc metrics for DEST1 (Base calculation)
            const metrics = calculateMetrics(finishDate);

            let updates: any = {
                fechaLlegadaDestino1: finishDate.toISOString(),
                ubicacionActual: `EN DESTINO 1: ${unit.almacenDestino1}`,
                lastUpdate: finishDate.toISOString(),
                tiempoTotal1: metrics.tiempoTotal,
                tiempoNeto1: metrics.tiempoNeto,
                calificacionTTotal: metrics.score,
                calificacionTNeto: metrics.score
            };

            await updateUnit(unit.id, updates);
            // RELATIONAL: Add arrival control
            await addEventToDB(unit.id, 'CONTROL', {
                time: finishDate.toISOString(),
                location: `LLEGADA A PUNTO 1 (${unit.almacenDestino1})`,
                coords: DESTINATION_GPS
            });
            setFinishTripModal(prev => ({ ...prev, open: false, date: '' }));
        }

        // --- SCENARIO 3: DEPARTURE D1 & ARRIVAL D2 (FINAL) ---
        else if (type === 'DEST2') {
            const exitD1 = new Date(finishTripModal.dateExitD1);
            const arriveD2 = new Date(finishTripModal.dateArriveD2);
            const arriveD1 = unit.fechaLlegadaDestino1 ? new Date(unit.fechaLlegadaDestino1) : departureDate;

            if (exitD1 < arriveD1) { alert("ERROR: La salida del Punto 1 no puede ser antes de haber llegado."); return; }
            if (arriveD2 < exitD1) { alert("ERROR: La llegada al Punto 2 no puede ser antes de salir del Punto 1."); return; }
            if (arriveD2 > now) { alert("ERROR: La llegada final no puede ser futura."); return; }

            // Dead Time at D1 = Exit D1 - Arrival D1
            const deadTimeMs = exitD1.getTime() - arriveD1.getTime();

            // Calculate Metrics for D2 (Deducting Dead Time)
            const metrics = calculateMetrics(arriveD2, deadTimeMs);

            const lastPoint = (unit.path && unit.path.length > 0) ? unit.path[unit.path.length - 1] : GLOBAL_ORIGIN;
            const segment = await fetchRoadRoute([lastPoint, DESTINATION_GPS]);
            const newPath = [...(unit.path || []), ...segment.slice(1)];

            let updates: any = {
                status: UnitStatus.DELIVERED,
                ubicacionActual: `LLEGADA A ${unit.almacenDestino2}`,
                lastUpdate: arriveD2.toISOString(),
                fechaSalidaDestino1: exitD1.toISOString(),
                fechaLlegadaDestino2: arriveD2.toISOString(),
                path: newPath,
                tiempoTotal2: metrics.tiempoTotal,
                tiempoNeto2: metrics.tiempoNeto
            };

            await updateUnit(unit.id, updates);
            // RELATIONAL: Add arrival control
            await addEventToDB(unit.id, 'CONTROL', {
                time: arriveD2.toISOString(),
                location: `LLEGADA A PUNTO 2 (${unit.almacenDestino2})`,
                coords: DESTINATION_GPS
            });
            setFinishTripModal(prev => ({ ...prev, open: false, date: '' }));
        }
    };

    // Helper for Single Finish
    const finalizeTrip = async (unit: TransportUnit, finishDateStr: string, locationName: string, metrics: { tiempoTotal: string; tiempoNeto: string; score: string }) => {
        const finishDate = new Date(finishDateStr);
        const finalCoords = DESTINATION_GPS;

        // RELATIONAL: Add arrival control
        await addEventToDB(unit.id, 'CONTROL', {
            time: finishDate.toISOString(),
            location: `LLEGADA A ${locationName}`,
            coords: finalCoords
        });

        // Update Path with Segment Routing
        const lastPathPoint = (unit.path && unit.path.length > 0) ? unit.path[unit.path.length - 1] : GLOBAL_ORIGIN;
        const segment = await fetchRoadRoute([lastPathPoint, finalCoords]);
        const newPath = [...(unit.path || []), ...segment.slice(1)];



        await updateUnit(unit.id, {
            status: UnitStatus.DELIVERED,
            ubicacionActual: `LLEGADA A ${locationName}`,
            lastUpdate: finishDate.toISOString(),
            // controles: newControles, -> handled by addEventToDB
            path: newPath,
            fechaLlegadaDestino1: finishDate.toISOString(), // Standard Single arrival
            tiempoTotal1: metrics.tiempoTotal,
            tiempoNeto1: metrics.tiempoNeto,
            calificacionTTotal: metrics.score,
            calificacionTNeto: metrics.score
        });

        setFinishTripModal(prev => ({ ...prev, open: false, date: '' }));
    };

    // State for Cancel Trip Confirmation
    const [confirmCancelModal, setConfirmCancelModal] = useState(false);

    const handleCancelTrip = () => {
        if (!selectedUnitId) return;
        setConfirmCancelModal(true);
    };

    const performCancelTrip = async () => {
        if (!selectedUnitId) return;

        await updateUnit(selectedUnitId, {
            status: 'CANCELADO',
            ubicacionActual: 'VIAJE CANCELADO',
            lastUpdate: new Date().toISOString()
        });

        setConfirmCancelModal(false);
    };

    const handleEditUnit = () => {
        if (!selectedUnit) return;

        // Helper to format UTC ISO string to Local ISO string for input[type="datetime-local"]
        const toLocalISO = (dateStr: string) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            // Adjust to local time
            const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
            return local.toISOString().slice(0, 16);
        };

        setForm({
            unitName: selectedUnit.unitName || '',
            proceso: selectedUnit.proceso || '',
            fechaIngreso: toLocalISO(selectedUnit.fechaIngresoPlanta),
            fechaSalida: toLocalISO(selectedUnit.fechaSalidaPlanta),
            tipoEnvio: selectedUnit.tipoEnvio || '',
            operador: selectedUnit.operadorLogistico || '',
            booking: selectedUnit.booking || '',
            conductor: selectedUnit.conductor || '',
            plateRemolque: selectedUnit.plateRemolque || '',
            plateSemi: selectedUnit.plateSemiRemolque || '',
            transportista: selectedUnit.transportista || '',
            telefono: selectedUnit.telefono || '',
            origin: selectedUnit.origin || '',
            destination: selectedUnit.destination || '',
            area: selectedUnit.area || '',
            eta: toLocalISO(selectedUnit.fechaEstimadaLlegada),
            almacenDestino1: selectedUnit.almacenDestino1 || '',
            almacenDestino2: selectedUnit.almacenDestino2 || ''
        });
        setIsEditMode(true);
        setIsAddModalOpen(true);
    };



    const handleSaveUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Check for existing errors before proceeding
        if (Object.keys(formErrors).length > 0) {
            return;
        }

        const ingresoDate = new Date(form.fechaIngreso);
        const salidaDate = new Date(form.fechaSalida);
        const now = new Date();
        const matched = routeMatrix.find(r => r.origen === form.origin && r.destino === form.destination);



        try {
            if (isEditMode && selectedUnitId) {
                await updateUnit(selectedUnitId, {
                    proceso: form.proceso.toUpperCase(),
                    fechaIngresoPlanta: ingresoDate.toISOString(),
                    fechaSalidaPlanta: salidaDate.toISOString(),
                    tipoEnvio: form.tipoEnvio,
                    operadorLogistico: form.operador.toUpperCase(),
                    booking: form.booking.toUpperCase(),
                    conductor: form.conductor.toUpperCase(),
                    plateRemolque: form.plateRemolque.toUpperCase(),
                    plateSemiRemolque: form.plateSemi.toUpperCase(),
                    transportista: form.transportista.toUpperCase(),
                    telefono: form.telefono,
                    fechaEstimadaLlegada: form.eta,
                    origin: form.origin,
                    destination: form.destination,
                    almacenDestino1: form.almacenDestino1,
                    almacenDestino2: form.almacenDestino2,
                    rutaName: matched ? `${matched.origen} - ${matched.destino}` : '',
                });
                setIsAddModalOpen(false);
                setIsEditMode(false);
            } else {
                const newUnit: Omit<TransportUnit, 'id'> = {
                    unitName: form.plateRemolque.toUpperCase() || 'S/N',
                    proceso: form.proceso.toUpperCase(),
                    fechaIngresoPlanta: ingresoDate.toISOString(),
                    fechaSalidaPlanta: salidaDate.toISOString(),
                    tipoEnvio: form.tipoEnvio,
                    operadorLogistico: form.operador.toUpperCase(),
                    booking: form.booking.toUpperCase(),
                    conductor: form.conductor.toUpperCase(),
                    plateRemolque: form.plateRemolque.toUpperCase(),
                    plateSemiRemolque: form.plateSemi.toUpperCase(),
                    transportistaEstandar: form.transportista.toUpperCase(),
                    transportista: form.transportista.toUpperCase(),
                    telefono: form.telefono,
                    ubicacionActual: 'ORIGEN PLANTA',
                    fechaEstimadaLlegada: form.eta,
                    status: UnitStatus.TRANSIT,
                    controles: [],
                    paradasProg: [],
                    paradasNoProg: [],
                    origin: form.origin,
                    destination: form.destination,
                    almacenDestino1: form.almacenDestino1,
                    fechaLlegadaDestino1: '',
                    tiempoTotal1: '',
                    tiempoNeto1: '',
                    almacenDestino2: form.almacenDestino2,
                    fechaLlegadaDestino2: '',
                    tiempoTotal2: '',
                    tiempoNeto2: '', // New field initialized

                    fechaSalidaDestino1: '',
                    fechaSalidaDestino2: '',

                    calificacionTNeto: 'PENDIENTE',
                    calificacionTTotal: 'PENDIENTE',
                    incidente: '',
                    detalleIncidente: '',
                    rutaName: matched ? `${matched.origen} - ${matched.destino}` : '',
                    tiempoTransitoMin: matched ? matched.min_time : '',
                    tiempoTransitoMax: matched ? matched.max_time : '',
                    año: now.getFullYear(),
                    mes: now.toLocaleDateString('es-ES', { month: 'short' }),
                    fecha: now.toLocaleDateString('es-ES'),
                    tipoViaje: 'REGULAR',
                    unidadEstandar: form.plateRemolque.toUpperCase(),
                    area: form.area,
                    lastLocation: 'Origen Planta',
                    lastUpdate: now.toISOString(),
                    path: [GLOBAL_ORIGIN]
                };
                await createUnit(newUnit);
                setIsAddModalOpen(false);
            }
            if (!isEditMode) {
                setForm(prev => ({ ...prev, plateRemolque: '', plateSemi: '', conductor: '', telefono: '', booking: '' }));
            }
        } catch (error) {
            console.error("Error saving unit:", error);
            showAlert("Error", "Error al guardar la unidad. Por favor intente nuevamente.", "danger");
        }
    };

    const handleExportReport = async () => {
        const activeUnits = units.filter(u => u.status === UnitStatus.TRANSIT || u.status === UnitStatus.PLANT || u.status === 'EN PARADA' || u.status === 'INCIDENTE');
        if (activeUnits.length === 0) {
            setToast({ type: 'warning', message: "No hay unidades en ruta para generar el reporte." });
            return;
        }

        setIsExporting(true);
        setToast({ type: 'info', message: "Generando reporte, por favor espere..." });

        try {
            let mapImage = '';
            // Force map render sync before capture
            if (mapContainerRef.current) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 800)); // Increased wait time slightly
                    const canvas = await html2canvas(mapContainerRef.current, {
                        useCORS: true,
                        allowTaint: true,
                        logging: false,
                        scale: 2,
                        ignoreElements: (element) => element.classList.contains('leaflet-control-zoom')
                    });
                    mapImage = canvas.toDataURL('image/png');
                } catch (e) {
                    console.warn("Error capturando mapa:", e);
                    // Don't fail the whole export just for the map
                }
            }

            const reportDate = new Date().toLocaleString();

            const cardStyle = "background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; page-break-inside: avoid; margin-bottom: 0; display: flex; height: 44px; flex-wrap: nowrap;";
            const sectionBase = "padding: 0 5px; display: flex; flex-direction: column; justify-content: center; border-right: 1px solid #e2e8f0; height: 100%; box-sizing: border-box;";
            const darkSection = "background: #1e293b; color: white; width: 14%; padding: 2px 6px; display: flex; flex-direction: column; justify-content: center; border-right: 1px solid #334155; height: 100%; box-sizing: border-box;";
            const labelStyle = "font-size: 7px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; line-height: 1;";
            const valStyle = "font-size: 9px; color: #0f172a; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.1;";

            const cardsHtml = activeUnits.map(u => {
                const fmtDate = (d: string) => d ? new Date(d).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '') : '-';
                const salida = fmtDate(u.fechaSalidaPlanta);
                const eta = fmtDate(u.fechaEstimadaLlegada);
                const updated = fmtDate(u.lastUpdate);

                return `
                <div style="${cardStyle}">
                    <div style="${darkSection}">
                        <div style="font-weight: 900; font-size: 11px; line-height: 1;">${u.plateRemolque}</div>
                        <div style="color: #94a3b8; font-size: 7px; margin-top: 3px;">${u.plateSemiRemolque || '-'}</div>
                        <div style="background: #fff; color: #1e293b; font-size: 6px; font-weight: 800; padding: 2px 3px; border-radius: 2px; margin-top: 3px; width: fit-content;">${u.proceso.substring(0, 10)}</div>
                    </div>
                    <div style="${sectionBase} width: 22%;">
                        <div style="display: flex; gap: 4px; margin-bottom: 3px;">
                            <div style="flex:1"><div style="${labelStyle}">ORI</div><div style="${valStyle}">${u.origin.substring(0, 10)}</div></div>
                            <div style="flex:1"><div style="${labelStyle}">DES</div><div style="${valStyle}">${u.destination.substring(0, 10)}</div></div>
                        </div>
                        <div><div style="${labelStyle}">TIPO</div><div style="${valStyle}">${u.tipoEnvio}</div></div>
                    </div>
                    <div style="${sectionBase} width: 18%;">
                        <div style="margin-bottom: 3px;"><div style="${labelStyle}">SALIDA</div><div style="${valStyle}">${salida}</div></div>
                        <div><div style="${labelStyle}"></div><div style="${valStyle}"></div></div>
                    </div>
                    <div style="${sectionBase} width: 16%;">
                        <div style="margin-bottom: 3px;"><div style="${labelStyle}">CONDUCTOR</div><div style="${valStyle}">${u.conductor.substring(0, 12)}</div></div>
                        <div><div style="${labelStyle}">TEL</div><div style="${valStyle}">${u.telefono}</div></div>
                    </div>
                    <div style="width: 30%; padding: 3px; display: flex; flex-direction: column; justify-content: center; gap: 3px; height: 100%; box-sizing: border-box;">
                        <div style="background: #f8fafc; padding: 3px 5px; border-radius: 3px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                            <span style="${labelStyle}">UBIC (${updated.split(' ')[1] || ''})</span>
                            <span style="${valStyle}; font-size: 8px; max-width: 140px;">${u.ubicacionActual.substring(0, 35)}</span>
                        </div>
                        <div style="background: #eff6ff; padding: 3px 5px; border-radius: 3px; border: 1px solid #dbeafe; display: flex; align-items: center; justify-content: space-between;">
                            <span style="${labelStyle}; color: #1e40af;">ESTIMADO LLEGADA</span>
                            <span style="${valStyle}; color: #1d4ed8; font-size: 9px;">${eta}</span>
                        </div>
                    </div>
                </div>
                `;
            }).join('');

            const htmlContent = `
                <div style="font-family: 'Inter', sans-serif; padding: 15px; width: 1120px; height: 790px; box-sizing: border-box; background: white; overflow: hidden; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 10px; height: 35px;">
                        <div>
                            <h1 style="color: #1e293b; font-size: 16px; margin: 0; font-weight: 900; text-transform: uppercase;">REPORTE DE OPERACIONES EN RUTA</h1>
                            <p style="color: #64748b; font-size: 10px; margin: 2px 0 0 0;">Generado: ${reportDate} • ${activeUnits.length} Unidades Activas</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="background-color: #1e293b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">CONTROL CENTER AI</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; height: 705px; align-items: flex-start;">
                        <div style="width: 65%; flex-shrink: 0; display: flex; flex-direction: column; gap: 4px; align-content: flex-start;">
                            ${cardsHtml}
                        </div>
                        <div style="width: 35%; flex-shrink: 0; display: flex; flex-direction: column; height: 100%;">
                            ${mapImage ? `
                                <div style="border: 2px solid #1e293b; border-radius: 6px; overflow: hidden; height: 100%; display: flex; align-items: center; justify-content: center; background: #f8fafc;">
                                    <img src="${mapImage}" style="width: 100%; height: auto; max-height: 100%; object-fit: contain; display: block;" />
                                </div>
                                <div style="margin-top: 8px; padding: 8px; background: #f8fafc; border-radius: 4px; border: 1px solid #e2e8f0; height: 40px;">
                                    <p style="font-size: 8px; color: #475569; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; margin-top: 0;">LEYENDA</p>
                                    <div style="display: flex; gap: 10px;">
                                        <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 6px; height: 6px; background: #3b82f6; border-radius: 50%;"></div><span style="font-size: 8px; color: #64748b; font-weight: 600;">EN RUTA</span></div>
                                        <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 6px; height: 6px; background: #f97316; border-radius: 50%;"></div><span style="font-size: 8px; color: #64748b; font-weight: 600;">ALERTA</span></div>
                                    </div>
                                </div>
                            ` : '<div style="background: #f1f5f9; height: 100%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-weight: bold; font-size: 10px;">MAPA NO DISPONIBLE</div>'}
                        </div>
                    </div>
                    <div style="position: absolute; bottom: 8px; width: 100%; text-align: center; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px;">
                        Documento Confidencial • Generado automáticamente por ControlCenter AI
                    </div>
                </div>
            `;

            const element = document.createElement('div');
            element.innerHTML = htmlContent;

            await html2pdf().set({
                margin: 0,
                filename: `Reporte_Ruta_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { scale: 1.5, useCORS: true, scrollY: 0 },
                jsPDF: { unit: 'px', format: [1122, 794], orientation: 'landscape', hotfixes: ['px_scaling'] } as any
            }).from(element).save();

            setToast({ type: 'success', message: "Reporte descargado correctamente" });
        } catch (error) {
            console.error("Export error:", error);
            setToast({ type: 'error', message: "Error al generar el reporte PDF" });
        } finally {
            setIsExporting(false);
        }
    };

    const handleUpdateControl = async (e: React.FormEvent) => {
        e.preventDefault();
        const u = units.find(unit => unit.id === selectedUnitId);
        if (!selectedUnitId || !u) return;

        // VALIDATION: Prevent adding control if unit is stopped
        if (u.status === 'EN PARADA' || u.status === 'INCIDENTE') {
            showAlert("Acción Requerida", "La unidad se encuentra en estado de DETENCIÓN (Parada/Incidente). Debe registrar el FIN DE PARADA en la pestaña 'Paradas' antes de reportar una nueva ubicación de ruta.", "warning");
            setActiveTab('PARADAS');
            return;
        }

        const nLat = parseFloat(reportForm.lat);
        const nLng = parseFloat(reportForm.lng);
        if (isNaN(nLat) || isNaN(nLng)) { showAlert("Error", "Coordenadas inválidas", "danger"); return; }

        const reportDateTime = new Date(reportForm.reportDateTime);
        const now = new Date();
        const departureDate = new Date(u.fechaSalidaPlanta);
        const lastUpdateDate = new Date(u.lastUpdate);

        // DATE VALIDATION FOR CONTROLS
        if (reportDateTime > now) { showAlert("Error de Validación", "La fecha del control no puede ser futura.", "danger"); return; }

        if (u.controles.length === 0) {
            // First control: Cannot be before departure
            if (reportDateTime < departureDate) { showAlert("Error de Validación", "La fecha del control no puede ser anterior a la salida de planta.", "danger"); return; }
        } else {
            // Subsequent controls: Cannot be before last update
            // We use lastUpdate because it tracks the timestamp of the latest event
            if (reportDateTime < lastUpdateDate && editingControlIndex === null) {
                showAlert("Error de Secuencialidad", "La fecha del nuevo control no puede ser anterior al último reporte registrado.", "danger");
                return;
            }
        }

        setIsSavingControl(true);
        const newPoint: LatLng = { lat: nLat, lng: nLng };
        const isoDateTime = reportDateTime.toISOString();

        if (editingControlIndex !== null) {
            const control = u.controles[editingControlIndex] as any;
            if (control.id) {
                await updateEventInDB(control.id, {
                    location: reportForm.location.toUpperCase(),
                    coords: newPoint,
                    time: isoDateTime
                });
            }
        } else {
            await addEventToDB(u.id, 'CONTROL', {
                time: isoDateTime,
                location: reportForm.location.toUpperCase(),
                coords: newPoint
            });
        }

        // --- OPTIMIZED ROUTING: Segment Routing ---
        let newPath = u.path || [];
        if (editingControlIndex !== null) {
            // Re-route using latest state from store (which is updated by relational calls)
            const pointsForRouting = [GLOBAL_ORIGIN, ...u.controles.filter((c: any) => c.coords).map((c: any) => c.coords as LatLng)];
            newPath = await fetchRoadRoute(pointsForRouting);
        } else {
            // Sequential addition: Only route from last path point to new control
            const lastPathPoint = (u.path && u.path.length > 0) ? u.path[u.path.length - 1] : GLOBAL_ORIGIN;
            const segment = await fetchRoadRoute([lastPathPoint, newPoint]);
            // Avoid duplicates and append
            newPath = [...(u.path || []), ...segment.slice(1)];
        }

        await updateUnit(u.id, {
            // controles: newControles, -> handled relacionalmente
            ubicacionActual: reportForm.location.toUpperCase(),
            lastLocation: reportForm.location.toUpperCase(),
            lastUpdate: reportDateTime.toISOString(),
            path: newPath
        });

        setIsSavingControl(false);

        resetReportForm();
        setEditingControlIndex(null);
    };

    const calculateDuration = (start: string, end: string) => {
        if (!start || !end) return 'En Curso';
        const d1 = new Date(start);
        const d2 = new Date(end);
        let diff = (d2.getTime() - d1.getTime()) / 60000;
        if (diff < 0) return 'Error';
        const h = Math.floor(diff / 60);
        const m = Math.floor(diff % 60);
        return `${h}h ${m}m`;
    };

    const handleAddStop = async (type: 'PROG' | 'NOPROG') => {
        if (!selectedUnitId) return;
        const u = units.find(unit => unit.id === selectedUnitId);
        if (!u) return;

        const startTime = new Date(newStopForm.start);
        const departureTime = new Date(u.fechaSalidaPlanta);
        const now = new Date();

        // VALIDATION FOR STOP START
        if (startTime < departureTime) { showAlert("Error de Validación", "El inicio de la parada no puede ser anterior a la salida de planta.", "danger"); return; }
        if (startTime > now) { showAlert("Error de Validación", "El inicio de la parada no puede ser una fecha futura.", "danger"); return; }

        // VALIDATION FOR STOP END (IF NOT ONGOING)
        if (!isStopOngoing) {
            const endTime = new Date(newStopForm.end);
            if (endTime < startTime) { showAlert("Error de Validación", "La hora de fin debe ser mayor a la hora de inicio.", "danger"); return; }
            if (endTime > now) { showAlert("Error de Validación", "La hora de fin no puede ser futura.", "danger"); return; }
        }

        const nLat = newStopForm.lat ? parseFloat(newStopForm.lat) : undefined;
        const nLng = newStopForm.lng ? parseFloat(newStopForm.lng) : undefined;
        const coords = (nLat && nLng) ? { lat: nLat, lng: nLng } : undefined;

        const newStatus = isStopOngoing ? (type === 'PROG' ? 'EN PARADA' : 'INCIDENTE') : u.status;

        const stopData = {
            location: newStopForm.location.toUpperCase(),
            start: newStopForm.start, // Store original ISO string
            end: isStopOngoing ? '' : newStopForm.end, // Store original ISO string
            time: isStopOngoing ? 'En Curso' : calculateDuration(newStopForm.start, newStopForm.end),
            cause: type === 'NOPROG' ? newStopForm.cause?.toUpperCase() : undefined,
            coords: coords
        };

        await updateUnit(u.id, { status: newStatus });
        await addEventToDB(u.id, type === 'PROG' ? 'PARADA_PROG' : 'PARADA_NOPROG', stopData);

        setNewStopForm({ location: '', start: '', end: '', time: '', cause: '', lat: '', lng: '' });
        setIsStopOngoing(false);
        if (type === 'PROG') setShowAddStopProg(false);
        else setShowAddStopNoProg(false);
    };

    const initiateFinishStop = (type: 'PROG' | 'NOPROG', index: number) => {
        // Open modal to select end time
        const now = new Date();
        // Format now for datetime-local input: YYYY-MM-DDTHH:mm
        const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

        setFinishStopModal({
            open: true,
            type,
            index,
            endDate: localIso
        });
    };

    const handleConfirmFinishStop = async () => {
        if (!selectedUnitId || !finishStopModal.type || finishStopModal.index === null) return;

        const { type, index, endDate } = finishStopModal;
        const endDateObj = new Date(endDate);
        const now = new Date();
        const u = units.find(unit => unit.id === selectedUnitId);

        if (!u) return;

        // VALIDATION FOR FINISHING STOP
        if (endDateObj > now) { showAlert("Error de Validación", "La fecha de fin no puede ser futura.", "danger"); return; }

        const currentList = type === 'PROG' ? [...u.paradasProg] : [...u.paradasNoProg];
        const currentStop = currentList[index];
        const startObj = new Date(currentStop.start);

        if (endDateObj < startObj) {
            showAlert("Error de Validación", "La fecha de fin no puede ser anterior al inicio de la parada.", "danger");
            return;
        }
        let durationStr = calculateDuration(currentStop.start, endDate);

        await updateUnit(u.id, {
            status: UnitStatus.TRANSIT, // Back to route
        });

        if ((currentStop as any).id) {
            await updateEventInDB((currentStop as any).id, {
                end: endDate,
                time: durationStr
            });
        }

        setFinishStopModal({ open: false, type: 'PROG', index: null, endDate: '' });
    };

    const handleDeleteStop = async (type: 'PROG' | 'NOPROG', index: number) => {
        if (!selectedUnitId) return;
        const u = units.find(unit => unit.id === selectedUnitId);
        if (!u) return;

        const list = type === 'PROG' ? [...u.paradasProg] : [...u.paradasNoProg];
        // If deleting an ongoing stop, revert status if needed
        const stop = list[index];
        let newStatus = u.status;
        if (!stop.end) {
            newStatus = UnitStatus.TRANSIT;
        }
        list.splice(index, 1);

        await updateUnit(u.id, {
            status: newStatus
        });

        if ((stop as any).id) {
            await deleteEventFromDB((stop as any).id);
        }
    };

    const openDetail = (unitId: string) => {
        setSelectedUnitId(unitId);
        setActiveTab('CONTROLES'); // Force switch to controls tab
        setIsDetailOpen(true);
        resetReportForm();
        setEditingControlIndex(null);
        const u = units.find(unit => unit.id === unitId);
        if (u && u.path && u.path.length > 0 && mapRef.current) {
            const lastPos = u.path[u.path.length - 1];
            mapRef.current.setView([lastPos.lat, lastPos.lng], 13);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-110px)] gap-2 animate-in fade-in duration-200">

            {/* HEADER COMPACTO - TRANSPARENTE */}
            <div className="flex justify-between items-center px-4 py-3 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-white text-slate-900 border border-slate-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                        <Monitor size={24} className="stroke-bold" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Terminal de Monitoreo</h1>
                        <p className="text-sm text-gray-500 font-medium">Seguimiento de Flota en Ruta</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setStatusFilter('TRANSIT')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${statusFilter === 'TRANSIT' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>En Ruta</button>
                        <button onClick={() => setStatusFilter('ALL')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${statusFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Todos</button>
                        <button onClick={() => setStatusFilter('ARRIVED')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${statusFilter === 'ARRIVED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Llegados</button>
                        <button onClick={() => setStatusFilter('CANCELLED')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${statusFilter === 'CANCELLED' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Cancelados</button>
                    </div>
                    <div className="h-8 w-[1px] bg-slate-200" />
                    <div className="flex gap-2">
                        <button onClick={handleExportReport} disabled={isExporting} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm hover:bg-gray-50 transition-all disabled:opacity-50 shadow-sm">
                            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                            {isExporting ? 'Generando...' : 'Reporte'}
                        </button>
                        <button onClick={() => { setIsEditMode(false); setForm({ ...form, plateRemolque: '' }); setIsAddModalOpen(true); }} className="bg-blue-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 font-medium text-sm hover:bg-blue-700 transition-all shadow-sm">
                            <Plus size={16} /> Nueva Monitoreo
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex flex-1 min-h-0 gap-4 overflow-hidden">

                {/* LISTA TARJETAS (HORIZONTAL) */}
                <div className="w-[60%] flex flex-col gap-2">
                    <div className="bg-white p-1.5 rounded-xl border border-slate-200 flex items-center gap-3 shrink-0">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input type="text" placeholder="Buscar placa, conductor, booking..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold outline-none focus:bg-white focus:border-slate-300 transition-all" />
                        </div>

                        {(statusFilter === 'ALL' || statusFilter === 'ARRIVED' || statusFilter === 'CANCELLED') && (
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 p-0.5 rounded-lg px-2">
                                <CalendarRange size={12} className="text-slate-400" />
                                <input type="date" className="bg-transparent text-[9px] font-bold text-slate-600 outline-none w-24" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
                                <span className="text-slate-300">-</span>
                                <input type="date" className="bg-transparent text-[9px] font-bold text-slate-600 outline-none w-24" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl overflow-y-auto custom-scrollbar p-2 space-y-2 flex-1 border border-slate-200">
                        {(filteredUnits || []).map(unit => {
                            const needsAlert = checkMonitoringAlert(unit.lastUpdate);
                            const isArrived = unit.status === UnitStatus.DELIVERED;
                            const isSelected = selectedUnitId === unit.id;
                            const isCancelled = unit.status === 'CANCELADO';
                            const isStopped = unit.status === 'EN PARADA' || unit.status === 'INCIDENTE';

                            const cardClasses = `
                        bg-white rounded-lg p-3 cursor-pointer transition-all duration-200 relative group overflow-hidden flex flex-col justify-between
                        ${isSelected ? 'border-l-[6px] border-l-[#1a73e8] border border-slate-300 z-10 shadow-md ring-1 ring-[#1a73e8]/20' : 'border border-slate-200 border-l-[6px] border-l-transparent hover:border-slate-300 hover:shadow-sm'}
                    `;

                            return (
                                <div key={unit.id} onClick={() => openDetail(unit.id)} className={cardClasses}>
                                    {isSelected && (<div className="absolute top-2 right-2 text-[#1a73e8] animate-in fade-in"><CheckCircle2 size={16} fill="#eef2ff" /></div>)}
                                    {needsAlert && !isArrived && !isCancelled && !isStopped && (
                                        <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg animate-pulse flex items-center gap-1 z-10"><AlertTriangle size={10} /> REVISIÓN (+3H)</div>
                                    )}

                                    <div className="flex items-center justify-between gap-4">
                                        <div className="min-w-[140px] flex flex-col gap-1">
                                            <div className="flex items-center gap-1">
                                                <h3 className={`text-base font-bold ${isSelected ? 'text-[#1a73e8]' : 'text-gray-900'}`}>
                                                    {unit.plateRemolque}
                                                </h3>
                                                {unit.plateSemiRemolque && unit.plateSemiRemolque !== 'N/A' && (
                                                    <span className="text-xs font-medium text-gray-400">/ {unit.plateSemiRemolque}</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] font-medium text-gray-400 truncate max-w-[140px]">{unit.transportista}</p>
                                            <div className="flex gap-1 mt-1">
                                                <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-bold">{unit.proceso}</span>
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${unit.status === UnitStatus.TRANSIT ? 'bg-blue-100 text-blue-700' : isStopped ? 'bg-red-100 text-red-700 animate-pulse' : unit.status === UnitStatus.DELIVERED ? 'bg-emerald-100 text-emerald-700' : isCancelled ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-700'}`}>
                                                    {typeof unit.status === 'string' ? unit.status : 'Desconocido'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex-1 border-l border-gray-100 pl-4 flex flex-col justify-center gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                                                <span className="text-xs font-bold text-gray-700 truncate">{unit.origin}</span>
                                                <div className="h-[1px] bg-gray-100 flex-1"></div>
                                                <span className="text-xs font-bold text-gray-700 truncate">{unit.destination}</span>
                                                <div className={`w-1.5 h-1.5 rounded-full ${isArrived ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                            </div>
                                            <div className="flex justify-between">
                                                <div>
                                                    <span className="text-[9px] font-semibold text-gray-400 uppercase block tracking-wider">Salida</span>
                                                    <span className="text-xs font-medium text-gray-600">{formatDate(unit.fechaSalidaPlanta)}</span>
                                                </div>
                                                <div className="text-right flex flex-col items-end">
                                                    {unit.almacenDestino1 && (
                                                        <div className="mb-0.5">
                                                            <span className="text-[9px] font-semibold text-gray-400 uppercase block tracking-wider">Llegada 1 {unit.fechaLlegadaDestino1 ? `- ${formatDate(unit.fechaLlegadaDestino1)}` : ''}</span>
                                                            <span className="text-xs font-medium text-gray-600 truncate max-w-[100px] block" title={unit.almacenDestino1}>{unit.almacenDestino1}</span>
                                                        </div>
                                                    )}
                                                    {unit.almacenDestino2 && (
                                                        <div>
                                                            <span className="text-[9px] font-semibold text-gray-400 uppercase block tracking-wider">Llegada 2</span>
                                                            <span className="text-xs font-medium text-gray-600 truncate max-w-[100px] block" title={unit.almacenDestino2}>{unit.almacenDestino2}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="min-w-[130px] border-l border-gray-100 pl-4 flex flex-col justify-center gap-1">
                                            <div>
                                                <span className="text-[9px] font-semibold text-gray-400 uppercase block tracking-wider">Conductor</span>
                                                <span className="text-xs font-medium text-gray-900 truncate block max-w-[120px]" title={unit.conductor}>{unit.conductor.split(' ')[0]}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-semibold text-gray-400 uppercase block tracking-wider">Teléfono</span>
                                                <span className="text-xs font-medium text-gray-900 truncate block">{unit.telefono}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-semibold text-gray-400 uppercase block tracking-wider">Envío</span>
                                                <span className="text-xs font-medium text-gray-900 truncate block">{unit.tipoEnvio}</span>
                                            </div>
                                        </div>

                                        <div className="min-w-[140px] flex flex-col justify-center gap-2 text-right">
                                            <div className="bg-gray-50 p-1.5 rounded border border-gray-200">
                                                <span className="text-[9px] font-semibold text-gray-400 uppercase block mb-0.5 tracking-wider">Ubicación ({formatDate(unit.lastUpdate).split(' ')[1] || ''})</span>
                                                <span className="text-xs font-bold text-gray-900 uppercase leading-tight block truncate max-w-[130px] ml-auto">{unit.ubicacionActual}</span>
                                            </div>
                                            <div className="bg-blue-50 p-1.5 rounded border border-blue-100">
                                                <span className="text-[9px] font-semibold text-blue-400 uppercase block mb-0.5 tracking-wider">Estimado Llegada</span>
                                                <span className="text-sm font-bold text-blue-600 block transition-all">
                                                    {(() => {
                                                        const d = new Date(unit.fechaEstimadaLlegada);
                                                        return `${d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredUnits.length === 0 && (
                            <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl">
                                <Truck size={24} className="mb-2 opacity-50" />
                                <p className="text-xs font-bold uppercase tracking-widest">No hay unidades en esta vista</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-[40%] bg-white rounded-xl border border-slate-300 overflow-hidden relative min-h-0 shadow-inner">
                    <div ref={mapContainerRef} className="w-full h-full z-0" />
                    <div className="absolute top-4 left-4 z-[1] bg-white/95 px-3 py-2 rounded-lg border border-slate-200 pointer-events-none">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                            <span className="text-xs font-semibold text-gray-900">Mapa de Monitoreo</span>
                        </div>
                    </div>
                </div>
            </div>
            {finishTripModal.open && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[200] p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h4 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                                <Flag size={14} className="text-[#ff0000]" /> Finalizar Viaje
                            </h4>
                            <button onClick={() => setFinishTripModal({ ...finishTripModal, open: false })} className="text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                                <p className="text-[10px] text-blue-700 font-bold">
                                    {finishTripModal.type === 'DEST1'
                                        ? 'Se registrará la llegada al primer punto de destino. El viaje continuará activo.'
                                        : 'Se registrará el cierre definitivo del viaje.'}
                                </p>
                            </div>

                            {(finishTripModal.type === 'SINGLE' || finishTripModal.type === 'DEST1') && (
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {finishTripModal.type === 'DEST1' ? 'Fecha Llegada (1er Punto)' : 'Fecha y Hora de Llegada'}
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-[#ff0000]"
                                        value={finishTripModal.date}
                                        onChange={(e) => setFinishTripModal({ ...finishTripModal, date: e.target.value })}
                                    />
                                </div>
                            )}

                            {finishTripModal.type === 'DEST2' && (
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Salida del 1er Punto</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-[#ff0000]"
                                            value={finishTripModal.dateExitD1}
                                            onChange={(e) => setFinishTripModal({ ...finishTripModal, dateExitD1: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Llegada al 2do Punto</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-[#ff0000]"
                                            value={finishTripModal.dateArriveD2}
                                            onChange={(e) => setFinishTripModal({ ...finishTripModal, dateArriveD2: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleConfirmFinishTrip}
                                className="w-full py-3 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                            >
                                {finishTripModal.type === 'DEST1' ? 'Confirmar Llegada (1er Punto)' : 'Confirmar Cierre de Viaje'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {finishStopModal.open && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[200] p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h4 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                                <Clock size={14} className="text-[#ff0000]" /> Finalizar {finishStopModal.type === 'PROG' ? 'Parada' : 'Incidente'}
                            </h4>
                            <button onClick={() => setFinishStopModal({ ...finishStopModal, open: false })} className="text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora de Fin</label>
                                <input
                                    type="datetime-local"
                                    className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-[#ff0000]"
                                    value={finishStopModal.endDate}
                                    onChange={(e) => setFinishStopModal({ ...finishStopModal, endDate: e.target.value })}
                                />
                            </div>
                            <p className="text-[9px] text-slate-400 italic">La unidad pasará automáticamente a estado "EN RUTA".</p>
                            <button
                                onClick={handleConfirmFinishStop}
                                className="w-full py-3 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                            >
                                Confirmar Fin
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`fixed inset-0 z-[60] flex justify-end transition-opacity duration-300 ${isDetailOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-slate-900/50" onClick={() => setIsDetailOpen(false)}></div>
                <div className={`relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ${isDetailOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                    {selectedUnit && (
                        <>
                            <div className="p-5 border-b border-slate-100 bg-slate-50 shrink-0">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center border border-slate-700 shrink-0 shadow-lg"><Truck size={24} /></div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tracto</span>
                                                    <h3 className="text-xl font-bold text-slate-900 uppercase leading-none tracking-tight">{selectedUnit.plateRemolque}</h3>
                                                </div>
                                                {selectedUnit.plateSemiRemolque && selectedUnit.plateSemiRemolque !== 'N/A' && (
                                                    <div className="flex flex-col border-l border-slate-200 pl-4">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Placa</span>
                                                        <h3 className="text-xl font-bold text-slate-400 uppercase leading-none tracking-tight">{selectedUnit.plateSemiRemolque}</h3>
                                                    </div>
                                                )}
                                                <div className="ml-auto flex flex-col items-end">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Proceso</span>
                                                    <span className="text-[10px] font-bold bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 uppercase shadow-sm tracking-wide">{selectedUnit.proceso}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col border-t border-slate-100 pt-3">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Responsable del Viaje</span>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-bold text-[#1a73e8] uppercase tracking-wide">{selectedUnit.conductor}</p>
                                                    <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 text-[#1a73e8]">
                                                        <Phone size={12} fill="currentColor" fillOpacity={0.2} />
                                                        <span className="text-[11px] font-black">{selectedUnit.telefono}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsDetailOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors"><X size={20} /></button>
                                </div>

                                {selectedUnit.status !== UnitStatus.DELIVERED && selectedUnit.status !== 'CANCELADO' && (
                                    <div className="flex gap-2">
                                        <button onClick={handleEditUnit} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"><Edit3 size={14} /> Editar Registro</button>
                                        <button onClick={handleInitiateFinishTrip} className="flex-1 bg-slate-900 hover:bg-black text-white py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-200"><Flag size={14} /> Finalizar</button>
                                        <button onClick={handleCancelTrip} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all" title="Cancelar Viaje por Error"><Ban size={14} /></button>
                                    </div>
                                )}
                                {(selectedUnit.status === UnitStatus.DELIVERED || selectedUnit.status === 'CANCELADO') && (
                                    <div className="bg-slate-100 p-3 rounded-xl text-center border border-slate-200"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Viaje Cerrado: {selectedUnit.status}</p></div>
                                )}
                            </div>

                            <div className="flex border-b border-slate-200 px-2 bg-white shrink-0">
                                <button onClick={() => setActiveTab('CONTROLES')} className={`flex-1 py-3.5 text-[11px] font-bold uppercase transition-all border-b-2 ${activeTab === 'CONTROLES' ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Geolocalización</button>
                                <button onClick={() => setActiveTab('PARADAS')} className={`flex-1 py-3.5 text-[11px] font-bold uppercase transition-all border-b-2 ${activeTab === 'PARADAS' ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Paradas</button>
                                <button onClick={() => setActiveTab('DETALLE')} className={`flex-1 py-3.5 text-[11px] font-bold uppercase transition-all border-b-2 ${activeTab === 'DETALLE' ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Info. Carga</button>
                                <button onClick={() => setActiveTab('RESUMEN')} className={`flex-1 py-3.5 text-[11px] font-bold uppercase transition-all border-b-2 ${activeTab === 'RESUMEN' ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Resumen</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                                {activeTab === 'CONTROLES' && (
                                    <div className="space-y-6">
                                        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl">
                                            <div className="flex items-center justify-between mb-6">
                                                <h4 className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
                                                    <Locate size={16} className="text-white" />
                                                    {editingControlIndex !== null ? `Corrección Control #${editingControlIndex + 1}` : 'Registrar Nuevo Control'}
                                                </h4>
                                            </div>

                                            {(selectedUnit.status === 'EN PARADA' || selectedUnit.status === 'INCIDENTE') ? (
                                                <div className="bg-orange-950/30 border border-orange-500/20 p-4 rounded-xl mb-4 flex items-start gap-3">
                                                    <AlertTriangle className="text-orange-500 shrink-0" size={20} />
                                                    <div>
                                                        <h4 className="text-xs font-bold text-orange-200 uppercase tracking-wide">Unidad Detenida</h4>
                                                        <p className="text-[10px] text-orange-200/60 mt-1">
                                                            No se pueden registrar controles de ruta mientras la unidad está en parada activa.
                                                            <br />
                                                            <strong>Por favor, finalice la parada primero.</strong>
                                                        </p>
                                                        <button onClick={() => setActiveTab('PARADAS')} className="mt-2 text-[9px] font-bold underline text-orange-400 uppercase tracking-wider hover:text-orange-300">Ir a Paradas →</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <form onSubmit={handleUpdateControl} className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-white uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                                                <Calendar size={12} className="text-white" /> Fecha y Hora
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    ref={dateInputRef}
                                                                    type="datetime-local"
                                                                    required
                                                                    className="absolute inset-0 opacity-0 -z-10 pointer-events-none"
                                                                    value={reportForm.reportDateTime}
                                                                    onChange={e => setReportForm({ ...reportForm, reportDateTime: e.target.value })}
                                                                />
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => dateInputRef.current?.showPicker()}
                                                                        className="flex-1 p-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-between group"
                                                                    >
                                                                        <span className="truncate">{formatDate(reportForm.reportDateTime)}</span>
                                                                        <Calendar size={14} className="text-white/40 group-hover:text-white transition-colors" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const now = new Date();
                                                                            const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                                                                            setReportForm({ ...reportForm, reportDateTime: localIso });
                                                                        }}
                                                                        className="px-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-[9px] font-black text-blue-400 uppercase tracking-tighter hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-900/20"
                                                                        title="Establecer Hora Actual"
                                                                    >
                                                                        Ahora
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-white uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                                                <Truck size={12} className="text-white" /> Ubicación Actual
                                                            </label>
                                                            <input
                                                                required
                                                                placeholder="EJ: CIUDAD / KM / PEAJE"
                                                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white outline-none uppercase focus:border-[#1a73e8] focus:ring-4 focus:ring-blue-900/10 transition-all placeholder:text-white/30"
                                                                value={reportForm.location}
                                                                onChange={e => setReportForm({ ...reportForm, location: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-4 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-white uppercase tracking-wider ml-1 flex items-center gap-1.5 line-clamp-1">
                                                                <MapPin size={12} className="text-white" /> Latitud
                                                            </label>
                                                            <input
                                                                required
                                                                onPaste={handleCoordPaste}
                                                                placeholder="-8.13..."
                                                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:border-[#1a73e8] focus:ring-4 focus:ring-blue-900/10 transition-all placeholder:text-white/30"
                                                                value={reportForm.lat}
                                                                onChange={e => setReportForm({ ...reportForm, lat: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-white uppercase tracking-wider ml-1 flex items-center gap-1.5 line-clamp-1">
                                                                <MapPin size={12} className="text-white" /> Longitud
                                                            </label>
                                                            <input
                                                                required
                                                                onPaste={handleCoordPaste}
                                                                placeholder="-79.0..."
                                                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:border-[#1a73e8] focus:ring-4 focus:ring-blue-900/10 transition-all placeholder:text-white/30"
                                                                value={reportForm.lng}
                                                                onChange={e => setReportForm({ ...reportForm, lng: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="col-span-2 pt-5.5 flex flex-col justify-end">
                                                            <button
                                                                type="submit"
                                                                disabled={isSavingControl}
                                                                className="w-full py-2.5 bg-[#1a73e8] hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                            >
                                                                {isSavingControl && <Loader2 size={14} className="animate-spin" />}
                                                                {editingControlIndex !== null ? 'Actualizar' : 'Reportar Ubicación'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </form>
                                            )}
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-300">
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Clock size={14} /> Historial de Ruta</h4>
                                            {selectedUnit.controles.length === 0 ? (<div className="text-center py-8 text-slate-400 text-xs italic">Aún no se han registrado controles de ruta.</div>) : (
                                                <div className="space-y-1.5 pl-1">
                                                    {selectedUnit.controles.map((cp, idx) => {
                                                        const dateObj = new Date(cp.time);
                                                        const isInvalidDate = isNaN(dateObj.getTime());

                                                        // Fallback para datos antiguos o ISO strings correctos
                                                        const displayDate = isInvalidDate ? '-' : dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
                                                        const displayTime = isInvalidDate ? cp.time : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

                                                        return (
                                                            <div key={idx} className="relative pl-6 pb-4 last:pb-0 border-l-2 border-slate-100 last:border-0 group">
                                                                <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow-sm ring-2 ring-red-50 group-hover:scale-110 transition-transform" />
                                                                <div className="bg-white p-2.5 rounded-xl border border-slate-200 hover:border-red-200 hover:shadow-sm transition-all flex justify-between items-center group/card">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-0.5">
                                                                            <span className="text-[10px] font-bold text-slate-400">CP-{idx + 1}</span>
                                                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                                                <Calendar size={10} className="text-blue-600 opacity-70" />
                                                                                <span className="text-[10px] font-bold">{displayDate}</span>
                                                                                <Clock size={10} className="ml-1 text-slate-400 opacity-70" />
                                                                                <span className="text-[10px] font-bold text-slate-900">{displayTime}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <MapPin size={10} className="text-red-500 shrink-0" />
                                                                            <p className="text-[11px] font-bold text-slate-800 uppercase truncate">{cp.location}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingControlIndex(idx);
                                                                                setReportForm({
                                                                                    ...reportForm,
                                                                                    location: cp.location,
                                                                                    lat: cp.coords?.lat.toString() || '',
                                                                                    lng: cp.coords?.lng.toString() || '',
                                                                                    reportDateTime: isInvalidDate ? new Date().toISOString().slice(0, 16) : dateObj.toISOString().slice(0, 16)
                                                                                });
                                                                            }}
                                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                                        >
                                                                            <Edit2 size={13} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'PARADAS' && (
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
                                            <div className="p-4 border-b border-emerald-100 bg-emerald-50/30 flex justify-between items-center"><h4 className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2"><CheckCircle2 size={16} /> Programadas</h4></div>
                                            <div className="p-4">
                                                {!showAddStopProg ? (
                                                    <button onClick={() => setShowAddStopProg(true)} className="w-full py-3 border-2 border-dashed border-emerald-200 text-emerald-600 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-emerald-50 transition-colors mb-4 flex items-center justify-center gap-2"><PlusCircle size={14} /> Registrar Parada</button>
                                                ) : (
                                                    <div className="mb-4 bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 animate-in fade-in">
                                                        <div className="grid grid-cols-1 gap-4">
                                                            <div className="space-y-1"><label className="text-[9px] font-bold text-emerald-800/60 uppercase tracking-wider">Lugar / Motivo</label><input autoFocus className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs font-bold uppercase focus:border-emerald-400 outline-none" value={newStopForm.location} onChange={e => setNewStopForm({ ...newStopForm, location: e.target.value })} placeholder="Ej: ALMUERZO / GRIFO" /></div>

                                                            <div className="space-y-3">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1"><label className="text-[9px] font-bold text-emerald-800/60 uppercase tracking-wider">Inicio</label><input type="datetime-local" className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs font-bold focus:border-emerald-400 outline-none" value={newStopForm.start} onChange={e => setNewStopForm({ ...newStopForm, start: e.target.value })} /></div>
                                                                    {!isStopOngoing && <div className="space-y-1"><label className="text-[9px] font-bold text-emerald-800/60 uppercase tracking-wider">Fin</label><input type="datetime-local" className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs font-bold focus:border-emerald-400 outline-none" value={newStopForm.end} onChange={e => setNewStopForm({ ...newStopForm, end: e.target.value })} /></div>}
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1"><label className="text-[9px] font-bold text-emerald-800/60 uppercase tracking-wider">Latitud</label><input required onPaste={handleStopCoordPaste} placeholder="-8.13..." className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-400" value={newStopForm.lat} onChange={e => setNewStopForm({ ...newStopForm, lat: e.target.value })} /></div>
                                                                    <div className="space-y-1"><label className="text-[9px] font-bold text-emerald-800/60 uppercase tracking-wider">Longitud</label><input required onPaste={handleStopCoordPaste} placeholder="-79.0..." className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-400" value={newStopForm.lng} onChange={e => setNewStopForm({ ...newStopForm, lng: e.target.value })} /></div>
                                                                </div>
                                                                <div className="flex items-center gap-2 pt-2">
                                                                    <input type="checkbox" id="activeStopProg" className="w-4 h-4 text-emerald-600" checked={isStopOngoing} onChange={e => setIsStopOngoing(e.target.checked)} />
                                                                    <label htmlFor="activeStopProg" className="text-[10px] font-bold text-emerald-700 cursor-pointer">Parada en curso (Unidad Detenida)</label>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 mt-2">
                                                                <button onClick={() => setShowAddStopProg(false)} className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
                                                                <button onClick={() => handleAddStop('PROG')} className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider">Guardar Parada</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="space-y-2">
                                                    {selectedUnit.paradasProg.length === 0 && !showAddStopProg && <p className="text-center text-xs text-slate-400 italic py-2">Sin paradas registradas.</p>}
                                                    {(selectedUnit.paradasProg || []).map((stop, idx) => (
                                                        <div key={`prog-${idx}`} className={`bg-white p-3 rounded-lg border flex items-center justify-between ${!stop.end ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}>
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xs border border-emerald-100">{idx + 1}</div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-800 uppercase">{stop.location} {!stop.end && <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full ml-2 animate-pulse">ACTIVA</span>}</p>
                                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{formatDate(stop.start)} - {stop.end ? formatDate(stop.end) : 'EN CURSO'}</p>
                                                                    {stop.coords && <p className="text-[8px] font-mono text-slate-400">{stop.coords.lat}, {stop.coords.lng}</p>}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {!stop.end && <button onClick={() => initiateFinishStop('PROG', idx)} className="text-[9px] font-bold bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700 transition flex items-center gap-1"><PlayCircle size={10} /> FINALIZAR</button>}
                                                                <button onClick={() => handleDeleteStop('PROG', idx)} className="text-slate-300 hover:text-red-500 transition p-2"><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                                            <div className="p-4 border-b border-amber-100 bg-amber-50/30 flex justify-between items-center"><h4 className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2"><AlertTriangle size={16} /> No Programadas</h4></div>
                                            <div className="p-4">
                                                {!showAddStopNoProg ? (
                                                    <button onClick={() => setShowAddStopNoProg(true)} className="w-full py-3 border-2 border-dashed border-amber-200 text-amber-600 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-amber-50 transition-colors mb-4 flex items-center justify-center gap-2"><PlusCircle size={14} /> Registrar Incidencia</button>
                                                ) : (
                                                    <div className="mb-4 bg-amber-50/50 p-5 rounded-xl border border-amber-100 animate-in fade-in">
                                                        <div className="grid grid-cols-1 gap-4">
                                                            <div className="space-y-1"><label className="text-[9px] font-bold text-amber-800/60 uppercase tracking-wider">Ubicación</label><input autoFocus className="w-full p-3 bg-white border border-amber-200 rounded-lg text-xs font-bold uppercase focus:border-amber-400 outline-none" value={newStopForm.location} onChange={e => setNewStopForm({ ...newStopForm, location: e.target.value })} placeholder="Km / Ref" /></div>
                                                            <div className="space-y-1"><label className="text-[9px] font-bold text-amber-800/60 uppercase tracking-wider">Causa / Motivo</label><input className="w-full p-3 bg-white border border-amber-200 rounded-lg text-xs font-bold uppercase focus:border-amber-400 outline-none" value={newStopForm.cause} onChange={e => setNewStopForm({ ...newStopForm, cause: e.target.value })} placeholder="Falla Mecánica / Tráfico" /></div>
                                                            <div className="space-y-3">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1"><label className="text-[9px] font-bold text-amber-800/60 uppercase tracking-wider">Inicio</label><input type="datetime-local" className="w-full p-3 bg-white border border-amber-200 rounded-lg text-xs font-bold focus:border-amber-400 outline-none" value={newStopForm.start} onChange={e => setNewStopForm({ ...newStopForm, start: e.target.value })} /></div>
                                                                    {!isStopOngoing && <div className="space-y-1"><label className="text-[9px] font-bold text-amber-800/60 uppercase tracking-wider">Fin</label><input type="datetime-local" className="w-full p-3 bg-white border border-amber-200 rounded-lg text-xs font-bold focus:border-amber-400 outline-none" value={newStopForm.end} onChange={e => setNewStopForm({ ...newStopForm, end: e.target.value })} /></div>}
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1"><label className="text-[9px] font-bold text-amber-800/60 uppercase tracking-wider">Latitud</label><input required onPaste={handleStopCoordPaste} placeholder="-8.13..." className="w-full p-3 bg-white border border-amber-200 rounded-lg text-xs font-bold outline-none focus:border-amber-400" value={newStopForm.lat} onChange={e => setNewStopForm({ ...newStopForm, lat: e.target.value })} /></div>
                                                                    <div className="space-y-1"><label className="text-[9px] font-bold text-amber-800/60 uppercase tracking-wider">Longitud</label><input required onPaste={handleStopCoordPaste} placeholder="-79.0..." className="w-full p-3 bg-white border border-amber-200 rounded-lg text-xs font-bold outline-none focus:border-amber-400" value={newStopForm.lng} onChange={e => setNewStopForm({ ...newStopForm, lng: e.target.value })} /></div>
                                                                </div>
                                                                <div className="flex items-center gap-2 pt-2">
                                                                    <input type="checkbox" id="activeStopNoProg" className="w-4 h-4 text-amber-600" checked={isStopOngoing} onChange={e => setIsStopOngoing(e.target.checked)} />
                                                                    <label htmlFor="activeStopNoProg" className="text-[10px] font-bold text-amber-700 cursor-pointer">Incidente en curso (Unidad Detenida)</label>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 mt-2">
                                                                <button onClick={() => setShowAddStopNoProg(false)} className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
                                                                <button onClick={() => handleAddStop('NOPROG')} className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black uppercase tracking-widest">Guardar Incidencia</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="space-y-2">
                                                    {selectedUnit.paradasNoProg.length === 0 && !showAddStopNoProg && <p className="text-center text-xs text-slate-400 italic py-2">Sin incidencias registradas.</p>}
                                                    {(selectedUnit.paradasNoProg || []).map((stop, idx) => (
                                                        <div key={`noprog-${idx}`} className={`bg-white p-3 rounded-lg border flex items-center justify-between ${!stop.end ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}>
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-xs border border-amber-100">!</div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-800 uppercase">{stop.location} <span className="text-amber-600">({stop.cause})</span> {!stop.end && <span className="text-[9px] bg-amber-600 text-white px-2 py-0.5 rounded-full ml-2 animate-pulse">ACTIVA</span>}</p>
                                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{formatDate(stop.start)} - {stop.end ? formatDate(stop.end) : 'EN CURSO'}</p>
                                                                    {stop.coords && <p className="text-[8px] font-mono text-slate-400">{stop.coords.lat}, {stop.coords.lng}</p>}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {!stop.end && <button onClick={() => initiateFinishStop('NOPROG', idx)} className="text-[9px] font-bold bg-amber-600 text-white px-3 py-1.5 rounded hover:bg-amber-700 transition flex items-center gap-1"><PlayCircle size={10} /> RESOLVER</button>}
                                                                <button onClick={() => handleDeleteStop('NOPROG', idx)} className="text-slate-300 hover:text-red-500 transition p-2"><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'DETALLE' && (
                                    <div className="space-y-4">
                                        <div className="bg-white p-6 rounded-xl border border-slate-300">
                                            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Información de Carga</h5>
                                            <ul className="space-y-3">
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Operador</span><span className="text-xs font-bold text-slate-900 uppercase">{selectedUnit.operadorLogistico}</span></li>
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Booking</span><span className="text-xs font-bold text-slate-900 uppercase">{selectedUnit.booking}</span></li>
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tipo Envío</span><span className="text-xs font-bold text-slate-900 uppercase">{selectedUnit.tipoEnvio}</span></li>
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Proceso</span><span className="text-xs font-bold text-slate-900 uppercase">{selectedUnit.proceso}</span></li>
                                            </ul>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-300">
                                            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Unidad de Transporte</h5>
                                            <ul className="space-y-3">
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Transportista</span><span className="text-xs font-bold text-slate-900 uppercase">{selectedUnit.transportista}</span></li>
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tracto / Carreta</span><span className="text-xs font-bold text-slate-900 uppercase">{selectedUnit.plateRemolque} / {selectedUnit.plateSemiRemolque}</span></li>
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Conductor</span><span className="text-xs font-bold text-slate-900 uppercase">{selectedUnit.conductor}</span></li>
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Teléfono</span><span className="text-xs font-bold text-slate-900">{selectedUnit.telefono}</span></li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'RESUMEN' && (
                                    <div className="space-y-6">
                                        <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800">
                                            <div className="flex items-center justify-between">
                                                <div><h4 className="text-xl font-bold uppercase tracking-tight">{selectedUnit.plateRemolque}</h4><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{selectedUnit.transportista}</p></div>
                                                <div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ETA</p><p className="text-sm font-bold text-white">{new Date(selectedUnit.fechaEstimadaLlegada).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div>
                                            </div>
                                            <div className="mt-6 flex items-center justify-between gap-4">
                                                <div className="flex-1 bg-white/10 p-2.5 rounded-xl"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Origen</p><p className="text-[11px] font-bold uppercase truncate">{selectedUnit.origin}</p></div>
                                                <div className="text-slate-500">→</div>
                                                <div className="flex-1 bg-white/10 p-2.5 rounded-xl text-right"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Destino</p><p className="text-[11px] font-bold uppercase truncate">{selectedUnit.destination}</p></div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-4 rounded-xl border border-slate-300 text-center"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Controles</p><p className="text-2xl font-bold text-slate-900">{selectedUnit.controles.length}</p></div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-300 text-center"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Incidencias</p><p className="text-2xl font-bold text-amber-500">{selectedUnit.paradasNoProg.length}</p></div>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-300">
                                            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><LayoutList size={14} /> Bitácora de Viaje</h5>
                                            <div className="space-y-4">
                                                <div className="flex gap-3">
                                                    <div className="flex flex-col items-center"><div className="w-2 h-2 bg-slate-900 rounded-full"></div><div className="w-0.5 flex-1 bg-slate-200 my-1"></div></div>
                                                    <div className="pb-4"><p className="text-[9px] font-bold text-slate-400">{new Date(selectedUnit.fechaSalidaPlanta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p><p className="text-xs font-bold text-slate-900 uppercase">Inicio de Viaje</p><p className="text-[10px] text-slate-500 uppercase">{selectedUnit.origin}</p></div>
                                                </div>
                                                {(selectedUnit.controles || []).map((cp, idx) => {
                                                    const dateObj = new Date(cp.time);
                                                    const isInvalid = isNaN(dateObj.getTime());
                                                    const displayDate = isInvalid ? '' : dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                                                    const displayTime = isInvalid ? cp.time : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                                                    return (
                                                        <div key={`ctrl-${idx}`} className="flex gap-3">
                                                            <div className="flex flex-col items-center"><div className="w-2 h-2 bg-slate-400 rounded-full border border-white"></div><div className="w-0.5 flex-1 bg-slate-200 my-1"></div></div>
                                                            <div className="pb-4"><p className="text-[9px] font-bold text-slate-400">{displayDate} {displayTime}</p><p className="text-xs font-bold text-slate-700 uppercase">{cp.location}</p><p className="text-[9px] text-slate-400">Control de Paso #{idx + 1}</p></div>
                                                        </div>
                                                    );
                                                })}
                                                <div className="flex gap-3">
                                                    <div className="flex flex-col items-center"><div className="w-2.5 h-2.5 bg-[#1a73e8] rounded-full animate-pulse"></div></div>
                                                    <div><p className="text-[9px] font-bold text-[#1a73e8]">ACTUAL</p><p className="text-xs font-bold text-slate-900 uppercase">{selectedUnit.ubicacionActual}</p></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[100] animate-in fade-in">
                    <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center text-slate-700">
                                    <RouteIcon size={24} className="stroke-bold" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">{isEditMode ? 'Editar Registro' : 'Apertura de Operación'}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{isEditMode ? 'Modificación de Datos' : 'Registro de Nuevo Viaje'}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X size={20} /></button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-8 custom-scrollbar bg-slate-50/30">
                            <form onSubmit={handleSaveUnit} className="space-y-4">
                                <div className="bg-slate-50/80 p-6 rounded-[1.5rem] border-2 border-slate-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                                            <MapPin size={20} className="stroke-bold" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">Itinerario y Tiempos</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Definición de ruta</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormInput label="Origen" type="select" options={Array.from(new Set((routeMatrix || []).map(r => r.origen))).sort()} value={form.origin} onChange={v => setForm({ ...form, origin: v })} />
                                            <FormInput label="Destino (Zona)" type="select" options={form.origin ? Array.from(new Set((routeMatrix || []).filter(r => r.origen === form.origin).map(r => r.destino))).sort() : []} value={form.destination} onChange={v => setForm({ ...form, destination: v, almacenDestino1: '', almacenDestino2: '' })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormInput
                                                label="1er Punto de Llegada"
                                                type="select"
                                                options={destinations.filter(d => d.city_zone === form.destination && d.active).map(d => d.name)}
                                                value={form.almacenDestino1}
                                                onChange={v => setForm({ ...form, almacenDestino1: v })}
                                            />
                                            <FormInput
                                                label={(() => {
                                                    const dest1 = destinations.find(d => d.name === form.almacenDestino1);
                                                    if (dest1?.type === 'MUESTRAS') return "2do Punto de Llegada (Obligatorio)";
                                                    return "2do Punto de Llegada (Opcional)";
                                                })()}
                                                type="select"
                                                required={(() => {
                                                    const dest1 = destinations.find(d => d.name === form.almacenDestino1);
                                                    return dest1?.type === 'MUESTRAS';
                                                })()}
                                                options={(() => {
                                                    const dest1 = destinations.find(d => d.name === form.almacenDestino1);
                                                    let relevant = destinations.filter(d => d.city_zone === form.destination && d.active);

                                                    if (dest1) {
                                                        // Validacion cruzada: Si es descaga solo muestra muestras, si es muestras solo muestra descarga
                                                        if (dest1.type === 'DESCARGA') {
                                                            relevant = relevant.filter(d => d.type === 'MUESTRAS');
                                                        } else if (dest1.type === 'MUESTRAS') {
                                                            relevant = relevant.filter(d => d.type === 'DESCARGA');
                                                        }
                                                    }

                                                    return relevant.map(d => d.name);
                                                })()}
                                                value={form.almacenDestino2}
                                                onChange={v => setForm({ ...form, almacenDestino2: v })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormInput label="Ingreso Planta" type="datetime-local" value={form.fechaIngreso} onChange={v => setForm({ ...form, fechaIngreso: v })} error={formErrors.fechaIngreso} />
                                            <FormInput label="Salida Planta" type="datetime-local" value={form.fechaSalida} onChange={v => setForm({ ...form, fechaSalida: v })} error={formErrors.fechaSalida} />
                                        </div>
                                        <div className="col-span-2 grid grid-cols-3 gap-3">
                                            <FormInput label="ETA (Estimado Llegada)" type="datetime-local" value={form.eta} onChange={v => setForm({ ...form, eta: v })} error={formErrors.eta} />
                                            <FormInput
                                                label="Proceso"
                                                type="select"
                                                options={(() => {
                                                    const relevant = form.origin && form.destination
                                                        ? routeMatrix.filter(r => r.origen === form.origin && r.destino === form.destination)
                                                        : routeMatrix;
                                                    return Array.from(new Set(relevant.map(r => r.proceso))).filter(Boolean).sort();
                                                })()}
                                                value={form.proceso}
                                                onChange={v => setForm({ ...form, proceso: v })}
                                            />
                                            <FormInput
                                                label="Tipo Envío"
                                                type="select"
                                                options={(() => {
                                                    const relevant = form.origin && form.destination
                                                        ? routeMatrix.filter(r => r.origen === form.origin && r.destino === form.destination)
                                                        : routeMatrix;
                                                    return Array.from(new Set(relevant.map(r => r.tipo_envio))).filter(Boolean).sort();
                                                })()}
                                                value={form.tipoEnvio}
                                                onChange={v => setForm({ ...form, tipoEnvio: v })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50/80 p-6 rounded-[1.5rem] border-2 border-slate-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                                            <Package size={20} className="stroke-bold" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">Información Logística</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Datos de carga</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <DataFormInput
                                            label="Operador Logístico"
                                            placeholder="Buscar Operador..."
                                            options={transportEntities.operators.filter(o => o.active).map(o => o.name)}
                                            value={form.operador}
                                            onChange={v => setForm({ ...form, operador: v, transportista: '', plateRemolque: '', plateSemi: '', conductor: '' })} // Clear dependents
                                        />
                                        <FormInput label="Booking / Referencia" placeholder="Ej: BK-2024-001" value={form.booking} onChange={v => setForm({ ...form, booking: v })} />
                                    </div>
                                </div>

                                <div className="bg-slate-50/80 p-6 rounded-[1.5rem] border-2 border-slate-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                                            <Truck size={20} className="stroke-bold" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">Unidad de Transporte</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Datos del vehículo</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <DataFormInput
                                            label="Transportista"
                                            placeholder="Buscar Transportista..."
                                            options={(() => {
                                                const op = transportEntities.operators.find(o => o.name === form.operador);
                                                if (!op) return transportEntities.providers.filter(p => p.active).map(p => p.name); // Show all if no operator selected (optional, or empty)
                                                return transportEntities.providers.filter(p => p.active && p.operator_id === op.id).map(p => p.name);
                                            })()}
                                            value={form.transportista}
                                            onChange={v => setForm({ ...form, transportista: v })}
                                        />
                                        <DataFormInput
                                            label="Placa Tracto"
                                            placeholder="Buscar Placa..."
                                            options={(() => {
                                                const prov = transportEntities.providers.find(p => p.name === form.transportista);
                                                let relevant = transportEntities.units.filter(u => u.active && u.type === 'TRACTO');
                                                if (prov) relevant = relevant.filter(u => u.provider_id === prov.id);
                                                return relevant.map(u => u.plate);
                                            })()}
                                            value={form.plateRemolque}
                                            onChange={v => setForm({ ...form, plateRemolque: v })}
                                        />
                                        <DataFormInput
                                            label="Placa Semi-Remolque"
                                            placeholder="Buscar Placa..."
                                            options={(() => {
                                                const prov = transportEntities.providers.find(p => p.name === form.transportista);
                                                let relevant = transportEntities.units.filter(u => u.active && u.type === 'SEMIREMOLQUE');
                                                if (prov) relevant = relevant.filter(u => u.provider_id === prov.id);
                                                return relevant.map(u => u.plate);
                                            })()}
                                            value={form.plateSemi}
                                            onChange={v => setForm({ ...form, plateSemi: v })}
                                        />
                                        <DataFormInput
                                            label="Nombre Conductor"
                                            placeholder="Buscar Conductor..."
                                            options={(() => {
                                                const prov = transportEntities.providers.find(p => p.name === form.transportista);
                                                let relevant = transportEntities.drivers.filter(d => d.active);
                                                if (prov) relevant = relevant.filter(d => d.provider_id === prov.id);
                                                return relevant.map(d => d.name);
                                            })()}
                                            value={form.conductor}
                                            onChange={v => {
                                                // Auto-fill phone if driver selected
                                                const driver = transportEntities.drivers.find(d => d.name === v);
                                                setForm({ ...form, conductor: v, telefono: driver?.phone || form.telefono })
                                            }}
                                        />
                                        <FormInput label="Teléfono / Celular" placeholder="Ej: 999 888 777" value={form.telefono} onChange={v => setForm({ ...form, telefono: v })} />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all">Cancelar Operación</button>
                                    <button type="submit" className="bg-[#ff0000] text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2"><Save size={14} /> {isEditMode ? 'Guardar Cambios' : 'Iniciar Seguimiento'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {confirmCancelModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[100] animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200 border border-slate-100">
                        <div className="text-center space-y-4">
                            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Confirmar Cancelación</h3>
                                <p className="text-xs font-medium text-slate-500 mt-2">¿Desea cancelar el monitoreo registrado?</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button onClick={() => setConfirmCancelModal(false)} className="px-4 py-3 rounded-xl text-xs font-bold uppercase text-slate-500 hover:bg-slate-50 border border-slate-100 transition-all">No, continuar</button>
                                <button onClick={performCancelTrip} className="px-4 py-3 rounded-xl text-xs font-bold uppercase text-white bg-red-500 hover:bg-red-600 transition-all">Si, cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; } .leaflet-container { font-family: 'Inter', sans-serif; background: #f8fafc !important; } .custom-leaflet-tooltip { background: transparent; border: none; box-shadow: none; padding: 0; }`}</style>
            <Toast toast={toast} onClose={() => setToast(null)} />

            <ConfirmationModal
                open={alertConfig.open}
                onClose={() => setAlertConfig({ ...alertConfig, open: false })}
                onConfirm={() => setAlertConfig({ ...alertConfig, open: false })}
                title={alertConfig.title}
                variant={alertConfig.variant}
                confirmText="Entendido"
                cancelText=""
            >
                <div className="flex flex-col items-center gap-4 py-2">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${alertConfig.variant === 'danger' ? 'bg-red-50 text-red-500' : alertConfig.variant === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-500'}`}>
                        {alertConfig.variant === 'danger' ? <X size={32} /> : alertConfig.variant === 'warning' ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
                    </div>
                    <p className="text-sm font-bold text-slate-600 text-center leading-relaxed">
                        {alertConfig.message}
                    </p>
                </div>
            </ConfirmationModal>
        </div>
    );
};

const DataFormInput = ({ label, value, onChange, options = [], placeholder = "" }: { label: string, value: string, onChange: (v: string) => void, options: string[], placeholder?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="group space-y-1 w-full relative" ref={wrapperRef}>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-slate-700 transition-colors">{label}</label>
            <div className="relative">
                <input
                    type="text"
                    className="w-full p-2.5 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold uppercase outline-none focus:border-slate-900 transition-all text-slate-700 placeholder:text-slate-300 placeholder:font-normal"
                    value={isOpen ? search : value}
                    onChange={e => { setSearch(e.target.value); if (!isOpen) setIsOpen(true); }}
                    onFocus={() => { setIsOpen(true); setSearch(''); }}
                    placeholder={placeholder}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Search size={14} />
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 text-center italic">No hay resultados</div>
                        ) : (
                            filteredOptions.map((opt, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className="w-full text-left px-4 py-2 text-xs font-bold uppercase hover:bg-slate-50 transition-colors text-slate-700"
                                    onClick={() => {
                                        onChange(opt);
                                        setIsOpen(false);
                                        setSearch("");
                                    }}
                                >
                                    {opt}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const FormInput = ({ label, value, onChange, type = "text", options = [], placeholder = "", required = true, error }: { label: string, value: string, onChange: (v: string) => void, type?: string, options?: string[], placeholder?: string, required?: boolean, error?: string }) => (
    <div className="group space-y-1 w-full">
        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-slate-700 transition-colors">{label}</label>
        {type === 'select' ? (
            <div className="relative">
                <select required={required} className={`w-full p-2.5 bg-white border-2 ${error ? 'border-red-500' : 'border-slate-200 hover:border-slate-300'} rounded-xl text-xs font-bold uppercase outline-none focus:border-slate-900 transition-all text-slate-700 appearance-none cursor-pointer`} value={value} onChange={e => onChange(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {(options || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="8" height="5" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>
        ) : (
            <input
                required={required}
                type={type}
                className={`w-full p-2.5 bg-white border-2 ${error ? 'border-red-500' : 'border-slate-200 hover:border-slate-300'} rounded-xl text-xs font-bold uppercase outline-none focus:border-slate-900 transition-all text-slate-700 placeholder:text-slate-300 placeholder:font-normal`}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
            />
        )}
        {error && <p className="text-[9px] font-bold text-red-500 ml-1 mt-0.5 animate-in slide-in-from-top-1">{error}</p>}
    </div>
);
