import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Moon,
  Sun,
  User,
  Linkedin,
} from 'lucide-react';
import wiseAiLogoDark from '@/assets/wiseresume-logo-dark.webp';
import { useIsDark } from '@/hooks/useIsDark';
import { useLocale } from '@/i18n/LocaleProvider';

export type AuthBoldMode = 'signin' | 'signup' | 'forgot' | 'reset' | 'change';

export interface AuthBoldProps {
  mode: AuthBoldMode;
  onModeChange?: (mode: AuthBoldMode) => void;

  name?: string;
  onNameChange?: (value: string) => void;
  email?: string;
  onEmailChange?: (value: string) => void;
  password?: string;
  onPasswordChange?: (value: string) => void;
  confirm?: string;
  onConfirmChange?: (value: string) => void;
  current?: string;
  onCurrentChange?: (value: string) => void;
  forgotStep?: 'email' | 'otp';
  otp?: string;
  onOtpChange?: (value: string) => void;

  remember?: boolean;
  onRememberChange?: (value: boolean) => void;

  loading?: boolean;
  error?: string | null;
  notice?: ReactNode;
  doneSlot?: ReactNode;

  onLinkedInLogin?: () => void | Promise<void>;
  onSubmit: () => void | Promise<void>;
}

const PRIMARY = '#9E1B22';
const ACCENT = '#ef5a62';
const STYLES = `
.ab-root *{box-sizing:border-box;}
.ab-root{
  --bg:#0b0b0d; --fg:#fafafa; --sub:#a1a1aa;
  --pill-bd:rgba(239,90,98,.32); --pill-bg:rgba(158,27,34,.10); --pill-fg:#ef7077;
  --card-bg:#161619; --card-bd:#2c2c33;
  --card-sh:0 30px 70px -24px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.04);
  --lab:#a1a1aa; --field-bg:#1f1f24; --field-bd:#2f2f37; --field-fg:#f4f4f5;
  --field-ph:#6b6b73; --field-icon:#71717a; --field-icon-on:#ef5a62;
  --check-bd:#3a3a42; --check-bg:#1f1f24; --opt-fg:#d4d4d8;
  --trust-fg:#8a8a93; --foot-fg:#71717a;
  --stat-n:#ffffff; --stat-l:#a1a1aa; --divcol:#26262b;
  --glow:rgba(158,27,34,.45); --glow2:rgba(158,27,34,.16); --wm-op:.08;
  --theme-bg:rgba(255,255,255,.06); --theme-bd:#2c2c33; --theme-fg:#a1a1aa;
  --sc-shell:#2b2730; --sc-screen:#16131a; --sc-socket:#0c0910; --sc-line:#6b6470;
  --err-fg:#ef4444;
  position:relative;width:100%;min-height:100dvh;background:var(--bg);overflow:hidden;
  font-family:Inter,system-ui,-apple-system,sans-serif;color:var(--fg);container-type:inline-size;
  transition:background-color .3s ease;
}
.ab-root.light{
  --bg:#ffffff; --fg:#18181b; --sub:#52525b;
  --pill-bd:rgba(158,27,34,.22); --pill-bg:rgba(158,27,34,.06); --pill-fg:#9E1B22;
  --card-bg:#ffffff; --card-bd:#ececef;
  --card-sh:0 20px 25px -5px rgba(0,0,0,.08),0 8px 10px -6px rgba(0,0,0,.04);
  --lab:#52525b; --field-bg:#ffffff; --field-bd:#e5e7eb; --field-fg:#18181b;
  --field-ph:#9ca3af; --field-icon:#9ca3af; --field-icon-on:#9E1B22;
  --check-bd:#d4d4d8; --check-bg:#ffffff; --opt-fg:#3f3f46;
  --trust-fg:#6b7280; --foot-fg:#6b7280;
  --stat-n:#18181b; --stat-l:#52525b; --divcol:#e5e7eb;
  --glow:rgba(158,27,34,.15); --glow2:rgba(158,27,34,.07); --wm-op:.05;
  --theme-bg:rgba(158,27,34,.05); --theme-bd:#e5e7eb; --theme-fg:#6b7280;
  --sc-shell:#d7d3dd; --sc-screen:#272330; --sc-socket:#15111c; --sc-line:#bdb9c4;
}

.ab-glow{position:absolute;bottom:-32%;left:-22%;width:62%;aspect-ratio:1;border-radius:50%;
  background:radial-gradient(circle,var(--glow),transparent 65%);pointer-events:none;transition:background .3s;}
.ab-glow2{position:absolute;top:-18%;right:-14%;width:42%;aspect-ratio:1;border-radius:50%;
  background:radial-gradient(circle,var(--glow2),transparent 68%);pointer-events:none;}
.ab-mark-wm{position:absolute;top:-7%;right:-6%;width:34%;object-fit:contain;opacity:var(--wm-op);
  transform:rotate(8deg);pointer-events:none;}

.ab-shell{position:relative;z-index:1;display:flex;flex-direction:column;min-height:100dvh;
  padding:44px 18px 22px;}
.ab-theme{position:absolute;top:40px;right:16px;width:38px;height:38px;border-radius:11px;z-index:6;
  border:1px solid var(--theme-bd);background:var(--theme-bg);color:var(--theme-fg);
  display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.18s;}
.ab-theme:hover{color:var(--fg);}
.ab-theme svg{width:18px;height:18px;}

.ab-brand{display:flex;align-items:center;gap:10px;flex:none;}
.ab-brand img{width:30px;height:30px;object-fit:contain;}
.ab-brand b{font:700 16px/1 Inter, sans-serif;letter-spacing:-.01em;}
.ab-brand b span{color:#ef5a62;}

.ab-body{flex:1;display:flex;flex-direction:column;justify-content:center;gap:14px;
  padding-top:6px;min-height:0;}
.ab-hero{flex:none;}
.ab-pill{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:9999px;
  border:1px solid var(--pill-bd);background:var(--pill-bg);
  font:600 10.5px/1 Inter, sans-serif;text-transform:uppercase;letter-spacing:.13em;color:var(--pill-fg);margin-bottom:12px;}
.ab-pill .dot{width:6px;height:6px;border-radius:50%;background:#ef5a62;box-shadow:0 0 8px #ef5a62;}
.ab-title{font:800 30px/1.0 Inter, sans-serif;letter-spacing:-.04em;margin:0;color:var(--fg);}
.ab-grad{background:linear-gradient(135deg,#E53E3E,#FF6B6B 25%,#C41E3A 50%,#FF8080 75%,#9E1B22);
  background-size:300% 300%;-webkit-background-clip:text;background-clip:text;
  -webkit-text-fill-color:transparent;animation:abShim 5s ease infinite;}
@keyframes abShim{0%,100%{background-position:0% 50%;}50%{background-position:100% 50%;}}
@keyframes abIn{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
@keyframes abBlink{50%{opacity:0;}}
.ab-anim{animation:abIn .6s cubic-bezier(.16,1,.3,1) both;animation-delay:var(--d,0ms);}
.ab-caret::after{content:'|';margin-left:2px;color:#ef5a62;-webkit-text-fill-color:#ef5a62;
  background:none;-webkit-background-clip:border-box;background-clip:border-box;
  animation:abBlink 1s steps(1) infinite;}
@media (prefers-reduced-motion: reduce){
  .ab-anim{animation:none;} .ab-caret::after{display:none;} .ab-grad{animation:none;} .ab-btn{animation:none;}
}
.ab-sub{display:none;font:400 15px/1.5 Inter, sans-serif;color:var(--sub);margin:14px 0 0;max-width:380px;}
.ab-stats{display:none;}
.ab-stat .n{font:800 30px/1 Inter, sans-serif;letter-spacing:-.03em;color:var(--stat-n);}
.ab-stat .l{font:500 12.5px/1.3 Inter, sans-serif;color:var(--stat-l);margin-top:6px;}
.ab-div{width:1px;align-self:stretch;background:var(--divcol);}

@property --ab-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
.ab-card{position:relative;width:100%;background:var(--card-bg);border:1px solid var(--card-bd);border-radius:22px;
  box-shadow:var(--card-sh);padding:20px 20px 22px;flex:none;max-width:430px;margin:0 auto;
  transition:background-color .3s,border-color .3s;}
.ab-card::before{
  content:'';position:absolute;inset:-1.5px;border-radius:inherit;padding:2px;z-index:2;pointer-events:none;
  background:conic-gradient(from var(--ab-angle),transparent 95deg,#9E1B22 150deg,#ff5d63 195deg,#ff8a90 210deg,#ff5d63 225deg,#9E1B22 270deg,transparent 320deg);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;
  animation:ab-rotate 4.2s linear infinite;}
@keyframes ab-rotate{to{--ab-angle:360deg;}}
@media (prefers-reduced-motion: reduce){
  .ab-card::before{animation:none;background:#9E1B22;opacity:.55;filter:none;}
}
.ab-scout{position:relative;display:flex;justify-content:center;margin-bottom:2px;}
.ab-think{position:absolute;top:-7px;left:calc(50% + 18px);display:flex;align-items:center;gap:3px;
  padding:5px 7px;border-radius:9px;background:var(--field-bg);border:1px solid var(--field-bd);
  box-shadow:0 4px 10px -3px rgba(0,0,0,.4);
  opacity:0;transform:scale(.4) translateY(8px);transform-origin:bottom left;
  transition:opacity .22s,transform .22s cubic-bezier(.16,1,.3,1);pointer-events:none;z-index:3;}
.ab-think::after{content:'';position:absolute;bottom:-4px;left:9px;width:7px;height:7px;
  background:var(--field-bg);border-right:1px solid var(--field-bd);border-bottom:1px solid var(--field-bd);
  transform:rotate(45deg);}
.ab-scout.typing .ab-think{opacity:1;transform:scale(1) translateY(0);}
.ab-scout.typing .ab-face{animation:ab-typebob 1.5s ease-in-out infinite;transform-origin:50% 80%;}
@keyframes ab-typebob{0%,100%{transform:translateY(0) rotate(0deg);}50%{transform:translateY(2.5px) rotate(-2deg);}}
.ab-think span{width:5px;height:5px;border-radius:50%;background:#ef5a62;animation:ab-think-b 1s ease-in-out infinite;}
.ab-think span:nth-child(2){animation-delay:.16s;}
.ab-think span:nth-child(3){animation-delay:.32s;}
@keyframes ab-think-b{0%,100%{transform:translateY(0);opacity:.45;}50%{transform:translateY(-3px);opacity:1;}}
@media (prefers-reduced-motion: reduce){ .ab-think span{animation:none;} .ab-scout.typing .ab-face{animation:none;} }
.ab-scout svg{width:60px;height:auto;overflow:visible;}
.sc-shell{fill:var(--sc-shell);transition:fill .3s;}
.sc-screen{fill:var(--sc-screen);transition:fill .3s;}
.sc-socket{fill:var(--sc-socket);transition:fill .3s;}
.sc-line{stroke:var(--sc-line);transition:stroke .3s;}
.ab-pl,.ab-pr{transition:transform .18s cubic-bezier(.16,1,.3,1);}
.ab-head{transform-box:fill-box;transform-origin:80px 92px;transition:transform .35s cubic-bezier(.16,1,.3,1);}
.ab-shut{transform-box:fill-box;transform-origin:top;transform:scaleY(0);transition:transform .3s cubic-bezier(.16,1,.3,1);}
.ab-cardhead{text-align:center;margin-bottom:14px;}
.ab-card h2{font:800 21px/1.1 Inter, sans-serif;letter-spacing:-.025em;margin:0 0 3px;color:var(--fg);}
.ab-card .ab-cardsub{font:400 13.5px/1.4 Inter, sans-serif;color:var(--sub);margin:0;}
.ab-lab{display:block;font:600 12.5px/1 Inter, sans-serif;color:var(--lab);margin-bottom:6px;}
.ab-labrow{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.ab-labrow button{font:500 12.5px/1 Inter, sans-serif;color:#ef5a62;background:none;border:none;padding:0;cursor:pointer;}
.ab-field{display:flex;align-items:center;gap:11px;height:48px;padding:0 14px;background:var(--field-bg);
  border:1px solid var(--field-bd);border-radius:13px;transition:border-color .15s,box-shadow .15s,background-color .3s;}
.ab-field > svg{width:18px;height:18px;color:var(--field-icon);flex:none;transition:color .15s;}
.ab-field input{flex:1;min-width:0;background:transparent;border:none;outline:none;
  color:var(--field-fg);font:500 15px Inter, sans-serif;}
.ab-field input::placeholder{color:var(--field-ph);}
.ab-field:focus-within{border-color:#9E1B22;box-shadow:0 0 0 3px rgba(158,27,34,.2);}
.ab-field:focus-within > svg:first-child{color:var(--field-icon-on);}
.ab-eye{background:none;border:none;padding:0;display:flex;cursor:pointer;color:var(--field-icon);}

.ab-optrow{display:flex;align-items:center;gap:9px;margin:14px 0 16px;cursor:pointer;user-select:none;}
.ab-check{width:19px;height:19px;border-radius:6px;border:1.5px solid var(--check-bd);background:var(--check-bg);
  display:flex;align-items:center;justify-content:center;flex:none;transition:.15s;color:transparent;}
.ab-check.on{background:#9E1B22;border-color:#9E1B22;color:#fff;}
.ab-check svg{width:13px;height:13px;}
.ab-optrow span{font:500 13.5px/1 Inter, sans-serif;color:var(--opt-fg);}

.ab-btn{width:100%;height:50px;border:none;border-radius:15px;background:#9E1B22;color:#fff;
  font:700 15px Inter, sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;
  animation:abPulse 2.8s ease-in-out infinite;transition:background .15s,transform .12s;}
.ab-btn:hover:not(:disabled){background:#b51f27;}
.ab-btn:active:not(:disabled){transform:scale(.98);}
.ab-btn:disabled{opacity:.7;cursor:not-allowed;}
.ab-btn svg{width:19px;height:19px;transition:transform .18s ease;}
.ab-btn:hover:not(:disabled) svg{transform:translateX(4px);}
@keyframes abPulse{0%,100%{box-shadow:0 8px 22px -4px rgba(158,27,34,.55),0 0 0 0 rgba(158,27,34,.32);}
  50%{box-shadow:0 8px 22px -4px rgba(158,27,34,.55),0 0 0 7px rgba(158,27,34,0);}}
.ab-trust{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:12px;flex-wrap:wrap;}
.ab-trust span{display:flex;align-items:center;gap:6px;font:500 11.5px/1 Inter, sans-serif;color:var(--trust-fg);}
.ab-trust svg{width:14px;height:14px;color:#9E1B22;}
.ab-foot{text-align:center;font:400 13.5px/1 Inter, sans-serif;color:var(--foot-fg);margin:14px 0 0;}
.ab-foot button{color:#ef5a62;font-weight:600;background:none;border:none;padding:0;cursor:pointer;}
.ab-mismatch{display:flex;align-items:center;gap:6px;font:500 12px/1.3 Inter, sans-serif;color:var(--err-fg);margin:8px 0 0;}
.ab-mismatch svg{width:14px;height:14px;}
.ab-error{display:flex;align-items:center;gap:8px;font:500 13px/1.4 Inter, sans-serif;color:var(--err-fg);
  background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);
  padding:10px 12px;border-radius:11px;margin-bottom:14px;}
.ab-error svg{width:16px;height:16px;flex:none;}
.ab-notice{font:500 12.5px/1.4 Inter, sans-serif;color:var(--pill-fg);text-align:center;margin-bottom:10px;}
.ab-done{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding:6px 0;}

.ab-root:not(.signin) .ab-optrow{display:none;}
.ab-root:not(.signin) .ab-btn{margin-top:20px;}
.ab-root:not(.signin):not(.signup) .ab-trust{display:none;}
@container (min-width:560px){
  .ab-root.signup .ab-stats{display:none;}
  .ab-root.signup .ab-scout svg{width:54px;}
  .ab-root.signup .ab-card{padding:20px 32px 22px;}
  .ab-root.signup .ab-cardhead{margin-bottom:12px;}
  .ab-root.signup .ab-field{height:46px;}
  .ab-root.signup .ab-btn{margin-top:16px;}
}
@container (max-width:559px){
  .ab-root.signup .ab-trust{display:none;}
  .ab-root.signup .ab-scout svg{width:46px;}
  .ab-root.signup .ab-scout{margin-bottom:0;}
  .ab-root.signup .ab-card{padding:15px 18px 17px;}
  .ab-root.signup .ab-cardhead{margin-bottom:8px;}
  .ab-root.signup .ab-field{height:44px;}
  .ab-root.signup .ab-lab{margin-bottom:4px;}
  .ab-root.signup .ab-btn{height:46px;margin-top:16px;}
}

@container (min-width:560px){
  .ab-shell{padding:40px 44px 44px;}
  .ab-theme{top:40px;right:40px;}
  .ab-brand img{width:34px;height:34px;}
  .ab-brand b{font-size:17px;}
  .ab-body{gap:24px;padding-top:0;justify-content:center;}
  .ab-pill{font-size:11px;padding:6px 13px;margin-bottom:18px;}
  .ab-title{font-size:54px;line-height:0.98;}
  .ab-sub{display:block;font-size:16px;}
  .ab-stats{display:flex;gap:34px;margin-top:32px;}
  .ab-scout svg{width:84px;}
  .ab-card{max-width:430px;padding:30px 34px 34px;border-radius:24px;}
  .ab-card h2{font-size:24px;}
  .ab-card .ab-cardsub{font-size:14px;}
  .ab-cardhead{margin-bottom:22px;}
  .ab-lab{font-size:13px;margin-bottom:8px;}
  .ab-labrow{margin-bottom:8px;}
  .ab-field{height:52px;padding:0 15px;border-radius:14px;}
  .ab-optrow{margin:18px 0 22px;}
  .ab-btn{height:54px;border-radius:16px;font-size:16px;}
  .ab-linkedin-btn{height:54px;border-radius:16px;font-size:16px;}
  .ab-trust{margin-top:16px;}
  .ab-trust span{font-size:12px;}
  .ab-foot{margin-top:20px;font-size:14px;}
}
@container (min-width:980px){
  .ab-shell{padding:46px 56px;}
  .ab-theme{top:44px;right:48px;}
  .ab-body{flex-direction:row;align-items:center;justify-content:space-between;gap:56px;}
  .ab-hero{flex:1;}
  .ab-title{font-size:68px;}
  .ab-sub{font-size:17px;}
  .ab-card{width:404px;max-width:404px;flex:none;margin:0;padding:34px 38px 38px;}
}

.ab-linkedin-btn{
  width:100%;height:50px;border:1px solid var(--field-bd);border-radius:15px;
  background:var(--field-bg);color:var(--field-fg);
  font:600 15px Inter,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;
  transition:background .15s,border-color .15s,transform .12s;
  margin-top:12px;box-sizing:border-box;
}
.ab-linkedin-btn:hover:not(:disabled){
  background:var(--card-bd);
  border-color:var(--sub);
}
.ab-linkedin-btn:active:not(:disabled){transform:scale(.98);}
.ab-linkedin-btn:disabled{opacity:.7;cursor:not-allowed;}
.ab-linkedin-btn svg{width:19px;height:19px;color:#0077b5;}

.ab-divider-row{display:flex;align-items:center;gap:10px;margin:16px 0 12px;}
.ab-divider-line{flex:1;height:1px;background:var(--divcol);}
.ab-divider-text{font:500 13px Inter,sans-serif;color:var(--sub);text-transform:lowercase;}
`;

