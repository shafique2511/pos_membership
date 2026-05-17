import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { getBusiness, getEnabledModules, getRolePermissions, getUserProfile } from "@/lib/auth/access";
import type { AuthState } from "@/types/auth";

type SignUpPayload = {
  email: string;
  password: string;
  fullName: string;
  role?: "owner" | "customer";
};

type AuthContextValue = AuthState & {
  refreshAuthState: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const emptyAuthState: AuthState = {
  user: null,
  profile: null,
  business: null,
  enabledModules: [],
  permissions: [],
  loading: true,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(emptyAuthState);

  const refreshAuthState = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user ?? null;

    if (!user) {
      setState({ ...emptyAuthState, loading: false });
      return;
    }

    try {
      const profile = await getUserProfile(user.id);
      const business = await getBusiness(profile?.business_id);
      const enabledModules = await getEnabledModules(profile?.business_id);
      const permissions = await getRolePermissions(profile?.business_id, profile?.role);

      setState({
        user,
        profile,
        business,
        enabledModules,
        permissions,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to load auth state", error);
      setState({
        user,
        profile: null,
        business: null,
        enabledModules: [],
        permissions: [],
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    void refreshAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshAuthState();
    });

    return () => subscription.unsubscribe();
  }, [refreshAuthState]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await refreshAuthState();
  }, [refreshAuthState]);

  const signUp = useCallback(async ({ email, password, fullName, role = "owner" }: SignUpPayload) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (error) throw error;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const redirectTo = `${window.location.origin}/auth/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setState({ ...emptyAuthState, loading: false });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      refreshAuthState,
      signIn,
      signUp,
      resetPassword,
      signOut,
    }),
    [state, refreshAuthState, signIn, signUp, resetPassword, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return value;
}

export function getAuthErrorMessage(error: unknown) {
  return (error as AuthError | undefined)?.message ?? "Something went wrong. Check your Supabase configuration and try again.";
}
