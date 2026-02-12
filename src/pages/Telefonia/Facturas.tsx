import React, { useEffect, useState } from "react";
import { telefoniaStore } from "../../store/telefoniaStore";
import type { Factura, FacturaItem } from "../../store/telefoniaStore";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import {
    Plus,
    ChevronsLeft,
    ChevronsRight,
    Search, // Added back
    DollarSign,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
    FileText,
    Receipt,
    Calendar,
    Box,
    CheckCircle
} from "lucide-react";
import { DateRangePicker } from "../../components/ui/DateRangePicker";


export default function FacturasTelefonia() {
    // const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Initial Data Load
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                await Promise.all([
                    telefoniaStore.fetchFacturas(),
                    telefoniaStore.fetchModelos(),
                    telefoniaStore.fetchSolicitudes()
                ]);
            } catch (e: any) {
                setToast({ type: "error", message: e.message || "Error cargando datos" });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [refreshTrigger]);

    // Modal State
    const [openModal, setOpenModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        numero_factura: "",
        proveedor: "CLARO",
        fecha_compra: new Date().toISOString().slice(0, 10),
        monto: 0,
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Filters State
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [providerFilter, setProviderFilter] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Filter Logic
    const filteredFacturas = telefoniaStore.facturas.filter(f => {
        // Date Range
        if (startDate && endDate) {
            const fecha = new Date(f.fecha_compra + 'T12:00:00').getTime(); // Add time to avoid timezone issues
            const start = new Date(startDate + 'T00:00:00').getTime();
            const end = new Date(endDate + 'T23:59:59').getTime();
            if (fecha < start || fecha > end) return false;
        }

        // Provider
        if (providerFilter && f.proveedor !== providerFilter) return false;

        // Search Query (Invoice Number)
        if (searchQuery) {
            if (!f.numero_factura.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        }

        return true;
    });

    const totalMonto = filteredFacturas.reduce((acc, curr) => acc + Number(curr.monto), 0);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({
            numero_factura: "",
            proveedor: "CLARO",
            fecha_compra: new Date().toISOString().slice(0, 10),
            monto: 0
        });
        setItems([]);
        setOpenModal(true);
    };

    const handleEdit = (factura: Factura) => {
        setEditingId(factura.id);
        setFormData({
            numero_factura: factura.numero_factura,
            proveedor: factura.proveedor,
            fecha_compra: factura.fecha_compra,
            monto: factura.monto
        });
        if (factura.items) {
            setItems(factura.items.map(i => ({
                modelo_id: i.modelo_id,
                nombre_modelo: i.nombre_modelo,
                cantidad: i.cantidad,
                costo_unitario: i.costo_unitario,
                ceco: i.ceco || "",
                tipo_adquisicion: i.tipo_adquisicion || "Renovación",
                asumido_por: i.asumido_por || "Danper",
                solicitud_id: i.solicitud_id || ""
            })));
        } else {
            setItems([]);
        }
        setOpenModal(true);
    };

    // Items Logic
    const [items, setItems] = useState<Partial<FacturaItem>[]>([]);

    const handleAddItem = () => {
        setItems([...items, {
            modelo_id: "",
            cantidad: 1,
            costo_unitario: 0,
            asumido_por: "Danper",
            tipo_adquisicion: "Renovación"
        }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleItemChange = (index: number, field: keyof FacturaItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === "modelo_id") {
            const model = telefoniaStore.modelos.find(m => m.id === value);
            if (model) {
                newItems[index].nombre_modelo = model.nombre;
            }
        }

        if (field === "solicitud_id") {
            const ticket = telefoniaStore.solicitudes.find(s => s.id === value);
            if (ticket) {
                newItems[index].ceco = ticket.ceco || "";
                newItems[index].tipo_adquisicion = mapSolicitudTypeToAcquisition(ticket.tipo_solicitud) || "Renovación";
            }
        }

        setItems(newItems);
    };

    const calculatedTotalAmount = items.reduce((acc, curr) => acc + ((Number(curr.cantidad) || 0) * (Number(curr.costo_unitario) || 0)), 0);

    const mapSolicitudTypeToAcquisition = (solType?: string) => {
        if (!solType) return null;
        if (solType.includes("NUEVO")) return "Equipo Nuevo";
        if (solType.includes("REPOSICION")) return "Reposición";
        return "Renovación";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (items.length === 0) {
            setToast({ type: "error", message: "Debe agregar al menos un modelo." });
            return;
        }

        for (const item of items) {
            if (!item.modelo_id) {
                setToast({ type: "error", message: "Seleccione el modelo para todos los ítems." });
                return;
            }
        }

        setSubmitting(true);
        try {
            const payload = {
                numero_factura: formData.numero_factura,
                proveedor: formData.proveedor as "CLARO" | "ENTEL",
                fecha_compra: formData.fecha_compra,
                monto: formData.monto || calculatedTotalAmount
            };

            // Sanitize items: convert empty strings to null for UUID fields
            const sanitizedItems = items.map(item => ({
                ...item,
                solicitud_id: item.solicitud_id === "" ? null : item.solicitud_id
            }));

            if (editingId) {
                await telefoniaStore.updateFactura(editingId, payload, sanitizedItems as any[]);
                setToast({ type: "success", message: "Factura actualizada correctamente" });
            } else {
                await telefoniaStore.createFactura(payload, sanitizedItems as any[]);
                setToast({ type: "success", message: "Factura registrada correctamente" });
            }
            setOpenModal(false);
            setRefreshTrigger(prev => prev + 1);

            setFormData({
                numero_factura: "",
                proveedor: "CLARO",
                fecha_compra: new Date().toISOString().slice(0, 10),
                monto: 0
            });
            setItems([]);

        } catch (error: any) {
            setToast({ type: "error", message: error.message || "Error al registrar factura" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            // 1. Check if factura is in use
            const inUse = await telefoniaStore.checkFacturaUsage(id);
            if (inUse) {
                setToast({ type: "error", message: "No se puede eliminar porque tiene equipos relacionados" });
                return;
            }

            // 2. Confirm deletion
            if (!window.confirm("¿Eliminar esta factura? Esta acción no se puede deshacer.")) return;

            await telefoniaStore.deleteFactura(id);
            setToast({ type: "success", message: "Factura eliminada" });
            setRefreshTrigger(prev => prev + 1);
        } catch (e: any) {
            setToast({ type: "error", message: e.message || "Error al eliminar" });
        }
    }

    // Pagination Logic
    const getCurrentData = () => {
        const data = filteredFacturas;
        if (itemsPerPage === 0) return data;
        const start = (currentPage - 1) * itemsPerPage;
        return data.slice(start, start + itemsPerPage);
    };

    const currentData = getCurrentData();
    const totalItems = filteredFacturas.length;
    const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(totalItems / itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="space-y-6">
            <Toast toast={toast} onClose={() => setToast(null)} />

            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Facturas de Compras</h1>
                    <p className="text-sm text-gray-500">Registro y gestión de compras de equipos</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                        <Plus size={16} />
                        Registrar Factura
                    </button>
                </div>
            </header>

            {/* Filters and Stats */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Total Stats Card */}
                <div className="md:col-span-3 bg-white p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto Total</span>
                    <div className="flex items-end gap-2 mt-2">
                        <span className="text-2xl font-bold text-gray-900">S/ {totalMonto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="md:col-span-9 bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row items-center gap-4">
                    {/* Date Picker */}
                    <div className="flex-1 w-full md:w-auto">
                        <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Rango de Fechas</label>
                        <DateRangePicker
                            initialStart={startDate ? new Date(startDate + 'T12:00:00') : null}
                            initialEnd={endDate ? new Date(endDate + 'T12:00:00') : null}
                            onChange={(range) => {
                                setStartDate(range.start ? range.start.toISOString().split('T')[0] : "");
                                setEndDate(range.end ? range.end.toISOString().split('T')[0] : "");
                            }}
                        />
                    </div>

                    {/* Provider Filter */}
                    <div className="w-full md:w-48">
                        <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Proveedor</label>
                        <select
                            className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
                            value={providerFilter}
                            onChange={(e) => setProviderFilter(e.target.value)}
                        >
                            <option value="">Todos</option>
                            <option value="CLARO">CLARO</option>
                            <option value="ENTEL">ENTEL</option>
                        </select>
                    </div>

                    {/* Search Bar */}
                    <div className="w-full md:w-64">
                        <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Buscar Factura</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={16} className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full rounded-lg border-gray-300 pl-9 p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Nº Factura..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Clear Filters */}
                    {(startDate || endDate || providerFilter || searchQuery) && (
                        <div className="flex items-end h-full pb-1">
                            <button
                                onClick={() => {
                                    setStartDate("");
                                    setEndDate("");
                                    setProviderFilter("");
                                    setSearchQuery("");
                                }}
                                className="text-xs text-red-600 hover:text-red-800 font-medium underline px-2"
                            >
                                Limpiar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10">Cargando...</div>
            ) : (
                <div className="rounded-xl border border-gray-200 bg-white  overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Nº Factura</th>
                                    <th className="px-4 py-3 font-medium">Proveedor</th>
                                    <th className="px-4 py-3 font-medium">Fecha</th>
                                    <th className="px-4 py-3 font-medium">Total Equipos</th>
                                    <th className="px-4 py-3 font-medium">Monto</th>
                                    <th className="px-4 py-3 font-medium">Ticket Origen</th>
                                    <th className="px-4 py-3 font-medium">Detalles</th>
                                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {currentData.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                            No hay facturas registradas
                                        </td>
                                    </tr>
                                ) : (
                                    currentData.map((factura) => (
                                        <tr key={factura.id} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {factura.numero_factura}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${factura.proveedor === 'CLARO' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                                                    }`}>
                                                    {factura.proveedor}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{factura.fecha_compra}</td>
                                            <td className="px-4 py-3 text-gray-900 font-semibold">
                                                {factura.cantidad_total || 0}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <DollarSign size={12} className="text-gray-400" />
                                                    {Number(factura.monto).toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    {Array.from(new Set(factura.items?.map(i => i.solicitud?.beneficiario_nombre).filter(Boolean))).map((name, idx) => (
                                                        <span key={idx} className="text-xs text-blue-600 bg-blue-50 px-1 rounded w-fit">{name}</span>
                                                    ))}
                                                    {!factura.items?.some(i => i.solicitud) && <span className="text-gray-400 text-xs">Sin vincular</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="max-w-[200px] text-xs text-gray-500">
                                                    {factura.items?.map(i => (
                                                        <div key={i.id} className="truncate">
                                                            {i.cantidad}x {i.nombre_modelo}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleEdit(factura)}
                                                    className="text-gray-400 hover:text-blue-600 p-1 mr-1"
                                                    title="Editar"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(factura.id)}
                                                    className="text-gray-400 hover:text-red-600 p-1"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {!loading && totalItems > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 p-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-medium uppercase">Filas:</span>
                                <select
                                    className="rounded border-none text-gray-500 py-1 pl-2 pr-6 text-sm focus:ring-0 bg-transparent cursor-pointer hover:text-gray-700"
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={0}>Todos</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handlePageChange(1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Primera Página"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Página Anterior"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>

                                <span className="text-xs font-medium px-4 text-gray-400">
                                    {currentPage} / {totalPages}
                                </span>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Página Siguiente"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handlePageChange(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Última Página"
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CREATE MODAL */}
            <Modal
                open={openModal}
                onClose={() => setOpenModal(false)}
                title={editingId ? "Editar Factura" : "Registrar Factura de Compra"}
                size="xl" // Reduced from 2xl
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Header Data */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-4">
                        <div className="flex items-center gap-2 mb-2 text-indigo-700 border-b border-indigo-100 pb-2">
                            <FileText size={18} />
                            <h3 className="font-semibold text-sm">Datos Generales</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase">Nº Factura</label>
                                <div className="relative mt-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Receipt size={14} className="text-gray-400" />
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        className="block w-full rounded-md border border-gray-300 pl-9 p-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                                        value={formData.numero_factura}
                                        onChange={(e) => setFormData({ ...formData, numero_factura: e.target.value })}
                                        placeholder="F001-000..."
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase">Proveedor</label>
                                <select
                                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm bg-white"
                                    value={formData.proveedor}
                                    onChange={(e) => setFormData({ ...formData, proveedor: e.target.value as "CLARO" | "ENTEL" })}
                                >
                                    <option value="CLARO">CLARO</option>
                                    <option value="ENTEL">ENTEL</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase">Fecha Compra</label>
                                <div className="relative mt-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Calendar size={14} className="text-gray-400" />
                                    </div>
                                    <input
                                        required
                                        type="date"
                                        className="block w-full rounded-md border border-gray-300 pl-9 p-2 text-sm"
                                        value={formData.fecha_compra}
                                        onChange={(e) => setFormData({ ...formData, fecha_compra: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Section ONLY */}
                    {/* Header fields removed: Linking, Accounting */}

                    <hr className="border-gray-100" />

                    {/* Items Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-gray-800">
                                <Box size={18} className="text-indigo-600" />
                                <h3 className="text-sm font-bold">Detalle de Equipos</h3>
                            </div>
                            <div className="text-right">
                                <span className="block text-xs text-gray-500 uppercase font-semibold">Total Calculado</span>
                                <span className="text-xl font-bold text-emerald-600">
                                    S/ {calculatedTotalAmount.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4 bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-inner">
                            {items.length === 0 && (
                                <p className="text-center text-gray-400 py-4 text-sm italic">
                                    No hay modelos agregados.
                                </p>
                            )}
                            {items.map((item, idx) => (
                                <div key={idx} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm transition-shadow hover:shadow-md relative">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(idx)}
                                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 bg-transparent p-1 rounded hover:bg-red-50"
                                        title="Quitar"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    {/* Row 1: Model, Qty, Cost */}
                                    <div className="flex gap-4 mb-3 pr-8">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Modelo</label>
                                            <select
                                                className="block w-full rounded border-gray-300 p-2 text-sm font-medium"
                                                value={item.modelo_id}
                                                onChange={(e) => handleItemChange(idx, "modelo_id", e.target.value)}
                                            >
                                                <option value="">-- Seleccionar --</option>
                                                {telefoniaStore.modelos.map(m => (
                                                    <option key={m.id} value={m.id}>{m.marca} - {m.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Cant.</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="block w-full rounded border-gray-300 p-2 text-sm text-center font-semibold"
                                                value={item.cantidad}
                                                onChange={(e) => handleItemChange(idx, "cantidad", Number(e.target.value))}
                                                onFocus={(e) => e.target.select()}
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Costo Unit.</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                                    <span className="text-gray-400 text-xs">S/</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="block w-full rounded border-gray-300 pl-6 p-2 text-sm font-mono text-right"
                                                    value={item.costo_unitario}
                                                    onChange={(e) => handleItemChange(idx, "costo_unitario", Number(e.target.value))}
                                                    onFocus={(e) => e.target.select()}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 2: Accounting Data per Item */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-indigo-50/30 p-3 rounded-lg border border-indigo-100">
                                        <div className="col-span-1 md:col-span-2 lg:col-span-1">
                                            <label className="text-[10px] font-bold text-indigo-400 uppercase mb-1 block">Ticket Origen</label>
                                            <TicketSelector
                                                value={item.solicitud_id || ""}
                                                onChange={(val) => handleItemChange(idx, "solicitud_id", val)}
                                                solicitudes={telefoniaStore.solicitudes.filter(s => s.estado === "Programar Entrega")}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-indigo-400 uppercase mb-1 block">CECO</label>
                                            <input
                                                type="text"
                                                className="block w-full rounded border-indigo-200 p-1.5 text-xs bg-white"
                                                value={item.ceco || ""}
                                                onChange={(e) => handleItemChange(idx, "ceco", e.target.value)}
                                                placeholder="10 dígitos"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-indigo-400 uppercase mb-1 block">Tipo</label>
                                            <select
                                                className="block w-full rounded border-indigo-200 p-1.5 text-xs bg-white"
                                                value={item.tipo_adquisicion || "Renovación"}
                                                onChange={(e) => handleItemChange(idx, "tipo_adquisicion", e.target.value)}
                                            >
                                                <option value="Renovación">Renovación</option>
                                                <option value="Equipo Nuevo">Equipo Nuevo</option>
                                                <option value="Reposición">Reposición</option>
                                                <option value="Solo Chip">Solo Chip</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-indigo-400 uppercase mb-1 block">Asumido Por</label>
                                            <select
                                                className="block w-full rounded border-indigo-200 p-1.5 text-xs bg-white"
                                                value={item.asumido_por || "Danper"}
                                                onChange={(e) => handleItemChange(idx, "asumido_por", e.target.value)}
                                            >
                                                <option value="Danper">Danper</option>
                                                <option value="Usuario">Usuario</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="w-full py-2 flex items-center justify-center gap-2 border border-dashed border-indigo-300 bg-indigo-50/50 rounded-lg text-sm text-indigo-600 font-medium hover:bg-indigo-50 hover:border-indigo-400 transition-all"
                            >
                                <Plus size={16} />
                                Agregar Modelo
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setOpenModal(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-6 py-2 text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all disabled:opacity-70"
                        >
                            <CheckCircle size={16} />
                            {submitting ? "Guardando..." : (editingId ? "Actualizar Factura" : "Registrar Factura")}
                        </button>
                    </div>
                </form>
            </Modal>
        </div >
    );
}

function TicketSelector({ value, onChange, solicitudes }: { value: string, onChange: (val: string) => void, solicitudes: any[] }) {
    const [filter, setFilter] = useState("");

    // Filter options based on search
    const filteredOptions = solicitudes.filter(s => {
        if (!filter) return true;
        const search = filter.toLowerCase();
        return (
            s.beneficiario_nombre?.toLowerCase().includes(search) ||
            s.tipo_solicitud?.toLowerCase().includes(search) ||
            s.ceco?.includes(search)
        );
    });

    return (
        <div className="relative">
            <input
                type="text"
                placeholder="Buscar ticket..."
                className="w-full text-[10px] border border-indigo-100 rounded px-1 py-0.5 mb-1 bg-indigo-50/50 focus:bg-white transition-colors"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />
            <select
                className="block w-full rounded border-indigo-200 p-1.5 text-xs bg-white"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="">-- Seleccionar --</option>
                {filteredOptions.map(t => (
                    <option key={t.id} value={t.id}>
                        {t.beneficiario_nombre} ({t.tipo_solicitud})
                    </option>
                ))}
                {filteredOptions.length === 0 && (
                    <option disabled>Sin resultados</option>
                )}
            </select>
        </div>
    );
}
