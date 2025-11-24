import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { GradeCard } from "@/components/GradeCard";
import { Skeleton } from "@/components/ui/skeleton";

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
          .single();
        
        if (roleData) {
          setUserRole(roleData.role);
        }
      }

      // Fetch lesson counts per grade
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
            Choose Your Grade
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore fun Physical & Health Education lessons designed just for you!
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <Skeleton key={i} className="h-48 rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
              <GradeCard 
                key={grade} 
                grade={grade} 
                lessonCount={lessonCounts[grade] || 0} 
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
