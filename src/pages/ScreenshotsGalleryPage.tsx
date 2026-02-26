import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ArrowLeft, ImageDown } from 'lucide-react';
import { captureWithRetry } from '@/lib/html2canvasRetry';
import { toast } from 'sonner';
import { StoreScreenshot } from '@/components/store/StoreScreenshot';
import {
  MockHeroScreen,
  MockDashboardScreen,
  MockAIStudioScreen,
  MockInterviewScreen,
  MockRecruiterScreen,
  MockTemplatesScreen,
  MockJobTrackerScreen,
  MockPortfolioScreen,
} from '@/components/store/MockScreens';

const SCREENSHOTS = [
  { id: 'gal-hero', headline: 'Your AI Career Companion', subtitle: 'Build resumes, ace interviews, and land your dream job — powered by AI.', gradient: 'linear-gradient(135deg, #0B0D17 0%, #1a1040 40%, #2d1b4e 70%, #0B0D17 100%)', Screen: MockHeroScreen },
  { id: 'gal-builder', headline: 'Build ATS-Optimized Resumes', subtitle: '13 sections, real-time scoring, and smart suggestions for every field.', gradient: 'linear-gradient(135deg, #0B0D17 0%, #0d2137 40%, #1a3a5c 70%, #0B0D17 100%)', Screen: MockDashboardScreen },
  { id: 'gal-tailor', headline: 'One-Tap Job Tailoring', subtitle: 'Paste any job description. AI rewrites your resume to match instantly.', gradient: 'linear-gradient(135deg, #0B0D17 0%, #1b0d3a 40%, #3b1d6e 70%, #0B0D17 100%)', Screen: MockAIStudioScreen },
  { id: 'gal-interview', headline: 'Practice With AI Voice Coach', subtitle: 'Realistic mock interviews with real-time scoring and feedback.', gradient: 'linear-gradient(135deg, #0B0D17 0%, #0d2a1f 40%, #1a5c40 70%, #0B0D17 100%)', Screen: MockInterviewScreen },
  { id: 'gal-recruiter', headline: 'Get Honest Recruiter Feedback', subtitle: '4 AI personas review your resume like real hiring managers.', gradient: 'linear-gradient(135deg, #0B0D17 0%, #2a1a0d 40%, #5c3a1a 70%, #0B0D17 100%)', Screen: MockRecruiterScreen },
  { id: 'gal-templates', headline: '30 Professional Templates', subtitle: 'Modern, classic, creative — every style ATS-tested and ready to go.', gradient: 'linear-gradient(135deg, #0B0D17 0%, #1a0d2a 40%, #3d1a5c 70%, #0B0D17 100%)', Screen: MockTemplatesScreen },
  { id: 'gal-tracker', headline: 'Track Every Application', subtitle: 'Kanban board, deadlines, reminders — never lose track of a job again.', gradient: 'linear-gradient(135deg, #0B0D17 0%, #0d1a2a 40%, #1a3d5c 70%, #0B0D17 100%)', Screen: MockJobTrackerScreen },
  { id: 'gal-portfolio', headline: 'Share Your Online Portfolio', subtitle: 'One-link portfolio with analytics, QR codes, and custom themes.', gradient: 'linear-gradient(135deg, #0B0D17 0%, #2a0d1a 40%, #5c1a3d 70%, #0B0D17 100%)', Screen: MockPortfolioScreen },
];

export default function ScreenshotsGalleryPage() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [capturingId, setCapturingId] = useState<string | null>(null);

  const captureAndDownload = useCallback(async (id: string, filename: string) => {
    const el = document.getElementById(id);
    if (!el) { toast.error('Element not found'); return; }
    const canvas = await captureWithRetry(el, { scale: 1, width: 1290, height: 2796 });
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const downloadSingle = useCallback(async (id: string) => {
    setCapturingId(id);
    try {
      await captureAndDownload(id, `${id}.png`);
      toast.success('Screenshot downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to capture screenshot');
    } finally {
      setCapturingId(null);
    }
  }, [captureAndDownload]);

  const downloadAll = useCallback(async () => {
    setDownloading(true);
    toast.info(`Capturing ${SCREENSHOTS.length} screenshots…`);
    try {
      for (const ss of SCREENSHOTS) {
        await captureAndDownload(ss.id, `${ss.id}.png`);
        await new Promise((r) => setTimeout(r, 500));
      }
      toast.success('All screenshots downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export some screenshots');
    } finally {
      setDownloading(false);
    }
  }, [captureAndDownload]);

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border -mx-4 px-4 py-3 mb-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Screenshots Gallery</h1>
              <p className="text-xs text-muted-foreground">{SCREENSHOTS.length} App Store screens</p>
            </div>
          </div>
          <Button onClick={downloadAll} disabled={downloading} size="sm" className="rounded-full">
            {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Capture All
          </Button>
        </div>
      </div>

      {/* Grid of real app screen previews */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {SCREENSHOTS.map((ss) => (
          <div key={ss.id} className="flex flex-col gap-2">
            {/* Scaled-down preview */}
            <div
              className="relative rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => downloadSingle(ss.id)}
              style={{ width: '100%', aspectRatio: '1290 / 2796' }}
            >
              <div
                style={{
                  transform: 'scale(0.12)',
                  transformOrigin: 'top left',
                  width: 1290,
                  height: 2796,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
              >
                <StoreScreenshot id={ss.id} headline={ss.headline} subtitle={ss.subtitle} gradient={ss.gradient}>
                  <ss.Screen />
                </StoreScreenshot>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                {capturingId === ss.id ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <ImageDown className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
            <p className="text-xs font-medium text-foreground truncate">{ss.headline}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
