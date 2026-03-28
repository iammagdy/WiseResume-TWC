import React from 'react';
import { Sparkles, Target, Wand2, Mic, ArrowRight, Globe, Check, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function SplitStage() {
  return (
    <div className="min-h-screen overflow-y-auto font-sans text-slate-300" style={{background: 'linear-gradient(135deg, #0a0e1a 0%, #0f1629 50%, #0a0e1a 100%)'}}>
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Column */}
          <div className="space-y-8">
            <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/20">
              <span className="text-3xl font-bold text-white tracking-tighter">W</span>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
                Build Your Dream <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-rose-400">Resume</span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-xl">
                The only resume app that coaches your interview, scores your ATS match, and builds your portfolio site — all in one.
              </p>
            </div>

            <div className="space-y-4 max-w-md">
              <Button className="w-full h-14 text-lg bg-rose-600 hover:bg-rose-700 text-white border-0 shadow-lg shadow-rose-600/25 rounded-xl transition-all">
                Get Started <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-slate-400 font-medium">
                <span className="flex items-center"><Check className="w-4 h-4 mr-1 text-emerald-400" /> Free to start</span>
                <span className="flex items-center"><Check className="w-4 h-4 mr-1 text-emerald-400" /> No credit card</span>
                <span className="flex items-center"><Check className="w-4 h-4 mr-1 text-emerald-400" /> AI-powered</span>
              </div>
            </div>
          </div>

          {/* Right Column: Editor Demo */}
          <div className="relative">
            <div className="absolute inset-0 bg-rose-500/20 blur-[100px] rounded-full" />
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl" style={{ boxShadow: '0 0 60px rgba(225,29,72,0.15)' }}>
              {/* Fake Toolbar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center space-x-3 text-xs font-semibold">
                  <div className="flex items-center bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20">
                    <Target className="w-3 h-3 mr-1" /> ATS 87%
                  </div>
                  <div className="flex items-center bg-rose-500/10 text-rose-400 px-2 py-1 rounded-md border border-rose-500/20">
                    <Sparkles className="w-3 h-3 mr-1" /> AI Active
                  </div>
                </div>
              </div>
              
              {/* Fake Content */}
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Senior Product Designer</h3>
                  <p className="text-sm text-slate-400">TechCorp Inc. • 2020 - Present</p>
                </div>
                
                <ul className="space-y-4 text-sm text-slate-300">
                  <li className="flex items-start">
                    <span className="text-slate-500 mr-2">•</span>
                    <span>Led the redesign of the core web application, improving user engagement metrics.</span>
                  </li>
                  <li className="flex items-start relative group">
                    <div className="absolute -left-3 top-1 w-1 h-4 bg-rose-500 rounded-full" />
                    <span className="text-rose-500 mr-2">•</span>
                    <div className="flex-1 bg-rose-500/5 border border-rose-500/20 rounded-md p-2 -mt-2 relative">
                      <div className="absolute -top-3 right-2 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center">
                        <Sparkles className="w-3 h-3 mr-1" /> Enhanced
                      </div>
                      <span className="text-white">Spearheaded full-stack platform redesign serving 2M+ users, increasing daily active engagement by 34% and reducing churn by 12% in Q3.</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-slate-500 mr-2">•</span>
                    <span>Collaborated with engineering to ship features faster.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/5 border-white/10 p-6 backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center mb-4 border border-rose-500/20">
              <Sparkles className="w-6 h-6 text-rose-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Weak bullet? Fixed in 1 tap</h3>
            <p className="text-sm text-slate-400">AI rewrites vague bullets into quantified achievements that recruiters remember</p>
          </Card>

          <Card className="bg-white/5 border-white/10 p-6 backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 border border-emerald-500/20">
              <Target className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Know your score before they do</h3>
            <p className="text-sm text-slate-400">Real-time ATS match percentage against any job posting — then fix it instantly</p>
          </Card>

          <Card className="bg-white/5 border-white/10 p-6 backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 border border-blue-500/20">
              <Wand2 className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">New job, new resume — instantly</h3>
            <p className="text-sm text-slate-400">Paste a job description and AI rewrites your entire resume to match in 30 seconds</p>
          </Card>

          <Card className="bg-white/5 border-white/10 p-6 backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4 border border-orange-500/20">
              <Mic className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Practice speaking, not just writing</h3>
            <p className="text-sm text-slate-400">Real voice interview coaching with an AI that listens, responds, and scores you live</p>
          </Card>
        </div>
      </div>

      {/* Portfolio Demo Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/5">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Your Resume, Beautifully Hosted</h2>
          <p className="text-slate-400">Turn your resume into a stunning public portfolio site in one click.</p>
        </div>

        <div className="max-w-3xl mx-auto relative group">
          <div className="absolute inset-0 bg-blue-500/10 blur-[80px] rounded-[3rem]" />
          <div className="relative bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            {/* Fake Browser Chrome */}
            <div className="bg-slate-950 px-4 py-3 flex items-center border-b border-white/5">
              <div className="flex space-x-2 mr-4">
                <div className="w-3 h-3 rounded-full bg-slate-800" />
                <div className="w-3 h-3 rounded-full bg-slate-800" />
                <div className="w-3 h-3 rounded-full bg-slate-800" />
              </div>
              <div className="flex-1 bg-slate-900 rounded-md py-1 px-3 text-xs text-slate-500 flex items-center justify-center max-w-sm mx-auto border border-white/5">
                <Globe className="w-3 h-3 mr-2" />
                alex.wiseresume.com
              </div>
            </div>

            {/* Portfolio Content */}
            <div className="p-8 sm:p-12">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-500 to-orange-400 p-1 shrink-0">
                  <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center overflow-hidden">
                    <img src="https://ui-avatars.com/api/?name=Alex+Design&background=0D1117&color=E11D48" alt="Avatar" className="w-full h-full object-cover opacity-80" />
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-3xl font-bold text-white mb-2">Alex Designer</h3>
                  <p className="text-rose-400 font-medium mb-4">Senior UI/UX & Frontend</p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-300">React</span>
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-300">Figma</span>
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-300">Tailwind CSS</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                  <div className="h-2 w-1/3 bg-slate-700 rounded mb-3" />
                  <div className="h-2 w-full bg-slate-700/50 rounded mb-2" />
                  <div className="h-2 w-5/6 bg-slate-700/50 rounded" />
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                  <div className="h-2 w-1/3 bg-slate-700 rounded mb-3" />
                  <div className="h-2 w-full bg-slate-700/50 rounded mb-2" />
                  <div className="h-2 w-4/6 bg-slate-700/50 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Install CTA Section */}
      <div className="py-24 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.1)_0%,transparent_50%)]" />
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <Smartphone className="w-12 h-12 text-slate-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Get the app on your phone</h2>
          <p className="text-slate-400 mb-8">Practice interviews on the go and perfect your resume anywhere.</p>
          <Button className="h-12 px-8 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl">
            Install App
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} WiseResume. All rights reserved.</p>
      </footer>
    </div>
  );
}
