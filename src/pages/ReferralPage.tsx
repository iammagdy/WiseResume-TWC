import { useEffect, useRef, useMemo } from 'react';
import { BackButton } from '@/components/ui/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Share2, Users, Gift, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { getAppUrl } from '@/lib/portfolioUrl';

const REWARDS = [
  { friends: 1, reward: '3 extra AI credits/day for 1 week' },
  { friends: 3, reward: '1 week of Pro features' },
  { friends: 5, reward: '1 month of Pro features' },
  { friends: 10, reward: 'Lifetime Premium badge' },
];

export default function ReferralPage() {
  const { user } = useAuth();
  const qrRef = useRef<HTMLDivElement>(null);

  const inviteCode = useMemo(() => {
    if (!user?.id) return 'WISE0000';
    return 'WISE' + user.id.replace(/-/g, '').slice(0, 6).toUpperCase();
  }, [user?.id]);

  const inviteLink = `${getAppUrl()}/?ref=${inviteCode}`;

  // QR code
  useEffect(() => {
    if (!qrRef.current) return;
    let qr: any;
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      qr = new QRCodeStyling({
        width: 160,
        height: 160,
        data: inviteLink,
        dotsOptions: { type: 'rounded', color: 'hsl(var(--primary))' },
        backgroundOptions: { color: 'transparent' },
        cornersSquareOptions: { type: 'extra-rounded' },
      });
      if (qrRef.current) {
        qrRef.current.innerHTML = '';
        qr.append(qrRef.current);
      }
    });
    return () => { if (qrRef.current) qrRef.current.innerHTML = ''; };
  }, [inviteLink]);

  const handleCopy = async () => {
    haptics.light();
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied!');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleShare = async () => {
    haptics.light();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join WiseResume',
          text: 'Build professional resumes with AI! Use my invite code: ' + inviteCode,
          url: inviteLink,
        });
      } catch { }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="pt-safe sticky top-0 z-10 pb-2 px-4 glass-header backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-page-title">Invite Friends</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-24">
        {/* Invite Code */}
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">Your Invite Code</p>
            <div className="text-2xl font-mono font-bold tracking-widest text-primary">{inviteCode}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                <Copy className="w-4 h-4" />
                Copy Link
              </Button>
              <Button size="sm" onClick={handleShare} className="gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card>
          <CardContent className="p-6 flex flex-col items-center gap-2">
            <p className="text-sm font-medium">Scan to Join</p>
            <div ref={qrRef} className="rounded-xl overflow-hidden" />
          </CardContent>
        </Card>

        {/* Stats (placeholder) */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Sent', value: 0, icon: Share2 },
            { label: 'Accepted', value: 0, icon: Users },
            { label: 'Rewards', value: 0, icon: Gift },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <stat.icon className="w-4 h-4 text-muted-foreground" />
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Rewards Tiers */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Rewards</h2>
          <Card>
            <CardContent className="p-0 divide-y divide-border/30">
              {REWARDS.map((tier, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{tier.friends} friend{tier.friends > 1 ? 's' : ''}</p>
                    <p className="text-xs text-muted-foreground">{tier.reward}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
