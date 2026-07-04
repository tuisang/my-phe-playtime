import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getGradeLabel } from "@/lib/grades";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";

interface Topic { id: string; title: string; grade: number; }
interface Q {
  id: string; topic_id: string; question: string; options: string[]; correct_index: number; sort_order: number;
}

const empty: Q = { id: "", topic_id: "", question: "", options: ["", "", "", ""], correct_index: 0, sort_order: 0 };

export const QuizzesManager = () => {
  const { toast } = useToast();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Q>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("topics").select("id,title,grade").order("grade").order("title");
      setTopics(data || []);
    })();
  }, []);

  const loadQuestions = async (topicId: string) => {
    if (!topicId) { setQuestions([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("quiz_questions")
      .select("id, topic_id, question, options, correct_index, sort_order")
      .eq("topic_id", topicId)
      .order("sort_order");
    setQuestions((data || []).map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : ["", "", "", ""] })));
    setLoading(false);
  };

  useEffect(() => { loadQuestions(selectedTopic); }, [selectedTopic]);

  const startNew = () => {
    if (!selectedTopic) { toast({ title: "Pick a topic first", variant: "destructive" }); return; }
    setForm({ ...empty, topic_id: selectedTopic, sort_order: questions.length });
    setOpen(true);
  };
  const startEdit = (q: Q) => { setForm(q); setOpen(true); };

  const save = async () => {
    if (!form.question.trim() || form.options.some(o => !o.trim())) {
      toast({ title: "Fill in the question and all 4 options", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload = {
      topic_id: form.topic_id,
      question: form.question.trim(),
      options: form.options.map(o => o.trim()),
      correct_index: form.correct_index,
      sort_order: form.sort_order,
    };
    const { error } = form.id
      ? await supabase.from("quiz_questions").update(payload).eq("id", form.id)
      : await supabase.from("quiz_questions").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: form.id ? "Question updated" : "Question added" });
    setOpen(false);
    loadQuestions(selectedTopic);
  };

  const remove = async (q: Q) => {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("quiz_questions").delete().eq("id", q.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Question deleted" }); loadQuestions(selectedTopic); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-end justify-between">
        <div className="flex-1 max-w-md">
          <Label>Topic</Label>
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger><SelectValue placeholder="Choose a topic..." /></SelectTrigger>
            <SelectContent>
              {topics.map(t => (
                <SelectItem key={t.id} value={t.id}>{getGradeLabel(t.grade)} · {t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={startNew} className="font-bold"><Plus className="w-4 h-4 mr-1" />Add question</Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : !selectedTopic ? (
        <Card className="p-8 text-center text-muted-foreground">Choose a topic to manage its quiz.</Card>
      ) : questions.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No questions yet. Add the first one!</Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-bold mb-2">{i + 1}. {q.question}</p>
                  <ul className="space-y-1 text-sm">
                    {q.options.map((o, oi) => (
                      <li key={oi} className={`flex items-center gap-2 ${oi === q.correct_index ? "text-green-600 font-semibold" : "text-muted-foreground"}`}>
                        {oi === q.correct_index && <CheckCircle2 className="w-4 h-4" />}
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(q)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(q)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Edit question" : "New question"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Question</Label>
              <Textarea value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} rows={2} />
            </div>
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={form.correct_index === i}
                  onChange={() => setForm({ ...form, correct_index: i })}
                  className="w-5 h-5 accent-primary"
                />
                <Input
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={e => {
                    const next = [...form.options];
                    next[i] = e.target.value;
                    setForm({ ...form, options: next });
                  }}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Tick the radio next to the correct answer.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
