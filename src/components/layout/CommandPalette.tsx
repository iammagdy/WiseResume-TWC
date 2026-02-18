import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  FileText, Upload, Briefcase, Settings, Home, BookOpen, Palette, Mic, PenTool,
  Wand2, Target, SpellCheck, Sparkles, Shield, Linkedin, UserCheck, TrendingUp,
  Lightbulb, GitCompareArrows, MessageSquare,
} from 'lucide-react';
import { haptics } from '@/lib/haptics';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const go = useCallback((path: string) => {
    haptics.light();
    setOpen(false);
    navigate(path);
  }, [navigate]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search actions, pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => go('/editor')}>
            <FileText className="mr-2 h-4 w-4" />
            Open Editor
          </CommandItem>
          <CommandItem onSelect={() => go('/upload')}>
            <Upload className="mr-2 h-4 w-4" />
            Import Resume
          </CommandItem>
          <CommandItem onSelect={() => go('/cover-letter/new')}>
            <PenTool className="mr-2 h-4 w-4" />
            New Cover Letter
          </CommandItem>
          <CommandItem onSelect={() => go('/interview')}>
            <Mic className="mr-2 h-4 w-4" />
            Practice Interview
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="AI Tools">
          <CommandItem onSelect={() => go('/ai-studio?tool=chat')}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Wise AI Chat
          </CommandItem>
          <CommandItem onSelect={() => go('/ai-studio?tool=tailor')}>
            <Wand2 className="mr-2 h-4 w-4" />
            Smart Tailor
          </CommandItem>
          <CommandItem onSelect={() => go('/ai-studio?tool=ab-compare')}>
            <GitCompareArrows className="mr-2 h-4 w-4" />
            A/B Compare
          </CommandItem>
          <CommandItem onSelect={() => go('/ai-studio?tool=job-match')}>
            <Target className="mr-2 h-4 w-4" />
            Job Match Analysis
          </CommandItem>
          <CommandItem onSelect={() => go('/ai-studio?tool=enhance')}>
            <Sparkles className="mr-2 h-4 w-4" />
            AI Enhance
          </CommandItem>
          <CommandItem onSelect={() => go('/ai-studio?tool=proofread')}>
            <SpellCheck className="mr-2 h-4 w-4" />
            Proofread Resume
          </CommandItem>
          <CommandItem onSelect={() => go('/ai-studio?tool=humanizer')}>
            <Shield className="mr-2 h-4 w-4" />
            AI Detector / Humanize
          </CommandItem>
          <CommandItem onSelect={() => go('/ai-studio?tool=linkedin')}>
            <Linkedin className="mr-2 h-4 w-4" />
            LinkedIn Optimizer
          </CommandItem>
          <CommandItem onSelect={() => go('/ai-studio?tool=onepage')}>
            <FileText className="mr-2 h-4 w-4" />
            One-Page Wizard
          </CommandItem>
          <CommandItem onSelect={() => go('/ai-studio?tool=recruiter')}>
            <UserCheck className="mr-2 h-4 w-4" />
            Recruiter Simulation
          </CommandItem>
          <CommandItem onSelect={() => go('/ai-studio?tool=career')}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Career Path Advisor
          </CommandItem>
          <CommandItem onSelect={() => go('/ai-studio?tool=ideas')}>
            <Lightbulb className="mr-2 h-4 w-4" />
            Content Ideas
          </CommandItem>
          <CommandItem onSelect={() => go('/ai-studio?tool=customize')}>
            <Palette className="mr-2 h-4 w-4" />
            Customize Design
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => go('/dashboard')}>
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go('/applications')}>
            <Briefcase className="mr-2 h-4 w-4" />
            Job Applications
          </CommandItem>
          <CommandItem onSelect={() => go('/templates')}>
            <Palette className="mr-2 h-4 w-4" />
            Templates
          </CommandItem>
          <CommandItem onSelect={() => go('/guides')}>
            <BookOpen className="mr-2 h-4 w-4" />
            Career Guides
          </CommandItem>
          <CommandItem onSelect={() => go('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
