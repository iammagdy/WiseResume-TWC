import { motion } from 'framer-motion';
import { ArrowUpRight, ExternalLink, Github } from 'lucide-react';
import type { Project } from '@/types/resume';

const scalePop = {
  hidden: { opacity: 0, scale: 0.88, rotateX: 6 },
  visible: { opacity: 1, scale: 1, rotateX: 0, transition: { duration: 0.45, ease: [0, 0, 0.2, 1] as const } },
};

export function ProjectCard({ project, style }: { project: Project; style: string }) {
  const cardStyle: React.CSSProperties = style === 'bold-dark'
    ? { background: 'rgba(255,255,255,0.03)', border: '1px solid color-mix(in srgb, var(--pf-accent) 25%, transparent)', borderRadius: '1rem', padding: '1.25rem' }
    : style === 'glass-pro'
    ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' }
    : style === 'classic-clean'
    ? { borderLeft: '2px solid var(--pf-accent)', paddingLeft: '1.25rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }
    : { background: 'var(--pf-card, rgba(255,255,255,0.04))', border: '1px solid var(--pf-border, rgba(255,255,255,0.08))', borderRadius: '1rem', padding: '1.25rem' };

  return (
    <motion.div variants={scalePop} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} style={cardStyle} className="space-y-3 group">
      <div>
        {project.url ? (
          <a href={project.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-base transition-opacity hover:opacity-80"
            style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>
            {project.name}
            <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--pf-accent)' }} />
          </a>
        ) : (
          <h4 className="font-bold text-base" style={{ fontFamily: 'var(--pf-heading-font)', color: 'var(--pf-fg, inherit)' }}>{project.name}</h4>
        )}
        {project.role && <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--pf-accent)' }}>{project.role}</p>}
      </div>
      {project.description && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--pf-muted, #9ca3af)' }}>{project.description}</p>
      )}
      {project.technologies?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.technologies.map((t, i) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
              background: 'color-mix(in srgb, var(--pf-accent) 12%, transparent)',
              color: 'var(--pf-accent)',
              border: '1px solid color-mix(in srgb, var(--pf-accent) 25%, transparent)',
            }}>{t}</span>
          ))}
        </div>
      )}
      {(project.url || project.githubUrl) && (
        <div className="flex gap-2 flex-wrap">
          {project.url && (
            <a href={project.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-85"
              style={{ background: 'var(--pf-accent)', color: '#fff' }}>
              <ExternalLink className="w-3 h-3" /> Live Demo
            </a>
          )}
          {project.githubUrl && (
            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all hover:opacity-85"
              style={{ borderColor: 'var(--pf-border, rgba(255,255,255,0.15))', color: 'var(--pf-fg, inherit)' }}>
              <Github className="w-3 h-3" /> GitHub
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}
