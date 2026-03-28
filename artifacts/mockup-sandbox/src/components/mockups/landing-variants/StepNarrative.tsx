import React from "react";
import { 
  Sparkles, 
  Target, 
  Wand2, 
  Mic, 
  ArrowRight, 
  Globe, 
  Check, 
  Smartphone,
  Upload,
  FileText,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function StepNarrative() {
  return (
    <div 
      className="min-h-screen overflow-y-auto text-slate-300 font-sans selection:bg-rose-500/30" 
      style={{background: 'linear-gradient(135deg, #0a0e1a 0%, #0f1629 50%, #0a0e1a 100%)'}}
    >
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center shadow-[0_0_15px_rgba(225,29,72,0.5)]">
            <span className="text-white font-bold text-xl leading-none">W</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">WiseResume</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <a href="#" className="hover:text-white transition-colors">Templates</a>
          <a href="#" className="hover:text-white transition-colors">Features</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <Button variant="outline" className="hidden md:inline-flex border-slate-700 hover:bg-slate-800 text-white">
          Sign In
        </Button>
      </nav>

      {/* HERO SECTION */}
      <section className="container mx-auto px-6 py-14 md:py-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          <span>The #1 AI Career Platform</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6 max-w-4xl leading-tight">
          Build Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-600">Dream Resume</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl leading-relaxed">
          The only resume app that coaches your interview, scores your ATS match, and builds your portfolio site — all in one.
        </p>
        
        <div className="flex flex-col items-center w-full max-w-xs">
          <Button size="lg" className="w-full bg-rose-600 hover:bg-rose-700 text-white h-14 text-lg rounded-xl shadow-[0_0_30px_rgba(225,29,72,0.3)] group transition-all duration-300 hover:shadow-[0_0_40px_rgba(225,29,72,0.5)] hover:-translate-y-1">
            Get Started
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm text-slate-400">
            <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-400" /> Free to start</span>
            <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-400" /> No credit card</span>
            <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-400" /> AI-powered</span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (THE JOURNEY) */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">3 steps to your dream job</h2>
          <p className="text-slate-400 max-w-xl mx-auto">A simple, proven process to land more interviews and offers.</p>
        </div>

        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-slate-700 to-transparent -translate-y-1/2 z-0"></div>

          <div className="flex flex-col md:flex-row gap-8 relative z-10">
            {/* Step 1 */}
            <div className="flex-1 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 relative group hover:border-blue-500/50 transition-colors">
              <div className="absolute -top-5 -left-5 w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-lg shadow-lg border-4 border-[#0a0e1a]">
                1
              </div>
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20 group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Upload your resume</h3>
              <p className="text-slate-400 leading-relaxed">
                Paste or upload your existing resume in seconds. We handle any format.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex-1 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 relative group hover:border-rose-500/50 transition-colors">
              <div className="absolute -top-5 -left-5 w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-lg shadow-lg border-4 border-[#0a0e1a]">
                2
              </div>
              <div className="w-14 h-14 rounded-xl bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20 group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI enhances everything</h3>
              <p className="text-slate-400 leading-relaxed">
                AI rewrites weak bullets, scores your ATS match, and tailors your resume to any job in 30 seconds.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex-1 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 relative group hover:border-emerald-500/50 transition-colors">
              <div className="absolute -top-5 -left-5 w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-lg shadow-lg border-4 border-[#0a0e1a]">
                3
              </div>
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <Target className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Apply with confidence</h3>
              <p className="text-slate-400 leading-relaxed">
                Interview-ready with AI coaching, a shareable portfolio, and a tracked application pipeline.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* THE DEMOS */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">See it in action</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Everything you need to showcase your professional story.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Demo A: AI Resume Editor */}
          <div className="flex flex-col h-full rounded-3xl bg-slate-900/50 border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-rose-400" />
                <h3 className="font-semibold text-white">AI Resume Editor</h3>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
                <Target className="w-3 h-3" />
                ATS: 92%
              </div>
            </div>
            
            <div className="p-8 flex-1 bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center relative">
              <div className="w-full max-w-md bg-white rounded-lg shadow-2xl overflow-hidden text-slate-800 text-left text-sm relative transform rotate-1 hover:rotate-0 transition-transform duration-500">
                {/* Resume Header Mock */}
                <div className="border-b border-slate-200 p-6 text-center">
                  <div className="h-4 w-32 bg-slate-800 rounded mx-auto mb-2"></div>
                  <div className="h-2 w-48 bg-slate-400 rounded mx-auto"></div>
                </div>
                {/* Resume Body Mock */}
                <div className="p-6 space-y-6">
                  <div>
                    <div className="h-3 w-24 bg-rose-600 rounded mb-4"></div>
                    <div className="space-y-3 relative">
                      {/* AI Highlighted Bullet */}
                      <div className="relative group cursor-pointer">
                        <div className="absolute -inset-2 bg-rose-500/10 border border-rose-500/30 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex gap-2 relative z-10">
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-700">Led a team of 5 engineers to rebuild the core platform architecture.</span>
                        </div>
                        
                        {/* AI Tooltip Mock */}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-slate-900 rounded-lg shadow-xl border border-slate-700 p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                          <div className="flex items-center gap-2 mb-2 text-rose-400 text-xs font-bold">
                            <Sparkles className="w-3 h-3" /> AI Suggestion
                          </div>
                          <div className="text-xs text-white">
                            "Directed cross-functional team of 5 to re-architect core platform, reducing latency by 40% and saving $50k/yr in infrastructure costs."
                          </div>
                          <div className="mt-2 flex gap-2">
                            <div className="h-6 flex-1 bg-rose-600 rounded flex items-center justify-center text-[10px] text-white font-bold">Apply</div>
                            <div className="h-6 flex-1 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-300">Ignore</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <span className="text-slate-400">•</span>
                        <div className="h-2 w-full bg-slate-200 rounded mt-1.5"></div>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-slate-400">•</span>
                        <div className="h-2 w-5/6 bg-slate-200 rounded mt-1.5"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Demo B: Public Portfolio Website */}
          <div className="flex flex-col h-full rounded-3xl bg-slate-900/50 border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white">Public Portfolio Website</h3>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium bg-slate-800 px-3 py-1 rounded-full">
                wiseresume.com/johndoe
              </div>
            </div>
            
            <div className="p-8 flex-1 bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center relative">
              <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                {/* Browser Header */}
                <div className="h-8 bg-slate-900 flex items-center px-4 gap-1.5 border-b border-slate-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
                </div>
                
                {/* Portfolio Content */}
                <div className="p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 mx-auto mb-4 p-1">
                    <div className="w-full h-full bg-slate-800 rounded-full border-2 border-slate-950 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">JD</span>
                    </div>
                  </div>
                  <div className="h-5 w-32 bg-white rounded mx-auto mb-3"></div>
                  <div className="h-3 w-48 bg-slate-500 rounded mx-auto mb-8"></div>
                  
                  <div className="flex flex-wrap justify-center gap-2 mb-8">
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20">React</span>
                    <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">TypeScript</span>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20">Node.js</span>
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full border border-amber-500/20">AWS</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                      <div className="w-6 h-6 rounded bg-slate-800 mb-2"></div>
                      <div className="h-2 w-full bg-slate-700 rounded mb-1"></div>
                      <div className="h-2 w-2/3 bg-slate-700 rounded"></div>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                      <div className="w-6 h-6 rounded bg-slate-800 mb-2"></div>
                      <div className="h-2 w-full bg-slate-700 rounded mb-1"></div>
                      <div className="h-2 w-1/2 bg-slate-700 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SUMMARY TICKER */}
      <section className="border-y border-slate-800/50 bg-slate-900/30 py-6 overflow-hidden relative flex">
        <div className="container mx-auto px-6 flex flex-wrap justify-center md:justify-between items-center gap-8 md:gap-4 text-sm font-medium text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-400" />
            <span>Weak bullet? Fixed in 1 tap</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <span>Know your score before they do</span>
          </div>
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-blue-400" />
            <span>New job, new resume — instantly</span>
          </div>
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-orange-400" />
            <span>Practice speaking, not just writing</span>
          </div>
        </div>
      </section>

      {/* SECONDARY / MOBILE SECTION */}
      <section className="container mx-auto px-6 py-20 flex flex-col md:flex-row items-center justify-between gap-12 bg-gradient-to-r from-slate-900/50 to-transparent rounded-3xl border border-slate-800/50 mt-20 p-12">
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl font-bold text-white mb-4">Get the app on your phone</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto md:mx-0">
            Edit your resume on the go, practice interviews during your commute, and track applications anywhere.
          </p>
          <Button size="lg" className="bg-slate-800 hover:bg-slate-700 text-white h-14 rounded-xl px-8 border border-slate-700">
            <Smartphone className="w-5 h-5 mr-2" />
            Install App
          </Button>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="w-64 h-[500px] border-8 border-slate-800 rounded-[3rem] bg-slate-950 relative overflow-hidden shadow-2xl">
            {/* Phone notch */}
            <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-xl mx-auto w-1/2 z-10"></div>
            {/* App UI mock */}
            <div className="pt-10 px-4 h-full flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="w-8 h-8 rounded-full bg-slate-800"></div>
                <div className="w-8 h-8 rounded bg-rose-600/20"></div>
              </div>
              <div className="h-6 w-32 bg-white rounded-md mt-4"></div>
              <div className="h-32 bg-gradient-to-br from-rose-500/20 to-purple-500/20 rounded-2xl border border-rose-500/20 flex flex-col items-center justify-center p-4 text-center">
                 <div className="text-3xl font-bold text-white mb-1">92%</div>
                 <div className="text-xs text-slate-400">Profile Strength</div>
              </div>
              <div className="flex-1 bg-slate-900 rounded-t-2xl p-4 space-y-3 mt-4">
                <div className="h-4 w-24 bg-slate-700 rounded"></div>
                <div className="h-12 bg-slate-800 rounded-xl"></div>
                <div className="h-12 bg-slate-800 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="container mx-auto px-6 py-32 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">Ready to build yours?</h2>
        <div className="flex flex-col items-center w-full max-w-xs mx-auto">
          <Button size="lg" className="w-full bg-rose-600 hover:bg-rose-700 text-white h-14 text-lg rounded-xl shadow-[0_0_30px_rgba(225,29,72,0.3)] hover:shadow-[0_0_40px_rgba(225,29,72,0.5)]">
            Get Started
          </Button>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm text-slate-400">
            <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-400" /> Free to start</span>
            <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-400" /> No credit card</span>
            <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-400" /> AI-powered</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/50 py-12 text-center text-slate-500 text-sm">
        <div className="container mx-auto px-6">
          <div className="flex justify-center items-center gap-2 mb-6 opacity-50 text-white">
            <div className="w-6 h-6 rounded bg-rose-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs leading-none">W</span>
            </div>
            <span className="font-bold tracking-tight">WiseResume</span>
          </div>
          <p>© {new Date().getFullYear()} WiseResume. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
