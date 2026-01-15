import { supabase } from "../supabase/supabaseClient";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: NotificationType;
    read: boolean;
    created_at: string;
}

export const notificationsStore = {
    notifications: [] as Notification[],
    unreadCount: 0,

    async fetchNotifications(userId: string) {
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(50); // Limit to last 50 to avoid clutter

        if (error) throw error;
        this.notifications = (data as Notification[]) || [];
        this.unreadCount = this.notifications.filter((n) => !n.read).length;
        return this.notifications;
    },

    async markAsRead(notificationId: string) {
        const { error } = await supabase
            .from("notifications")
            .update({ read: true })
            .eq("id", notificationId);

        if (error) throw error;

        // Update local state
        this.notifications = this.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
        );
        this.unreadCount = this.notifications.filter((n) => !n.read).length;
    },

    async markAllAsRead(userId: string) {
        const { error } = await supabase
            .from("notifications")
            .update({ read: true })
            .eq("user_id", userId)
            .eq("read", false);

        if (error) throw error;

        this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
        this.unreadCount = 0;
    },

    /* =========================
     * Creation Helpers
     * ========================= */

    /**
     * Create a single notification for a specific user
     */
    async createNotification(
        userId: string,
        title: string,
        message: string,
        type: NotificationType = "info"
    ) {
        const { error } = await supabase.from("notifications").insert([
            {
                user_id: userId,
                title,
                message,
                type,
            },
        ]);
        if (error) console.error("Error creating notification:", error);
    },

    /**
     * Helper to target users by ROLE and optionally AREA
     * Useful for "Notify Jefe of Administracion"
     */
    async notifyUsersByRoleAndArea(
        role: "admin" | "jefe" | "operador",
        area: string | null,
        title: string,
        message: string,
        type: NotificationType = "info"
    ) {
        console.log(`[Notification] Attempting to notify Role=${role}, Area=${area}`);

        // 1. Find users matching criteria (Fetch by role first, filter area in JS to handle accents/case)
        let query = supabase.from("profiles").select("id, nombre, area, rol").eq("rol", role);

        const { data: usersRaw, error } = await query;

        if (error) {
            console.error("[Notification] Error fetching target users:", error);
            return;
        }

        if (!usersRaw || usersRaw.length === 0) {
            console.warn("[Notification] No users found for role:", role);
            return;
        }

        // Filter by area if provided (Normalizing accents: Administración == ADMINISTRACION)
        let users = usersRaw;
        if (area) {
            const normalize = (str: string) =>
                str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

            const targetArea = normalize(area);

            users = usersRaw.filter(u => {
                if (!u.area) return false;
                return normalize(u.area) === targetArea;
            });
        }

        if (users.length === 0) {
            console.warn("[Notification] Users found for role, but none matched area:", { role, area });
            return;
        }

        console.log(`[Notification] Found ${users.length} target users (after filtering):`, users);

        // 2. Insert notifications for found users
        const payload = users.map((u) => ({
            user_id: u.id,
            title,
            message,
            type,
        }));

        const { error: insertError } = await supabase
            .from("notifications")
            .insert(payload);

        if (insertError) {
            console.error("[Notification] Error bulk inserting notifications:", insertError);
        } else {
            console.log("[Notification] Successfully inserted notifications.");
        }
    },
};
