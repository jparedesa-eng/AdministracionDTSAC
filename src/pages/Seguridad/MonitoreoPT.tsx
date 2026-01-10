
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UnitStatus } from '../types';
import type { TransportUnit, LatLng, StopPoint } from '../types';
import { getTravelTimesState, subscribeTravelTimes, fetchTravelTimes } from '../../store/travelTimesStore';
import { getDestinationsState, subscribeDestinations, fetchDestinations } from '../../store/destinationStore';
import { createUnit, updateUnit } from '../../store/monitoreoStore';
import { Toast } from '../../components/ui/Toast';
import type { ToastState } from '../../components/ui/Toast';
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
    ClipboardCopy,
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
    Loader2
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

    // State for Finish Stop Modal
    const [finishStopModal, setFinishStopModal] = useState<{ open: boolean, type: 'PROG' | 'NOPROG' | null, index: number | null, endDate: string }>({
        open: false,
        type: null,
        index: null,
        endDate: ''
    });

    // State for Finish Trip Modal
    const [finishTripModal, setFinishTripModal] = useState<{ open: boolean, date: string }>({
        open: false,
        date: ''
    });

    const mapRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const unitLayersRef = useRef<Record<string, { polyline: any, marker: any }>>({});

    const [toast, setToast] = useState<ToastState>(null);
    const [isExporting, setIsExporting] = useState(false);

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
            return date.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '');
        } catch (e) { return isoString; }
    };

    const filteredUnits = useMemo(() => {
        return units.filter(u => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                u.plateRemolque.toLowerCase().includes(searchLower) ||
                u.conductor.toLowerCase().includes(searchLower) ||
                u.transportista.toLowerCase().includes(searchLower) ||
                u.proceso.toLowerCase().includes(searchLower);

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
        const currentMap = mapRef.current;
        if (!currentMap) return;
        setTimeout(() => currentMap.invalidateSize(), 100);

        const activeBounds: any[] = [];

        units.forEach(unit => {
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
        <div class="px-2 py-1 bg-white border border-slate-300 rounded font-sans z-[1000]">
             <div class="text-[10px] font-black text-slate-900 leading-none mb-0.5 text-center">${unit.plateRemolque}</div>
             <div class="text-[8px] font-bold text-slate-500 truncate max-w-[100px] text-center">${unit.ubicacionActual}</div>
             ${isStopped ? `<div class="text-[8px] font-black text-red-600 text-center mt-1">${unit.status}</div>` : ''}
             ${needsAlert && !isArrived && !isStopped ? '<div class="text-[8px] font-black text-orange-500 text-center mt-1 animate-pulse">!ALERTA!</div>' : ''}
        </div>
      `;

            if (unitLayersRef.current[unit.id]) {
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
    }, [units, selectedUnitId]);

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
        const now = new Date();
        const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setFinishTripModal({ open: true, date: localIso });
    };

    const handleConfirmFinishTrip = async () => {
        if (!selectedUnitId || !finishTripModal.date) return;

        const now = new Date();
        const finishDate = new Date(finishTripModal.date);
        const unit = units.find(u => u.id === selectedUnitId);
        if (!unit) return;

        // VALIDATION FOR FINISH TRIP
        const departureDate = new Date(unit.fechaSalidaPlanta);
        const lastUpdateDate = new Date(unit.lastUpdate);

        if (finishDate < departureDate) { alert("ERROR: La fecha de llegada no puede ser anterior a la salida de planta."); return; }
        if (finishDate < lastUpdateDate) { alert("ERROR: La fecha de llegada no puede ser anterior al último reporte registrado."); return; }
        if (finishDate > now) { alert("ERROR: La fecha de llegada no puede ser futura."); return; }

        const formattedTime = finishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const finalCoords = DESTINATION_GPS;

        let newControles = [...unit.controles];
        newControles.push({
            time: formattedTime,
            location: 'LLEGADA A DESTINO',
            coords: finalCoords
        });

        // Update Path
        const pointsForRouting = [GLOBAL_ORIGIN, ...newControles.filter(c => c.coords).map(c => c.coords as LatLng)];
        const newPath = await fetchRoadRoute(pointsForRouting);

        const updatedUnit = {
            ...unit,
            status: UnitStatus.DELIVERED,
            ubicacionActual: 'LLEGADA A DESTINO',
            lastUpdate: finishDate.toISOString(),
            controles: newControles,
            path: newPath,
            // Metrics & Ratings
            fechaLlegadaDestino1: finishDate.toISOString(),
            tiempoTotal1: (() => {
                const totalMs = finishDate.getTime() - departureDate.getTime();
                const h = Math.floor(Math.floor(totalMs / 60000) / 60);
                const m = Math.floor(totalMs / 60000) % 60;
                return `${h}h ${m}m`;
            })(),
            tiempoNeto1: (() => {
                const totalMs = finishDate.getTime() - departureDate.getTime();
                const totalMins = Math.floor(totalMs / 60000);

                const stopsMins = [...unit.paradasProg, ...unit.paradasNoProg].reduce((acc, stop) => {
                    if (!stop.time) return acc;
                    let m = 0;
                    const hMatch = stop.time.match(/(\d+)h/);
                    const mMatch = stop.time.match(/(\d+)m/);
                    if (hMatch) m += parseInt(hMatch[1]) * 60;
                    if (mMatch) m += parseInt(mMatch[1]);
                    return acc + m;
                }, 0);

                const netMins = Math.max(0, totalMins - stopsMins);
                const h = Math.floor(netMins / 60);
                const m = netMins % 60;
                return `${h}h ${m}m`;
            })(),
            calificacionTTotal: (() => {
                const parse = (s: string) => {
                    if (!s) return 0;
                    const parts = s.split(':').map(Number);
                    return (parts[0] * 60) + (parts[1] || 0);
                };
                const min = parse(unit.tiempoTransitoMin);
                const max = parse(unit.tiempoTransitoMax);

                const totalMs = finishDate.getTime() - departureDate.getTime();
                const totalMins = Math.floor(totalMs / 60000);

                if (min === 0 && max === 0) return 'PENDIENTE';
                if (totalMins < min) return 'EXCELENTE';
                if (totalMins > max) return 'DEFICIENTE';
                return 'BUENO';
            })(),
            calificacionTNeto: (() => {
                const parse = (s: string) => {
                    if (!s) return 0;
                    const parts = s.split(':').map(Number);
                    return (parts[0] * 60) + (parts[1] || 0);
                };
                const min = parse(unit.tiempoTransitoMin);
                const max = parse(unit.tiempoTransitoMax);

                const totalMs = finishDate.getTime() - departureDate.getTime();
                const totalMins = Math.floor(totalMs / 60000);
                const stopsMins = [...unit.paradasProg, ...unit.paradasNoProg].reduce((acc, stop) => {
                    if (!stop.time) return acc;
                    let m = 0;
                    const hMatch = stop.time.match(/(\d+)h/);
                    const mMatch = stop.time.match(/(\d+)m/);
                    if (hMatch) m += parseInt(hMatch[1]) * 60;
                    if (mMatch) m += parseInt(mMatch[1]);
                    return acc + m;
                }, 0);
                const netMins = Math.max(0, totalMins - stopsMins);

                if (min === 0 && max === 0) return 'PENDIENTE';
                if (netMins < min) return 'EXCELENTE';
                if (netMins > max) return 'DEFICIENTE';
                return 'BUENO';
            })()
        };

        await updateUnit(unit.id, updatedUnit);
        setFinishTripModal({ open: false, date: '' });
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
        setForm({
            unitName: selectedUnit.unitName || '',
            proceso: selectedUnit.proceso || '',
            fechaIngreso: (selectedUnit.fechaIngresoPlanta || '').slice(0, 16),
            fechaSalida: selectedUnit.fechaSalidaPlanta.slice(0, 16),
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
            eta: (selectedUnit.fechaEstimadaLlegada || '').slice(0, 16),
            almacenDestino1: selectedUnit.almacenDestino1 || '',
            almacenDestino2: selectedUnit.almacenDestino2 || ''
        });
        setIsEditMode(true);
        setIsAddModalOpen(true);
    };



    const handleSaveUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        const ingresoDate = new Date(form.fechaIngreso);
        const salidaDate = new Date(form.fechaSalida);
        const etaDate = new Date(form.eta);
        const now = new Date();
        const matched = routeMatrix.find(r => r.origen === form.origin && r.destino === form.destination);

        // VALIDATION LOGIC FOR NEW/EDIT UNIT
        if (ingresoDate > now) { alert("ERROR: La fecha de ingreso a planta no puede ser futura."); return; }
        if (salidaDate < ingresoDate) { alert("ERROR: La fecha de salida no puede ser anterior al ingreso."); return; }
        if (salidaDate > now) { alert("ERROR: La fecha de salida no puede ser futura."); return; }
        if (etaDate < salidaDate) { alert("ERROR: La fecha estimada de llegada no puede ser anterior a la salida de planta."); return; }

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
                    almacenDestino1: form.destination,
                    fechaLlegadaDestino1: '',
                    tiempoTotal1: '',
                    tiempoNeto1: '',
                    almacenDestino2: '',
                    fechaLlegadaDestino2: '',
                    tiempoTotal2: '',
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
                    cumplimiento: 'PENDIENTE',
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
            alert("Error al guardar la unidad. Por favor intente nuevamente.");
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
            alert("⚠️ ACCIÓN REQUERIDA:\n\nLa unidad se encuentra en estado de DETENCIÓN (Parada/Incidente).\n\nDebe registrar el FIN DE PARADA en la pestaña 'Paradas' antes de reportar una nueva ubicación de ruta.");
            setActiveTab('PARADAS');
            return;
        }

        const nLat = parseFloat(reportForm.lat);
        const nLng = parseFloat(reportForm.lng);
        if (isNaN(nLat) || isNaN(nLng)) { alert("Coordenadas inválidas"); return; }

        const reportDateTime = new Date(reportForm.reportDateTime);
        const now = new Date();
        const departureDate = new Date(u.fechaSalidaPlanta);
        const lastUpdateDate = new Date(u.lastUpdate);

        // DATE VALIDATION FOR CONTROLS
        if (reportDateTime < departureDate) { alert("ERROR: La fecha del control no puede ser anterior a la salida de planta."); return; }
        if (reportDateTime > now) { alert("ERROR: La fecha del control no puede ser futura."); return; }
        // Ensure chronological order relative to the last recorded update
        if (reportDateTime < lastUpdateDate && editingControlIndex === null) {
            alert("ERROR: La fecha del nuevo control no puede ser anterior al último reporte registrado (Secuencialidad).");
            return;
        }

        const newPoint: LatLng = { lat: nLat, lng: nLng };
        const formattedTime = reportDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let newControles = [...u.controles];
        if (editingControlIndex !== null) {
            newControles[editingControlIndex] = {
                ...newControles[editingControlIndex],
                location: reportForm.location.toUpperCase(),
                coords: newPoint
            };
        } else {
            newControles.push({
                time: formattedTime,
                location: reportForm.location.toUpperCase(),
                coords: newPoint
            });
        }
        const pointsForRouting = [GLOBAL_ORIGIN, ...newControles.filter(c => c.coords).map(c => c.coords as LatLng)];
        const newPath = await fetchRoadRoute(pointsForRouting);

        await updateUnit(u.id, {
            ...u,
            controles: newControles,
            ubicacionActual: reportForm.location.toUpperCase(),
            lastLocation: reportForm.location.toUpperCase(),
            lastUpdate: reportDateTime.toISOString(),
            path: newPath
        });

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
        if (startTime < departureTime) { alert("ERROR: El inicio de la parada no puede ser anterior a la salida de planta."); return; }
        if (startTime > now) { alert("ERROR: El inicio de la parada no puede ser una fecha futura."); return; }

        // VALIDATION FOR STOP END (IF NOT ONGOING)
        if (!isStopOngoing) {
            const endTime = new Date(newStopForm.end);
            if (endTime < startTime) { alert("ERROR: La hora de fin debe ser mayor a la hora de inicio."); return; }
            if (endTime > now) { alert("ERROR: La hora de fin no puede ser futura."); return; }
        }

        const formatTime = (iso: string) => {
            if (!iso) return '';
            const d = new Date(iso);
            return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        };

        const nLat = newStopForm.lat ? parseFloat(newStopForm.lat) : undefined;
        const nLng = newStopForm.lng ? parseFloat(newStopForm.lng) : undefined;
        const coords = (nLat && nLng) ? { lat: nLat, lng: nLng } : undefined;

        const newStatus = isStopOngoing ? (type === 'PROG' ? 'EN PARADA' : 'INCIDENTE') : u.status;

        const newStop: StopPoint = {
            location: newStopForm.location.toUpperCase(),
            start: formatTime(newStopForm.start),
            end: isStopOngoing ? '' : formatTime(newStopForm.end),
            time: isStopOngoing ? 'En Curso' : calculateDuration(newStopForm.start, newStopForm.end),
            cause: type === 'NOPROG' ? newStopForm.cause?.toUpperCase() : undefined,
            coords: coords
        };

        await updateUnit(u.id, {
            ...u,
            status: newStatus,
            [type === 'PROG' ? 'paradasProg' : 'paradasNoProg']: [...(type === 'PROG' ? u.paradasProg : u.paradasNoProg), newStop]
        });

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
        if (endDateObj > now) { alert("ERROR: La fecha de fin no puede ser futura."); return; }

        // Re-format end date for display
        const formatTimeDisplay = (d: Date) => `${d.getDate()}/${d.getMonth() + 1} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

        const currentList = type === 'PROG' ? [...u.paradasProg] : [...u.paradasNoProg];
        let durationStr = 'Finalizado';
        try {
            const [datePart, timePart] = currentList[index].start.split(' ');
            const [day, month] = datePart.split('/').map(Number);
            const [hour, min] = timePart.split(':').map(Number);
            const startObj = new Date(new Date().getFullYear(), month - 1, day, hour, min);

            if (endDateObj < startObj) {
                alert("ADVERTENCIA: La fecha de fin parece ser anterior al inicio. Verifique.");
            }

            let diff = (endDateObj.getTime() - startObj.getTime()) / 60000;
            if (diff > 0) {
                const h = Math.floor(diff / 60);
                const m = Math.floor(diff % 60);
                durationStr = `${h}h ${m}m`;
            }
        } catch (e) { }

        currentList[index] = {
            ...currentList[index],
            end: formatTimeDisplay(endDateObj),
            time: durationStr
        };

        await updateUnit(u.id, {
            ...u,
            status: UnitStatus.TRANSIT, // Back to route
            [type === 'PROG' ? 'paradasProg' : 'paradasNoProg']: currentList
        });

        setFinishStopModal({ open: false, type: null, index: null, endDate: '' });
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
            ...u,
            status: newStatus,
            [type === 'PROG' ? 'paradasProg' : 'paradasNoProg']: list
        });
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
        <div className="flex flex-col h-[calc(100vh-140px)] gap-4 animate-in fade-in duration-200">

            {/* HEADER */}
            <div className="flex justify-between items-center px-4 py-3 shrink-0">
                <div className="px-1 flex items-center gap-4">
                    <div className="h-14 w-14 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                        <Monitor size={30} className="stroke-bold" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Terminal de Monitoreo SOC</h1>
                        <p className="text-sm text-gray-500 mt-1">Seguimiento de Flota en Ruta</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExportReport} disabled={isExporting} className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                        {isExporting ? 'Generando...' : 'Reporte Ruta'}
                    </button>
                    <button onClick={() => { setIsEditMode(false); setForm({ ...form, plateRemolque: '' }); setIsAddModalOpen(true); }} className="bg-[#ff0000] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all">
                        <Plus size={16} /> Nueva Apertura
                    </button>
                </div>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex flex-1 min-h-0 gap-4 overflow-hidden">

                {/* LISTA TARJETAS (HORIZONTAL) */}
                <div className="w-[65%] flex flex-col gap-3">
                    <div className="bg-white p-2 rounded-xl border border-slate-300 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto custom-scrollbar border border-slate-200">
                            <button onClick={() => setStatusFilter('TRANSIT')} className={`whitespace-nowrap px-4 py-1.5 rounded-md text-[10px] font-black uppercase outline-none transition-colors ${statusFilter === 'TRANSIT' ? 'bg-white text-blue-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700 border border-transparent'}`}>En Ruta</button>
                            <button onClick={() => setStatusFilter('ALL')} className={`whitespace-nowrap px-4 py-1.5 rounded-md text-[10px] font-black uppercase outline-none transition-colors ${statusFilter === 'ALL' ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-700 border border-transparent'}`}>Todos</button>
                            <button onClick={() => setStatusFilter('ARRIVED')} className={`whitespace-nowrap px-4 py-1.5 rounded-md text-[10px] font-black uppercase outline-none transition-colors ${statusFilter === 'ARRIVED' ? 'bg-white text-emerald-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700 border border-transparent'}`}>Llegados</button>
                            <button onClick={() => setStatusFilter('CANCELLED')} className={`whitespace-nowrap px-4 py-1.5 rounded-md text-[10px] font-black uppercase outline-none transition-colors ${statusFilter === 'CANCELLED' ? 'bg-white text-rose-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700 border border-transparent'}`}>Cancelados</button>
                        </div>

                        {(statusFilter === 'ALL' || statusFilter === 'ARRIVED' || statusFilter === 'CANCELLED') && (
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-lg">
                                <div className="flex items-center gap-1 px-2 text-slate-400">
                                    <CalendarRange size={14} />
                                </div>
                                <input type="date" className="bg-transparent text-[10px] font-bold text-slate-600 outline-none w-24" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
                                <span className="text-slate-300">-</span>
                                <input type="date" className="bg-transparent text-[10px] font-bold text-slate-600 outline-none w-24" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
                            </div>
                        )}

                        <div className="flex-1 relative w-full md:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input type="text" placeholder="Buscar placa, conductor, booking..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:bg-white focus:border-slate-400 transition-all" />
                        </div>
                    </div>

                    <div className="bg-slate-100/50 rounded-xl overflow-y-auto custom-scrollbar p-2 space-y-3 flex-1 border border-slate-200">
                        {(filteredUnits || []).map(unit => {
                            const needsAlert = checkMonitoringAlert(unit.lastUpdate);
                            const isArrived = unit.status === UnitStatus.DELIVERED;
                            const isSelected = selectedUnitId === unit.id;
                            const isCancelled = unit.status === 'CANCELADO';
                            const isStopped = unit.status === 'EN PARADA' || unit.status === 'INCIDENTE';

                            const cardClasses = `
                        bg-white rounded-lg p-4 cursor-pointer transition-all duration-200 relative group overflow-hidden flex flex-col justify-between
                        ${isSelected ? 'border-l-[6px] border-l-[#1a73e8] border border-slate-300 z-10' : 'border border-slate-300 border-l-[6px] border-l-transparent hover:border-slate-400'}
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
                                                <h3 className={`text-sm font-black uppercase ${isSelected ? 'text-[#1a73e8]' : 'text-slate-800'}`}>
                                                    {unit.plateRemolque}
                                                </h3>
                                                {unit.plateSemiRemolque && unit.plateSemiRemolque !== 'N/A' && (
                                                    <span className="text-xs font-bold text-slate-400 uppercase">/ {unit.plateSemiRemolque}</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[140px]">{unit.transportista}</p>
                                            <div className="flex gap-1 mt-1">
                                                <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[8px] font-black uppercase tracking-wider">{unit.proceso}</span>
                                                <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${unit.status === UnitStatus.TRANSIT ? 'bg-blue-100 text-blue-700' : isStopped ? 'bg-red-100 text-red-700 animate-pulse' : unit.status === UnitStatus.DELIVERED ? 'bg-emerald-100 text-emerald-700' : isCancelled ? 'bg-slate-200 text-slate-600' : 'bg-slate-200 text-slate-700'}`}>
                                                    {typeof unit.status === 'string' ? unit.status : 'Desconocido'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex-1 border-l border-slate-100 pl-4 flex flex-col justify-center gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                                <span className="text-[10px] font-black text-slate-700 uppercase truncate">{unit.origin}</span>
                                                <div className="h-[1px] bg-slate-200 flex-1"></div>
                                                <span className="text-[10px] font-black text-slate-700 uppercase truncate">{unit.destination}</span>
                                                <div className={`w-1.5 h-1.5 rounded-full ${isArrived ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                            </div>
                                            <div className="flex justify-between">
                                                <div>
                                                    <span className="text-[7px] font-bold text-slate-400 uppercase block">SALIDA</span>
                                                    <span className="text-[9px] font-bold text-slate-600">{formatDate(unit.fechaSalidaPlanta)}</span>
                                                </div>
                                                <div className="text-right">

                                                </div>
                                            </div>
                                        </div>

                                        <div className="min-w-[130px] border-l border-slate-100 pl-4 flex flex-col justify-center gap-1">
                                            <div>
                                                <span className="text-[7px] font-bold text-slate-400 uppercase block">CONDUCTOR</span>
                                                <span className="text-[9px] font-bold text-slate-800 truncate block max-w-[120px]" title={unit.conductor}>{unit.conductor.split(' ')[0]}</span>
                                            </div>
                                            <div>
                                                <span className="text-[7px] font-bold text-slate-400 uppercase block">TELÉFONO</span>
                                                <span className="text-[9px] font-bold text-slate-800 truncate block">{unit.telefono}</span>
                                            </div>
                                            <div>
                                                <span className="text-[7px] font-bold text-slate-400 uppercase block">TIPO ENVÍO</span>
                                                <span className="text-[9px] font-bold text-slate-800 truncate block">{unit.tipoEnvio}</span>
                                            </div>
                                        </div>

                                        <div className="min-w-[140px] flex flex-col justify-center gap-2 text-right">
                                            <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                                                <span className="text-[7px] font-bold text-slate-400 uppercase block mb-0.5">ÚLTIMA UBICACIÓN ({formatDate(unit.lastUpdate).split(' ')[1] || ''})</span>
                                                <span className="text-[9px] font-black text-slate-800 uppercase leading-tight block truncate max-w-[130px] ml-auto">{unit.ubicacionActual}</span>
                                            </div>
                                            <div className="bg-blue-50 p-1.5 rounded border border-blue-200">
                                                <span className="text-[7px] font-bold text-blue-400 uppercase block mb-0.5">ESTIMADO LLEGADA</span>
                                                <span className="text-[10px] font-black text-blue-700 block transition-all hover:scale-105 cursor-default">
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

                <div className="w-[35%] bg-white rounded-xl border border-slate-300 overflow-hidden relative min-h-0">
                    <div ref={mapContainerRef} className="w-full h-full z-0" />
                    <div className="absolute top-4 left-4 z-[1] bg-white/95 px-3 py-2 rounded-lg border border-slate-300 pointer-events-none">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-[#ff0000] rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase text-slate-900">Mapa SOC</span>
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
                                    Se registrará automáticamente la ubicación de llegada en destino (GPS Sede).
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora de Llegada</label>
                                <input
                                    type="datetime-local"
                                    className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-[#ff0000]"
                                    value={finishTripModal.date}
                                    onChange={(e) => setFinishTripModal({ ...finishTripModal, date: e.target.value })}
                                />
                            </div>
                            <button
                                onClick={handleConfirmFinishTrip}
                                className="w-full py-3 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                            >
                                Confirmar Cierre de Viaje
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
                                        <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center border border-slate-700 shrink-0"><Truck size={24} /></div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 uppercase leading-none">{selectedUnit.unitName}</h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[9px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500 uppercase">{selectedUnit.proceso}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{selectedUnit.conductor}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsDetailOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors"><X size={20} /></button>
                                </div>

                                {selectedUnit.status !== UnitStatus.DELIVERED && selectedUnit.status !== 'CANCELADO' && (
                                    <div className="flex gap-2">
                                        <button onClick={handleEditUnit} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"><Edit3 size={14} /> Editar Registro</button>
                                        <button onClick={handleInitiateFinishTrip} className="flex-1 bg-slate-900 hover:bg-black text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"><Flag size={14} /> Finalizar</button>
                                        <button onClick={handleCancelTrip} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all" title="Cancelar Viaje por Error"><Ban size={14} /></button>
                                    </div>
                                )}
                                {(selectedUnit.status === UnitStatus.DELIVERED || selectedUnit.status === 'CANCELADO') && (
                                    <div className="bg-slate-100 p-3 rounded-lg text-center border border-slate-200"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Viaje Cerrado: {selectedUnit.status}</p></div>
                                )}
                            </div>

                            <div className="flex border-b border-slate-200 px-2 bg-white shrink-0">
                                <button onClick={() => setActiveTab('CONTROLES')} className={`flex-1 py-3 text-[10px] font-black uppercase border-b-2 transition-all ${activeTab === 'CONTROLES' ? 'border-[#ff0000] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Geolocalización</button>
                                <button onClick={() => setActiveTab('PARADAS')} className={`flex-1 py-3 text-[10px] font-black uppercase border-b-2 transition-all ${activeTab === 'PARADAS' ? 'border-[#ff0000] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Paradas</button>
                                <button onClick={() => setActiveTab('DETALLE')} className={`flex-1 py-3 text-[10px] font-black uppercase border-b-2 transition-all ${activeTab === 'DETALLE' ? 'border-[#ff0000] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Info. Carga</button>
                                <button onClick={() => setActiveTab('RESUMEN')} className={`flex-1 py-3 text-[10px] font-black uppercase border-b-2 transition-all ${activeTab === 'RESUMEN' ? 'border-[#ff0000] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Resumen</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                                {activeTab === 'CONTROLES' && (
                                    <div className="space-y-6">
                                        <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2"><Locate size={16} className="text-[#ff0000]" /> {editingControlIndex !== null ? `Corrección Control #${editingControlIndex + 1}` : 'Registrar Nuevo Control'}</h4>
                                                <div className="flex items-center gap-2 text-[9px] text-white/40"><ClipboardCopy size={12} /> Pegar coord. con coma</div>
                                            </div>
                                            {(selectedUnit.status === 'EN PARADA' || selectedUnit.status === 'INCIDENTE') ? (
                                                <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-4 flex items-start gap-3">
                                                    <AlertTriangle className="text-orange-600 shrink-0" size={20} />
                                                    <div>
                                                        <h4 className="text-xs font-black text-orange-800 uppercase">Unidad Detenida</h4>
                                                        <p className="text-[10px] text-orange-700 mt-1">
                                                            No se pueden registrar controles de ruta mientras la unidad está en parada activa.
                                                            <br />
                                                            <strong>Por favor, finalice la parada primero.</strong>
                                                        </p>
                                                        <button onClick={() => setActiveTab('PARADAS')} className="mt-2 text-[9px] font-black underline text-orange-900 uppercase tracking-widest">Ir a Paradas →</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <form onSubmit={handleUpdateControl} className="grid grid-cols-1 gap-4">
                                                    <div className="space-y-1"><label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Fecha y Hora Reporte</label><input type="datetime-local" required className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-xs font-bold outline-none focus:border-[#ff0000] text-white" value={reportForm.reportDateTime} onChange={e => setReportForm({ ...reportForm, reportDateTime: e.target.value })} /></div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1"><label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Latitud</label><input required onPaste={handleCoordPaste} placeholder="-8.13..." className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-xs font-bold outline-none focus:border-[#ff0000]" value={reportForm.lat} onChange={e => setReportForm({ ...reportForm, lat: e.target.value })} /></div>
                                                        <div className="space-y-1"><label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Longitud</label><input required onPaste={handleCoordPaste} placeholder="-79.0..." className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-xs font-bold outline-none focus:border-[#ff0000]" value={reportForm.lng} onChange={e => setReportForm({ ...reportForm, lng: e.target.value })} /></div>
                                                    </div>
                                                    <div className="space-y-1"><label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Ubicación Actual</label><input required placeholder="CIUDAD / KM / PEAJE" className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-xs font-bold outline-none uppercase focus:border-[#ff0000]" value={reportForm.location} onChange={e => setReportForm({ ...reportForm, location: e.target.value })} /></div>
                                                    <button type="submit" className="w-full py-3 bg-[#ff0000] hover:bg-red-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">{editingControlIndex !== null ? 'Actualizar' : 'Reportar Ubicación'}</button>
                                                </form>
                                            )}
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-300">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock size={14} /> Historial de Ruta</h4>
                                            {selectedUnit.controles.length === 0 ? (<div className="text-center py-8 text-slate-400 text-xs italic">Aún no se han registrado controles de ruta.</div>) : (
                                                <div className="space-y-0 pl-2">
                                                    {selectedUnit.controles.map((cp, idx) => (
                                                        <div key={idx} className="relative pl-8 pb-8 last:pb-0 border-l border-slate-200 last:border-0 group">
                                                            <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-[#ff0000] border-2 border-white group-hover:scale-125 transition-transform" />
                                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex justify-between items-start">
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1"><span className="text-[9px] font-black bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">CP-{idx + 1}</span><span className="text-[10px] font-bold text-slate-500">{cp.time}</span></div>
                                                                    <p className="text-xs font-black text-slate-800 uppercase">{cp.location}</p>
                                                                    <p className="text-[9px] font-mono text-slate-400 mt-0.5">{cp.coords?.lat}, {cp.coords?.lng}</p>
                                                                </div>
                                                                <button onClick={() => { setEditingControlIndex(idx); setReportForm({ ...reportForm, location: cp.location, lat: cp.coords?.lat.toString() || '', lng: cp.coords?.lng.toString() || '', reportDateTime: new Date().toISOString().slice(0, 16) }); }} className="p-1.5 text-slate-400 hover:text-[#ff0000] bg-white rounded border border-slate-200"><Edit2 size={12} /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'PARADAS' && (
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
                                            <div className="p-4 border-b border-emerald-100 bg-emerald-50/30 flex justify-between items-center"><h4 className="text-[11px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 size={16} /> Programadas</h4></div>
                                            <div className="p-4">
                                                {!showAddStopProg ? (
                                                    <button onClick={() => setShowAddStopProg(true)} className="w-full py-3 border-2 border-dashed border-emerald-200 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-50 transition-colors mb-4 flex items-center justify-center gap-2"><PlusCircle size={14} /> Registrar Parada</button>
                                                ) : (
                                                    <div className="mb-4 bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 animate-in fade-in">
                                                        <div className="grid grid-cols-1 gap-4">
                                                            <div className="space-y-1"><label className="text-[9px] font-black text-emerald-800/60 uppercase tracking-widest">Lugar / Motivo</label><input autoFocus className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs font-bold uppercase focus:border-emerald-400 outline-none" value={newStopForm.location} onChange={e => setNewStopForm({ ...newStopForm, location: e.target.value })} placeholder="Ej: ALMUERZO / GRIFO" /></div>

                                                            <div className="space-y-3">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1"><label className="text-[9px] font-black text-emerald-800/60 uppercase tracking-widest">Inicio</label><input type="datetime-local" className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs font-bold focus:border-emerald-400 outline-none" value={newStopForm.start} onChange={e => setNewStopForm({ ...newStopForm, start: e.target.value })} /></div>
                                                                    {!isStopOngoing && <div className="space-y-1"><label className="text-[9px] font-black text-emerald-800/60 uppercase tracking-widest">Fin</label><input type="datetime-local" className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs font-bold focus:border-emerald-400 outline-none" value={newStopForm.end} onChange={e => setNewStopForm({ ...newStopForm, end: e.target.value })} /></div>}
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1"><label className="text-[9px] font-black text-emerald-800/60 uppercase tracking-widest">Latitud</label><input required onPaste={handleStopCoordPaste} placeholder="-8.13..." className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-400" value={newStopForm.lat} onChange={e => setNewStopForm({ ...newStopForm, lat: e.target.value })} /></div>
                                                                    <div className="space-y-1"><label className="text-[9px] font-black text-emerald-800/60 uppercase tracking-widest">Longitud</label><input required onPaste={handleStopCoordPaste} placeholder="-79.0..." className="w-full p-3 bg-white border border-emerald-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-400" value={newStopForm.lng} onChange={e => setNewStopForm({ ...newStopForm, lng: e.target.value })} /></div>
                                                                </div>
                                                                <div className="flex items-center gap-2 pt-2">
                                                                    <input type="checkbox" id="activeStopProg" className="w-4 h-4 text-emerald-600" checked={isStopOngoing} onChange={e => setIsStopOngoing(e.target.checked)} />
                                                                    <label htmlFor="activeStopProg" className="text-[10px] font-bold text-emerald-700 cursor-pointer">Parada en curso (Unidad Detenida)</label>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 mt-2">
                                                                <button onClick={() => setShowAddStopProg(false)} className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
                                                                <button onClick={() => handleAddStop('PROG')} className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase tracking-widest">Guardar Parada</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="space-y-2">
                                                    {selectedUnit.paradasProg.length === 0 && !showAddStopProg && <p className="text-center text-xs text-slate-400 italic py-2">Sin paradas registradas.</p>}
                                                    {(selectedUnit.paradasProg || []).map((stop, idx) => (
                                                        <div key={`prog-${idx}`} className={`bg-white p-3 rounded-lg border flex items-center justify-between ${!stop.end ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}>
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xs border border-emerald-100">{idx + 1}</div>
                                                                <div>
                                                                    <p className="text-xs font-black text-slate-800 uppercase">{stop.location} {!stop.end && <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full ml-2 animate-pulse">ACTIVA</span>}</p>
                                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{stop.start} - {stop.end || 'EN CURSO'}</p>
                                                                    {stop.coords && <p className="text-[8px] font-mono text-slate-400">{stop.coords.lat}, {stop.coords.lng}</p>}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {!stop.end && <button onClick={() => initiateFinishStop('PROG', idx)} className="text-[9px] font-black bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700 transition flex items-center gap-1"><PlayCircle size={10} /> FINALIZAR</button>}
                                                                <button onClick={() => handleDeleteStop('PROG', idx)} className="text-slate-300 hover:text-red-500 transition p-2"><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                                            <div className="p-4 border-b border-amber-100 bg-amber-50/30 flex justify-between items-center"><h4 className="text-[11px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={16} /> No Programadas (Incidencias)</h4></div>
                                            <div className="p-4">
                                                {!showAddStopNoProg ? (
                                                    <button onClick={() => setShowAddStopNoProg(true)} className="w-full py-3 border-2 border-dashed border-amber-200 text-amber-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-50 transition-colors mb-4 flex items-center justify-center gap-2"><PlusCircle size={14} /> Registrar Incidencia</button>
                                                ) : (
                                                    <div className="mb-4 bg-amber-50/50 p-5 rounded-xl border border-amber-100 animate-in fade-in">
                                                        <div className="grid grid-cols-1 gap-4">
                                                            <div className="space-y-1"><label className="text-[9px] font-black text-amber-800/60 uppercase tracking-widest">Ubicación</label><input autoFocus className="w-full p-3 bg-white border border-amber-200 rounded-lg text-xs font-bold uppercase focus:border-amber-400 outline-none" value={newStopForm.location} onChange={e => setNewStopForm({ ...newStopForm, location: e.target.value })} placeholder="Km / Ref" /></div>
                                                            <div className="space-y-1"><label className="text-[9px] font-black text-amber-800/60 uppercase tracking-widest">Causa / Motivo</label><input className="w-full p-3 bg-white border border-amber-200 rounded-lg text-xs font-bold uppercase focus:border-amber-400 outline-none" value={newStopForm.cause} onChange={e => setNewStopForm({ ...newStopForm, cause: e.target.value })} placeholder="Falla Mecánica / Tráfico" /></div>
                                                            <div className="space-y-3">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1"><label className="text-[9px] font-black text-amber-800/60 uppercase tracking-widest">Inicio</label><input type="datetime-local" className="w-full p-3 bg-white border border-amber-200 rounded-lg text-xs font-bold focus:border-amber-400 outline-none" value={newStopForm.start} onChange={e => setNewStopForm({ ...newStopForm, start: e.target.value })} /></div>
                                                                    {!isStopOngoing && <div className="space-y-1"><label className="text-[9px] font-black text-amber-800/60 uppercase tracking-widest">Fin</label><input type="datetime-local" className="w-full p-3 bg-white border border-amber-200 rounded-lg text-xs font-bold focus:border-amber-400 outline-none" value={newStopForm.end} onChange={e => setNewStopForm({ ...newStopForm, end: e.target.value })} /></div>}
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1"><label className="text-[9px] font-black text-amber-800/60 uppercase tracking-widest">Latitud</label><input required onPaste={handleStopCoordPaste} placeholder="-8.13..." className="w-full p-3 bg-white border border-amber-200 rounded-lg text-xs font-bold outline-none focus:border-amber-400" value={newStopForm.lat} onChange={e => setNewStopForm({ ...newStopForm, lat: e.target.value })} /></div>
                                                                    <div className="space-y-1"><label className="text-[9px] font-black text-amber-800/60 uppercase tracking-widest">Longitud</label><input required onPaste={handleStopCoordPaste} placeholder="-79.0..." className="w-full p-3 bg-white border border-amber-200 rounded-lg text-xs font-bold outline-none focus:border-amber-400" value={newStopForm.lng} onChange={e => setNewStopForm({ ...newStopForm, lng: e.target.value })} /></div>
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
                                                                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-black text-xs border border-amber-100">!</div>
                                                                <div>
                                                                    <p className="text-xs font-black text-slate-800 uppercase">{stop.location} <span className="text-amber-600">({stop.cause})</span> {!stop.end && <span className="text-[9px] bg-amber-600 text-white px-2 py-0.5 rounded-full ml-2 animate-pulse">ACTIVA</span>}</p>
                                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{stop.start} - {stop.end || 'EN CURSO'}</p>
                                                                    {stop.coords && <p className="text-[8px] font-mono text-slate-400">{stop.coords.lat}, {stop.coords.lng}</p>}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {!stop.end && <button onClick={() => initiateFinishStop('NOPROG', idx)} className="text-[9px] font-black bg-amber-600 text-white px-3 py-1.5 rounded hover:bg-amber-700 transition flex items-center gap-1"><PlayCircle size={10} /> RESOLVER</button>}
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
                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Información de Carga</h5>
                                            <ul className="space-y-3">
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase">Operador</span><span className="text-xs font-black text-slate-900 uppercase">{selectedUnit.operadorLogistico}</span></li>
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase">Booking</span><span className="text-xs font-black text-slate-900 uppercase">{selectedUnit.booking}</span></li>
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase">Tipo Envío</span><span className="text-xs font-black text-slate-900 uppercase">{selectedUnit.tipoEnvio}</span></li>
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase">Proceso</span><span className="text-xs font-black text-slate-900 uppercase">{selectedUnit.proceso}</span></li>
                                            </ul>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-300">
                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Unidad de Transporte</h5>
                                            <ul className="space-y-3">
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase">Transportista</span><span className="text-xs font-black text-slate-900 uppercase">{selectedUnit.transportista}</span></li>
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase">Tracto / Carreta</span><span className="text-xs font-black text-slate-900 uppercase">{selectedUnit.plateRemolque} / {selectedUnit.plateSemiRemolque}</span></li>
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase">Conductor</span><span className="text-xs font-black text-slate-900 uppercase">{selectedUnit.conductor}</span></li>
                                                <li className="flex justify-between border-b border-slate-200 pb-2"><span className="text-xs font-bold text-slate-500 uppercase">Teléfono</span><span className="text-xs font-black text-slate-900 uppercase">{selectedUnit.telefono}</span></li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'RESUMEN' && (
                                    <div className="space-y-6">
                                        <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800">
                                            <div className="flex items-center justify-between">
                                                <div><h4 className="text-xl font-black uppercase tracking-tight">{selectedUnit.plateRemolque}</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedUnit.transportista}</p></div>
                                                <div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ETA</p><p className="text-sm font-black text-white">{new Date(selectedUnit.fechaEstimadaLlegada).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div>
                                            </div>
                                            <div className="mt-6 flex items-center justify-between gap-4">
                                                <div className="flex-1 bg-white/10 p-2 rounded-lg"><p className="text-[8px] font-bold text-slate-400 uppercase">Origen</p><p className="text-[10px] font-black uppercase truncate">{selectedUnit.origin}</p></div>
                                                <div className="text-slate-500">→</div>
                                                <div className="flex-1 bg-white/10 p-2 rounded-lg text-right"><p className="text-[8px] font-bold text-slate-400 uppercase">Destino</p><p className="text-[10px] font-black uppercase truncate">{selectedUnit.destination}</p></div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-4 rounded-xl border border-slate-300 text-center"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Controles</p><p className="text-2xl font-black text-slate-900">{selectedUnit.controles.length}</p></div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-300 text-center"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Incidencias</p><p className="text-2xl font-black text-amber-500">{selectedUnit.paradasNoProg.length}</p></div>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-300">
                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><LayoutList size={14} /> Bitácora de Viaje</h5>
                                            <div className="space-y-4">
                                                <div className="flex gap-3">
                                                    <div className="flex flex-col items-center"><div className="w-2 h-2 bg-slate-900 rounded-full"></div><div className="w-0.5 flex-1 bg-slate-200 my-1"></div></div>
                                                    <div className="pb-4"><p className="text-[9px] font-bold text-slate-400">{new Date(selectedUnit.fechaSalidaPlanta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p><p className="text-xs font-black text-slate-900 uppercase">Inicio de Viaje</p><p className="text-[10px] text-slate-500 uppercase">{selectedUnit.origin}</p></div>
                                                </div>
                                                {(selectedUnit.controles || []).map((cp, idx) => (
                                                    <div key={`ctrl-${idx}`} className="flex gap-3">
                                                        <div className="flex flex-col items-center"><div className="w-2 h-2 bg-slate-400 rounded-full border border-white"></div><div className="w-0.5 flex-1 bg-slate-200 my-1"></div></div>
                                                        <div className="pb-4"><p className="text-[9px] font-bold text-slate-400">{cp.time}</p><p className="text-xs font-bold text-slate-700 uppercase">{cp.location}</p><p className="text-[9px] text-slate-400">Control de Paso #{idx + 1}</p></div>
                                                    </div>
                                                ))}
                                                <div className="flex gap-3">
                                                    <div className="flex flex-col items-center"><div className="w-2.5 h-2.5 bg-[#ff0000] rounded-full animate-pulse"></div></div>
                                                    <div><p className="text-[9px] font-bold text-[#ff0000]">ACTUAL</p><p className="text-xs font-black text-slate-900 uppercase">{selectedUnit.ubicacionActual}</p></div>
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
                                                label="Almacén Descarga"
                                                type="select"
                                                options={destinations.filter(d => d.city_zone === form.destination && d.type === 'DESCARGA' && d.active).map(d => d.name)}
                                                value={form.almacenDestino1}
                                                onChange={v => setForm({ ...form, almacenDestino1: v })}
                                            />
                                            <FormInput
                                                label="Almacén Muestras (Opcional)"
                                                type="select"
                                                options={destinations.filter(d => d.city_zone === form.destination && d.type === 'MUESTRAS' && d.active).map(d => d.name)}
                                                value={form.almacenDestino2}
                                                onChange={v => setForm({ ...form, almacenDestino2: v })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormInput label="Ingreso Planta" type="datetime-local" value={form.fechaIngreso} onChange={v => setForm({ ...form, fechaIngreso: v })} />
                                            <FormInput label="Salida Planta" type="datetime-local" value={form.fechaSalida} onChange={v => setForm({ ...form, fechaSalida: v })} />
                                        </div>
                                        <div className="col-span-2 grid grid-cols-3 gap-3">
                                            <FormInput label="ETA (Estimado Llegada)" type="datetime-local" value={form.eta} onChange={v => setForm({ ...form, eta: v })} />
                                            <FormInput label="Proceso" type="select" options={['CONSERVA', 'FRESCO', 'CONGELADO', 'HARINA', 'ACEITE']} value={form.proceso} onChange={v => setForm({ ...form, proceso: v })} />
                                            <FormInput label="Tipo Envío" type="select" options={['TERRESTRE', 'MARITIMO', 'AEREO', 'BIMODAL']} value={form.tipoEnvio} onChange={v => setForm({ ...form, tipoEnvio: v })} />
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
                                        <FormInput label="Operador Logístico" placeholder="Ej: RANSA / NEPTUNIA" value={form.operador} onChange={v => setForm({ ...form, operador: v })} />
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
                                        <FormInput label="Transportista" placeholder="Ej: TRANSPORTES PEREDA" value={form.transportista} onChange={v => setForm({ ...form, transportista: v })} />
                                        <FormInput label="Placa Tracto" placeholder="Ej: ABC-123" value={form.plateRemolque} onChange={v => setForm({ ...form, plateRemolque: v })} />
                                        <FormInput label="Placa Semi-Remolque" placeholder="Ej: DEF-456" value={form.plateSemi} onChange={v => setForm({ ...form, plateSemi: v })} />
                                        <FormInput label="Nombre Conductor" placeholder="Ej: JUAN PEREZ" value={form.conductor} onChange={v => setForm({ ...form, conductor: v })} />
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
        </div>
    );
};

const FormInput = ({ label, value, onChange, type = "text", options = [], placeholder = "" }: { label: string, value: string, onChange: (v: string) => void, type?: string, options?: string[], placeholder?: string }) => (
    <div className="group space-y-1 w-full">
        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-slate-700 transition-colors">{label}</label>
        {type === 'select' ? (
            <div className="relative">
                <select required className="w-full p-2.5 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold uppercase outline-none focus:border-slate-900 transition-all text-slate-700 appearance-none cursor-pointer" value={value} onChange={e => onChange(e.target.value)}>
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
                required
                type={type}
                className="w-full p-2.5 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold uppercase outline-none focus:border-slate-900 transition-all text-slate-700 placeholder:text-slate-300 placeholder:font-normal"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
            />
        )}
    </div>
);
