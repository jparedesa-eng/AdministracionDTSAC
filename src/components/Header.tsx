import React from "react";
import { Menu, LogOut, Bell } from "lucide-react";
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
        <header className={`fixed top-0 left-0 w-full z-20 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-2 transition-all duration-300 ${!isMobile && (sidebarOpen ? "md:pl-72" : "md:pl-20")}`}>
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                {/* Notification Bell */}
                <button
                    type="button"
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
                </button>

                {/* Separator */}
                <div className="h-8 w-px bg-gray-200 hidden sm:block" />

                <div className="relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-3 pl-2 pr-1 py-1.5 rounded-full hover:bg-gray-50 transition-all group"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-gray-900 leading-none mb-1">
                                {profile?.nombre ? profile.nombre.toUpperCase() : "USUARIO"}
                            </p>
                            <p className="text-[11px] font-medium text-gray-500 leading-none truncate max-w-[150px]">
                                {profile?.area ? profile.area.toUpperCase() : "ÁREA NO DEFINIDA"}
                            </p>
                        </div>
                        <div className="h-9 w-9 bg-gray-900 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm group-hover:scale-105 transition-transform">
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
                                    className="absolute top-full right-0 mt-2 z-20 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl py-1"
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
