import React, { useEffect } from "react";
import { Bell, Info, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { notificationsStore } from "../store/notificationsStore";
import type { Notification } from "../store/notificationsStore";
import { useAuth } from "../auth/AuthContext";

export default function NotificationList() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = React.useState(false);
    const [list, setList] = React.useState<Notification[]>([]);
    const [unread, setUnread] = React.useState(0);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const lastNotificationIdRef = React.useRef<string | null>(null);

    // Request permission on mount
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Poll for notifications or fetch on mount/open
    const refresh = async () => {
        if (!user) return;
        await notificationsStore.fetchNotifications(user.id);

        const currentList = notificationsStore.notifications;
        setList(currentList);
        setUnread(notificationsStore.unreadCount);

        // Detect new unread notification for Desktop Alert
        if (currentList.length > 0) {
            const latest = currentList[0];
            // If it's a new ID, it's unread, and we haven't seen it yet
            if (latest.id !== lastNotificationIdRef.current) {
                lastNotificationIdRef.current = latest.id;

                // Trigger desktop notification if allowed
                if (!latest.read && "Notification" in window && Notification.permission === "granted") {
                    try {
                        new Notification(latest.title, {
                            body: latest.message,
                            icon: "/logo-rojo.svg" // Optional: placeholder or app icon
                        });
                    } catch (e) {
                        console.warn("Notification trigger failed", e);
                    }
                }
            }
        }
    };

    useEffect(() => {
        refresh();
        // Optional: Poll every 30s
        const interval = setInterval(refresh, 30000);
        return () => clearInterval(interval);
    }, [user]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMarkRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await notificationsStore.markAsRead(id);
            setList([...notificationsStore.notifications]);
            setUnread(notificationsStore.unreadCount);
        } catch (error) {
            console.error(error);
        }
    };

    const handleMarkAllRead = async () => {
        if (!user) return;
        try {
            await notificationsStore.markAllAsRead(user.id);
            setList([...notificationsStore.notifications]);
            setUnread(0);
        } catch (error) {
            console.error(error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "success": return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
            case "warning": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
            case "error": return <AlertCircle className="h-5 w-5 text-rose-500" />;
            default: return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none"
            >
                <Bell className="h-6 w-6" />
                {unread > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unread > 99 ? "99+" : unread}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
                        {unread > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Marcar todo leído
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {list.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-500">
                                No tienes notificaciones.
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {list.map((n) => (
                                    <li
                                        key={n.id}
                                        onClick={(e) => !n.read && handleMarkRead(n.id, e)}
                                        className={`flex gap-3 p-4 transition-colors cursor-pointer ${n.read
                                            ? "bg-white hover:bg-gray-50"
                                            : "bg-blue-50/50 hover:bg-blue-50"
                                            }`}
                                    >
                                        <div className="flex-shrink-0 mt-1">{getIcon(n.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${n.read ? "text-gray-900" : "text-gray-900 font-semibold"}`}>
                                                {n.title}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                {n.message}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-2">
                                                {new Date(n.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        {!n.read && (
                                            <div className="flex-shrink-0 text-blue-600">
                                                <span className="block h-2 w-2 rounded-full bg-blue-600 mt-2" />
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
