import { motion } from 'framer-motion';
import { GitCompare, Plus, Minus, CheckCircle, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResumeData } from '@/types/resume';
import { TailorResult } from '@/lib/aiTailor';
import { compareSkills, diffText, compareExperience, countChanges, TextDiff } from '@/lib/diffUtils';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface CompareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalResume: ResumeData | null;
  tailorResult: TailorResult | null;
  onApplyChanges: () => void;
}

export function CompareSheet({ 
  open, 
  onOpenChange, 
  originalResume, 
  tailorResult,
  onApplyChanges 
}: CompareSheetProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary', 'skills']);

  if (!originalResume || !tailorResult) return null;

  const skillsDiff = compareSkills(originalResume.skills, tailorResult.skills);
  const summaryDiff = diffText(originalResume.summary, tailorResult.summary);
  const experienceDiff = compareExperience(originalResume.experience, tailorResult.experience);
  
  const skillChanges = countChanges(skillsDiff);
  const totalChanges = skillChanges.added + skillChanges.removed;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const renderDiffText = (diffs: TextDiff[]) => (
    <p className="text-sm leading-relaxed">
      {diffs.map((diff, i) => (
        <span
          key={i}
          className={
            diff.type === 'added' 
              ? 'bg-success/20 text-success px-0.5 rounded' 
              : diff.type === 'removed'
              ? 'bg-destructive/20 text-destructive line-through px-0.5 rounded'
              : ''
          }
        >
          {diff.text}{' '}
        </span>
      ))}
    </p>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="pb-4 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary" />
            Compare Changes
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="diff" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 shrink-0">
            <TabsTrigger value="original">Original</TabsTrigger>
            <TabsTrigger value="tailored">Tailored</TabsTrigger>
            <TabsTrigger value="diff">Diff View</TabsTrigger>
          </TabsList>

          {/* Original Tab */}
          <TabsContent value="original" className="flex-1 overflow-y-auto mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {originalResume.summary}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {originalResume.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {originalResume.experience.map((exp, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{exp.position}</CardTitle>
                  <p className="text-xs text-muted-foreground">{exp.company}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{exp.description}</p>
                  <ul className="space-y-1">
                    {exp.achievements.map((ach, j) => (
                      <li key={j} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {ach}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Tailored Tab */}
          <TabsContent value="tailored" className="flex-1 overflow-y-auto mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tailorResult.summary}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tailorResult.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {tailorResult.experience.map((exp, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{exp.position}</CardTitle>
                  <p className="text-xs text-muted-foreground">{exp.company}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{exp.description}</p>
                  <ul className="space-y-1">
                    {exp.achievements.map((ach, j) => (
                      <li key={j} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {ach}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Diff Tab */}
          <TabsContent value="diff" className="flex-1 overflow-y-auto mt-4 space-y-3 pb-4">
            {/* Summary Diff */}
            <Collapsible 
              open={expandedSections.includes('summary')}
              onOpenChange={() => toggleSection('summary')}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Summary</CardTitle>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.includes('summary') ? 'rotate-180' : ''}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    {renderDiffText(summaryDiff)}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Skills Diff */}
            <Collapsible 
              open={expandedSections.includes('skills')}
              onOpenChange={() => toggleSection('skills')}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm">Skills</CardTitle>
                        {skillChanges.added > 0 && (
                          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                            <Plus className="w-3 h-3 mr-1" />
                            {skillChanges.added}
                          </Badge>
                        )}
                        {skillChanges.removed > 0 && (
                          <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                            <Minus className="w-3 h-3 mr-1" />
                            {skillChanges.removed}
                          </Badge>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.includes('skills') ? 'rotate-180' : ''}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    {skillsDiff.added.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-success mb-2">Added Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {skillsDiff.added.map((skill, i) => (
                            <Badge key={i} className="text-xs bg-success/20 text-success border-0">
                              <Plus className="w-3 h-3 mr-1" />
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {skillsDiff.removed.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-destructive mb-2">Removed Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {skillsDiff.removed.map((skill, i) => (
                            <Badge key={i} className="text-xs bg-destructive/20 text-destructive border-0 line-through">
                              <Minus className="w-3 h-3 mr-1" />
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {skillsDiff.unchanged.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Unchanged</p>
                        <div className="flex flex-wrap gap-2">
                          {skillsDiff.unchanged.map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Experience Diff */}
            {experienceDiff.map((exp, i) => (
              <Collapsible 
                key={i}
                open={expandedSections.includes(`exp-${i}`)}
                onOpenChange={() => toggleSection(`exp-${i}`)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm">{exp.position}</CardTitle>
                          <p className="text-xs text-muted-foreground">{exp.company}</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.includes(`exp-${i}`) ? 'rotate-180' : ''}`} />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs font-medium mb-2">Description</p>
                        {renderDiffText(exp.descriptionDiff)}
                      </div>
                      
                      {(exp.achievementsDiff.added.length > 0 || exp.achievementsDiff.removed.length > 0) && (
                        <div>
                          <p className="text-xs font-medium mb-2">Achievements</p>
                          <ul className="space-y-1">
                            {exp.achievementsDiff.added.map((ach, j) => (
                              <li key={`add-${j}`} className="text-xs flex items-start gap-2 bg-success/10 text-success p-1 rounded">
                                <Plus className="w-3 h-3 mt-0.5 shrink-0" />
                                {ach}
                              </li>
                            ))}
                            {exp.achievementsDiff.removed.map((ach, j) => (
                              <li key={`rem-${j}`} className="text-xs flex items-start gap-2 bg-destructive/10 text-destructive line-through p-1 rounded">
                                <Minus className="w-3 h-3 mt-0.5 shrink-0" />
                                {ach}
                              </li>
                            ))}
                            {exp.achievementsDiff.unchanged.map((ach, j) => (
                              <li key={`unch-${j}`} className="text-xs flex items-start gap-2 text-muted-foreground">
                                <span className="mt-0.5">•</span>
                                {ach}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </TabsContent>
        </Tabs>

        {/* Sticky Footer */}
        <motion.div 
          className="shrink-0 pt-4 pb-safe border-t border-border mt-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            <Button
              className="flex-1 gradient-primary"
              onClick={() => {
                onApplyChanges();
                onOpenChange(false);
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply Changes
            </Button>
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
