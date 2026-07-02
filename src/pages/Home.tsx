import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { GradeCard } from "@/components/GradeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { GRADE_CATEGORIES } from "@/lib/grades";
import { getGradeProgress } from "@/lib/progress";
import { Baby, School, Users, Sparkles } from "lucide-react";

const ROLE_INFO: Record<string, { title: string; blurb: string; icon: typeof Baby; accent: string }> = {
  pupil: { title: "Hi, superstar learner!", blurb: "Pick a class and start playing, watching, and learning.", icon: Baby, accent: "from-orange-400 to-rose-400" },
  teacher: { title: "Welcome, teacher!", blurb: "Browse lessons, download notes, and use resources with your class.", icon: School, accent: "from-purple-400 to-indigo-500" },
  parent: { title: "Hello, parent!", blurb: "Support your child's learning and track progress across classes.", icon: Users, accent: "from-cyan-400 to-teal-500" },
  admin: { title: "Admin dashboard", blurb: "Manage lessons, topics, resources, and pricing from the Admin Panel.", icon: Sparkles, accent: "from-emerald-400 to-green-600" },
};

const Home = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [lessonCounts, setLessonCounts] = useState<{ [key: number]: number }>({});
  const [progressByGrade, setProgressByGrade] = useState<Record<number, { total: number; done: number }>>({});
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
          .maybeSingle();
        if (roleData) setUserRole(roleData.role);
        setProgressByGrade(await getGradeProgress(session.user.id));
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

    fetchData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const roleInfo = userRole ? ROLE_INFO[userRole] : null;
  const RoleIcon = roleInfo?.icon;
  const totalTopics = Object.values(progressByGrade).reduce((s, g) => s + g.total, 0);
  const doneTopics = Object.values(progressByGrade).reduce((s, g) => s + g.done, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <Navbar user={user} userRole={userRole} />

      <main className="container mx-auto px-4 py-8">
        {user && roleInfo && RoleIcon && (
          <Card className={`mb-8 p-6 md:p-8 border-4 border-transparent bg-gradient-to-r ${roleInfo.accent} text-white shadow-xl`}>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <RoleIcon className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold mb-1">{roleInfo.title}</h2>
                <p className="opacity-95">{roleInfo.blurb}</p>
              </div>
              {totalTopics > 0 && userRole !== "admin" && (
                <div className="text-right bg-white/20 rounded-2xl px-5 py-3 backdrop-blur-sm">
                  <p className="text-xs uppercase font-bold opacity-90">Topics done</p>
                  <p className="text-3xl font-bold">{doneTopics} / {totalTopics}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        <div className="text-center mb-10">
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
                      progress={user ? progressByGrade[grade] : undefined}
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
