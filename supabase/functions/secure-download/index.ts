import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "lesson-media";
const SIGNED_TTL = 120; // seconds

function extractPath(input: string): string | null {
  if (!input) return null;
  // Match anything after `/lesson-media/` (public or sign URLs), else assume raw path
  const m = input.match(/\/lesson-media\/(.+?)(\?|$)/);
  if (m) return decodeURIComponent(m[1]);
  if (!input.startsWith("http")) return input.replace(/^\/+/, "");
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller using the anon client + their JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { url, lessonId, resourceId } = body as {
      url?: string;
      lessonId?: string;
      resourceId?: string;
    };

    if (!url && !resourceId && !lessonId) {
      return new Response(JSON.stringify({ error: "Missing url/resourceId/lessonId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for privileged checks + signing
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Admin/teacher bypass
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isPrivileged = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "teacher");

    let targetUrl = url ?? "";
    let gatedLessonId: string | null = lessonId ?? null;

    // Resolve a resourceId to its stored URL (topic resources — gate on any paid lesson in that topic)
    if (resourceId) {
      const { data: res, error } = await admin
        .from("topic_resources")
        .select("url, topic_id")
        .eq("id", resourceId)
        .maybeSingle();
      if (error || !res) {
        return new Response(JSON.stringify({ error: "Resource not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUrl = res.url;

      if (!isPrivileged) {
        // Require a completed payment for ANY lesson in this topic
        const { data: lessonsInTopic } = await admin
          .from("lessons")
          .select("id")
          .eq("topic_id", res.topic_id);
        const ids = (lessonsInTopic ?? []).map((l: any) => l.id);
        if (ids.length === 0) {
          return new Response(JSON.stringify({ error: "Locked" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: pay } = await admin
          .from("payments")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "completed")
          .in("lesson_id", ids)
          .limit(1)
          .maybeSingle();
        if (!pay) {
          return new Response(JSON.stringify({ error: "Payment required" }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } else if (gatedLessonId && !isPrivileged) {
      // Gate by lesson payment
      const { data: pay } = await admin
        .from("payments")
        .select("id")
        .eq("user_id", userId)
        .eq("lesson_id", gatedLessonId)
        .eq("status", "completed")
        .maybeSingle();
      if (!pay) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const path = extractPath(targetUrl);
    if (!path) {
      return new Response(JSON.stringify({ error: "Invalid file URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_TTL);
    if (signErr || !signed) {
      return new Response(JSON.stringify({ error: signErr?.message ?? "Sign failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: signed.signedUrl, expiresIn: SIGNED_TTL }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
