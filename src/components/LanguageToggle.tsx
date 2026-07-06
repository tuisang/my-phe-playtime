import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const LanguageToggle = () => {
  const { lang, setLang } = useI18n();
  const next = lang === "en" ? "sw" : "en";
  return (
    <Button
      onClick={() => setLang(next)}
      variant="outline"
      size="lg"
      className="font-bold"
      aria-label={lang === "en" ? "Switch to Swahili" : "Badilisha kwa Kiingereza"}
      title={lang === "en" ? "Switch to Swahili" : "Switch to English"}
    >
      <Languages className="w-4 h-4 mr-2" />
      {lang === "en" ? "SW" : "EN"}
    </Button>
  );
};
