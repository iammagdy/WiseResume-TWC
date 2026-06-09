import type { ElementType } from "react";
import {
  BookOpen,
  Building2,
  FileCheck,
  FileOutput,
  FileSignature,
  GitCompareArrows,
  Linkedin,
  Mail,
  Mic,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserCheck,
  Wand2,
  XCircle,
  DollarSign,
  type LucideIcon,
} from "lucide-react";

export type StudioVisibility = "primary" | "secondary" | "hidden" | "excluded";

export interface AiStudioToolEntry {
  id: string;
  icon: LucideIcon;
  label: string;
  desc: string;
  color: string;
  cost: string;
  visibility: StudioVisibility;
  navigate?: string;
  parentWorkflowId?: string;
}

export interface AiStudioWorkflowAction {
  label: string;
  toolId: string;
}

export interface AiStudioWorkflowEntry {
  id: string;
  title: string;
  description: string;
  icon: ElementType;
  color: string;
  visibility: Extract<StudioVisibility, "primary" | "secondary">;
  primaryAction: AiStudioWorkflowAction;
  secondaryActions: AiStudioWorkflowAction[];
  backingTools: string[];
}

export const aiStudioToolEntries: AiStudioToolEntry[] = [
  { id: "tailor", icon: Wand2, label: "Smart Tailor", desc: "Adapt to job descriptions", color: "text-primary", cost: "tailor", visibility: "hidden", parentWorkflowId: "tailor-for-job" },
  { id: "enhance", icon: Sparkles, label: "Enhance", desc: "Improve writing", color: "text-cyan-500", cost: "enhance", visibility: "hidden", parentWorkflowId: "improve-resume" },
  { id: "onepage", icon: FileSignature, label: "1-Page Wizard", desc: "Condense resume", color: "text-amber-500", cost: "one-page", visibility: "hidden", parentWorkflowId: "improve-resume" },
  { id: "humanizer", icon: Shield, label: "Humanize", desc: "AI detection fix", color: "text-violet-500", cost: "detect-humanize", visibility: "hidden", parentWorkflowId: "improve-resume" },
  { id: "job-match", icon: Target, label: "Tailoring Hub", desc: "All-in-one tailoring workspace", color: "text-green-500", cost: "tailor", visibility: "primary", navigate: "/tailoring-hub", parentWorkflowId: "tailor-for-job" },
  { id: "ab-compare", icon: GitCompareArrows, label: "A/B Compare", desc: "Score two resumes", color: "text-rose-500", cost: "score", visibility: "hidden", parentWorkflowId: "improve-resume" },
  { id: "recruiter", icon: UserCheck, label: "Recruiter Sim", desc: "Simulate review", color: "text-rose-500", cost: "recruiter-sim", visibility: "hidden", parentWorkflowId: "improve-resume" },
  { id: "skills-gap", icon: TrendingUp, label: "Skills Gap", desc: "Identify missing skills", color: "text-cyan-500", cost: "skills-gap", visibility: "hidden", parentWorkflowId: "tailor-for-job" },
  { id: "career", icon: TrendingUp, label: "Career Plan", desc: "Path advisor", color: "text-emerald-500", cost: "career-assessment", visibility: "secondary", navigate: "/career", parentWorkflowId: "career-plan" },
  { id: "interview", icon: Mic, label: "Interview Prep", desc: "Practice Q&A", color: "text-orange-500", cost: "interview", visibility: "primary", navigate: "/interview", parentWorkflowId: "prepare-interview" },
  { id: "company-briefing", icon: Building2, label: "Company Briefing", desc: "Company research", color: "text-teal-500", cost: "company_briefing", visibility: "primary", parentWorkflowId: "company-briefing" },
  { id: "salary-negotiation", icon: DollarSign, label: "Salary Coach", desc: "Negotiation scripts", color: "text-green-500", cost: "salary-negotiation", visibility: "hidden" },
  { id: "cold-email", icon: Mail, label: "Cold Email", desc: "Recruiter outreach", color: "text-rose-600", cost: "cold-email", visibility: "hidden", parentWorkflowId: "write-documents" },
  { id: "job-rejection", icon: XCircle, label: "Rejection Analyzer", desc: "Learn from rejection", color: "text-rose-500", cost: "job-rejection", visibility: "hidden" },
  { id: "linkedin", icon: Linkedin, label: "LinkedIn", desc: "Profile optimizer", color: "text-blue-500", cost: "linkedin", visibility: "primary", parentWorkflowId: "linkedin-brand" },
  { id: "personal-branding", icon: Star, label: "Brand Statement", desc: "3 style variants", color: "text-amber-500", cost: "personal-branding", visibility: "hidden", parentWorkflowId: "linkedin-brand" },
  { id: "portfolio-bio", icon: BookOpen, label: "Portfolio Bio", desc: "For your portfolio", color: "text-violet-500", cost: "portfolio-bio", visibility: "hidden", parentWorkflowId: "linkedin-brand" },
  { id: "cover-letters", icon: FileSignature, label: "Cover Letters", desc: "AI-generated letters", color: "text-sky-500", cost: "cover-letter", visibility: "primary", navigate: "/cover-letters", parentWorkflowId: "cover-letter" },
  { id: "resignation-letters", icon: FileOutput, label: "Resignation Letter", desc: "Leave professionally", color: "text-pink-500", cost: "cover-letter", visibility: "hidden", navigate: "/resignation-letters", parentWorkflowId: "write-documents" },
  { id: "reference-letter", icon: FileCheck, label: "Reference Letter", desc: "For your referee", color: "text-sky-500", cost: "reference-letter", visibility: "hidden", parentWorkflowId: "write-documents" },
  { id: "qr-code", icon: FileCheck, label: "QR Generator", desc: "Custom QR codes", color: "text-primary", cost: "free", visibility: "excluded", navigate: "/qr-code" },
  { id: "qr-batch", icon: FileCheck, label: "Batch QR", desc: "Bulk CSV to ZIP", color: "text-amber-500", cost: "free", visibility: "excluded", navigate: "/qr-batch" },
  { id: "qr-scan", icon: FileCheck, label: "QR Scanner", desc: "Decode from image", color: "text-emerald-500", cost: "free", visibility: "excluded", navigate: "/qr-scan" },
];

