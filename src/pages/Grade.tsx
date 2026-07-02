import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, FileText, Film, PlayCircle, BookOpen, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { getCategoryForGrade, getGradeLabel } from "@/lib/grades";
import { getCompletedTopicIds } from "@/lib/progress";

interface Topic {
  id: string;
  title: string;
  description: string;
}

interface ResourceCount {
  pdf_notes: number;
  whiteboard_animation: number;
  video: number;
  readable_notes: number;
}

const Grade = () => {
  const { grade } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [counts, setCounts] = useState<Record<string, ResourceCount>>({});
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const gradeNum = parseInt(grade || "1", 10);
  const category = getCategoryForGrade(gradeNum);

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
        setCompletedIds(await getCompletedTopicIds(session.user.id));
      }

      const { data: topicsData } = await supabase
        .from("topics")
        .select("id, title, description")
        .eq("grade", gradeNum)
        .eq("published", true)
        .order("created_at", { ascending: true });

      if (topicsData) {
        setTopics(topicsData);
        const ids = topicsData.map((t) => t.id);
        if (ids.length) {
          const { data: resData } = await supabase
            .from("topic_resources")
            .select("topic_id, type")
            .in("topic_id", ids);
          const map: Record<string, ResourceCount> = {};
          topicsData.forEach((t) => {
            map[t.id] = { pdf_notes: 0, whiteboard_animation: 0, video: 0, readable_notes: 0 };
          });
          resData?.forEach((r: any) => {
            if (map[r.topic_id]) map[r.topic_id][r.type as keyof ResourceCount]++;
          });
          setCounts(map);
        }
      }
      setIsLoading(false);
    };

    fetchData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, [gradeNum]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <Navbar user={user} userRole={userRole} />

      <main className="container mx-auto px-4 py-12">
        <Button onClick={() => navigate("/")} variant="outline" size="lg" className="mb-6 font-bold">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Classes
        </Button>

        <div className={`bg-gradient-to-r ${category.gradient} rounded-3xl p-8 mb-8 text-white shadow-2xl`}>
          <p className="text-sm font-bold uppercase tracking-wider opacity-90 mb-1">{category.name}</p>
          <h1 className="text-5xl font-bold mb-2">{getGradeLabel(gradeNum)}</h1>
          <p className="text-xl">
            {topics.length} PHE topic{topics.length !== 1 ? "s" : ""} ready to explore
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((t) => {
              const c = counts[t.id] || { pdf_notes: 0, whiteboard_animation: 0, video: 0, readable_notes: 0 };
              return (
                <Link key={t.id} to={`/topic/${t.id}`}>
                  <Card className={`group h-full cursor-pointer overflow-hidden border-4 border-transparent hover:${category.borderColor} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}>
                    <div className={`bg-gradient-to-br ${category.gradient} p-6 text-white`}>
                      <h3 className="text-2xl font-bold mb-2">{t.title}</h3>
                      <p className="text-sm opacity-90 line-clamp-2">{t.description}</p>
                    </div>
                    <div className="p-5 bg-card grid grid-cols-2 gap-3 text-sm font-semibold">
                      <div className="flex items-center gap-2 text-foreground">
                        <FileText className="w-4 h-4 text-primary" />
                        {c.pdf_notes} PDF notes
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <Film className="w-4 h-4 text-secondary" />
                        {c.whiteboard_animation} animations
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <PlayCircle className="w-4 h-4 text-accent" />
                        {c.video} videos
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <BookOpen className="w-4 h-4 text-primary" />
                        {c.readable_notes} readers
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Grade;
