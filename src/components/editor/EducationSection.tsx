import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronDown, ChevronUp, GraduationCap, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { Education } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';

export function EducationSection() {
  const { currentResume, updateResume } = useResumeStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!currentResume) return null;

  const addEducation = () => {
    const newEdu: Education = {
      id: uuidv4(),
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
    };
    updateResume({
      education: [...currentResume.education, newEdu],
    });
    setExpandedId(newEdu.id);
  };

  const updateEducation = (id: string, updates: Partial<Education>) => {
    updateResume({
      education: currentResume.education.map((edu) =>
        edu.id === id ? { ...edu, ...updates } : edu
      ),
    });
  };

  const deleteEducation = (id: string) => {
    updateResume({
      education: currentResume.education.filter((edu) => edu.id !== id),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg">Education</h3>
        <Button variant="outline" size="sm" onClick={addEducation} className="gap-2">
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      <AnimatePresence>
        {currentResume.education.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 rounded-xl border border-dashed border-border text-center"
          >
            <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No education added yet</p>
            <Button variant="link" size="sm" onClick={addEducation} className="mt-2">
              Add your education
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {currentResume.education.map((edu, index) => (
              <motion.div
                key={edu.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl border border-border overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === edu.id ? null : edu.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="text-left">
                    <p className="font-semibold text-sm">
                      {edu.degree || `Degree ${index + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {edu.institution || 'Institution name'}
                    </p>
                  </div>
                  {expandedId === edu.id ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedId === edu.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 space-y-4 border-t border-border">
                        <div>
                          <Label className="text-xs flex items-center gap-1 mb-1">
                            <GraduationCap className="w-3 h-3" />
                            Institution
                          </Label>
                          <Input
                            value={edu.institution}
                            onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                            placeholder="University Name"
                            className="h-10"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs mb-1 block">Degree</Label>
                            <Input
                              value={edu.degree}
                              onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                              placeholder="Bachelor's"
                              className="h-10"
                            />
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">Field of Study</Label>
                            <Input
                              value={edu.field}
                              onChange={(e) => updateEducation(edu.id, { field: e.target.value })}
                              placeholder="Computer Science"
                              className="h-10"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs flex items-center gap-1 mb-1">
                              <Calendar className="w-3 h-3" />
                              Start Date
                            </Label>
                            <Input
                              value={edu.startDate}
                              onChange={(e) => updateEducation(edu.id, { startDate: e.target.value })}
                              placeholder="2016"
                              className="h-10"
                            />
                          </div>
                          <div>
                            <Label className="text-xs flex items-center gap-1 mb-1">
                              <Calendar className="w-3 h-3" />
                              End Date
                            </Label>
                            <Input
                              value={edu.endDate}
                              onChange={(e) => updateEducation(edu.id, { endDate: e.target.value })}
                              placeholder="2020"
                              className="h-10"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs mb-1 block">GPA (optional)</Label>
                          <Input
                            value={edu.gpa || ''}
                            onChange={(e) => updateEducation(edu.id, { gpa: e.target.value })}
                            placeholder="3.8/4.0"
                            className="h-10"
                          />
                        </div>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteEducation(edu.id)}
                          className="w-full gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Education
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
