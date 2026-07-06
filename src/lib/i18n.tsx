import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Lang = "en" | "sw";

const DICT: Record<string, { en: string; sw: string }> = {
  "nav.myPurchases": { en: "My Purchases", sw: "Manunuzi Yangu" },
  "nav.adminPanel": { en: "Admin Panel", sw: "Paneli ya Msimamizi" },
  "nav.signOut": { en: "Sign Out", sw: "Toka" },
  "nav.signIn": { en: "Sign In", sw: "Ingia" },
  "nav.tagline": { en: "Physical & Health Education", sw: "Elimu ya Afya na Michezo" },
  "search.placeholder": { en: "Search lessons and topics...", sw: "Tafuta masomo na mada..." },
  "common.back": { en: "Back", sw: "Rudi" },
  "common.loading": { en: "Loading...", sw: "Inapakia..." },
  "common.download": { en: "Download", sw: "Pakua" },
  "common.watch": { en: "Watch", sw: "Tazama" },
  "common.play": { en: "Play", sw: "Cheza" },
  "common.open": { en: "Open", sw: "Fungua" },
  "topic.markCompleted": { en: "Mark as completed", sw: "Weka alama kama imekamilika" },
  "topic.completedUndo": { en: "Completed — tap to undo", sw: "Imekamilika — bofya kutengua" },
  "topic.notFound": { en: "Topic not found.", sw: "Mada haipatikani." },
  "lang.toggle": { en: "SW", sw: "EN" },
  "lang.label": { en: "Language", sw: "Lugha" },
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof DICT) => string;
  tr: (text: string | null | undefined) => string;
  trMany: (texts: string[]) => string[];
}

const Ctx = createContext<I18nCtx | null>(null);

// In-memory translation cache for this session
const memCache = new Map<string, string>(); // key = `${lang}::${text}`

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem("lang") as Lang) || "en";
  });
  const [, forceRender] = useState(0);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
    document.documentElement.lang = l;
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: keyof typeof DICT) => DICT[key]?.[lang] ?? DICT[key]?.en ?? String(key),
    [lang],
  );

  const fetchTranslations = useCallback(
    async (texts: string[], target: Lang) => {
      if (target === "en" || texts.length === 0) return;
      const missing = texts.filter((t) => t && !memCache.has(`${target}::${t}`));
      if (missing.length === 0) return;
      try {
        const { data, error } = await supabase.functions.invoke("translate", {
          body: { texts: missing, target },
        });
        if (error || !data?.translations) return;
        (data.translations as string[]).forEach((tr, i) => {
          if (tr) memCache.set(`${target}::${missing[i]}`, tr);
        });
        forceRender((n) => n + 1);
      } catch (e) {
        console.warn("translate failed", e);
      }
    },
    [],
  );

  const tr = useCallback(
    (text: string | null | undefined): string => {
      if (!text) return "";
      if (lang === "en") return text;
      const key = `${lang}::${text}`;
      const hit = memCache.get(key);
      if (hit) return hit;
      // trigger async fetch; return original meanwhile
      void fetchTranslations([text], lang);
      return text;
    },
    [lang, fetchTranslations],
  );

  const trMany = useCallback(
    (texts: string[]): string[] => {
      if (lang === "en") return texts;
      const pending = texts.filter((t) => t && !memCache.has(`${lang}::${t}`));
      if (pending.length > 0) void fetchTranslations(pending, lang);
      return texts.map((t) => memCache.get(`${lang}::${t}`) ?? t);
    },
    [lang, fetchTranslations],
  );

  const value = useMemo(() => ({ lang, setLang, t, tr, trMany }), [lang, setLang, t, tr, trMany]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function useT(text: string | null | undefined) {
  const { tr } = useI18n();
  return tr(text);
}
