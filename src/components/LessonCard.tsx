import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Lock } from "lucide-react";
import { Link } from "react-router-dom";

interface LessonCardProps {
  id: string;
  title: string;
  description: string;
  price: number;
  hasVideo: boolean;
  isPurchased?: boolean;
}

export const LessonCard = ({ 
  id, 
  title, 
  description, 
  price, 
  hasVideo,
  isPurchased = false 
}: LessonCardProps) => {
  return (
    <Link to={`/lesson/${id}`}>
      <Card className="group cursor-pointer overflow-hidden border-2 hover:border-primary transition-all duration-300 hover:shadow-xl h-full">
        <div className="bg-gradient-to-br from-secondary/20 to-accent/20 p-6 relative">
          {hasVideo && (
            <div className="absolute top-4 right-4">
              <PlayCircle className="w-8 h-8 text-primary" />
            </div>
          )}
          <h3 className="text-2xl font-bold text-foreground mb-2 pr-12">
            {title}
          </h3>
          <p className="text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>
        <div className="p-6 bg-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPurchased ? (
              <Badge variant="secondary" className="text-base px-4 py-1">
                Purchased
              </Badge>
            ) : (
              <Badge variant="default" className="text-base px-4 py-1 bg-primary">
                KES {price}
              </Badge>
            )}
          </div>
          {!isPurchased && (
            <Lock className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </Card>
    </Link>
  );
};
