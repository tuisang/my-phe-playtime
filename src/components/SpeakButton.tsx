import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Pause, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface SpeakButtonProps {
  text: string;
  label?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "secondary" | "outline" | "ghost";
  className?: string;
}

// In-memory audio cache: key = `${lang}::${text}` -> object URL
const audioCache = new Map<string, string>();

export const SpeakButton = ({
  text,
  label,
  size = "sm",
  variant = "outline",
  className,
}: SpeakButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const { lang, tr } = useI18n();

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const spoken = lang === "en" ? text : tr(text);

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
  };

  const handleClick = async () => {
    if (playing) {
      stop();
      return;
    }
    if (!spoken?.trim()) return;

    const key = `${lang}::${spoken}`;
    let url = audioCache.get(key);

    if (!url) {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("tts", {
          body: { text: spoken },
        });
        if (error) throw error;

        // supabase-js returns a Blob when the response is not JSON
        const blob = data instanceof Blob ? data : new Blob([data], { type: "audio/mpeg" });
        url = URL.createObjectURL(blob);
        audioCache.set(key, url);
      } catch (e: any) {
        toast({
          title: "Couldn't read that aloud",
          description: e?.message ?? "Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    audio.onerror = () => {
      setPlaying(false);
      toast({ title: "Playback error", variant: "destructive" });
    };
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  const Icon = loading ? Loader2 : playing ? Pause : Volume2;

  return (
    <Button
      type="button"
      onClick={handleClick}
      size={size}
      variant={variant}
      className={cn("font-bold gap-2", className)}
      aria-label={playing ? "Stop reading" : "Read aloud"}
      disabled={loading || !spoken?.trim()}
    >
      <Icon className={cn("w-4 h-4", loading && "animate-spin")} />
      {label && <span>{label}</span>}
    </Button>
  );
};
