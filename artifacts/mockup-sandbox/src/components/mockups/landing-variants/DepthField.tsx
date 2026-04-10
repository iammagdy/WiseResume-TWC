import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Star, FileText, CheckCircle, Zap, Target, Layout, PenTool, Lock } from 'lucide-react';

const useInView = (threshold = 0.15) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, { threshold });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
};

export function DepthField() {
  const [isInteractive, setIsInteractive] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    setIsInteractive(!prefersReducedMotion && !isTouch);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isInteractive || !sceneRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    sceneRef.current.style.setProperty('--rx', `${y * 8}deg`);
    sceneRef.current.style.setProperty('--ry', `${x * 8}deg`);
  };

  const handleMouseLeave = () => {
    if (!sceneRef.current) return;
    sceneRef.current.style.setProperty('--rx', '0deg');
    sceneRef.current.style.setProperty('--ry', '0deg');
  };

  const [featuresRef, featuresInView] = useInView();
  const [pricingRef, pricingInView] = useInView();
  const [ctaRef, ctaInView] = useInView();

  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [hoveredPricing, setHoveredPricing] = useState<number | null>(null);

  const features = [
    { title: "AI-Powered Bullet Points", desc: "Generate high-impact achievements tailored to your target job in seconds.", icon: <Zap className="w-6 h-6 text-purple-400" /> },
    { title: "ATS Optimization", desc: "Scan against job descriptions and get real-time keyword suggestions.", icon: <Target className="w-6 h-6 text-purple-400" /> },
    { title: "Smart Formatting", desc: "Pixel-perfect templates that look great and parse flawlessly through ATS.", icon: <Layout className="w-6 h-6 text-purple-400" /> }
  ];

  const pricing = [
    { name: "Free", price: "$0", desc: "Perfect for getting started", features: ["1 Resume", "Basic Templates", "Export to PDF"] },
    { name: "Pro", price: "$9", period: "/mo", desc: "For serious job seekers", features: ["Unlimited Resumes", "AI Bullet Generation", "Cover Letter Builder", "ATS Keyword Analysis"], popular: true },
    { name: "Premium", price: "$19", period: "/mo", desc: "For career climbers", features: ["Everything in Pro", "Interview Prep AI", "Portfolio Builder", "Priority Support"] }
  ];

  return (
    <div className="min-h-screen bg-[#111118] text-white overflow-x-hidden font-sans selection:bg-purple-500/30">
      {/* Floating Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#111118]/60 backdrop-blur-md">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <PenTool className="w-4 h-4 text-white" />
          </div>
          WiseResume
        </div>
        <button className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium border border-white/10">
          Get Started Free
        </button>
      </header>

      {/* Hero Section (3D Parallax) */}
      <section 
        className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden pt-20"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          perspective: '1200px',
          perspectiveOrigin: '50% 50%'
        }}
      >
        <div
          ref={sceneRef}
          className="absolute inset-0 w-full h-full flex items-center justify-center"
          style={{
            ['--rx' as string]: '0deg',
            ['--ry' as string]: '0deg',
            transformStyle: 'preserve-3d',
            transform: isInteractive ? 'rotateX(calc(-1 * var(--rx))) rotateY(var(--ry))' : 'none',
            transition: 'transform 0.1s ease-out'
          }}
        >
          {/* Background layer (z: -200px) */}
          <div style={{ position: 'absolute', transformStyle: 'preserve-3d', transform: 'translateZ(-200px)', width: '100%', height: '100%' }}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse" />
            <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[100px] mix-blend-screen opacity-40" />
          </div>

          {/* Mid layer (z: -80px) */}
          <div style={{ position: 'absolute', transformStyle: 'preserve-3d', transform: 'translateZ(-80px)', width: '100%', height: '100%' }}>
            <div className="absolute top-[20%] right-[15%] w-64 h-80 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md -rotate-12 shadow-2xl opacity-60">
              <div className="p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/10" />
                <div className="w-3/4 h-4 rounded bg-white/10" />
                <div className="w-1/2 h-4 rounded bg-white/10" />
                <div className="space-y-2 mt-8">
                  <div className="w-full h-3 rounded bg-white/5" />
                  <div className="w-full h-3 rounded bg-white/5" />
                  <div className="w-5/6 h-3 rounded bg-white/5" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-[20%] left-[10%] w-72 h-48 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md rotate-6 shadow-2xl opacity-40">
               <div className="p-6 space-y-3">
                 <div className="w-full h-4 rounded bg-purple-500/20" />
                 <div className="w-full h-4 rounded bg-white/10" />
                 <div className="w-4/5 h-4 rounded bg-white/10" />
                 <div className="w-full h-4 rounded bg-white/10" />
               </div>
            </div>
          </div>

          {/* Base layer (z: 0) */}
          <div style={{ position: 'absolute', transformStyle: 'preserve-3d', transform: 'translateZ(0)', width: '100%', height: '100%' }} className="flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight max-w-5xl leading-[1.1]">
              Land your dream job with a <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-purple-400 animate-gradient bg-[length:200%_auto]">perfect resume</span>
            </h1>
            <p className="mt-8 text-xl md:text-2xl text-gray-400 max-w-2xl font-light">
              AI-powered formatting, real-time ATS scoring, and targeted bullet points to get you hired faster.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row items-center gap-6">
              <button className="px-8 py-4 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-lg shadow-[0_0_40px_rgba(147,51,234,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(147,51,234,0.6)] flex items-center gap-2">
                Get Started Free <ChevronRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold text-lg border border-white/10 transition-all">
                See how it works
              </button>
            </div>
          </div>

          {/* Foreground layer (z: +60px) */}
          <div style={{ position: 'absolute', transformStyle: 'preserve-3d', transform: 'translateZ(60px)', width: '100%', height: '100%', pointerEvents: 'none' }}>
             <div className="absolute top-[35%] left-[20%] px-4 py-2 rounded-full bg-[#111118]/80 border border-purple-500/30 backdrop-blur-md flex items-center gap-2 shadow-lg shadow-purple-500/10">
               <Zap className="w-4 h-4 text-purple-400" />
               <span className="text-sm font-medium text-gray-200">AI-Powered</span>
             </div>
             <div className="absolute bottom-[40%] right-[22%] px-4 py-2 rounded-full bg-[#111118]/80 border border-green-500/30 backdrop-blur-md flex items-center gap-2 shadow-lg shadow-green-500/10">
               <CheckCircle className="w-4 h-4 text-green-400" />
               <span className="text-sm font-medium text-gray-200">ATS Score: 92%</span>
             </div>
             <div className="absolute top-[60%] left-[30%] px-4 py-2 rounded-full bg-[#111118]/80 border border-blue-500/30 backdrop-blur-md flex items-center gap-2 shadow-lg shadow-blue-500/10">
               <Star className="w-4 h-4 text-blue-400" />
               <span className="text-sm font-medium text-gray-200">Interview Ready</span>
             </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="border-y border-white/5 bg-white/[0.02] py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5">
          {[
            { value: "50K+", label: "Resumes Built" },
            { value: "92%", label: "ATS Pass Rate" },
            { value: "4.8★", label: "Average Rating" },
            { value: "30s", label: "Avg. Tailor Time" }
          ].map((stat, i) => (
            <div key={i} className="text-center px-4">
              <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">{stat.value}</div>
              <div className="mt-2 text-sm text-gray-400 uppercase tracking-wider font-semibold">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="py-32 px-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className={`max-w-7xl mx-auto transition-all duration-1000 ${featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-24'}`}>
          <div className="text-center mb-20 relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Built for serious job seekers</h2>
            <p className="mt-4 text-xl text-gray-400 max-w-2xl mx-auto">Everything you need to stand out, get past the robots, and land interviews.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                onMouseEnter={() => setHoveredFeature(idx)}
                onMouseLeave={() => setHoveredFeature(null)}
                className="rounded-3xl p-8 relative group"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: hoveredFeature === idx ? 'perspective(800px) rotateX(-5deg) rotateY(5deg) translateZ(12px)' : 'perspective(800px) rotateX(0) rotateY(0)',
                  transition: 'transform 0.3s ease',
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(139,92,246,0.1)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section ref={pricingRef} className="py-32 px-6 bg-[#111118] relative z-10">
        <div className={`max-w-7xl mx-auto transition-all duration-1000 ${pricingInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-24'}`}>
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-4 text-xl text-gray-400">Start for free, upgrade when you need more power.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricing.map((plan, idx) => (
              <div 
                key={idx}
                onMouseEnter={() => setHoveredPricing(idx)}
                onMouseLeave={() => setHoveredPricing(null)}
                className={`rounded-3xl p-8 relative flex flex-col ${plan.popular ? 'border-purple-500/50' : 'border-white/10'} border`}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: hoveredPricing === idx ? 'perspective(800px) rotateX(-2deg) rotateY(2deg) translateZ(10px)' : 'perspective(800px) rotateX(0) rotateY(0)',
                  transition: 'transform 0.3s ease',
                  background: plan.popular ? 'rgba(147,51,234,0.05)' : 'rgba(255,255,255,0.02)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-full">
                    Most Popular
                  </div>
                )}
                
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-400 mb-6">{plan.desc}</p>
                
                <div className="mb-8 flex items-baseline gap-1">
                  <span className="text-5xl font-black">{plan.price}</span>
                  {plan.period && <span className="text-gray-400">{plan.period}</span>}
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-purple-400 shrink-0" />
                      <span className="text-gray-300">{feat}</span>
                    </li>
                  ))}
                </ul>

                <button className={`w-full py-4 rounded-xl font-bold transition-all ${plan.popular ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                  {plan.price === "$0" ? "Get Started" : "Upgrade"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent" />
        <div className={`max-w-4xl mx-auto text-center relative z-10 transition-all duration-1000 ${ctaInView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-8">Ready to upgrade your career?</h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">Join thousands of professionals who have already landed their dream jobs using WiseResume.</p>
          <button className="px-10 py-5 rounded-full bg-white text-gray-900 font-bold text-xl hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)]">
            Create Your Resume Now
          </button>
        </div>
      </section>

      {/* Install CTA */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto rounded-2xl border border-purple-500/20 bg-purple-900/10 backdrop-blur-md p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-base mb-1">Install WiseResume on your device</div>
              <div className="text-sm text-gray-400">Works offline. Add to home screen for instant access on any device.</div>
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <button onClick={() => {}} className="px-5 py-2.5 rounded-full border border-white/10 bg-white/5 text-white text-sm font-semibold hover:bg-white/10 transition-colors">
              📱 Add to Home Screen
            </button>
            <button onClick={() => {}} className="px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-lg shadow-purple-500/25 transition-all">
              ⬇ Install App
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 text-center text-gray-500">
        <div className="flex items-center justify-center gap-2 mb-6 font-bold text-lg text-white/80">
          <PenTool className="w-5 h-5" />
          WiseResume
        </div>
        <p>© {new Date().getFullYear()} WiseResume. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default DepthField;