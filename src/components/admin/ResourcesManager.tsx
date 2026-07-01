import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ALL_GRADES, getGradeLabel } from "@/lib/grades";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { FileUploader } from "./FileUploader";

type ResourceType = "pdf_notes" | "whiteboard_animation" | "video" | "readable_notes";
type Resource = {
  id: string;
  topic_id: string;
  type: ResourceType;
  title: string;
  description: string | null;
  url: string;
  sort_order: number;
};
type TopicLite = { id: string; title: string; grade: number };

const TYPE_LABELS: Record<ResourceType, string> = {
  pdf_notes: "PDF Notes",
  whiteboard_animation: "Whiteboard Animation",
  video: "Video",
  readable_notes: "Readable Notes",
};

const ACCEPT_BY_TYPE: Record<ResourceType, string> = {
  pdf_notes: "application/pdf",
  whiteboard_animation: "video/*",
  video: "video/*",
  readable_notes: "application/pdf,image/*",
};

const BUCKET_BY_TYPE: Record<ResourceType, "pdfs" | "illustrations" | "videos"> = {
  pdf_notes: "pdfs",
  whiteboard_animation: "videos",
  video: "videos",
  readable_notes: "illustrations",
};

const empty: Resource = {
  id: "", topic_id: "", type: "pdf_notes", title: "", description: "", url: "", sort_order: 0,
};

export const ResourcesManager = () => {
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [topics, setTopics] = useState<TopicLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Resource>(empty);
  const [saving, setSaving] = useState(false);
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterTopic, setFilterTopic] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const [{ data: r }, { data: t }] = await Promise.all([
      supabase.from("topic_resources").select("*").order("sort_order"),
      supabase.from("topics").select("id,title,grade").order("grade").order("title"),
    ]);
    setResources((r as Resource[]) || []);
    setTopics(t || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const topicMap = Object.fromEntries(topics.map(t => [t.id, t]));

  const startNew = () => {
    setForm({ ...empty, topic_id: topics[0]?.id || "" });
    setOpen(true);
  };
  const startEdit = (r: Resource) => { setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.title.trim() || !form.url.trim() || !form.topic_id) {
      toast({ title: "Missing fields", description: "Topic, title and file/URL are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      topic_id: form.topic_id,
      type: form.type,
      title: form.title.trim(),
      description: form.description?.trim() || null,
      url: form.url.trim(),
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = form.id
      ? await supabase.from("topic_resources").update(payload).eq("id", form.id)
      : await supabase.from("topic_resources").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: form.id ? "Resource updated" : "Resource added" });
    setOpen(false);
    load();
  };

  const remove = async (r: Resource) => {
    if (!confirm(`Delete resource "${r.title}"?`)) return;
    const { error } = await supabase.from("topic_resources").delete().eq("id", r.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Resource deleted" }); load(); }
  };

  const filtered = resources.filter(r => {
    const t = topicMap[r.topic_id];
    if (filterGrade !== "all" && (!t || String(t.grade) !== filterGrade)) return false;
    if (filterTopic !== "all" && r.topic_id !== filterTopic) return false;
    return true;
  });

  const topicsForFilter = filterGrade === "all" ? topics : topics.filter(t => String(t.grade) === filterGrade);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterGrade} onValueChange={(v) => { setFilterGrade(v); setFilterTopic("all"); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {ALL_GRADES.map(g => <SelectItem key={g} value={String(g)}>{getGradeLabel(g)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTopic} onValueChange={setFilterTopic}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Topic" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {topicsForFilter.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={startNew} className="font-bold" disabled={topics.length === 0}>
          <Plus className="w-4 h-4 mr-1" />New Resource
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No resources</TableCell></TableRow>
            ) : filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell><Badge variant="secondary">{TYPE_LABELS[r.type]}</Badge></TableCell>
                <TableCell>{topicMap[r.topic_id]?.title || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit Resource" : "New Resource"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Topic</Label>
              <Select value={form.topic_id} onValueChange={v => setForm({ ...form, topic_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick topic" /></SelectTrigger>
                <SelectContent>
                  {topics.map(t => <SelectItem key={t.id} value={t.id}>{getGradeLabel(t.grade)} — {t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as ResourceType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as ResourceType[]).map(k => (
                    <SelectItem key={k} value={k}>{TYPE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={120} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} maxLength={500} />
            </div>
            <div>
              <Label>URL</Label>
              <Input placeholder="Paste URL or upload below" value={form.url}
                onChange={e => setForm({ ...form, url: e.target.value })} />
              <div className="mt-2">
                <FileUploader accept={ACCEPT_BY_TYPE[form.type]} folder={`resources/${form.type}`}
                  currentUrl={form.url} onUploaded={(url) => setForm(f => ({ ...f, url }))} />
              </div>
            </div>
            <div>
              <Label>Sort order</Label>
              <Input type="number" value={form.sort_order}
                onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
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
