import { supabase } from "@/integrations/supabase/client";

export interface ClassRow {
  id: string;
  teacher_id: string;
  name: string;
  grade: number | null;
  join_code: string;
  created_at: string;
}

export interface ClassMember {
  id: string;
  class_id: string;
  pupil_id: string;
  joined_at: string;
}

export interface PupilProgressRow {
  pupil_id: string;
  full_name: string;
  done: number;
  total: number;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateJoinCode(len = 6): string {
  let s = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return s;
}

export async function createClass(teacherId: string, name: string, grade: number | null) {
  // Try a few times in case of unique-collision on join_code.
  for (let i = 0; i < 4; i++) {
    const code = generateJoinCode(6);
    const { data, error } = await supabase
      .from("classes")
      .insert({ teacher_id: teacherId, name, grade, join_code: code })
      .select()
      .maybeSingle();
    if (!error) return { data, error: null as any };
    if (!`${error.message}`.toLowerCase().includes("duplicate")) return { data: null, error };
  }
  return { data: null, error: new Error("Could not generate a unique join code, try again") };
}

export async function updateClass(id: string, patch: { name?: string; grade?: number | null }) {
  return supabase.from("classes").update(patch).eq("id", id);
}

export async function deleteClass(id: string) {
  return supabase.from("classes").delete().eq("id", id);
}

export async function getMyClassesAsTeacher(teacherId: string) {
  return supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
}

export async function getMyClassesAsPupil(pupilId: string) {
  const { data: memberships } = await supabase
    .from("class_members")
    .select("class_id, joined_at, classes ( id, name, grade, join_code, teacher_id, created_at )")
    .eq("pupil_id", pupilId);
  return (memberships || []).map((m: any) => ({ ...(m.classes as ClassRow), joined_at: m.joined_at }));
}

export async function joinClassByCode(pupilId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase();
  const { data: cls, error: findErr } = await supabase
    .from("classes")
    .select("id, name")
    .eq("join_code", code)
    .maybeSingle();
  if (findErr) return { data: null, error: findErr };
  if (!cls) return { data: null, error: new Error("No class matches that code") };
  const { error: insertErr } = await supabase
    .from("class_members")
    .insert({ class_id: cls.id, pupil_id: pupilId });
  if (insertErr && !`${insertErr.message}`.toLowerCase().includes("duplicate")) {
    return { data: null, error: insertErr };
  }
  return { data: cls, error: null as any };
}

export async function leaveClass(pupilId: string, classId: string) {
  return supabase
    .from("class_members")
    .delete()
    .eq("class_id", classId)
    .eq("pupil_id", pupilId);
}

export async function removePupilFromClass(classId: string, pupilId: string) {
  return supabase
    .from("class_members")
    .delete()
    .eq("class_id", classId)
    .eq("pupil_id", pupilId);
}

export async function getClassPupilsWithProgress(classId: string, grade: number | null): Promise<PupilProgressRow[]> {
  const { data: members } = await supabase
    .from("class_members")
    .select("pupil_id")
    .eq("class_id", classId);
  const pupilIds = (members || []).map((m: any) => m.pupil_id as string);
  if (pupilIds.length === 0) return [];

  const [profilesRes, progressRes, topicsRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", pupilIds),
    supabase.from("topic_progress").select("user_id, topic_id").in("user_id", pupilIds),
    grade
      ? supabase.from("topics").select("id, grade").eq("published", true).eq("grade", grade)
      : supabase.from("topics").select("id, grade").eq("published", true),
  ]);

  const totalTopics = (topicsRes.data || []).length;
  const relevantTopicIds = new Set((topicsRes.data || []).map((t: any) => t.id));
  const doneByUser: Record<string, number> = {};
  (progressRes.data || []).forEach((p: any) => {
    if (relevantTopicIds.has(p.topic_id)) {
      doneByUser[p.user_id] = (doneByUser[p.user_id] || 0) + 1;
    }
  });
  const nameById: Record<string, string> = {};
  (profilesRes.data || []).forEach((p: any) => {
    nameById[p.id] = p.full_name || "Pupil";
  });

  return pupilIds.map((pid) => ({
    pupil_id: pid,
    full_name: nameById[pid] || "Pupil",
    done: doneByUser[pid] || 0,
    total: totalTopics,
  }));
}
