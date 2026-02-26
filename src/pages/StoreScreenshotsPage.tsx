import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
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
  {
    id: 'ss-hero',
    headline: 'Your AI Career Companion',
    subtitle: 'Build resumes, ace interviews, and land your dream job — powered by AI.',
    gradient: 'linear-gradient(135deg, #0B0D17 0%, #1a1040 40%, #2d1b4e 70%, #0B0D17 100%)',
    Screen: MockHeroScreen,
  },
  {
    id: 'ss-builder',
    headline: 'Build ATS-Optimized Resumes',
    subtitle: '13 sections, real-time scoring, and smart suggestions for every field.',
    gradient: 'linear-gradient(135deg, #0B0D17 0%, #0d2137 40%, #1a3a5c 70%, #0B0D17 100%)',
    Screen: MockDashboardScreen,
  },
  {
    id: 'ss-tailor',
    headline: 'One-Tap Job Tailoring',
    subtitle: 'Paste any job description. AI rewrites your resume to match instantly.',
    gradient: 'linear-gradient(135deg, #0B0D17 0%, #1b0d3a 40%, #3b1d6e 70%, #0B0D17 100%)',
    Screen: MockAIStudioScreen,
  },
  {
    id: 'ss-interview',
    headline: 'Practice With AI Voice Coach',
    subtitle: 'Realistic mock interviews with real-time scoring and feedback.',
    gradient: 'linear-gradient(135deg, #0B0D17 0%, #0d2a1f 40%, #1a5c40 70%, #0B0D17 100%)',
    Screen: MockInterviewScreen,
  },
  {
    id: 'ss-recruiter',
    headline: 'Get Honest Recruiter Feedback',
    subtitle: '4 AI personas review your resume like real hiring managers.',
    gradient: 'linear-gradient(135deg, #0B0D17 0%, #2a1a0d 40%, #5c3a1a 70%, #0B0D17 100%)',
    Screen: MockRecruiterScreen,
  },
  {
    id: 'ss-templates',
    headline: '30 Professional Templates',
    subtitle: 'Modern, classic, creative — every style ATS-tested and ready to go.',
    gradient: 'linear-gradient(135deg, #0B0D17 0%, #1a0d2a 40%, #3d1a5c 70%, #0B0D17 100%)',
    Screen: MockTemplatesScreen,
  },
  {
    id: 'ss-tracker',
    headline: 'Track Every Application',
    subtitle: 'Kanban board, deadlines, reminders — never lose track of a job again.',
    gradient: 'linear-gradient(135deg, #0B0D17 0%, #0d1a2a 40%, #1a3d5c 70%, #0B0D17 100%)',
    Screen: MockJobTrackerScreen,
  },
  {
    id: 'ss-portfolio',
    headline: 'Share Your Online Portfolio',
    subtitle: 'One-link portfolio with analytics, QR codes, and custom themes.',
    gradient: 'linear-gradient(135deg, #0B0D17 0%, #2a0d1a 40%, #5c1a3d 70%, #0B0D17 100%)',
    Screen: MockPortfolioScreen,
  },
];

export default function StoreScreenshotsPage() {
  const [downloading, setDownloading] = useState(false);

  const downloadAll = useCallback(async () => {
    setDownloading(true);
    try {
      for (const ss of SCREENSHOTS) {
        const el = document.getElementById(ss.id);
        if (!el) continue;
        const canvas = await captureWithRetry(el, { scale: 1, width: 1290, height: 2796 });
        const link = document.createElement('a');
        link.download = `${ss.id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        // Small delay between downloads
        await new Promise((r) => setTimeout(r, 500));
      }
      toast.success('All screenshots downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export some screenshots');
    } finally {
      setDownloading(false);
    }
  }, []);

  const downloadSingle = useCallback(async (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      const canvas = await captureWithRetry(el, { scale: 1, width: 1290, height: 2796 });
      const link = document.createElement('a');
      link.download = `${id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Screenshot downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to capture screenshot');
    }
  }, []);

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      {/* Controls */}
      <div className="max-w-3xl mx-auto mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Space_Grotesk']">
            App Store Screenshots
          </h1>
          <p className="text-white/60 mt-1">8 promotional screenshots — click any to download individually</p>
        </div>
        <Button
          onClick={downloadAll}
          disabled={downloading}
          size="lg"
          className="rounded-full"
        >
          {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Download All
        </Button>
      </div>

      {/* Screenshot grid — scaled down for preview */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {SCREENSHOTS.map((ss) => (
          <div
            key={ss.id}
            className="cursor-pointer group"
            onClick={() => downloadSingle(ss.id)}
          >
            <p className="text-white/80 font-medium mb-2 text-sm group-hover:text-primary transition-colors">
              {ss.headline}
            </p>
            <div
              className="rounded-2xl overflow-hidden border border-white/10 group-hover:border-primary/40 transition-colors"
              style={{
                transform: 'scale(0.25)',
                transformOrigin: 'top left',
                width: 1290,
                height: 2796,
                marginBottom: `calc(-2796px * 0.75)`,
                marginRight: `calc(-1290px * 0.75)`,
              }}
            >
              <StoreScreenshot
                id={ss.id}
                headline={ss.headline}
                subtitle={ss.subtitle}
                gradient={ss.gradient}
              >
                <ss.Screen />
              </StoreScreenshot>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
