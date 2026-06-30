import { useRef, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/i18n/LocaleProvider';

export default function AccountStatsCard({ resumes, coverLetters, applications, createdAt }: {
    resumes: number;
    coverLetters: number;
    applications: number;
    createdAt?: string;
}) {
    const { t, locale } = useLocale();
    const cardRef = useRef<HTMLDivElement>(null);
    const countRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const hasAnimated = useRef(false);

    const stats = [
        { value: resumes, label: t('app.settingsPage.accountStats.resumes', 'Resumes') },
        { value: coverLetters, label: t('app.settingsPage.accountStats.coverLetters', 'Cover Letters') },
        { value: applications, label: t('app.settingsPage.accountStats.applications', 'Applications') },
    ];

    // Membership tier
    const membershipTier = (() => {
        if (!createdAt) return null;
        const months = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
        if (months >= 12) return t('app.settingsPage.accountStats.membership.founding', 'Founding Member');
        if (months >= 6) return t('app.settingsPage.accountStats.membership.early', 'Early Adopter');
        if (months >= 1) return t('app.settingsPage.accountStats.membership.member', 'Member');
        return t('app.settingsPage.accountStats.membership.new', 'New Member');
    })();

    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting || hasAnimated.current) return;
            hasAnimated.current = true;

            const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            stats.forEach((stat, i) => {
                const span = countRefs.current[i];
                if (!span) return;
                if (prefersReduced || stat.value === 0) {
                    span.textContent = String(stat.value);
                    return;
                }
                const duration = 800;
                const start = performance.now();
                const animate = (now: number) => {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    span.textContent = String(Math.round(eased * stat.value));
                    if (progress < 1) requestAnimationFrame(animate);
                };
                requestAnimationFrame(animate);
            });
        }, { threshold: 0.5 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [resumes, coverLetters, applications]);

    return (
        <div
            ref={cardRef}
            className="rounded-2xl bg-card border border-primary/20 shadow-soft overflow-hidden p-4 mb-3"
        >
            {membershipTier && (
                <div className="flex justify-center mb-2">
                    <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary">
                        <Star className="w-3 h-3" />
                        {membershipTier}
                    </Badge>
                </div>
            )}
            <div className="grid grid-cols-3 gap-3 text-center">
                {stats.map((stat, i) => (
                    <div key={stat.label}>
                        <p className="text-lg font-bold text-primary">
                            <span ref={el => { countRefs.current[i] = el; }}>0</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </div>
                ))}
            </div>
            {createdAt && (
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                    {t('app.settingsPage.accountStats.memberSince', 'Member since {{date}}', {
                        date: new Date(createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' }),
                    })}
                </p>
            )}
        </div>
    );
}
