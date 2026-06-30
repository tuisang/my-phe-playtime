import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ALL_GRADES, getGradeLabel } from "@/lib/grades";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { FileUploader } from "./FileUploader";

type Lesson = {
  id: string;
  title: string;
  description: string;
  grade: number;
  topic_id: string | null;
  price: number;
  published: boolean;
  notes_pdf_url: string | null;
  illustration_pdf_url: string | null;
  video_url: string | null;
};

type TopicLite = { id: string; title: string; grade: number };

const empty: Lesson = {
  id: "", title: "", description: "", grade: 1, topic_id: null,
  price: 0, published: true, notes_pdf_url: null, illustration_pdf_url: null, video_url: null,
};

export const LessonsManager = () => {
  const { toast } = useToast();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topics, setTopics] = useState<TopicLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Lesson>(empty);
  const [saving, setSaving] = useState(false);
  const [filterGrade, setFilterGrade] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const [{ data: l }, { data: t }] = await Promise.all([
      supabase.from("lessons").select("*").order("grade").order("title"),
      supabase.from("topics").select("id,title,grade").order("grade").order("title"),
    ]);
    setLessons(l || []);
    setTopics(t || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startNew = () => { setForm(empty); setOpen(true); };
  const startEdit = (l: Lesson) => { setForm(l); setOpen(true); };

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "Missing fields", description: "Title and description are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      grade: form.grade,
      topic_id: form.topic_id,
      price: Number(form.price) || 0,
      published: form.published,
      notes_pdf_url: form.notes_pdf_url,
      illustration_pdf_url: form.illustration_pdf_url,
      video_url: form.video_url,
    };
    const { error } = form.id
      ? await supabase.from("lessons").update(payload).eq("id", form.id)
      : await supabase.from("lessons").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: form.id ? "Lesson updated" : "Lesson created" });
    setOpen(false);
    load();
  };

  const togglePublish = async (l: Lesson) => {
    const { error } = await supabase.from("lessons").update({ published: !l.published }).eq("id", l.id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else load();
  };

  const remove = async (l: Lesson) => {
    if (!confirm(`Delete lesson "${l.title}"?`)) return;
    const { error } = await supabase.from("lessons").delete().eq("id", l.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Lesson deleted" }); load(); }
  };

  const filtered = filterGrade === "all" ? lessons : lessons.filter(l => String(l.grade) === filterGrade);
  const topicsForGrade = topics.filter(t => t.grade === form.grade);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Filter:</Label>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {ALL_GRADES.map(g => <SelectItem key={g} value={String(g)}>{getGradeLabel(g)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={startNew} className="font-bold"><Plus className="w-4 h-4 mr-1" />New Lesson</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Price (KSh)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No lessons yet</TableCell></TableRow>
            ) : filtered.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.title}</TableCell>
                <TableCell>{getGradeLabel(l.grade)}</TableCell>
                <TableCell>{l.price}</TableCell>
                <TableCell>
                  <button onClick={() => togglePublish(l)}>
                    <Badge variant={l.published ? "default" : "secondary"}>
                      {l.published ? "Published" : "Hidden"}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(l)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(l)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit Lesson" : "New Lesson"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={120} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} maxLength={500} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Class</Label>
                <Select value={String(form.grade)} onValueChange={v => setForm({ ...form, grade: Number(v), topic_id: null })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_GRADES.map(g => <SelectItem key={g} value={String(g)}>{getGradeLabel(g)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Topic</Label>
                <Select value={form.topic_id ?? "none"} onValueChange={v => setForm({ ...form, topic_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Select topic" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {topicsForGrade.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Price (KSh)</Label>
              <Input type="number" min={0} step={1} value={form.price}
                onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Video URL (YouTube or upload)</Label>
              <Input placeholder="https://..." value={form.video_url ?? ""}
                onChange={e => setForm({ ...form, video_url: e.target.value || null })} />
              <div className="mt-2">
                <FileUploader accept="video/*" folder="videos"
                  onUploaded={(url) => setForm(f => ({ ...f, video_url: url }))} />
              </div>
            </div>
            <div>
              <Label>Notes PDF</Label>
              <FileUploader accept="application/pdf" folder="notes" currentUrl={form.notes_pdf_url}
                onUploaded={(url) => setForm(f => ({ ...f, notes_pdf_url: url }))} />
            </div>
            <div>
              <Label>Coloured Illustration PDF</Label>
              <FileUploader accept="application/pdf" folder="illustrations" currentUrl={form.illustration_pdf_url}
                onUploaded={(url) => setForm(f => ({ ...f, illustration_pdf_url: url }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.published} onCheckedChange={v => setForm({ ...form, published: v })} />
              <Label>Published</Label>
            </div>
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
