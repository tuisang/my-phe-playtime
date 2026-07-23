import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, FileText, Film, PlayCircle, BookOpen, Download, ExternalLink, CheckCircle2, Circle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryForGrade, getGradeLabel } from "@/lib/grades";
import { openSecureDownload } from "@/lib/secureDownload";
import { isTopicCompleted, markTopicCompleted, unmarkTopicCompleted } from "@/lib/progress";
import { awardPoints, POINTS } from "@/lib/gamification";
import { BookmarkButton } from "@/components/BookmarkButton";
import { Quiz } from "@/components/Quiz";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { SpeakButton } from "@/components/SpeakButton";

interface Topic {
  id: string;
  title: string;
  description: string;
  grade: number;
}

interface Resource {
  id: string;
  type: "pdf_notes" | "whiteboard_animation" | "video" | "readable_notes";
  title: string;
  description: string | null;
  url: string;
  sort_order: number;
}
// External links (YouTube, Vimeo, etc.) aren't stored in our own Supabase buckets,
// so they can't be signed by the secure-download edge function — open them directly instead.
function isExternalMediaUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url) || !/\/storage\/v1\/object\//.test(url);
}

const SECTIONS: {
  type: Resource["type"];
  label: string;
  icon: typeof FileText;
  accent: string;
  cta: string;
  ctaIcon: typeof Download;
}[] = [
  { type: "pdf_notes", label: "Downloadable PDF Notes", icon: FileText, accent: "from-orange-400 to-rose-400", cta: "Download", ctaIcon: Download },
  { type: "whiteboard_animation", label: "Whiteboard Animations", icon: Film, accent: "from-cyan-400 to-teal-500", cta: "Watch", ctaIcon: PlayCircle },
  { type: "video", label: "Demonstration Videos", icon: PlayCircle, accent: "from-purple-400 to-indigo-500", cta: "Play", ctaIcon: PlayCircle },
  { type: "readable_notes", label: "Readable Notes with Images", icon: BookOpen, accent: "from-emerald-400 to-green-600", cta: "Open", ctaIcon: ExternalLink },
];

const Topic = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const { toast } = useToast();
  const { tr, t } = useI18n();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      if (session?.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (roleData) setUserRole(roleData.role);

        if (id) {
          setCompleted(await isTopicCompleted(session.user.id, id));
        }
      }

      const { data: topicData } = await supabase
        .from("topics")
        .select("id, title, description, grade")
        .eq("id", id)
        .maybeSingle();
      if (topicData) setTopic(topicData);

      const { data: resData } = await supabase
        .from("topic_resources")
        .select("id, type, title, description, url, sort_order")
        .eq("topic_id", id)
        .order("sort_order", { ascending: true });
      if (resData) setResources(resData as Resource[]);

      setIsLoading(false);
    };
    fetchData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
        <Navbar user={user} userRole={userRole} />
        <main className="container mx-auto px-4 py-12 space-y-6">
          <Skeleton className="h-12 w-40" />
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
        <Navbar user={user} userRole={userRole} />
        <main className="container mx-auto px-4 py-12 text-center text-xl">Topic not found.</main>
      </div>
    );
  }

  const category = getCategoryForGrade(topic.grade);

  const toggleCompleted = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setSavingProgress(true);
    if (completed) {
      await unmarkTopicCompleted(user.id, topic.id);
      setCompleted(false);
      toast({ title: "Marked as not done" });
    } else {
      await markTopicCompleted(user.id, topic.id);
      await awardPoints(user.id, POINTS.topic_completed, "topic_completed", topic.id);
      setCompleted(true);
      toast({ title: `Great job! +${POINTS.topic_completed} points 🎉` });
    }
    setSavingProgress(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <Navbar user={user} userRole={userRole} />

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <Button
          onClick={() => navigate(`/grade/${topic.grade}`)}
          variant="outline"
          size="lg"
          className="mb-6 font-bold"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to {getGradeLabel(topic.grade)}
        </Button>

        <div className={`bg-gradient-to-r ${category.gradient} rounded-3xl p-8 mb-6 text-white shadow-2xl`}>
          <Badge className="mb-3 bg-white/20 text-white border-0 text-sm">
            {category.name} · {getGradeLabel(topic.grade)}
          </Badge>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 flex-1">{tr(topic.title)}</h1>
            <SpeakButton
              text={`${tr(topic.title)}. ${tr(topic.description)}`}
              variant="secondary"
              size="lg"
              className="shrink-0 bg-white/20 hover:bg-white/30 text-white border-0"
            />
          </div>
          <p className="text-lg opacity-95">{tr(topic.description)}</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-10">
          {user && (
            <Button
              onClick={toggleCompleted}
              disabled={savingProgress}
              size="lg"
              variant={completed ? "secondary" : "default"}
              className="font-bold text-base"
            >
              {completed ? (
                <><CheckCircle2 className="w-5 h-5 mr-2" /> {t("topic.completedUndo")}</>
              ) : (
                <><Circle className="w-5 h-5 mr-2" /> {t("topic.markCompleted")}</>
              )}
            </Button>
          )}
          <BookmarkButton topicId={topic.id} />
        </div>


        <div className="space-y-10">
          {SECTIONS.map((section) => {
            const items = resources.filter((r) => r.type === section.type);
            const Icon = section.icon;
            const CtaIcon = section.ctaIcon;
            return (
              <section key={section.type}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${section.accent} text-white`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    {section.label}
                  </h2>
                  <Badge variant="secondary" className="ml-auto text-sm">
                    {items.length}
                  </Badge>
                </div>

                {items.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">
                    No {section.label.toLowerCase()} yet.
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((r) => (
                      <Card key={r.id} className="p-5 border-2 hover:border-primary/40 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-foreground mb-1">{tr(r.title)}</h3>
                            {r.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{tr(r.description)}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          className="mt-4 w-full font-bold"
                          size="lg"
                          onClick={() =>
  isExternalMediaUrl(r.url)
    ? window.open(r.url, "_blank", "noopener,noreferrer")
    : openSecureDownload({ resourceId: r.id })
}
                        >
                          <CtaIcon className="w-4 h-4 mr-2" />
                          {section.cta}
                        </Button>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <Quiz topicId={topic.id} userId={user?.id ?? null} />
      </main>
    </div>
  );
};

export default Topic;
