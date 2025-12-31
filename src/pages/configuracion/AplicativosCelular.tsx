import React, { useEffect, useState } from "react";
import { aplicativosStore } from "../../store/aplicativosStore";
import type { Aplicativo } from "../../store/aplicativosStore";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import {
    Plus,
    Trash2,
    Loader2,
    LayoutGrid,
    Search
} from "lucide-react";

export default function AplicativosCelular() {
    const [loading, setLoading] = useState(false);
    const [apps, setApps] = useState<Aplicativo[]>([]);
    const [toast, setToast] = useState<ToastState>(null);
    const [newAppName, setNewAppName] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Filtrar aplicativos
    const filteredApps = apps.filter(app =>
        app.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const loadApps = async () => {
        setLoading(true);
        try {
            const data = await aplicativosStore.fetchAll();
            setApps(data);
        } catch (error) {
            console.error(error);
            setToast({ type: "error", message: "Error al cargar aplicativos" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadApps();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAppName.trim()) return;

        setIsAdding(true);
        try {
            await aplicativosStore.create(newAppName.trim());
            setNewAppName("");
            setToast({ type: "success", message: "Aplicativo agregado correctamente" });
            loadApps();
        } catch (error) {
            console.error(error);
            setToast({ type: "error", message: "Error al agregar aplicativo" });
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("¿Seguro que desea eliminar este aplicativo?")) return;

        try {
            await aplicativosStore.delete(id);
            setToast({ type: "success", message: "Aplicativo eliminado" });
            loadApps();
        } catch (error) {
            console.error(error);
            setToast({ type: "error", message: "Error al eliminar" });
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Aplicativos Móviles</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Gestione la lista de aplicaciones disponibles para solicitar.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Formulario de agregar */}
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 sticky top-6">
                        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-indigo-600" />
                            Agregar Nuevo
                        </h2>
                        <form onSubmit={handleAdd}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre del App
                                </label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border-gray-300 border p-2.5 text-sm focus:border-indigo-600 outline-none transition-all"
                                    placeholder="Ej. WhatsApp, Waze..."
                                    value={newAppName}
                                    onChange={(e) => setNewAppName(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isAdding || !newAppName.trim()}
                                className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Agregar
                            </button>
                        </form>
                    </div>
                </div>

                {/* Lista */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h3 className="font-semibold text-gray-900">Lista de Aplicativos ({filteredApps.length})</h3>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar aplicativo..."
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500 transition-colors bg-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-12 flex justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            </div>
                        ) : filteredApps.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                {searchTerm ? "No se encontraron resultados." : "No hay aplicativos registrados."}
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {filteredApps.map((app) => (
                                    <li key={app.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <LayoutGrid className="w-5 h-5" />
                                            </div>
                                            <span className="font-medium text-gray-900">{app.nombre}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(app.id)}
                                            className="text-red-600 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
