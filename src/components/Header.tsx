import React from "react";
import { Menu, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface HeaderProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    isMobile: boolean;
}

export default function Header({ sidebarOpen, setSidebarOpen, isMobile }: HeaderProps) {
    const { logout, profile } = useAuth();
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = React.useState(false);

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    return (
        <header className={`sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-2 transition-all duration-300 ${!isMobile && (sidebarOpen ? "md:pl-72" : "md:pl-20")}`}>
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <div className="h-6 w-px bg-gray-200 hidden md:block" />
                <div className="flex items-center gap-2">
                    <span className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </span>
                    <h1 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Dashboard</h1>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-full border border-gray-100 hover:bg-gray-50 transition-all group"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-gray-900 leading-none mb-1">
                                {profile?.nombre ? profile.nombre.toUpperCase() : "USUARIO"}
                            </p>
                            <div className="flex items-center justify-end gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <p className="text-[10px] font-medium text-emerald-600 leading-none">
                                    EN LÍNEA
                                </p>
                            </div>
                        </div>
                        <div className="h-9 w-9 bg-gray-900 rounded-full flex items-center justify-center text-white text-xs font-bold group-hover:scale-105 transition-transform">
                            {profile?.nombre ? profile.nombre.substring(0, 2).toUpperCase() : "US"}
                        </div>
                    </button>

                    <AnimatePresence>
                        {showUserMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowUserMenu(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute top-full right-0 mt-2 z-20 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl py-1"
                                >
                                    <div className="px-4 py-3 border-b border-gray-50 sm:hidden">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                            {profile?.nombre}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {profile?.area}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Cerrar sesión
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}
