import { supabase } from "@/integrations/supabase/client";

export type PointReason = "topic_completed" | "quiz_stars" | "streak_bonus";

export const POINTS = {
  topic_completed: 10,
  per_star: 5,
  streak_bonus: 3, // per active day
};

export async function awardPoints(userId: string, points: number, reason: PointReason, refId?: string) {
  if (!points) return;
  await supabase.from("user_points").insert({ user_id: userId, points, reason, ref_id: refId ?? null });
}

export interface UserStats {
  points: number;
  streakDays: number;
  badges: Badge[];
  topicsDone: number;
  quizzesTaken: number;
  totalStars: number;
}

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  earned: boolean;
  hint: string;
}

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const days = new Set(dates.map((d) => new Date(d).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  // allow today or yesterday to start
  const todayKey = cursor.toISOString().slice(0, 10);
  if (!days.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const [pointsRes, progressRes, attemptsRes] = await Promise.all([
    supabase.from("user_points").select("points").eq("user_id", userId),
    supabase.from("topic_progress").select("created_at").eq("user_id", userId),
    supabase.from("quiz_attempts").select("stars, created_at").eq("user_id", userId),
  ]);
  const points = (pointsRes.data || []).reduce((s: number, r: any) => s + (r.points || 0), 0);
  const topicsDone = (progressRes.data || []).length;
  const quizzesTaken = (attemptsRes.data || []).length;
  const totalStars = (attemptsRes.data || []).reduce((s: number, r: any) => s + (r.stars || 0), 0);
  const activityDates = [
    ...(progressRes.data || []).map((r: any) => r.created_at),
    ...(attemptsRes.data || []).map((r: any) => r.created_at),
  ];
  const streakDays = computeStreak(activityDates);

  const badges: Badge[] = [
    { id: "first_steps", label: "First Steps", emoji: "🌱", hint: "Finish your first topic", earned: topicsDone >= 1 },
    { id: "quiz_whiz", label: "Quiz Whiz", emoji: "🧠", hint: "Complete 3 quizzes", earned: quizzesTaken >= 3 },
    { id: "star_collector", label: "Star Collector", emoji: "⭐", hint: "Earn 10 stars", earned: totalStars >= 10 },
    { id: "streak_3", label: "On Fire", emoji: "🔥", hint: "3-day streak", earned: streakDays >= 3 },
    { id: "streak_7", label: "Champion", emoji: "🏆", hint: "7-day streak", earned: streakDays >= 7 },
    { id: "explorer", label: "Explorer", emoji: "🗺️", hint: "Finish 10 topics", earned: topicsDone >= 10 },
  ];

  return { points, streakDays, badges, topicsDone, quizzesTaken, totalStars };
}
