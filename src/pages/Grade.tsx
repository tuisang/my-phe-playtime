import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { LessonCard } from "@/components/LessonCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryForGrade, getGradeLabel } from "@/lib/grades";

interface Lesson {
  id: string;
  title: string;
  description: string;
  price: number;
  video_url: string | null;
}

const Grade = () => {
  const { grade } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [purchasedLessons, setPurchasedLessons] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      if (session?.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();
        
        if (roleData) {
          setUserRole(roleData.role);
        }

        // Fetch purchased lessons
        const { data: payments } = await supabase
          .from("payments")
          .select("lesson_id")
          .eq("user_id", session.user.id)
          .eq("status", "completed");

        if (payments) {
          setPurchasedLessons(new Set(payments.map(p => p.lesson_id)));
        }
      }

      // Fetch lessons for this grade
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("grade", parseInt(grade || "1", 10))
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (lessonsData) {
        setLessons(lessonsData);
      }

      setIsLoading(false);
    };

    fetchData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [grade]);

  const gradeNum = parseInt(grade || "1", 10);
  const category = getCategoryForGrade(gradeNum);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <Navbar user={user} userRole={userRole} />

      <main className="container mx-auto px-4 py-12">
        <Button
          onClick={() => navigate("/")}
          variant="outline"
          size="lg"
          className="mb-6 font-bold"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Classes
        </Button>

        <div className={`bg-gradient-to-r ${category.gradient} rounded-3xl p-8 mb-8 text-white shadow-2xl`}>
          <p className="text-sm font-bold uppercase tracking-wider opacity-90 mb-1">
            {category.name}
          </p>
          <h1 className="text-5xl font-bold mb-2">{getGradeLabel(gradeNum)}</h1>
          <p className="text-xl">
            {lessons.length} exciting PHE lesson{lessons.length !== 1 ? 's' : ''} waiting for you!
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl text-muted-foreground">
              No lessons available yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                id={lesson.id}
                title={lesson.title}
                description={lesson.description}
                price={lesson.price}
                hasVideo={!!lesson.video_url}
                isPurchased={purchasedLessons.has(lesson.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Grade;
