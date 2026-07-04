import { supabase } from "@/integrations/supabase/client";

export type BookmarkTarget = { topicId?: string; lessonId?: string };

export async function isBookmarked(userId: string, t: BookmarkTarget): Promise<boolean> {
  let q = supabase.from("bookmarks").select("id").eq("user_id", userId);
  q = t.topicId ? q.eq("topic_id", t.topicId).is("lesson_id", null) : q.eq("lesson_id", t.lessonId!).is("topic_id", null);
  const { data } = await q.maybeSingle();
  return !!data;
}

export async function toggleBookmark(userId: string, t: BookmarkTarget): Promise<boolean> {
  const on = await isBookmarked(userId, t);
  if (on) {
    let q = supabase.from("bookmarks").delete().eq("user_id", userId);
    q = t.topicId ? q.eq("topic_id", t.topicId).is("lesson_id", null) : q.eq("lesson_id", t.lessonId!).is("topic_id", null);
    await q;
    return false;
  }
  await supabase.from("bookmarks").insert({
    user_id: userId,
    topic_id: t.topicId ?? null,
    lesson_id: t.lessonId ?? null,
  });
  return true;
}
