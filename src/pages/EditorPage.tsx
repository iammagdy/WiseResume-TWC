import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Target, Sparkles, Download, ChevronRight, Wand2 } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useResumeStore } from '@/store/resumeStore';
import { ContactSection } from '@/components/editor/ContactSection';
import { SummarySection } from '@/components/editor/SummarySection';
import { ExperienceSection } from '@/components/editor/ExperienceSection';
import { EducationSection } from '@/components/editor/EducationSection';
import { SkillsSection } from '@/components/editor/SkillsSection';
import { JobAnalysisSheet } from '@/components/editor/JobAnalysisSheet';
import { TemplateSelector } from '@/components/editor/TemplateSelector';
import { TailorSheet } from '@/components/editor/TailorSheet';

export default function EditorPage() {
  const navigate = useNavigate();
  const { currentResume, matchScore, isAnalyzing } = useResumeStore();
  const [showJobSheet, setShowJobSheet] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTailor, setShowTailor] = useState(false);

  if (!currentResume) {
    navigate('/upload');
    return null;
  }

  return (
    <MobileLayout showHeader headerTitle="Edit Resume" onBack={() => navigate('/upload')}>
      <div className="flex-1 flex flex-col">
        {/* Quick Actions Bar */}
        <motion.div
          className="px-4 py-3 flex gap-2 overflow-x-auto border-b border-border"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => setShowJobSheet(true)}
          >
            <Target className="w-4 h-4" />
            {matchScore ? `Score: ${matchScore.overallScore}%` : 'Analyze'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => setShowTailor(true)}
          >
            <Wand2 className="w-4 h-4" />
            Tailor
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => setShowTemplates(true)}
          >
            <FileText className="w-4 h-4" />
            Templates
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => navigate('/preview')}
          >
            <Sparkles className="w-4 h-4" />
            Preview
          </Button>
        </motion.div>

        {/* Editor Tabs */}
        <Tabs defaultValue="contact" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-3 grid grid-cols-5 h-auto p-1">
            <TabsTrigger value="contact" className="text-xs py-2">Contact</TabsTrigger>
            <TabsTrigger value="summary" className="text-xs py-2">Summary</TabsTrigger>
            <TabsTrigger value="experience" className="text-xs py-2">Work</TabsTrigger>
            <TabsTrigger value="education" className="text-xs py-2">Education</TabsTrigger>
            <TabsTrigger value="skills" className="text-xs py-2">Skills</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <TabsContent value="contact" className="mt-0">
              <ContactSection />
            </TabsContent>
            <TabsContent value="summary" className="mt-0">
              <SummarySection />
            </TabsContent>
            <TabsContent value="experience" className="mt-0">
              <ExperienceSection />
            </TabsContent>
            <TabsContent value="education" className="mt-0">
              <EducationSection />
            </TabsContent>
            <TabsContent value="skills" className="mt-0">
              <SkillsSection />
            </TabsContent>
          </div>
        </Tabs>

        {/* Bottom Action Bar */}
        <motion.div
          className="sticky bottom-0 p-4 glass border-t border-border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold gradient-primary glow-primary"
            onClick={() => navigate('/preview')}
          >
            <Download className="w-5 h-5 mr-2" />
            Preview & Export PDF
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </div>

      {/* Sheets */}
      <JobAnalysisSheet open={showJobSheet} onOpenChange={setShowJobSheet} />
      <TemplateSelector open={showTemplates} onOpenChange={setShowTemplates} />
      <TailorSheet open={showTailor} onOpenChange={setShowTailor} />
    </MobileLayout>
  );
}
