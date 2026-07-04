import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isBookmarked, toggleBookmark, type BookmarkTarget } from "@/lib/bookmarks";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Props extends BookmarkTarget {
  size?: "sm" | "lg" | "default" | "icon";
  variant?: "outline" | "ghost" | "secondary";
  showLabel?: boolean;
}

export const BookmarkButton = ({ topicId, lessonId, size = "lg", variant = "outline", showLabel = true }: Props) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [on, setOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUserId(session.user.id);
      setOn(await isBookmarked(session.user.id, { topicId, lessonId }));
    })();
  }, [topicId, lessonId]);

  const handle = async () => {
    if (!userId) { navigate("/auth"); return; }
    setLoading(true);
    const next = await toggleBookmark(userId, { topicId, lessonId });
    setOn(next);
    setLoading(false);
    toast({ title: next ? "Saved to favourites ❤️" : "Removed from favourites" });
  };

  return (
    <Button onClick={handle} disabled={loading} size={size} variant={variant} className="font-bold">
      <Heart className={`w-5 h-5 ${showLabel ? "mr-2" : ""} ${on ? "fill-rose-500 text-rose-500" : ""}`} />
      {showLabel && (on ? "Saved" : "Save")}
    </Button>
  );
};
