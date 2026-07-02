import { Card } from "@/components/ui/card";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { getCategoryForGrade, getGradeLabel, getGradeShortLabel } from "@/lib/grades";
import { Progress } from "@/components/ui/progress";

interface GradeCardProps {
  grade: number;
  lessonCount: number;
  progress?: { total: number; done: number };
}

export const GradeCard = ({ grade, lessonCount, progress }: GradeCardProps) => {
  const category = getCategoryForGrade(grade);
  const pct = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0;
  const isComplete = progress && progress.total > 0 && progress.done === progress.total;
  return (
    <Link to={`/grade/${grade}`}>
      <Card className="group cursor-pointer overflow-hidden border-4 border-primary/20 hover:border-primary transition-all duration-300 hover:scale-105 hover:shadow-2xl">
        <div className={`bg-gradient-to-br ${category.gradient} p-8 text-white relative`}>
          {isComplete && (
            <div className="absolute top-3 right-3 bg-white/20 rounded-full p-1.5">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-5xl font-bold mb-2">{getGradeLabel(grade)}</h2>
              <p className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {lessonCount} Lessons
              </p>
            </div>
            <div className="text-7xl opacity-20 group-hover:opacity-40 transition-opacity font-bold">
              {getGradeShortLabel(grade)}
            </div>
          </div>
        </div>
        <div className="p-4 bg-card">
          {progress && progress.total > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>Progress</span>
                <span>{progress.done} / {progress.total} topics</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          ) : (
            <p className="text-center font-semibold text-foreground">Click to explore →</p>
          )}
        </div>
      </Card>
    </Link>
  );
};

