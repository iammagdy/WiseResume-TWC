import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { TemplateThumbnail } from '@/components/editor/TemplateThumbnail';
import { TemplateId, ResumeData } from '@/types/resume';
import { cn } from '@/lib/utils';

const templates: { id: TemplateId; name: string; spaceAlias: string }[] = [
  { id: 'modern', name: 'Modern', spaceAlias: 'Voyager' },
  { id: 'executive', name: 'Executive', spaceAlias: 'Commander' },
  { id: 'creative', name: 'Creative', spaceAlias: 'Explorer' },
];

// Sample data for thumbnails matching the ResumeData type
const sampleResume: ResumeData = {
  id: 'sample',
  contactInfo: {
    fullName: 'Wise Megz',
    email: 'megz@wiseuniverse.ai',
    phone: '(555) 123-4567',
    location: 'Wise Universe HQ',
    linkedin: '',
    portfolio: '',
  },
  summary: 'Interstellar AI Navigator specializing in quantum propulsion systems and autonomous spacecraft operations. Led 50+ successful deep-space missions.',
  experience: [
    {
      id: '1',
      company: 'Wise Universe',
      position: 'Senior AI Navigator',
      startDate: '2020-01',
      endDate: 'Present',
      current: true,
      description: 'Leading interstellar AI navigation and mission control',
      achievements: [
        'Pioneered quantum warp navigation reducing travel time by 73%',
        'Commanded AI fleet of 12 autonomous spacecraft across 3 galaxies',
        'Developed neural-link interface for real-time asteroid avoidance',
      ],
    },
  ],
  education: [
    {
      id: '1',
      institution: 'Cosmic Academy',
      degree: 'M.S.',
      field: 'Astro-AI Engineering',
      startDate: '2014',
      endDate: '2018',
      gpa: '3.95',
    },
  ],
  skills: ['Quantum Navigation', 'Neural Starship UI', 'Warp Drive Systems', 'AI Fleet Command', 'Zero-G Operations', 'Cosmic Data Analysis'],
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
    <section className="py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-10 px-6"
      >
        <p className="text-secondary text-sm font-medium tracking-wider uppercase mb-2">
          🚀 Templates
        </p>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Choose Your Flight Suit
        </h2>
      </motion.div>

      {/* Scrollable gallery */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-6 scrollbar-hide"
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
              activeIndex === index ? 'scale-100' : 'scale-95 opacity-60'
            )}
          >
            <motion.div 
              className={cn(
                'rounded-xl overflow-hidden border transition-all duration-300',
                activeIndex === index 
                  ? 'border-primary/50 shadow-lg shadow-primary/20' 
                  : 'border-border/30'
              )}
              whileHover={{ 
                borderColor: 'hsl(var(--primary) / 0.7)',
                boxShadow: '0 0 30px hsl(var(--primary) / 0.3)',
              }}
            >
              <TemplateThumbnail
                templateId={template.id}
                resume={sampleResume}
              />
            </motion.div>
            <div className="text-center mt-4">
              <p className="font-display font-semibold text-foreground">
                {template.spaceAlias}
              </p>
              <p className="text-xs text-muted-foreground">{template.name}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center gap-2 mt-2">
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
              'h-2 rounded-full transition-all duration-300',
              activeIndex === index
                ? 'bg-primary w-6'
                : 'bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50'
            )}
            aria-label={`Go to template ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
