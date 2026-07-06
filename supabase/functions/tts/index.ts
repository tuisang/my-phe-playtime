import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { text, voice } = await req.json();
    if (typeof text !== 'string' || !text.trim()) {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clipped = text.slice(0, 2000);

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini-tts',
        input: clipped,
        voice: voice || 'alloy',
        response_format: 'mp3',
        speed: 0.95,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => '');
      console.error('TTS failed', aiRes.status, errText);
      return new Response(JSON.stringify({ error: `TTS failed: ${aiRes.status}`, details: errText }), {
        status: aiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const audio = await aiRes.arrayBuffer();
    return new Response(audio, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    console.error('tts error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
