import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { getCategoryForGrade, getGradeLabel, getGradeShortLabel } from "@/lib/grades";

interface GradeCardProps {
  grade: number;
  lessonCount: number;
}

export const GradeCard = ({ grade, lessonCount }: GradeCardProps) => {
  const category = getCategoryForGrade(grade);
  return (
    <Link to={`/grade/${grade}`}>
      <Card className="group cursor-pointer overflow-hidden border-4 border-primary/20 hover:border-primary transition-all duration-300 hover:scale-105 hover:shadow-2xl">
        <div className={`bg-gradient-to-br ${category.gradient} p-8 text-white`}>
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
          <p className="text-center font-semibold text-foreground">
            Click to explore →
          </p>
        </div>
      </Card>
    </Link>
  );
};
