import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Star, Trophy, RotateCcw, Sparkles } from "lucide-react";
import { awardPoints, POINTS } from "@/lib/gamification";
import { useToast } from "@/hooks/use-toast";
import { SpeakButton } from "@/components/SpeakButton";
import { useI18n } from "@/lib/i18n";

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
}

interface Props {
  topicId: string;
  userId: string | null;
  onCompleted?: (stars: number) => void;
}

export const Quiz = ({ topicId, userId, onCompleted }: Props) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("quiz_questions")
        .select("id, question, options, correct_index")
        .eq("topic_id", topicId)
        .order("sort_order", { ascending: true });
      setQuestions((data || []).map((q: any) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
      })));
      setLoading(false);
    })();
  }, [topicId]);

  const reset = () => { setAnswers({}); setSubmitted(false); setScore(0); setStars(0); };

  const submit = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast({ title: "Please answer every question", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const s = questions.filter(q => answers[q.id] === q.correct_index).length;
    const pct = s / questions.length;
    const st = pct >= 1 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0;
    setScore(s); setStars(st); setSubmitted(true);
    if (userId) {
      await supabase.from("quiz_attempts").insert({
        user_id: userId, topic_id: topicId, score: s, total: questions.length, stars: st,
      });
      if (st > 0) await awardPoints(userId, st * POINTS.per_star, "quiz_stars", topicId);
    }
    onCompleted?.(st);
    setSubmitting(false);
  };

  if (loading) return null;
  if (!questions.length) return null;

  return (
    <section className="mt-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold">Quick Quiz</h2>
      </div>

      <Card className="p-6 md:p-8 border-4 border-yellow-300/50 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
        {!submitted ? (
          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="space-y-3">
                <div className="flex items-start gap-2">
                  <p className="font-bold text-lg text-foreground flex-1">{idx + 1}. {q.question}</p>
                  <SpeakButton
                    text={`Question ${idx + 1}. ${q.question}. Options: ${q.options.join(". ")}`}
                    variant="ghost"
                  />
                </div>
                <RadioGroup
                  value={answers[q.id]?.toString() ?? ""}
                  onValueChange={(v) => setAnswers({ ...answers, [q.id]: Number(v) })}
                >
                  {q.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-background/40 border-2 border-transparent hover:border-primary/40 transition-colors">
                      <RadioGroupItem value={i.toString()} id={`${q.id}-${i}`} />
                      <Label htmlFor={`${q.id}-${i}`} className="text-base cursor-pointer flex-1">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
            <Button onClick={submit} disabled={submitting} size="lg" className="w-full font-bold text-lg">
              {submitting ? "Checking..." : "Submit answers"}
            </Button>
          </div>
        ) : (
          <div className="text-center py-4 space-y-4">
            <Trophy className="w-16 h-16 mx-auto text-yellow-500" />
            <h3 className="text-3xl font-bold">You scored {score} / {questions.length}!</h3>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map(i => (
                <Star key={i} className={`w-12 h-12 ${i <= stars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
              ))}
            </div>
            {stars > 0 && userId && (
              <p className="text-lg font-semibold text-primary">+{stars * POINTS.per_star} points earned!</p>
            )}
            <Button onClick={reset} variant="outline" size="lg" className="font-bold">
              <RotateCcw className="w-4 h-4 mr-2" /> Try again
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
};
