import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { GradeCard } from "@/components/GradeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { GRADE_CATEGORIES } from "@/lib/grades";

const Home = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [lessonCounts, setLessonCounts] = useState<{ [key: number]: number }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndLessons = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      if (session?.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (roleData) setUserRole(roleData.role);
      }

      const { data: lessons } = await supabase
        .from("lessons")
        .select("grade")
        .eq("published", true);

      if (lessons) {
        const counts: { [key: number]: number } = {};
        lessons.forEach((lesson) => {
          counts[lesson.grade] = (counts[lesson.grade] || 0) + 1;
        });
        setLessonCounts(counts);
      }

      setIsLoading(false);
    };

    fetchUserAndLessons();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <Navbar user={user} userRole={userRole} />

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Choose Your Class
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore fun Physical & Health Education lessons from Pre-Primary to Senior High!
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-12">
            {GRADE_CATEGORIES.map((cat) => (
              <div key={cat.name} className="space-y-4">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cat.grades.map((g) => (
                    <Skeleton key={g} className="h-48 rounded-3xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {GRADE_CATEGORIES.map((cat) => (
              <section key={cat.name}>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`h-12 w-2 rounded-full bg-gradient-to-b ${cat.gradient}`} />
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                      {cat.name}
                    </h2>
                    <p className="text-muted-foreground">
                      {cat.grades.length} {cat.grades.length === 1 ? "class" : "classes"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cat.grades.map((grade) => (
                    <GradeCard
                      key={grade}
                      grade={grade}
                      lessonCount={lessonCounts[grade] || 0}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
