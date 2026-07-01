import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, ExternalLink } from "lucide-react";

interface FileUploaderProps {
  accept: string;
  folder: string;
  bucket?: "pdfs" | "illustrations" | "videos";
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
}

const DEFAULT_BUCKET = "pdfs";
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB (videos can be big)

export const FileUploader = ({ accept, folder, bucket, currentUrl, onUploaded }: FileUploaderProps) => {
  const resolvedBucket = bucket ?? DEFAULT_BUCKET;
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast({ title: "File too large", description: "Max 50 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "bin";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) {
      setUploading(false);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    // Store path as URL (resolved via signed URL on download). For now we store public-style path.
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    onUploaded(data.publicUrl);
    setUploading(false);
    toast({ title: "File uploaded" });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Upload className="w-4 h-4 mr-1" />
        {uploading ? "Uploading..." : "Upload file"}
      </Button>
      {currentUrl && (
        <a href={currentUrl} target="_blank" rel="noreferrer" className="text-sm text-primary flex items-center gap-1 hover:underline">
          <CheckCircle2 className="w-4 h-4" /> View current <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
};