function ScoutSvg() {
  return (
    <svg className="ab-face" viewBox="0 0 160 150" aria-hidden="true">
      <line className="sc-line" x1="80" y1="46" x2="80" y2="30" strokeWidth="3" strokeLinecap="round" />
      <circle className="ab-ant" cx="80" cy="25" r="5" fill={ACCENT} />
      <g className="ab-head">
        <rect className="sc-shell" x="26" y="46" width="108" height="86" rx="22" />
        <rect className="sc-screen" x="34" y="54" width="92" height="70" rx="16" />
        <g clipPath="url(#abScr)">
          <circle className="sc-socket" cx="60" cy="88" r="18" stroke={PRIMARY} strokeWidth="2.5" />
          <circle className="sc-socket" cx="100" cy="88" r="18" stroke={PRIMARY} strokeWidth="2.5" />
          <circle className="ab-pl" cx="60" cy="88" r="9" fill="#ff5d63" />
          <circle className="ab-pr" cx="100" cy="88" r="9" fill="#ff5d63" />
          <rect x="42" y="113" width="76" height="3.4" rx="1.7" fill="#ff5d63" />
          <rect className="ab-shut sc-shell" x="34" y="54" width="92" height="70" />
        </g>
      </g>
      <clipPath id="abScr">
        <rect x="34" y="54" width="92" height="70" rx="16" />
      </clipPath>
    </svg>
  );
}

