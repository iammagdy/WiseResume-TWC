import { motion } from 'framer-motion';
import { Github, Star, ExternalLink } from 'lucide-react';

interface GitHubProject {
  name: string;
  description: string;
  url: string;
  language: string | null;
  stars: number;
  topics: string[];
}

interface GitHubProjectsSectionProps {
  projects: GitHubProject[];
  accentColor: string;
  style: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C#': '#178600',
  'C++': '#f34b7d',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
};

export function GitHubProjectsSection({ projects, accentColor, style }: GitHubProjectsSectionProps) {
  if (!projects || projects.length === 0) return null;

  return (
    <div className="space-y-4">
      {projects.map((project, i) => (
        <motion.a
          key={project.name}
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.06, 0.3) }}
          className="block p-4 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: 'var(--pf-card, rgba(255,255,255,0.04))',
            border: '1px solid var(--pf-border, rgba(255,255,255,0.08))',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Github className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                <span className="font-semibold text-sm truncate" style={{ color: 'var(--pf-fg, #f5f5ff)' }}>
                  {project.name}
                </span>
              </div>
              {project.description && (
                <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {project.language && (
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: LANGUAGE_COLORS[project.language] || '#888' }}
                    />
                    {project.language}
                  </span>
                )}
                {project.stars > 0 && (
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                    <Star className="w-3 h-3" />
                    {project.stars}
                  </span>
                )}
                {project.topics?.slice(0, 3).map(topic => (
                  <span
                    key={topic}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                      color: accentColor,
                    }}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-1" style={{ color: 'var(--pf-muted, #9ca3af)' }} />
          </div>
        </motion.a>
      ))}
    </div>
  );
}
