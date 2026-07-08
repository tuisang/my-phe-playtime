import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getGradeLabel } from "@/lib/grades";
import { Users, Copy, Trash2, LogOut, Plus, GraduationCap } from "lucide-react";
import {
  createClass,
  deleteClass,
  getClassPupilsWithProgress,
  getMyClassesAsPupil,
  getMyClassesAsTeacher,
  joinClassByCode,
  leaveClass,
  removePupilFromClass,
  type ClassRow,
  type PupilProgressRow,
} from "@/lib/classes";

const GRADES = Array.from({ length: 9 }, (_, i) => i + 1);

const Classes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [teacherClasses, setTeacherClasses] = useState<ClassRow[]>([]);
  const [pupilClasses, setPupilClasses] = useState<(ClassRow & { joined_at: string })[]>([]);

  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [pupilsByClass, setPupilsByClass] = useState<Record<string, PupilProgressRow[]>>({});

  const loadForUser = async (uid: string, r: string) => {
    if (r === "teacher" || r === "admin") {
      const { data } = await getMyClassesAsTeacher(uid);
      setTeacherClasses((data as ClassRow[]) || []);
    }
    if (r === "pupil" || r === "admin") {
      setPupilClasses(await getMyClassesAsPupil(uid));
    }
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();
      const r = roleData?.role || "pupil";
      setRole(r);
      await loadForUser(session.user.id, r);
      setLoading(false);
    })();
  }, [navigate]);

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    setCreating(true);
    const gradeNum = newGrade ? parseInt(newGrade, 10) : null;
    const { data, error } = await createClass(user.id, newName.trim(), gradeNum);
    setCreating(false);
    if (error || !data) {
      toast({ title: "Could not create class", description: (error as any)?.message, variant: "destructive" });
      return;
    }
    setNewName("");
    setNewGrade("");
    toast({ title: "Class created", description: `Share code ${(data as any).join_code} with pupils.` });
    await loadForUser(user.id, role);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this class and remove all pupils from it?")) return;
    const { error } = await deleteClass(id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Class deleted" });
    await loadForUser(user.id, role);
  };

  const handleJoin = async () => {
    if (!user || !joinCode.trim()) return;
    setJoining(true);
    const { data, error } = await joinClassByCode(user.id, joinCode);
    setJoining(false);
    if (error) {
      toast({ title: "Could not join", description: (error as any).message, variant: "destructive" });
      return;
    }
    setJoinCode("");
    toast({ title: "Joined class", description: `Welcome to ${(data as any).name}!` });
    await loadForUser(user.id, role);
  };

  const handleLeave = async (classId: string) => {
    if (!confirm("Leave this class?")) return;
    await leaveClass(user.id, classId);
    await loadForUser(user.id, role);
  };

  const toggleExpand = async (cls: ClassRow) => {
    if (expandedClass === cls.id) {
      setExpandedClass(null);
      return;
    }
    setExpandedClass(cls.id);
    if (!pupilsByClass[cls.id]) {
      const rows = await getClassPupilsWithProgress(cls.id, cls.grade);
      setPupilsByClass((p) => ({ ...p, [cls.id]: rows }));
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code copied", description: code });
  };

  const removePupil = async (classId: string, pupilId: string) => {
    if (!confirm("Remove this pupil from the class?")) return;
    const { error } = await removePupilFromClass(classId, pupilId);
    if (error) {
      toast({ title: "Remove failed", description: error.message, variant: "destructive" });
      return;
    }
    const cls = teacherClasses.find((c) => c.id === classId);
    if (cls) {
      const rows = await getClassPupilsWithProgress(cls.id, cls.grade);
      setPupilsByClass((p) => ({ ...p, [cls.id]: rows }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
        <Navbar user={user} userRole={role} />
        <main className="container mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  const canTeach = role === "teacher" || role === "admin";
  const canJoin = role === "pupil" || role === "admin";
  const defaultTab = canTeach ? "teacher" : "pupil";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <Navbar user={user} userRole={role} />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">My Classes</h1>
            <p className="text-muted-foreground">
              {canTeach && canJoin ? "Manage classes you teach or the ones you've joined." : canTeach ? "Create classes and track pupil progress." : "Join a class with a code your teacher gave you."}
            </p>
          </div>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="teacher" disabled={!canTeach}>Teaching</TabsTrigger>
            <TabsTrigger value="pupil" disabled={!canJoin}>My classes</TabsTrigger>
          </TabsList>

          {canTeach && (
            <TabsContent value="teacher" className="space-y-6">
              <Card className="p-5 border-4 border-primary/10">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5" /> Create a new class</h2>
                <div className="grid gap-3 md:grid-cols-[1fr,180px,auto]">
                  <div>
                    <Label>Class name</Label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Grade 4 Blue" />
                  </div>
                  <div>
                    <Label>Grade (optional)</Label>
                    <Select value={newGrade} onValueChange={setNewGrade}>
                      <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        {GRADES.map((g) => (
                          <SelectItem key={g} value={String(g)}>{getGradeLabel(g)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleCreate} disabled={creating || !newName.trim()} size="lg" className="font-bold w-full md:w-auto">
                      Create
                    </Button>
                  </div>
                </div>
              </Card>

              {teacherClasses.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">No classes yet. Create your first one above.</Card>
              ) : (
                <div className="space-y-4">
                  {teacherClasses.map((cls) => {
                    const pupils = pupilsByClass[cls.id] || [];
                    const isOpen = expandedClass === cls.id;
                    return (
                      <Card key={cls.id} className="p-5 border-2 border-primary/10">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-bold">{cls.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {cls.grade && <Badge variant="secondary">{getGradeLabel(cls.grade)}</Badge>}
                              <button
                                onClick={() => copyCode(cls.join_code)}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted font-mono text-sm font-bold hover:bg-muted/70 transition"
                                title="Copy join code"
                              >
                                {cls.join_code}
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => toggleExpand(cls)}>
                              <Users className="w-4 h-4 mr-2" />
                              {isOpen ? "Hide pupils" : "View pupils"}
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => handleDelete(cls.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="mt-4 border-t pt-4">
                            {pupils.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No pupils have joined yet. Share the code <span className="font-mono font-bold">{cls.join_code}</span>.</p>
                            ) : (
                              <div className="space-y-2">
                                {pupils.map((p) => {
                                  const pct = p.total > 0 ? (p.done / p.total) * 100 : 0;
                                  return (
                                    <div key={p.pupil_id} className="grid grid-cols-[1fr,auto] items-center gap-3 p-3 rounded-xl bg-muted/40">
                                      <div className="min-w-0">
                                        <p className="font-semibold truncate">{p.full_name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Progress value={pct} className="h-2 flex-1" />
                                          <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">{p.done}/{p.total}</span>
                                        </div>
                                      </div>
                                      <Button variant="ghost" size="icon" onClick={() => removePupil(cls.id, p.pupil_id)} title="Remove pupil">
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}

          {canJoin && (
            <TabsContent value="pupil" className="space-y-6">
              <Card className="p-5 border-4 border-secondary/20">
                <h2 className="text-xl font-bold mb-4">Join a class</h2>
                <div className="flex flex-col md:flex-row gap-3">
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter class code (e.g. AB2CDE)"
                    className="font-mono uppercase tracking-widest text-lg"
                    maxLength={12}
                  />
                  <Button onClick={handleJoin} disabled={joining || !joinCode.trim()} size="lg" className="font-bold">
                    Join
                  </Button>
                </div>
              </Card>

              {pupilClasses.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">You haven't joined any classes yet.</Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {pupilClasses.map((cls) => (
                    <Card key={cls.id} className="p-5 border-2 border-secondary/10">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold">{cls.name}</h3>
                          {cls.grade && <Badge variant="secondary" className="mt-1">{getGradeLabel(cls.grade)}</Badge>}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleLeave(cls.id)}>
                          <LogOut className="w-4 h-4 mr-2" /> Leave
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Classes;
