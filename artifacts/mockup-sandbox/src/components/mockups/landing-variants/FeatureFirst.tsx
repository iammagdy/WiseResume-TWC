import React from 'react';
import { Sparkles, Target, Wand2, Mic, ArrowRight, Globe, Check, Smartphone, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function FeatureFirst() {
  return (
    <div className="min-h-screen overflow-y-auto text-slate-200 font-sans" style={{background: 'linear-gradient(135deg, #0a0e1a 0%, #0f1629 50%, #0a0e1a 100%)'}}>
      
      {/* 1. HERO */}
      <section className="pt-20 pb-12 px-6 max-w-4xl mx-auto text-center flex flex-col items-center">
        <div className="w-14 h-14 bg-rose-600 rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(225,29,72,0.4)]">
          <Star className="text-white w-8 h-8" fill="currentColor" />
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
          Build Your Dream Resume
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-8 leading-relaxed">
          The only resume app that coaches your interview, scores your ATS match, and builds your portfolio site — all in one.
        </p>

        <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-300 font-medium">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" /> Free to start
          </span>
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" /> No credit card
          </span>
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" /> AI-powered
          </span>
        </div>
      </section>

      {/* 2. WHY SECTION */}
      <section className="py-12 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-white mb-12">Why WiseResume?</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Feature 1 */}
          <Card className="bg-slate-900/50 border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-500 to-rose-600" />
            <CardContent className="p-8">
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center mb-6">
                <Sparkles className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Weak bullet? Fixed in 1 tap</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                AI rewrites vague bullets into quantified achievements that recruiters remember
              </p>
            </CardContent>
          </Card>

          {/* Feature 2 */}
          <Card className="bg-slate-900/50 border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
            <CardContent className="p-8">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-6">
                <Target className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Know your score before they do</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Real-time ATS match percentage against any job posting — then fix it instantly
              </p>
            </CardContent>
          </Card>

          {/* Feature 3 */}
          <Card className="bg-slate-900/50 border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-blue-600" />
            <CardContent className="p-8">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-6">
                <Wand2 className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">New job, new resume — instantly</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Paste a job description and AI rewrites your entire resume to match in 30 seconds
              </p>
            </CardContent>
          </Card>

          {/* Feature 4 */}
          <Card className="bg-slate-900/50 border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 to-orange-600" />
            <CardContent className="p-8">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center mb-6">
                <Mic className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Practice speaking, not just writing</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Real voice interview coaching with an AI that listens, responds, and scores you live
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. FIRST CTA BLOCK */}
      <section className="py-16 px-6 text-center">
        <p className="text-slate-400 mb-6 font-medium tracking-wide uppercase text-sm">Join thousands of job seekers</p>
        <Button size="lg" className="bg-rose-600 hover:bg-rose-700 text-white h-14 px-10 text-lg rounded-full shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all hover:scale-105 group">
          Get Started
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
        <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-500 font-medium mt-6">
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Free to start</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> No credit card</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> AI-powered</span>
        </div>
      </section>

      {/* 4. DEMO SECTION */}
      <section className="py-16 px-6 max-w-6xl mx-auto border-t border-slate-800/50">
        <h2 className="text-3xl font-bold text-center text-white mb-12">See it in action</h2>
        
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Demo A: AI Resume Editor */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-500" />
              AI Resume Editor
            </h3>
            <Card className="bg-[#0f1629] border-slate-800 shadow-2xl overflow-hidden rounded-xl h-[400px]">
              <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50" />
                <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                <div className="ml-4 text-xs text-slate-500 font-mono">resume-builder.tsx</div>
              </div>
              <CardContent className="p-6 relative">
                <div className="absolute top-4 right-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 w-32 backdrop-blur-sm">
                  <div className="text-xs text-emerald-400 font-medium mb-1 flex justify-between">
                    <span>ATS Match</span>
                    <span>85%</span>
                  </div>
                  <Progress value={85} className="h-1.5 bg-slate-800 [&>div]:bg-emerald-500" />
                </div>
                
                <div className="mt-4 max-w-[80%]">
                  <div className="h-6 w-48 bg-slate-800 rounded mb-4" />
                  <div className="space-y-3">
                    <div className="h-4 w-full bg-slate-800 rounded" />
                    <div className="relative p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg shadow-[0_0_15px_rgba(225,29,72,0.1)]">
                      <div className="absolute -top-2.5 -right-2.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI Improved
                      </div>
                      <p className="text-sm text-slate-300 font-medium leading-relaxed">
                        <span className="text-rose-400 line-through opacity-50 mr-2">Helped increase sales.</span>
                        <br/>
                        Spearheaded Q3 marketing campaign, driving a <span className="text-emerald-400 font-bold">34% increase in enterprise sales</span> and generating $1.2M in new pipeline.
                      </p>
                    </div>
                    <div className="h-4 w-5/6 bg-slate-800 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Demo B: Public Portfolio */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              Public Portfolio Website
            </h3>
            <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden rounded-xl h-[400px] relative">
              <div className="h-10 bg-slate-950 border-b border-slate-800 flex items-center px-4 justify-between">
                <div className="flex items-center gap-2 w-full">
                  <div className="flex gap-1.5 mr-4">
                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                    <div className="w-3 h-3 rounded-full bg-slate-700" />
                  </div>
                  <div className="bg-slate-800 rounded text-xs text-slate-400 px-3 py-1 w-full max-w-[200px] text-center flex items-center justify-center gap-2">
                    <Globe className="w-3 h-3" /> wse.re/alex
                  </div>
                </div>
              </div>
              <CardContent className="p-8 flex flex-col items-center justify-center h-[calc(100%-40px)] text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20" />
                
                <div className="relative z-10 w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-900 shadow-xl mb-4 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=266&auto=format&fit=crop" alt="Profile" className="w-full h-full object-cover grayscale opacity-80" />
                </div>
                
                <h4 className="text-2xl font-bold text-white mb-2 relative z-10">Alex Chen</h4>
                <p className="text-blue-400 text-sm mb-6 relative z-10 font-medium">Senior Frontend Engineer</p>
                
                <div className="flex flex-wrap justify-center gap-2 relative z-10">
                  <Badge variant="secondary" className="bg-slate-800/80 hover:bg-slate-700 text-slate-300">React</Badge>
                  <Badge variant="secondary" className="bg-slate-800/80 hover:bg-slate-700 text-slate-300">TypeScript</Badge>
                  <Badge variant="secondary" className="bg-slate-800/80 hover:bg-slate-700 text-slate-300">Node.js</Badge>
                  <Badge variant="secondary" className="bg-slate-800/80 hover:bg-slate-700 text-slate-300">GraphQL</Badge>
                </div>
                
                <Button className="mt-8 rounded-full bg-white text-slate-900 hover:bg-slate-200 relative z-10 w-32 shadow-lg">
                  Hire Me
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 5. SECOND CTA (Bottom Strip) */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-900/20 via-slate-900 to-blue-900/20" />
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">Ready to land your next job?</h2>
          <Button size="lg" className="bg-rose-600 hover:bg-rose-700 text-white h-16 px-12 text-xl rounded-full shadow-[0_0_30px_rgba(225,29,72,0.4)] transition-all hover:scale-105 group">
            Get Started Now
            <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* 6. INSTALL & FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950/50 py-12 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center">
              <Star className="text-white w-4 h-4" fill="currentColor" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">WiseResume</span>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-3">
            <span className="text-sm text-slate-400">Get the app on your phone</span>
            <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300 rounded-full gap-2">
              <Smartphone className="w-4 h-4" /> Install App
            </Button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-12 pt-8 border-t border-slate-800/50 text-center text-sm text-slate-600">
          © {new Date().getFullYear()} WiseResume. All rights reserved.
        </div>
      </footer>

    </div>
  );
}
