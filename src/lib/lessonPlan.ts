import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { getGradeLabel } from "@/lib/grades";

export type Term = 1 | 2 | 3;

export interface LessonPlanOptions {
  grade: number;
  term: Term;
  schoolName?: string;
  teacherName?: string;
}

interface TopicRow {
  id: string;
  title: string;
  description: string;
  grade: number;
  created_at: string;
}

interface LessonRow {
  id: string;
  title: string;
  description: string;
  topic_id: string | null;
}

const WEEKS_PER_TERM = 13;

/**
 * Split ordered topics across the 3 terms as evenly as possible.
 * Term N returns the slice of topics allocated to that term.
 */
function topicsForTerm(all: TopicRow[], term: Term): TopicRow[] {
  const n = all.length;
  if (n === 0) return [];
  const per = Math.ceil(n / 3);
  const start = (term - 1) * per;
  return all.slice(start, start + per);
}

export async function generateLessonPlanPDF(opts: LessonPlanOptions): Promise<void> {
  const { grade, term, schoolName, teacherName } = opts;

  const { data: topicsData, error: tErr } = await supabase
    .from("topics")
    .select("id,title,description,grade,created_at")
    .eq("grade", grade)
    .eq("published", true)
    .order("created_at", { ascending: true });
  if (tErr) throw tErr;
  const topics = (topicsData ?? []) as TopicRow[];

  const termTopics = topicsForTerm(topics, term);
  const topicIds = termTopics.map((t) => t.id);

  let lessons: LessonRow[] = [];
  if (topicIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from("lessons")
      .select("id,title,description,topic_id")
      .in("topic_id", topicIds)
      .eq("published", true)
      .order("created_at", { ascending: true });
    lessons = (lessonsData ?? []) as LessonRow[];
  }
  const lessonsByTopic = lessons.reduce<Record<string, LessonRow[]>>((acc, l) => {
    const k = l.topic_id ?? "_";
    (acc[k] ||= []).push(l);
    return acc;
  }, {});

  // Build weekly schedule: distribute topics across ~13 weeks
  const weeks = WEEKS_PER_TERM;
  const schedule: { week: number; topic?: TopicRow; focus: string }[] = [];
  if (termTopics.length === 0) {
    for (let w = 1; w <= weeks; w++) {
      schedule.push({ week: w, focus: "Revision / catch-up" });
    }
  } else {
    const weeksPerTopic = Math.max(1, Math.floor(weeks / termTopics.length));
    let w = 1;
    termTopics.forEach((topic, idx) => {
      const span =
        idx === termTopics.length - 1 ? weeks - (w - 1) : weeksPerTopic;
      for (let i = 0; i < span && w <= weeks; i++, w++) {
        const topicLessons = lessonsByTopic[topic.id] ?? [];
        const focus =
          topicLessons.length > 0
            ? topicLessons[i % topicLessons.length].title
            : `${topic.title} — activity ${i + 1}`;
        schedule.push({ week: w, topic, focus });
      }
    });
    while (schedule.length < weeks) {
      schedule.push({ week: schedule.length + 1, focus: "Revision & assessment" });
    }
  }

  // ---- PDF layout ----
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const wrap = (text: string, size: number, maxW: number): string[] => {
    doc.setFontSize(size);
    return doc.splitTextToSize(text || "", maxW) as string[];
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("My PHE Today", margin, y);
  y += 24;
  doc.setFontSize(16);
  doc.text(`Termly Lesson Plan — ${getGradeLabel(grade)} — Term ${term}`, margin, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80);
  const meta: string[] = [];
  if (schoolName) meta.push(`School: ${schoolName}`);
  if (teacherName) meta.push(`Teacher: ${teacherName}`);
  meta.push(`Subject: Physical & Health Education`);
  meta.push(`Weeks: ${weeks}`);
  meta.push(`Generated: ${new Date().toLocaleDateString()}`);
  meta.forEach((line) => {
    doc.text(line, margin, y);
    y += 14;
  });
  doc.setTextColor(0);
  y += 6;

  // Overview
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Overview", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const overview =
    termTopics.length > 0
      ? `This term covers ${termTopics.length} topic${termTopics.length === 1 ? "" : "s"}: ${termTopics.map((t) => t.title).join(", ")}. Pupils will build physical skills, health awareness, and teamwork through practical activities.`
      : `No topics have been published for ${getGradeLabel(grade)} yet. Add topics in the admin panel to generate a full plan.`;
  wrap(overview, 11, pageW - margin * 2).forEach((line) => {
    ensureSpace(14);
    doc.text(line, margin, y);
    y += 14;
  });
  y += 8;

  // Weekly schedule table
  ensureSpace(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Weekly Schedule", margin, y);
  y += 18;

  const colW = [50, 170, pageW - margin * 2 - 50 - 170];
  const headers = ["Week", "Topic", "Lesson focus"];
  const drawRow = (cells: string[], bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10);
    const wrapped = cells.map((c, i) => wrap(c, 10, colW[i] - 8));
    const rowH = Math.max(...wrapped.map((w) => w.length)) * 12 + 8;
    ensureSpace(rowH);
    // borders
    let x = margin;
    doc.setDrawColor(200);
    for (let i = 0; i < cells.length; i++) {
      doc.rect(x, y, colW[i], rowH);
      wrapped[i].forEach((line, idx) => {
        doc.text(line, x + 4, y + 12 + idx * 12);
      });
      x += colW[i];
    }
    y += rowH;
  };
  drawRow(headers, true);
  schedule.forEach((row) => {
    drawRow([
      String(row.week),
      row.topic?.title ?? "—",
      row.focus,
    ]);
  });
  y += 10;

  // Topic details
  termTopics.forEach((topic) => {
    ensureSpace(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(topic.title, margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    wrap(topic.description || "", 11, pageW - margin * 2).forEach((line) => {
      ensureSpace(14);
      doc.text(line, margin, y);
      y += 14;
    });
    const topicLessons = lessonsByTopic[topic.id] ?? [];
    if (topicLessons.length > 0) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      ensureSpace(16);
      doc.text("Suggested lessons:", margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      topicLessons.forEach((l) => {
        wrap(`• ${l.title}`, 11, pageW - margin * 2 - 12).forEach((line, idx) => {
          ensureSpace(14);
          doc.text(line, margin + (idx === 0 ? 0 : 12), y);
          y += 14;
        });
      });
    }
    y += 10;
  });

  // Assessment
  ensureSpace(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Assessment", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  [
    "Weekly practical observation (participation, effort, safety).",
    "End-of-topic quiz using the in-app quizzes.",
    "End-of-term skills demonstration and short written reflection.",
  ].forEach((line) => {
    wrap(`• ${line}`, 11, pageW - margin * 2).forEach((l) => {
      ensureSpace(14);
      doc.text(l, margin, y);
      y += 14;
    });
  });

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `My PHE Today • ${getGradeLabel(grade)} • Term ${term} • Page ${p} / ${pageCount}`,
      margin,
      pageH - 20,
    );
  }

  const filename = `lesson-plan-grade-${grade}-term-${term}.pdf`;
  doc.save(filename);
}
