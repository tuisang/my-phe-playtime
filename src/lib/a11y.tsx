import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

interface A11ySettings {
  largeText: boolean;
  dyslexic: boolean;
  highContrast: boolean;
}

interface A11yCtx extends A11ySettings {
  toggle: (key: keyof A11ySettings) => void;
  reset: () => void;
}

const DEFAULTS: A11ySettings = {
  largeText: false,
  dyslexic: false,
  highContrast: false,
};

const STORAGE_KEY = "a11y-settings";
const Ctx = createContext<A11yCtx | null>(null);

function readInitial(): A11ySettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export const A11yProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<A11ySettings>(readInitial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("a11y-large", settings.largeText);
    root.classList.toggle("a11y-dyslexic", settings.dyslexic);
    root.classList.toggle("a11y-contrast", settings.highContrast);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const toggle = useCallback((key: keyof A11ySettings) => {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULTS), []);

  const value = useMemo(() => ({ ...settings, toggle, reset }), [settings, toggle, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useA11y() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useA11y must be used inside A11yProvider");
  return ctx;
}
