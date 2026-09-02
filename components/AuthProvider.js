"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, firebasePronto } from "../lib/firebase";
import { emailPermitido } from "../lib/security";

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  pronto: false,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pronto = firebasePronto();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, async (atual) => {
      if (atual?.email && !emailPermitido(atual.email)) {
        await signOut(auth);
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(atual);
      setLoading(false);
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      pronto,
      login: async (email, senha, manterConectado = true) => {
        if (!auth) return Promise.reject(new Error("Firebase não configurado"));
        await setPersistence(auth, manterConectado ? browserLocalPersistence : browserSessionPersistence);
        return signInWithEmailAndPassword(auth, email, senha);
      },
      logout: () => (auth ? signOut(auth) : Promise.resolve()),
    }),
    [user, loading, pronto],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
