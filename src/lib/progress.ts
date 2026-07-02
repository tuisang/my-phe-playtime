import { supabase } from "@/integrations/supabase/client";

export async function isTopicCompleted(userId: string, topicId: string): Promise<boolean> {
  const { data } = await supabase
    .from("topic_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .maybeSingle();
  return !!data;
}

export async function markTopicCompleted(userId: string, topicId: string) {
  return supabase
    .from("topic_progress")
    .upsert({ user_id: userId, topic_id: topicId }, { onConflict: "user_id,topic_id" });
}

export async function unmarkTopicCompleted(userId: string, topicId: string) {
  return supabase
    .from("topic_progress")
    .delete()
    .eq("user_id", userId)
    .eq("topic_id", topicId);
}

export async function getCompletedTopicIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("topic_progress")
    .select("topic_id")
    .eq("user_id", userId);
  return new Set((data || []).map((r: any) => r.topic_id as string));
}

export async function getGradeProgress(userId: string): Promise<Record<number, { total: number; done: number }>> {
  const { data: topics } = await supabase
    .from("topics")
    .select("id, grade")
    .eq("published", true);
  const { data: progress } = await supabase
    .from("topic_progress")
    .select("topic_id")
    .eq("user_id", userId);

  const doneSet = new Set((progress || []).map((p: any) => p.topic_id));
  const map: Record<number, { total: number; done: number }> = {};
  (topics || []).forEach((t: any) => {
    if (!map[t.grade]) map[t.grade] = { total: 0, done: 0 };
    map[t.grade].total += 1;
    if (doneSet.has(t.id)) map[t.grade].done += 1;
  });
  return map;
}