export const aiStudioWorkflows: AiStudioWorkflowEntry[] = [
  {
    id: "tailor-for-job",
    title: "Tailor for a Job",
    description: "Match your resume to a role, tighten the fit, and move into your next application step.",
    icon: Target,
    color: "text-green-500",
    visibility: "primary",
    primaryAction: { label: "Open Tailoring Hub", toolId: "job-match" },
    secondaryActions: [],
    backingTools: ["job-match", "tailor", "skills-gap", "onepage"],
  },
  {
    id: "improve-resume",
    title: "Improve My Resume",
    description: "Polish writing, spot weak areas, and strengthen how your resume reads to recruiters.",
    icon: Sparkles,
    color: "text-cyan-500",
    visibility: "primary",
    primaryAction: { label: "Enhance Resume", toolId: "enhance" },
    secondaryActions: [],
    backingTools: ["enhance", "recruiter", "humanizer", "ab-compare", "onepage"],
  },
  {
    id: "prepare-interview",
    title: "Prepare for Interview",
    description: "Practice answers, sharpen stories, and get ready with company-specific context.",
    icon: Mic,
    color: "text-orange-500",
    visibility: "primary",
    primaryAction: { label: "Start Interview Prep", toolId: "interview" },
    secondaryActions: [
      { label: "Company Briefing", toolId: "company-briefing" },
    ],
    backingTools: ["interview", "company-briefing"],
  },
  {
    id: "company-briefing",
    title: "Company Briefing",
    description: "Get a fast research pack before interviews, networking, or outreach.",
    icon: Building2,
    color: "text-teal-500",
    visibility: "primary",
    primaryAction: { label: "Research a Company", toolId: "company-briefing" },
    secondaryActions: [],
    backingTools: ["company-briefing"],
  },
  {
    id: "cover-letter",
    title: "Cover Letter",
    description: "Draft, refine, and manage tailored cover letters as part of your application flow.",
    icon: FileSignature,
    color: "text-sky-500",
    visibility: "primary",
    primaryAction: { label: "Open Cover Letters", toolId: "cover-letters" },
    secondaryActions: [],
    backingTools: ["cover-letters"],
  },
  {
    id: "linkedin-brand",
    title: "LinkedIn / Personal Brand",
    description: "Improve your public profile and shape how recruiters and hiring teams remember you.",
    icon: Linkedin,
    color: "text-blue-500",
    visibility: "primary",
    primaryAction: { label: "Optimize LinkedIn", toolId: "linkedin" },
    secondaryActions: [],
    backingTools: ["linkedin", "portfolio-bio", "personal-branding"],
  },
  {
    id: "career-plan",
    title: "Career Plan",
    description: "Map next steps, spot growth areas, and turn long-term goals into a clearer plan.",
    icon: TrendingUp,
    color: "text-emerald-500",
    visibility: "secondary",
    primaryAction: { label: "Open Career Plan", toolId: "career" },
    secondaryActions: [],
    backingTools: ["career"],
  },
  {
    id: "write-documents",
    title: "Write Documents",
    description: "Handle supporting career documents that matter, without crowding the main workspace.",
    icon: FileOutput,
    color: "text-pink-500",
    visibility: "secondary",
    primaryAction: { label: "Resignation Letter", toolId: "resignation-letters" },
    secondaryActions: [
      { label: "Reference Letter", toolId: "reference-letter" },
      { label: "Cold Email", toolId: "cold-email" },
    ],
    backingTools: ["resignation-letters", "reference-letter", "cold-email"],
  },
];

export const aiStudioPrimaryWorkflows = aiStudioWorkflows.filter(
  (workflow) => workflow.visibility === "primary"
);

export const aiStudioSecondaryWorkflows = aiStudioWorkflows.filter(
  (workflow) => workflow.visibility === "secondary"
);

export function getAiStudioToolById(id: string) {
  return aiStudioToolEntries.find((tool) => tool.id === id);
}

export function getAiStudioToolPath(tool: AiStudioToolEntry): string {
  return tool.navigate ?? `/ai-studio/${tool.id}`;
}

export function getAiStudioToolByPath(path: string) {
  if (path.startsWith("/ai-studio/")) {
    return getAiStudioToolById(path.slice("/ai-studio/".length));
  }
  return aiStudioToolEntries.find((tool) => tool.navigate === path);
}
