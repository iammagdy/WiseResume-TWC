import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Download, ImagePlus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Screenshot {
  id: string;
  name: string;
  headline: string;
  image_url: string;
  created_at: string;
}

export default function ScreenshotsGalleryPage() {
  const navigate = useNavigate();
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchScreenshots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("store_screenshots")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Fetch error:", error);
    } else {
      setScreenshots((data as Screenshot[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchScreenshots();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    toast.info("Generating 8 screenshots with AI... This may take 2-3 minutes.");

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-store-screenshots"
      );

      if (error) throw error;

      toast.success(`Generated ${data?.screenshots?.length || 0} screenshots!`);
      await fetchScreenshots();
    } catch (err: any) {
      console.error("Generate error:", err);
      toast.error(err.message || "Failed to generate screenshots");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleDownloadAll = async () => {
    toast.info("Downloading all screenshots...");
    for (const s of screenshots) {
      await handleDownload(s.image_url, s.name);
    }
    toast.success("All downloads started!");
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">
              Store Screenshots
            </h1>
            <p className="text-sm text-muted-foreground">
              AI-generated App Store &amp; Google Play screenshots
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 h-4 w-4" />
            )}
            {generating ? "Generating..." : "Generate Screenshots"}
          </Button>
          {screenshots.length > 0 && (
            <Button variant="outline" onClick={handleDownloadAll}>
              <Download className="mr-2 h-4 w-4" />
              Download All
            </Button>
          )}
        </div>

        {/* Gallery */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[9/19.5] rounded-xl" />
            ))}
          </div>
        ) : screenshots.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ImagePlus className="mx-auto h-12 w-12 mb-4 opacity-40" />
            <p>No screenshots yet. Click "Generate Screenshots" to create them.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {screenshots.map((s) => (
              <div key={s.id} className="group relative">
                <img
                  src={s.image_url}
                  alt={s.headline}
                  className="w-full rounded-xl border border-border shadow-sm"
                  loading="lazy"
                />
                <div className="mt-2 text-xs font-medium text-foreground truncate">
                  {s.headline}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-1 w-full text-xs"
                  onClick={() => handleDownload(s.image_url, s.name)}
                >
                  <Download className="mr-1 h-3 w-3" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
