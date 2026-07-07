import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, FileDown, Loader2 } from "lucide-react";
import { GRADE_CATEGORIES, getGradeLabel } from "@/lib/grades";
import { generateLessonPlanPDF, type Term } from "@/lib/lessonPlan";

const ALL_GRADES = GRADE_CATEGORIES.flatMap((c) => c.grades);

const LessonPlans = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [grade, setGrade] = useState<number>(ALL_GRADES[0] ?? 1);
  const [term, setTerm] = useState<Term>(1);
  const [schoolName, setSchoolName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (role) setUserRole(role.role);
      }
    })();
  }, []);

  const handleGenerate = async () => {
    setBusy(true);
    try {
      await generateLessonPlanPDF({
        grade,
        term,
        schoolName: schoolName.trim() || undefined,
        teacherName: teacherName.trim() || undefined,
      });
      toast({
        title: "Lesson plan ready",
        description: `Downloaded plan for ${getGradeLabel(grade)}, Term ${term}.`,
      });
    } catch (e: any) {
      toast({
        title: "Could not generate plan",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <Navbar user={user} userRole={userRole} />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <Button
          onClick={() => navigate("/")}
          variant="outline"
          size="lg"
          className="mb-6 font-bold"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Termly Lesson Plans
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Auto-generate a downloadable scheme of work from the published topics
            and lessons for any grade.
          </p>
        </div>

        <Card className="p-6 md:p-8 border-4 border-primary/10 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select
                value={String(grade)}
                onValueChange={(v) => setGrade(Number(v))}
              >
                <SelectTrigger id="grade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_GRADES.map((g) => (
                    <SelectItem key={g} value={String(g)}>
                      {getGradeLabel(g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="term">Term</Label>
              <Select
                value={String(term)}
                onValueChange={(v) => setTerm(Number(v) as Term)}
              >
                <SelectTrigger id="term">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Term 1</SelectItem>
                  <SelectItem value="2">Term 2</SelectItem>
                  <SelectItem value="3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school">School (optional)</Label>
              <Input
                id="school"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g. Nairobi Primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher">Teacher name (optional)</Label>
              <Input
                id="teacher"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="e.g. Mr. Otieno"
              />
            </div>
          </div>

          <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            The generated PDF includes a term overview, a 13-week weekly
            schedule, topic details with suggested lessons, and an assessment
            section — all sourced from the topics and lessons published for the
            selected grade.
          </div>

          <Button
            size="lg"
            className="w-full font-bold text-lg py-6"
            onClick={handleGenerate}
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FileDown className="w-5 h-5 mr-2" />
                Generate & Download PDF
              </>
            )}
          </Button>
        </Card>
      </main>
    </div>
  );
};

export default LessonPlans;
