"use client";

import { useEffect } from "react";
import { AuthProvider } from "./AuthProvider";

function ViewportHeight() {
  useEffect(() => {
    const sync = () => {
      const h = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty("--vv-height", `${Math.round(h)}px`);
    };
    sync();
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    window.addEventListener("orientationchange", sync);
    window.addEventListener("resize", sync);
    return () => {
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);
  return null;
}

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <ViewportHeight />
      {children}
    </AuthProvider>
  );
}
