import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { TemplateThumbnail } from '@/components/editor/TemplateThumbnail';
import { TemplateId, ResumeData } from '@/types/resume';
import { cn } from '@/lib/utils';

const templates: { id: TemplateId; name: string }[] = [
  { id: 'modern', name: 'Modern' },
  { id: 'executive', name: 'Executive' },
  { id: 'creative', name: 'Creative' },
];

// Sample data for thumbnails matching the ResumeData type
const sampleResume: ResumeData = {
  id: 'sample',
  contactInfo: {
    fullName: 'Alex Johnson',
    email: 'alex@example.com',
    phone: '(555) 123-4567',
    location: 'San Francisco, CA',
    linkedin: '',
    portfolio: '',
  },
  summary: 'Experienced professional with a proven track record of success.',
  experience: [
    {
      id: '1',
      company: 'Tech Corp',
      position: 'Senior Developer',
      startDate: '2020-01',
      endDate: 'Present',
      current: true,
      description: 'Leading development initiatives',
      achievements: ['Led development of key features', 'Improved performance by 40%'],
    },
  ],
  education: [
    {
      id: '1',
      institution: 'University of Technology',
      degree: 'B.S.',
      field: 'Computer Science',
      startDate: '2014',
      endDate: '2018',
      gpa: '3.8',
    },
  ],
  skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
  certifications: [],
  templateId: 'modern',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function TemplateGallery() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(1);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const itemWidth = scrollRef.current.offsetWidth * 0.6;
    const newIndex = Math.round(scrollLeft / itemWidth);
    setActiveIndex(Math.min(newIndex, templates.length - 1));
  };

  return (
    <section className="py-12">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="font-display text-2xl font-bold text-center text-foreground mb-8 px-6"
      >
        Choose Your Style
      </motion.h2>

      {/* Scrollable gallery */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-4 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {templates.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'flex-shrink-0 w-[60%] sm:w-[40%] snap-center transition-all duration-300',
              activeIndex === index ? 'scale-100' : 'scale-95 opacity-70'
            )}
          >
            <div className="rounded-xl overflow-hidden shadow-lg border border-border/50">
              <TemplateThumbnail
                templateId={template.id}
                resume={sampleResume}
              />
            </div>
            <p className="text-center font-medium text-foreground mt-3">
              {template.name}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center gap-2 mt-4">
        {templates.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (!scrollRef.current) return;
              const itemWidth = scrollRef.current.offsetWidth * 0.6;
              scrollRef.current.scrollTo({
                left: index * itemWidth,
                behavior: 'smooth',
              });
            }}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              activeIndex === index
                ? 'bg-primary w-6'
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            )}
            aria-label={`Go to template ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
