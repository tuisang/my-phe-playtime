import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Accessibility, RotateCcw } from "lucide-react";
import { useA11y } from "@/lib/a11y";
import { useI18n } from "@/lib/i18n";

export const AccessibilityMenu = () => {
  const { largeText, dyslexic, highContrast, toggle, reset } = useA11y();
  const { lang } = useI18n();
  const L = (en: string, sw: string) => (lang === "sw" ? sw : en);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="font-bold"
          aria-label={L("Accessibility options", "Chaguo za ufikivu")}
          title={L("Accessibility", "Ufikivu")}
        >
          <Accessibility className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{L("Reading options", "Chaguo za kusoma")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={largeText}
          onCheckedChange={() => toggle("largeText")}
        >
          {L("Larger text", "Andiko kubwa")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={dyslexic}
          onCheckedChange={() => toggle("dyslexic")}
        >
          {L("Dyslexia-friendly font", "Fonti rafiki kwa dyslexia")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={highContrast}
          onCheckedChange={() => toggle("highContrast")}
        >
          {L("High contrast", "Utofautishaji wa juu")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={reset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          {L("Reset", "Weka upya")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
