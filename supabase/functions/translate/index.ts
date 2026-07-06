import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const LANG_NAMES: Record<string, string> = {
  sw: 'Swahili (Kiswahili)',
  en: 'English',
};

async function hash(text: string, lang: string) {
  const data = new TextEncoder().encode(`${lang}::${text}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { texts, target } = await req.json();
    if (!Array.isArray(texts) || !target || !LANG_NAMES[target]) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const cleaned = texts
      .filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
      .slice(0, 50);

    const withHashes = await Promise.all(
      cleaned.map(async (t) => ({ text: t, hash: await hash(t, target) })),
    );

    const hashes = withHashes.map((h) => h.hash);
    const { data: cached } = await admin
      .from('translation_cache')
      .select('source_hash, translated_text')
      .eq('target_lang', target)
      .in('source_hash', hashes);

    const cacheMap = new Map<string, string>();
    (cached ?? []).forEach((r: any) => cacheMap.set(r.source_hash, r.translated_text));

    const missing = withHashes.filter((h) => !cacheMap.has(h.hash));

    if (missing.length > 0 && LOVABLE_API_KEY) {
      const numbered = missing.map((m, i) => `${i + 1}. ${m.text}`).join('\n');
      const prompt = `Translate the following numbered items into ${LANG_NAMES[target]}. Return ONLY a JSON array of strings in the same order, no commentary, no numbering.\n\n${numbered}`;

      const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: 'You are a precise translator for a children\'s educational app. Keep the tone friendly and age-appropriate. Output only valid JSON.' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        let content: string = aiJson.choices?.[0]?.message?.content ?? '[]';
        content = content.replace(/```json\s*|\s*```/g, '').trim();
        let arr: string[] = [];
        try { arr = JSON.parse(content); } catch { arr = []; }

        const rows = missing
          .map((m, i) => ({ m, translated: arr[i] }))
          .filter((r) => typeof r.translated === 'string' && r.translated.length > 0);

        rows.forEach((r) => cacheMap.set(r.m.hash, r.translated!));

        if (rows.length > 0) {
          await admin.from('translation_cache').upsert(
            rows.map((r) => ({
              source_hash: r.m.hash,
              target_lang: target,
              source_text: r.m.text,
              translated_text: r.translated!,
            })),
            { onConflict: 'source_hash,target_lang' },
          );
        }
      }
    }

    const result = withHashes.map((h) => cacheMap.get(h.hash) ?? '');
    return new Response(JSON.stringify({ translations: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('translate error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