export function AuthBold({
  mode,
  onModeChange,
  name = '',
  onNameChange,
  email = '',
  onEmailChange,
  password = '',
  onPasswordChange,
  confirm = '',
  onConfirmChange,
  current = '',
  onCurrentChange,
  forgotStep = 'email',
  otp = '',
  onOtpChange,
  remember = true,
  onRememberChange,
  loading = false,
  error = null,
  notice,
  doneSlot,
  onLinkedInLogin,
  onSubmit,
}: AuthBoldProps) {
  const { direction, t } = useLocale();
  const typedWord = t('auth.heroTyped');
  const isDarkPref = useIsDark();
  const [light, setLight] = useState(!isDarkPref);
  useEffect(() => {
    setLight(!isDarkPref);
  }, [isDarkPref]);

  const [showPw, setShowPw] = useState(false);
  const [typed, setTyped] = useState('');
  const [caret, setCaret] = useState(true);
  const [stat1, setStat1] = useState('0.0×');
  const [stat2, setStat2] = useState('0');

  const rootRef = useRef<HTMLDivElement | null>(null);
  const scoutRef = useRef<HTMLDivElement | null>(null);
  const shutRef = useRef<SVGRectElement | null>(null);
  const headRef = useRef<SVGGElement | null>(null);
  const plRef = useRef<SVGCircleElement | null>(null);
  const prRef = useRef<SVGCircleElement | null>(null);

  const coveringRef = useRef(false);
  const typingRef = useRef(false);
  const lastMoveRef = useRef(0);
  const typeJitRef = useRef<number | null>(null);

  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const look = useCallback((dx: number, dy: number) => {
    const t = `translate(${dx}px,${dy}px)`;
    if (plRef.current) plRef.current.style.transform = t;
    if (prRef.current) prRef.current.style.transform = t;
  }, []);

  const cover = useCallback(
    (on: boolean) => {
      coveringRef.current = on;
      const sh = shutRef.current;
      const hd = headRef.current;
      if (sh) {
        sh.style.transition = 'transform .3s cubic-bezier(.16,1,.3,1)';
        sh.style.transform = on ? `scaleY(${showPw ? 0.55 : 1})` : 'scaleY(0)';
      }
      if (hd) hd.style.transform = on ? 'rotate(-4deg)' : 'rotate(0deg)';
    },
    [showPw],
  );

  const setScoutTyping = useCallback((on: boolean) => {
    scoutRef.current?.classList.toggle('typing', on);
  }, []);

  const startTypingJitter = useCallback(() => {
    if (typeJitRef.current) window.clearInterval(typeJitRef.current);
    if (reduced) {
      look(0, 6.5);
      return;
    }
    typeJitRef.current = window.setInterval(() => {
      if (!typingRef.current) {
        if (typeJitRef.current) window.clearInterval(typeJitRef.current);
        return;
      }
      look((Math.random() * 2 - 1) * 4, 5.5 + Math.random() * 1.5);
    }, 450);
  }, [look, reduced]);

  const clearTypingJitter = useCallback(() => {
    if (typeJitRef.current) {
      window.clearInterval(typeJitRef.current);
      typeJitRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (reduced) {
      setTyped(typedWord);
      setCaret(false);
      setStat1('3.2×');
      setStat2('92');
      return;
    }

    let i = 0;
    let tw: number | undefined;
    const tick = () => {
      i += 1;
      setTyped(typedWord.slice(0, i));
      if (i < typedWord.length) {
        tw = window.setTimeout(tick, 72);
      } else {
        tw = window.setTimeout(() => setCaret(false), 1500);
      }
    };
    const twStart = window.setTimeout(tick, 780);

    const runCount = (set: (v: string) => void, to: number, dec: number, suf: string) => {
      const dur = 1400;
      const start = performance.now();
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      const step = (now: number) => {
        const t = Math.min((now - start) / dur, 1);
        set((ease(t) * to).toFixed(dec) + suf);
        if (t < 1) requestAnimationFrame(step);
        else set(to.toFixed(dec) + suf);
      };
      requestAnimationFrame(step);
    };
    const cuStart = window.setTimeout(() => {
      runCount(setStat1, 3.2, 1, '×');
      runCount(setStat2, 92, 0, '');
    }, 360);

    return () => {
      window.clearTimeout(twStart);
      window.clearTimeout(cuStart);
      if (tw) window.clearTimeout(tw);
    };
  }, [reduced, typedWord]);

  useEffect(() => {
    if (reduced) return;
    const blink = window.setInterval(() => {
      if (coveringRef.current) return;
      const sh = shutRef.current;
      if (!sh) return;
      sh.style.transition = 'transform .09s ease';
      sh.style.transform = 'scaleY(1)';
      window.setTimeout(() => {
        sh.style.transition = 'transform .18s cubic-bezier(.16,1,.3,1)';
        sh.style.transform = 'scaleY(0)';
      }, 110);
    }, 4200);
    return () => window.clearInterval(blink);
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    const wander = window.setInterval(() => {
      if (coveringRef.current || typingRef.current) return;
      if (Date.now() - lastMoveRef.current < 1200) return;
      look((Math.random() * 2 - 1) * 4.5, (Math.random() * 2 - 1) * 3.2);
    }, 1500);
    return () => window.clearInterval(wander);
  }, [reduced, look]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMoveRef.current < 16) return;
      lastMoveRef.current = now;
      if (coveringRef.current || typingRef.current) return;
      const svg = rootRef.current?.querySelector('.ab-face') as SVGSVGElement | null;
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      const cx = r.left + r.width * 0.5;
      const cy = r.top + r.height * (88 / 150);
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      look(
        Math.max(-5, Math.min(5, (dx / dist) * 5)),
        Math.max(-4, Math.min(5, (dy / dist) * 5)),
      );
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, [look]);

  useEffect(() => () => clearTypingJitter(), [clearTypingJitter]);

  const isReset = mode === 'reset' || mode === 'change';
  const showName = mode === 'signup';
  const showEmail = (mode === 'signin' || mode === 'signup' || mode === 'forgot') && !(mode === 'forgot' && forgotStep === 'otp');
  const showCurrent = mode === 'change';
  const showPassword = mode !== 'forgot';
  const showConfirm = mode === 'signup' || isReset;
  const showForgot = mode === 'signin';
  const showMismatch = showConfirm && confirm.length > 0 && password !== confirm;

  const cardTitle: Record<AuthBoldMode, string> = {
    signin: t('auth.signIn'),
    signup: t('auth.createYourAccount'),
    forgot: t('auth.resetYourPassword'),
    reset: t('auth.setNewPassword'),
    change: t('auth.changePassword'),
  };
  const cardSub: Record<AuthBoldMode, string> = {
    signin: t('auth.welcomeBack'),
    signup: t('auth.signupSubtitle'),
    forgot: forgotStep === 'otp' ? t('auth.forgotOtpSubtitle') : t('auth.forgotSubtitle'),
    reset: t('auth.resetSubtitle'),
    change: t('auth.changeSubtitle'),
  };
  const submitLabel: Record<AuthBoldMode, string> = {
    signin: t('auth.login'),
    signup: t('auth.signUp'),
    forgot: forgotStep === 'otp' ? t('auth.verifyCode') : t('auth.sendVerificationCode'),
    reset: t('auth.resetPassword'),
    change: t('auth.updatePassword'),
  };
  const footPrompt: Record<AuthBoldMode, string> = {
    signin: t('auth.newToWiseResume'),
    signup: t('auth.alreadyHaveAccount'),
    forgot: t('auth.rememberedIt'),
    reset: t('auth.rememberedIt'),
    change: '',
  };
  const footAction: Record<AuthBoldMode, string> = {
    signin: t('auth.signUpAction'),
    signup: t('auth.signIn'),
    forgot: t('auth.backToSignIn'),
    reset: t('auth.backToSignIn'),
    change: t('auth.backToSignIn'),
  };

  const onEmailFocus = () => {
    typingRef.current = true;
    cover(false);
    setScoutTyping(true);
    look(0, 6.5);
    startTypingJitter();
  };
  const onEmailInput = () => {
    if (typingRef.current && !reduced) {
      look((Math.random() * 2 - 1) * 4.5, 5.5 + Math.random() * 1.5);
    }
  };
  const onPwFocus = () => {
    typingRef.current = false;
    clearTypingJitter();
    setScoutTyping(false);
    look(0, 0);
    cover(true);
  };
  const onBlur = () => {
    typingRef.current = false;
    clearTypingJitter();
    setScoutTyping(false);
    cover(false);
    look(0, 0);
  };

  const toggleMode = () => {
    if (!onModeChange) return;
    if (mode === 'signin') onModeChange('signup');
    else onModeChange('signin');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (showMismatch) return;
    void onSubmit();
  };

  const onText = (cb?: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) =>
    cb?.(e.target.value);

  const rootClass = `ab-root${light ? ' light' : ''} ${mode}`;

  return (
    <div ref={rootRef} className={rootClass} dir={direction}>
      <style>{STYLES}</style>
      <div className="ab-glow" />
      <div className="ab-glow2" />
      <img className="ab-mark-wm" src={wiseAiLogoDark} alt="" />


      <div className="ab-shell">
        <button
          className="ab-theme"
          type="button"
          onClick={() => setLight((v) => !v)}
          aria-label={t('auth.toggleTheme')}
        >
          {light ? <Moon /> : <Sun />}
        </button>

        <div className="ab-brand ab-anim" style={{ ['--d' as string]: '0ms' }}>
          <img src={wiseAiLogoDark} alt="" />
          <b>
            WiseResume<span> AI</span>
          </b>
        </div>

        <div className="ab-body">
          <div className="ab-hero">
            <div className="ab-pill ab-anim" style={{ ['--d' as string]: '80ms' }}>
              <span className="dot" />
              {t('auth.careerPill')}
            </div>
            <h1 className="ab-title ab-anim" style={{ ['--d' as string]: '160ms' }}>
              {t('auth.heroLead')}
              <br />
              <span className={`ab-grad${caret ? ' ab-caret' : ''}`}>{typed}</span>
            </h1>
            <p className="ab-sub ab-anim" style={{ ['--d' as string]: '240ms' }}>
              {t('auth.heroDescription')}
            </p>
            <div className="ab-stats ab-anim" style={{ ['--d' as string]: '320ms' }}>
              <div className="ab-stat">
                <div className="n">{stat1}</div>
                <div className="l">{t('auth.moreInterviews')}</div>
              </div>
              <div className="ab-div" />
              <div className="ab-stat">
                <div className="n">{stat2}</div>
                <div className="l">{t('auth.averageAtsScore')}</div>
              </div>
            </div>
          </div>

          <form className="ab-card ab-anim" role="form" dir={direction} style={{ ['--d' as string]: '260ms' }} onSubmit={handleSubmit}>
            <div className="ab-scout" ref={scoutRef}>
              <div className="ab-think">
                <span />
                <span />
                <span />
              </div>
              <ScoutSvg />
            </div>

            <div className="ab-cardhead">
              <h2>{cardTitle[mode]}</h2>
              <p className="ab-cardsub">{cardSub[mode]}</p>
            </div>

            {/* Capture refs after first render */}
            <ScoutRefAttacher
              rootRef={rootRef}
              shutRef={shutRef}
              headRef={headRef}
              plRef={plRef}
              prRef={prRef}
            />

            {notice ? <div className="ab-notice">{notice}</div> : null}

            {error ? (
              <div className="ab-error" role="alert">
                <AlertCircle />
                <span>{error}</span>
              </div>
            ) : null}

            {doneSlot ? (
              <div className="ab-done">{doneSlot}</div>
            ) : (
              <>
                {showName && (
                  <>
                    <label className="ab-lab">{t('auth.fullName')}</label>
                    <div className="ab-field" style={{ marginBottom: 14 }}>
                      <User />
                      <input
                        type="text"
                        dir="auto"
                        placeholder="Alex Johnson"
                        autoComplete="name"
                        value={name}
                        onFocus={onEmailFocus}
                        onBlur={onBlur}
                        onChange={onText(onNameChange)}
                        required
                      />
                    </div>
                  </>
                )}

                {showEmail && (
                  <>
                    <label className="ab-lab">{t('auth.email')}</label>
                    <div className="ab-field" style={{ marginBottom: 14 }}>
                      <Mail />
                      <input
                        type="email"
                        dir="ltr"
                        placeholder="you@email.com"
                        autoComplete="email"
                        value={email}
                        onFocus={onEmailFocus}
                        onBlur={onBlur}
                        onChange={(e) => {
                           onEmailInput();
                           onEmailChange?.(e.target.value);
                        }}
                        required
                      />
                    </div>
                  </>
                )}

                {mode === 'forgot' && forgotStep === 'otp' && (
                  <>
                    <label className="ab-lab">{t('auth.verificationCode')}</label>
                    <div className="ab-field" style={{ marginBottom: 14 }}>
                      <Lock />
                      <input
                        type="text"
                        dir="ltr"
                        placeholder={t('auth.verificationCodePlaceholder')}
                        value={otp}
                        onFocus={onEmailFocus}
                        onBlur={onBlur}
                        onChange={onText(onOtpChange)}
                        required
                        maxLength={6}
                      />
                    </div>
                  </>
                )}

                {showCurrent && (
                  <>
                    <label className="ab-lab">{t('auth.currentPassword')}</label>
                    <div className="ab-field" style={{ marginBottom: 14 }}>
                      <Lock />
                      <input
                        type="password"
                        dir="ltr"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={current}
                        onFocus={onPwFocus}
                        onBlur={onBlur}
                        onChange={onText(onCurrentChange)}
                        required
                      />
                    </div>
                  </>
                )}

                {showPassword && (
                  <>
                    <div className="ab-labrow">
                      <label className="ab-lab" style={{ margin: 0 }}>
                        {isReset ? t('auth.newPassword') : t('auth.password')}
                      </label>
                      {showForgot && (
                        <button type="button" onClick={() => onModeChange?.('forgot')}>
                          {t('auth.forgotShort')}
                        </button>
                      )}
                    </div>
                    <div className="ab-field">
                      <Lock />
                      <input
                        type={showPw ? 'text' : 'password'}
                        dir="ltr"
                        placeholder="••••••••"
                        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                        value={password}
                        onFocus={onPwFocus}
                        onBlur={onBlur}
                        onChange={onText(onPasswordChange)}
                        required
                        minLength={mode === 'signin' ? undefined : 8}
                      />
                      <button
                        className="ab-eye"
                        type="button"
                        onClick={() => {
                          setShowPw((v) => {
                            const next = !v;
                            if (coveringRef.current && shutRef.current) {
                              shutRef.current.style.transform = `scaleY(${next ? 0.55 : 1})`;
                            }
                            return next;
                          });
                        }}
                        aria-label={t('auth.togglePassword')}
                      >
                        {showPw ? <EyeOff /> : <Eye />}
                      </button>
                    </div>
                  </>
                )}

                {showConfirm && (
                  <>
                    <label className="ab-lab" style={{ marginTop: 14 }}>
                      {isReset ? t('auth.confirmNewPassword') : t('auth.confirmPassword')}
                    </label>
                    <div className="ab-field">
                      <Lock />
                      <input
                        type={showPw ? 'text' : 'password'}
                        dir="ltr"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        value={confirm}
                        onFocus={onPwFocus}
                        onBlur={onBlur}
                        onChange={onText(onConfirmChange)}
                        required
                        minLength={8}
                      />
                    </div>
                    {showMismatch && (
                      <p className="ab-mismatch">
                        <AlertCircle />
                        {t('auth.passwordMismatch')}
                      </p>
                    )}
                  </>
                )}

                {mode === 'signin' && (
                  <div className="ab-optrow" onClick={() => onRememberChange?.(!remember)}>
                    <span className={`ab-check${remember ? ' on' : ''}`}>
                      {remember && <Check />}
                    </span>
                    <span>{t('auth.keepSignedIn')}</span>
                  </div>
                )}

                 <button className="ab-btn" type="submit" disabled={loading}>
                   {loading ? t('auth.pleaseWait') : submitLabel[mode]}
                   {!loading && <ArrowRight data-mirror-rtl="true" />}
                 </button>

                 {(mode === 'signin' || mode === 'signup') && onLinkedInLogin && (
                   <>
                     <div className="ab-divider-row">
                       <span className="ab-divider-line" />
                       <span className="ab-divider-text">{t('auth.or')}</span>
                       <span className="ab-divider-line" />
                     </div>
                     <button
                       className="ab-linkedin-btn"
                       type="button"
                       onClick={onLinkedInLogin}
                       disabled={loading}
                     >
                       <Linkedin />
                       <span>{t('auth.continueWithLinkedIn')}</span>
                     </button>
                   </>
                 )}

                {(mode === 'signin' || mode === 'signup') && (
                  <div className="ab-trust">
                    <span>
                      <CheckCircle2 />
                      {t('auth.freeToStart')}
                    </span>
                    <span>
                      <CheckCircle2 />
                      {t('auth.noCreditCard')}
                    </span>
                  </div>
                )}

                {footPrompt[mode] && (
                  <p className="ab-foot">
                    {footPrompt[mode]}{' '}
                    <button type="button" onClick={toggleMode}>
                      {footAction[mode]}
                    </button>
                  </p>
                )}
              </>
            )}
          </form>
        </div>
      </div>

    </div>
  );
}

interface RefAttacherProps {
  rootRef: React.MutableRefObject<HTMLDivElement | null>;
  shutRef: React.MutableRefObject<SVGRectElement | null>;
  headRef: React.MutableRefObject<SVGGElement | null>;
  plRef: React.MutableRefObject<SVGCircleElement | null>;
  prRef: React.MutableRefObject<SVGCircleElement | null>;
}

function ScoutRefAttacher({ rootRef, shutRef, headRef, plRef, prRef }: RefAttacherProps) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    shutRef.current = root.querySelector('.ab-shut');
    headRef.current = root.querySelector('.ab-head');
    plRef.current = root.querySelector('.ab-pl');
    prRef.current = root.querySelector('.ab-pr');
  });
  return null;
}

export default AuthBold;
