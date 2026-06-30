import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Args = { url?: string; lessonId?: string; resourceId?: string };

export async function openSecureDownload(args: Args) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    toast({ title: "Sign in required", description: "Please sign in to download.", variant: "destructive" });
    return false;
  }

  const { data, error } = await supabase.functions.invoke("secure-download", { body: args });

  if (error || !data?.url) {
    const msg = (data as any)?.error || error?.message || "Unable to fetch download link";
    const isPay = /payment/i.test(msg) || /402/.test(String(error?.message ?? ""));
    toast({
      title: isPay ? "Payment required" : "Download unavailable",
      description: isPay ? "Unlock this lesson with M-PESA to download." : msg,
      variant: "destructive",
    });
    return false;
  }

  window.open(data.url, "_blank", "noopener,noreferrer");
  return true;
}
