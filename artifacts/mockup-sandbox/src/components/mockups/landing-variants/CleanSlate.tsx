import React, { useState, useEffect } from "react";
import { 
  Check, 
  Sparkles, 
  LineChart, 
  Wand2, 
  Mic, 
  FileText, 
  LayoutList,
  Menu,
  X,
  ArrowRight,
  Star,
  Shield,
  FileCheck2,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroMockup = () => {
  return (
    <div className="relative w-full aspect-[4/3] bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
      {/* Browser Chrome / Header */}
      <div className="h-10 bg-zinc-50 border-b border-zinc-200 flex items-center px-4 gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-zinc-300" />
          <div className="w-3 h-3 rounded-full bg-zinc-300" />
          <div className="w-3 h-3 rounded-full bg-zinc-300" />
        </div>
        <div className="ml-4 h-5 w-48 bg-white border border-zinc-200 rounded text-[10px] text-zinc-400 flex items-center px-2">
          wiseresume.com/editor
        </div>
      </div>
      
      {/* Editor Body */}
      <div className="flex-1 flex bg-zinc-100">
        {/* Left Toolbar */}
        <div className="w-12 bg-white border-r border-zinc-200 flex flex-col items-center py-4 gap-4">
          <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <FileText size={14} />
          </div>
          <div className="w-6 h-6 rounded text-zinc-400 flex items-center justify-center">
            <LayoutList size={14} />
          </div>
          <div className="w-6 h-6 rounded text-zinc-400 flex items-center justify-center">
            <Sparkles size={14} />
          </div>
        </div>

        {/* Main Document Area */}
        <div className="flex-1 p-6 overflow-hidden flex justify-center">
          <div className="w-full max-w-sm bg-white shadow-sm border border-zinc-200 rounded p-6 flex flex-col gap-4">
            <div className="w-1/2 h-6 bg-zinc-200 rounded" />
            <div className="w-1/3 h-3 bg-zinc-100 rounded" />
            
            <div className="mt-4 flex flex-col gap-2">
              <div className="w-full h-2 bg-zinc-100 rounded" />
              <div className="w-full h-2 bg-zinc-100 rounded" />
              <div className="w-4/5 h-2 bg-zinc-100 rounded" />
            </div>

            <div className="mt-4">
              <div className="w-1/4 h-4 bg-zinc-200 rounded mb-3" />
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="w-1/3 h-3 bg-zinc-800 rounded" />
                  <div className="w-1/5 h-2 bg-zinc-300 rounded" />
                </div>
                <div className="w-full h-2 bg-zinc-100 rounded" />
                <div className="w-full h-2 bg-zinc-100 rounded" />
                <div className="w-5/6 h-2 bg-zinc-100 rounded" />
              </div>
            </div>
            
            {/* AI Suggestion Highlight */}
            <div className="relative mt-4 p-3 border-2 border-indigo-200 bg-indigo-50/50 rounded-md">
               <div className="absolute -top-3 -right-3 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-md">
                 <Sparkles size={12} />
               </div>
               <div className="w-1/4 h-4 bg-zinc-200 rounded mb-3" />
               <div className="flex justify-between items-center">
                  <div className="w-1/3 h-3 bg-zinc-800 rounded" />
                  <div className="w-1/5 h-2 bg-zinc-300 rounded" />
                </div>
                <div className="mt-2 w-full h-2 bg-indigo-200 rounded" />
                <div className="mt-2 w-4/5 h-2 bg-indigo-200 rounded" />
            </div>
          </div>
        </div>

        {/* Right AI Panel */}
        <div className="w-48 bg-white border-l border-zinc-200 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs mb-2">
            <Sparkles size={14} />
            AI Suggestions
          </div>
          
          <div className="bg-zinc-50 border border-zinc-200 rounded p-3">
            <div className="w-full h-2 bg-zinc-200 rounded mb-2" />
            <div className="w-3/4 h-2 bg-zinc-200 rounded mb-3" />
            <div className="h-6 bg-indigo-600 rounded text-[9px] text-white flex items-center justify-center font-medium">
              Apply Suggestion
            </div>
          </div>
          
          <div className="bg-zinc-50 border border-zinc-200 rounded p-3 opacity-60">
            <div className="w-full h-2 bg-zinc-200 rounded mb-2" />
            <div className="w-1/2 h-2 bg-zinc-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const CleanSlate = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      title: "AI Resume Writing",
      description: "Generate professional bullet points and summaries tailored to your target role in seconds.",
      icon: <Sparkles className="w-6 h-6 text-indigo-600" />,
      color: "border-indigo-500"
    },
    {
      title: "ATS Score Analysis",
      description: "Score your resume against job descriptions to ensure you pass applicant tracking systems.",
      icon: <LineChart className="w-6 h-6 text-emerald-500" />,
      color: "border-emerald-500"
    },
    {
      title: "Smart Tailoring",
      description: "Automatically adapt your existing resume to match specific job postings with one click.",
      icon: <Wand2 className="w-6 h-6 text-amber-500" />,
      color: "border-amber-500"
    },
    {
      title: "Interview Coaching",
      description: "Practice with our AI recruiter simulation to prepare for the specific role you applied for.",
      icon: <Mic className="w-6 h-6 text-rose-500" />,
      color: "border-rose-500"
    },
    {
      title: "Cover Letters",
      description: "Generate perfectly matched cover letters that complement your resume and the job description.",
      icon: <FileText className="w-6 h-6 text-blue-500" />,
      color: "border-blue-500"
    },
    {
      title: "Application Tracker",
      description: "Keep track of where you applied, interview stages, and follow-up deadlines in one place.",
      icon: <LayoutList className="w-6 h-6 text-purple-500" />,
      color: "border-purple-500"
    }
  ];

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Background Dot Grid */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%23000000'/%3E%3C/svg%3E")`,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Sticky Header */}
      <header 
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/80 backdrop-blur-md border-b border-zinc-200/50 py-3 shadow-sm' : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-zinc-900">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <FileText className="w-5 h-5" />
            </div>
            WiseResume
          </div>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Pricing</a>
            <div className="flex items-center gap-4 ml-4">
              <Button variant="ghost" className="text-sm font-medium hover:bg-zinc-100" onClick={() => {}}>
                Sign In
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 shadow-sm" onClick={() => {}}>
                Get Started
              </Button>
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-zinc-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-zinc-200 shadow-lg p-6 flex flex-col gap-4 md:hidden">
            <a href="#features" className="text-base font-medium text-zinc-800" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#pricing" className="text-base font-medium text-zinc-800" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <hr className="border-zinc-100 my-2" />
            <Button variant="outline" className="w-full justify-center" onClick={() => {}}>Sign In</Button>
            <Button className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {}}>Get Started</Button>
          </div>
        )}
      </header>

      <main className="relative pt-32 pb-20 overflow-hidden">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 pt-10 pb-24 md:pt-20 md:pb-32">
          <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
            
            {/* Hero Text (60% desktop) */}
            <div className="w-full md:w-[55%] flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                <span>WiseResume AI 2.0 is here</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-zinc-900 leading-[1.1] mb-6">
                Land your dream job with a <span className="relative inline-block">
                  <span className="relative z-10 text-indigo-600">perfect resume</span>
                  <span className="absolute bottom-1 lg:bottom-2 left-0 w-full h-3 bg-indigo-100 -z-10 rounded-sm transform -rotate-1"></span>
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-zinc-600 mb-8 max-w-xl leading-relaxed">
                Stop guessing what recruiters want. Our AI analyzes job descriptions, scores your resume, and perfectly tailors your experience to beat the ATS and get you hired.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Button size="lg" className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-200 text-base font-semibold group transition-all" onClick={() => {}}>
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 rounded-full text-base font-semibold border-zinc-300 hover:bg-zinc-50" onClick={() => {}}>
                  Sign In
                </Button>
              </div>
              
              <div className="mt-10 flex items-center gap-4 text-sm text-zinc-500 font-medium">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-zinc-200 border-2 border-white overflow-hidden">
                       <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i}&backgroundColor=e2e8f0`} alt="avatar" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex text-amber-400 mb-0.5">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                  <span>Trusted by 50k+ professionals</span>
                </div>
              </div>
            </div>
            
            {/* Hero Mockup (40% desktop) */}
            <div className="w-full md:w-[45%] relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100 to-purple-50 blur-3xl -z-10 transform scale-110 rounded-full opacity-60"></div>
              <HeroMockup />
            </div>
            
          </div>
        </section>

        {/* Stats Strip */}
        <section className="border-y border-zinc-200 bg-zinc-50/50">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 divide-x-0 md:divide-x divide-zinc-200">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 text-3xl font-bold text-zinc-900 mb-1">
                  50K+ <FileCheck2 className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="text-sm font-medium text-zinc-500">Resumes created</div>
              </div>
              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 text-3xl font-bold text-zinc-900 mb-1">
                  92% <Shield className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="text-sm font-medium text-zinc-500">ATS pass rate</div>
              </div>
              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 text-3xl font-bold text-zinc-900 mb-1">
                  4.8 <Star className="w-6 h-6 text-amber-400 fill-current" />
                </div>
                <div className="text-sm font-medium text-zinc-500">Average rating</div>
              </div>
              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 text-3xl font-bold text-zinc-900 mb-1">
                  30s <Clock className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="text-sm font-medium text-zinc-500">Avg. time to tailor</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 mb-6 tracking-tight">
              Everything you need to land the job
            </h2>
            <p className="text-lg text-zinc-600">
              A complete toolkit designed to bypass applicant tracking systems and impress human recruiters.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className={`bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${feature.color} bg-current opacity-80`} />
                <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-3">{feature.title}</h3>
                <p className="text-zinc-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="max-w-6xl mx-auto px-6 py-24 md:py-32 bg-zinc-50/50 rounded-3xl border border-zinc-200/50 mx-4 md:mx-auto mb-20">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 mb-6 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-zinc-600">
              Start for free, upgrade when you need more power.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm flex flex-col">
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Free</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-zinc-900">$0</span>
                <span className="text-zinc-500 font-medium">/ forever</span>
              </div>
              <p className="text-sm text-zinc-600 mb-8 border-b border-zinc-100 pb-8">
                Perfect for creating your first professional resume.
              </p>
              <ul className="flex flex-col gap-4 mb-8 flex-1">
                {['1 Resume', 'Basic templates', 'PDF export', 'Basic grammar check'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-700 text-sm font-medium">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-12 rounded-xl font-semibold border-zinc-300 hover:bg-zinc-50" onClick={() => {}}>
                Start for free
              </Button>
            </div>

            {/* Pro Tier */}
            <div className="bg-white rounded-2xl p-8 border-2 border-indigo-600 shadow-xl relative flex flex-col transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Most Popular
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Pro</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-zinc-900">$9</span>
                <span className="text-zinc-500 font-medium">/ month</span>
              </div>
              <p className="text-sm text-zinc-600 mb-8 border-b border-zinc-100 pb-8">
                Everything you need to actively hunt for jobs.
              </p>
              <ul className="flex flex-col gap-4 mb-8 flex-1">
                {[
                  'Unlimited resumes', 
                  'All premium templates', 
                  '10 AI Tailor generations / mo', 
                  'ATS Score Analysis',
                  'Cover letter generator'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-900 text-sm font-medium">
                    <Check className="w-4 h-4 text-indigo-600" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-12 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200" onClick={() => {}}>
                Get Pro
              </Button>
            </div>

            {/* Premium Tier */}
            <div className="bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm flex flex-col">
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Premium</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-zinc-900">$19</span>
                <span className="text-zinc-500 font-medium">/ month</span>
              </div>
              <p className="text-sm text-zinc-600 mb-8 border-b border-zinc-100 pb-8">
                For the serious job seeker who wants every advantage.
              </p>
              <ul className="flex flex-col gap-4 mb-8 flex-1">
                {[
                  'Everything in Pro', 
                  'Unlimited AI Tailor generations', 
                  'Unlimited AI Cover Letters', 
                  'AI Interview Coaching',
                  'Priority support'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-700 text-sm font-medium">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-12 rounded-xl font-semibold border-zinc-300 hover:bg-zinc-50" onClick={() => {}}>
                Get Premium
              </Button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-6 tracking-tight">
            Ready to get hired?
          </h2>
          <p className="text-xl text-zinc-600 mb-10 max-w-2xl mx-auto">
            Join thousands of professionals who have already upgraded their career with WiseResume.
          </p>
          <Button size="lg" className="h-16 px-10 text-lg bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl shadow-indigo-200 font-bold hover:scale-105 transition-transform" onClick={() => {}}>
            Create your free account
          </Button>
        </section>
      </main>

      {/* Install CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-zinc-900 text-base mb-0.5">Install WiseResume on your device</div>
              <div className="text-sm text-zinc-500">Works offline — add to your home screen for instant access anytime.</div>
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <button onClick={() => {}} className="px-5 py-2.5 rounded-lg border border-zinc-300 bg-white text-zinc-700 text-sm font-semibold hover:bg-zinc-50 transition-colors">
              📱 Add to Home Screen
            </button>
            <button onClick={() => {}} className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
              ⬇ Install App
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-bold text-lg text-zinc-900">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white">
              <FileText className="w-3.5 h-3.5" />
            </div>
            WiseResume
          </div>
          
          <div className="flex gap-6 text-sm font-medium text-zinc-500">
            <a href="#" className="hover:text-zinc-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Contact</a>
          </div>
          
          <p className="text-sm text-zinc-400">
            © {new Date().getFullYear()} WiseResume. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
