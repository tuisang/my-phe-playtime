import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useState, KeyboardEvent } from "react";

interface SearchBarProps {
  initial?: string;
  className?: string;
  autoFocus?: boolean;
}

export const SearchBar = ({ initial = "", className = "", autoFocus }: SearchBarProps) => {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();

  const go = () => {
    const term = q.trim();
    if (!term) return;
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") go();
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        autoFocus={autoFocus}
        placeholder="Search lessons and topics..."
        className="pl-10 h-12 rounded-full border-2 border-primary/30 focus-visible:border-primary text-base"
        aria-label="Search lessons and topics"
      />
    </div>
  );
};
