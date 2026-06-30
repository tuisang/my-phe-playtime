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

type Topic = {
  id: string;
  title: string;
  description: string;
  grade: number;
  published: boolean;
};

const empty = { id: "", title: "", description: "", grade: 1, published: true };

export const TopicsManager = () => {
  const { toast } = useToast();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Topic>(empty);
  const [saving, setSaving] = useState(false);
  const [filterGrade, setFilterGrade] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("topics")
      .select("id,title,description,grade,published")
      .order("grade")
      .order("title");
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setTopics(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startNew = () => { setForm(empty); setOpen(true); };
  const startEdit = (t: Topic) => { setForm(t); setOpen(true); };

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
      published: form.published,
    };
    const { error } = form.id
      ? await supabase.from("topics").update(payload).eq("id", form.id)
      : await supabase.from("topics").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: form.id ? "Topic updated" : "Topic created" });
    setOpen(false);
    load();
  };

  const togglePublish = async (t: Topic) => {
    const { error } = await supabase.from("topics").update({ published: !t.published }).eq("id", t.id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else load();
  };

  const remove = async (t: Topic) => {
    if (!confirm(`Delete topic "${t.title}"? Its lessons and resources will also be removed.`)) return;
    const { error } = await supabase.from("topics").delete().eq("id", t.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Topic deleted" }); load(); }
  };

  const filtered = filterGrade === "all" ? topics : topics.filter(t => String(t.grade) === filterGrade);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Filter:</Label>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {ALL_GRADES.map(g => (
                <SelectItem key={g} value={String(g)}>{getGradeLabel(g)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={startNew} className="font-bold"><Plus className="w-4 h-4 mr-1" />New Topic</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No topics yet</TableCell></TableRow>
            ) : filtered.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.title}</TableCell>
                <TableCell>{getGradeLabel(t.grade)}</TableCell>
                <TableCell>
                  <button onClick={() => togglePublish(t)}>
                    <Badge variant={t.published ? "default" : "secondary"}>
                      {t.published ? "Published" : "Hidden"}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(t)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(t)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit Topic" : "New Topic"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={120} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} maxLength={500} />
            </div>
            <div>
              <Label>Class</Label>
              <Select value={String(form.grade)} onValueChange={v => setForm({ ...form, grade: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_GRADES.map(g => <SelectItem key={g} value={String(g)}>{getGradeLabel(g)}</SelectItem>)}
                </SelectContent>
              </Select>
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
