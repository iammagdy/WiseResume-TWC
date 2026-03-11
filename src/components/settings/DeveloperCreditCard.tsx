import React from 'react';
import { motion } from 'framer-motion';
import { Mail, ExternalLink, Github, Wrench } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { openExternal } from '@/lib/openExternal';
import { useNavigate } from 'react-router-dom';
import ElectricBorder from '@/components/ui/ElectricBorder';

import './DeveloperCreditCard.css';

interface DeveloperCreditCardProps {
  name: string;
  title: string;
  avatarUrl: string;
  websiteUrl?: string;
  githubUrl?: string;
  onContactClick: () => void;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } }
};

export function DeveloperCreditCard({
  name,
  title,
  avatarUrl,
  websiteUrl,
  githubUrl,
  onContactClick
}: DeveloperCreditCardProps) {
  const navigate = useNavigate();
  const handleContactClick = () => {
    haptics.light();
    onContactClick();
  };

  const handleWebsiteClick = () => {
    haptics.light();
    if (websiteUrl) {
      openExternal(websiteUrl);
    }
  };

  return (
    <motion.div
      className="dev-card-wrapper"
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut" }}>
      
      {/* Sparkle elements */}
      <div className="dev-sparkles">
        <span className="dev-sparkle" />
        <span className="dev-sparkle" />
        <span className="dev-sparkle" />
        <span className="dev-sparkle" />
      </div>

      <ElectricBorder color="#7C3AED" borderRadius={20} speed={1} chaos={0.12}>
        <div className="dev-card mr-0 mx-0 pb-[2px] pr-[2px] pl-[5px]">
          {/* Holographic light sweep */}
          <div className="dev-holo-sweep" />
          {/* Floating particles */}
          <div className="dev-particles">
            <span /><span /><span /><span /><span /><span />
          </div>

          <motion.div
            className="dev-card-content"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}>
            
            <div className="flex flex-col gap-3 w-full">
              {/* Top section: avatar + info */}
              <div className="flex items-start gap-3 w-full">
                {/* Avatar with gradient ring */}
                <motion.div variants={itemVariants} className="flex-shrink-0">
                  <div className="dev-avatar-ring">
                    <div className="dev-avatar-inner">
                      <img
                        src={avatarUrl}
                        alt={name}
                        className="dev-avatar" />
                      
                    </div>
                  </div>
                </motion.div>

                {/* Name, title, buttons */}
                <div className="flex flex-1 flex-col min-w-0">
                  <motion.div variants={itemVariants} className="mb-2">
                    <h3 className="dev-name text-3xl">{name}</h3>
                    <p className="dev-title text-slate-50">{title}</p>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <div className="dev-btn-row">
                      <button
                        className="dev-contact-btn"
                        onClick={handleContactClick}>
                        
                        <Mail className="w-4 h-4" />
                        <span>Contact</span>
                      </button>
                      {githubUrl &&
                      <button
                        className="dev-github-btn"
                        onClick={() => {
                          haptics.light();
                          openExternal(githubUrl);
                        }}>
                        
                          <Github className="w-4 h-4" />
                          <span>GitHub</span>
                        </button>
                      }
                      <button
                        className="dev-github-btn"
                        onClick={() => {
                          haptics.light();
                          navigate('/dev-tools');
                        }}>
                        
                        <Wrench className="w-4 h-4" />
                        <span>DevKit</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Bottom section: website link */}
              {websiteUrl &&
              <motion.div variants={itemVariants}>
                  <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {e.preventDefault();handleWebsiteClick();}}
                  className="dev-website-link text-center text-base ml-[5px] mb-[2px] mt-0 pt-[2px] text-slate-50"
                  aria-label={`Visit ${new URL(websiteUrl).hostname.replace('www.', '')}`}>
                  
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{new URL(websiteUrl).hostname.replace('www.', '')}</span>
                  </a>
                </motion.div>
              }
            </div>
          </motion.div>
        </div>
      </ElectricBorder>
    </motion.div>);

}