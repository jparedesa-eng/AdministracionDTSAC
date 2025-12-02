import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase/supabaseClient";


export type Profile = {
  id: string;
  dni: string;
  nombre: string;
  area: string;
  correo: string | null;
  rol: "admin" | "jefe" | "operador" | "visitante";
  allowed_views: string[];
};

type AuthCtx = {
  user: any | null;
  profile: Profile | null;
  login: (dni: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  canView: (path: string) => boolean;
  loadingSession: boolean;
};

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

const dniToEmail = (dni: string) => `${dni}@users.local`;

// Timeout simple con Promise.race (evita tipo genérico del query)
function promiseWithTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) loadProfileSafe(session.user.id);
      setLoadingSession(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfileSafe(session.user.id);
      else setProfile(null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfileSafe(uid: string) {
    try {
      // Forzamos a Promise “real” para el race y evitamos el tipo PostgrestBuilder
      const query = supabase.from("profiles").select("*").eq("id", uid).single();
      const resp: any = await promiseWithTimeout(query as unknown as Promise<any>, 2000);

      if (resp?.data) {
        setProfile(resp.data as Profile);
      } else {
        console.warn("[Auth] Perfil no encontrado para uid:", uid);
        setProfile(null);
      }
    } catch (e: any) {
      if (e?.message === "timeout") {
        console.warn("[Auth] Timeout cargando perfil. Continuando sin perfil.");
      } else {
        console.warn("[Auth] Error cargando perfil:", e?.message ?? e);
      }
      setProfile(null);
    }
  }

  async function login(dni: string, pass: string) {
    if (!/^\d{8}$/.test(dni)) throw new Error("DNI inválido (8 dígitos).");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: dniToEmail(dni),
      password: pass,
    });
    if (error) throw error;

    if (data.user) {
      setUser(data.user);
      // cargar perfil en paralelo (no bloquea el submit)
      loadProfileSafe(data.user.id);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  function canView(path: string) {
    if (!path) return false;
    if (profile?.rol === "admin") return true;
    const allowed = profile?.allowed_views ?? [];
    return allowed.some(
      (p) => path === p || (typeof p === "string" && p.endsWith("/*") && path.startsWith(p.slice(0, -2)))
    );
  }

  return (
    <Ctx.Provider value={{ user, profile, login, logout, canView, loadingSession }}>
      {children}
    </Ctx.Provider>
  );
}
