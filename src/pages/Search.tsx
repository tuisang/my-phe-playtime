import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { SearchBar } from "@/components/SearchBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getGradeLabel, getCategoryForGrade } from "@/lib/grades";
import { BookOpen, FolderOpen } from "lucide-react";

type TopicHit = { id: string; title: string; description: string | null; grade: number };
type LessonHit = { id: string; title: string; description: string | null; grade: number; topic_id: string | null };

const SearchPage = () => {
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<TopicHit[]>([]);
  const [lessons, setLessons] = useState<LessonHit[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!q) { setTopics([]); setLessons([]); return; }
      setLoading(true);
      const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
      const [{ data: t }, { data: l }] = await Promise.all([
        supabase
          .from("topics")
          .select("id,title,description,grade")
          .or(`title.ilike.${like},description.ilike.${like}`)
          .order("grade")
          .limit(50),
        supabase
          .from("lessons")
          .select("id,title,description,grade,topic_id")
          .eq("published", true)
          .or(`title.ilike.${like},description.ilike.${like}`)
          .order("grade")
          .limit(50),
      ]);
      setTopics((t as TopicHit[]) ?? []);
      setLessons((l as LessonHit[]) ?? []);
      setLoading(false);
    };
    run();
  }, [q]);

  const total = topics.length + lessons.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <Navbar user={user} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Search
        </h1>
        <SearchBar initial={q} autoFocus className="max-w-2xl mb-8" />

        {!q ? (
          <p className="text-muted-foreground">Type a keyword above to find lessons and topics across all classes.</p>
        ) : loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : total === 0 ? (
          <p className="text-muted-foreground">No results for “{q}”.</p>
        ) : (
          <div className="space-y-8">
            {topics.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-secondary" />
                  Topics ({topics.length})
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {topics.map((t) => (
                    <Link key={t.id} to={`/topic/${t.id}`}>
                      <Card className="p-4 hover:border-primary/60 transition-colors border-2">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-bold">{t.title}</h3>
                          <Badge variant="secondary" className={getCategoryForGrade(t.grade)}>
                            {getGradeLabel(t.grade)}
                          </Badge>
                        </div>
                        {t.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                        )}
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {lessons.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Lessons ({lessons.length})
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {lessons.map((l) => (
                    <Link key={l.id} to={`/lesson/${l.id}`}>
                      <Card className="p-4 hover:border-primary/60 transition-colors border-2">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-bold">{l.title}</h3>
                          <Badge variant="secondary" className={getCategoryForGrade(l.grade)}>
                            {getGradeLabel(l.grade)}
                          </Badge>
                        </div>
                        {l.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{l.description}</p>
                        )}
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchPage;
