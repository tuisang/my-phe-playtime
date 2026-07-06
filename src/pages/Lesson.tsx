import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Download, FileText, Image as ImageIcon, PlayCircle, Lock } from "lucide-react";
import { getGradeLabel } from "@/lib/grades";
import { useToast } from "@/hooks/use-toast";
import { openSecureDownload } from "@/lib/secureDownload";
import { BookmarkButton } from "@/components/BookmarkButton";
import { SpeakButton } from "@/components/SpeakButton";
import { useI18n } from "@/lib/i18n";

interface LessonData {
  id: string;
  title: string;
  description: string;
  grade: number;
  price: number;
  video_url: string | null;
  notes_pdf_url: string | null;
  illustration_pdf_url: string | null;
}

const Lesson = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [isPurchased, setIsPurchased] = useState(false);
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

        // Check if purchased
        const { data: payment } = await supabase
          .from("payments")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("lesson_id", id)
          .eq("status", "completed")
          .maybeSingle();

        setIsPurchased(!!payment);
      }

      // Fetch lesson
      const { data: lessonData } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", id)
        .single();

      if (lessonData) {
        setLesson(lessonData);
      }

      setIsLoading(false);
    };

    fetchData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [id]);

  const handlePayment = () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    toast({
      title: "M-PESA Integration Coming Soon",
      description: "Payment processing with M-PESA will be integrated in the next update!",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
        <Navbar user={user} userRole={userRole} />
        <main className="container mx-auto px-4 py-12">
          <div className="text-center">Loading...</div>
        </main>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
        <Navbar user={user} userRole={userRole} />
        <main className="container mx-auto px-4 py-12">
          <div className="text-center">Lesson not found</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <Navbar user={user} userRole={userRole} />
      
      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <Button
          onClick={() => navigate(`/grade/${lesson.grade}`)}
          variant="outline"
          size="lg"
          className="mb-6 font-bold"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to {getGradeLabel(lesson.grade)}
        </Button>

        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <Badge className="mb-4 text-lg px-4 py-2">{getGradeLabel(lesson.grade)}</Badge>
            <div className="flex items-center gap-2">
              <SpeakButton
                text={`${useI18n().tr(lesson.title)}. ${useI18n().tr(lesson.description ?? "")}`}
                label="Read aloud"
                size="lg"
              />
              <BookmarkButton lessonId={lesson.id} />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 text-foreground">{useI18n().tr(lesson.title)}</h1>
          <p className="text-xl text-muted-foreground">{useI18n().tr(lesson.description ?? "")}</p>
        </div>

        {lesson.video_url && (
          <Card className="mb-8 overflow-hidden border-4 border-primary/20">
            <div className="aspect-video bg-muted flex items-center justify-center">
              <div className="text-center">
                <PlayCircle className="w-20 h-20 text-primary mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">Video player will be embedded here</p>
                <p className="text-sm text-muted-foreground mt-2">{lesson.video_url}</p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-8 border-4 border-primary/20 shadow-xl">
          <h2 className="text-3xl font-bold mb-6 text-foreground">Lesson Materials</h2>
          
          <div className="space-y-4 mb-8">
            {lesson.notes_pdf_url && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                <div className="flex items-center gap-4">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-bold text-lg">Lesson Notes (PDF)</p>
                    <p className="text-sm text-muted-foreground">Detailed lesson content and activities</p>
                  </div>
                </div>
                {isPurchased ? (
                  <Button
                    size="lg"
                    className="font-bold"
                    onClick={() => openSecureDownload({ url: lesson.notes_pdf_url!, lessonId: lesson.id })}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                ) : (
                  <Lock className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
            )}

            {lesson.illustration_pdf_url && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                <div className="flex items-center gap-4">
                  <ImageIcon className="w-8 h-8 text-secondary" />
                  <div>
                    <p className="font-bold text-lg">Activity Illustrations (PDF)</p>
                    <p className="text-sm text-muted-foreground">Colorful images showing the activities</p>
                  </div>
                </div>
                {isPurchased ? (
                  <Button
                    size="lg"
                    variant="secondary"
                    className="font-bold"
                    onClick={() => openSecureDownload({ url: lesson.illustration_pdf_url!, lessonId: lesson.id })}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                ) : (
                  <Lock className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
            )}
          </div>

          {!isPurchased && (
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-8 rounded-2xl border-2 border-primary/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold mb-2">Unlock All Materials</p>
                  <p className="text-muted-foreground">Get instant access to all lesson content</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-primary mb-2">KES {lesson.price}</p>
                  <Button 
                    onClick={handlePayment} 
                    size="lg" 
                    className="font-bold text-lg px-8 py-6"
                  >
                    Pay with M-PESA
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isPurchased && (
            <div className="bg-gradient-to-r from-accent/20 to-secondary/20 p-6 rounded-2xl border-2 border-accent">
              <p className="text-center text-lg font-bold text-foreground">
                ✓ You own this lesson! Download materials anytime.
              </p>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Lesson;
