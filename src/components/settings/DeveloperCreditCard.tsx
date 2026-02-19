import React from 'react';
import { motion } from 'framer-motion';
import { Mail, ExternalLink, Github } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { openExternal } from '@/lib/openExternal';

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
  const handleContactClick = () => {
    haptics.light();
    onContactClick();
  };

  const handleWebsiteClick = () => {
    haptics.light();
    if (websiteUrl) {
      window.open(websiteUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div
      className="dev-card-wrapper"
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Animated gradient border */}
      <div className="dev-card-border" />
      
      {/* Sparkle elements */}
      <div className="dev-sparkles">
        <span className="dev-sparkle" />
        <span className="dev-sparkle" />
        <span className="dev-sparkle" />
        <span className="dev-sparkle" />
      </div>
      
      {/* Glass card with breathing effect */}
      <div className="dev-card">
        {/* Holographic light sweep */}
        <div className="dev-holo-sweep" />
        {/* Enhanced floating particles */}
        <div className="dev-particles">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        
        {/* Content layout */}
        <motion.div
          className="dev-card-content"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.3 }}
        >
          {/* Avatar with glow ring and orbit */}
          <motion.div variants={itemVariants}>
            <div className="dev-avatar-container">
              <div className="dev-avatar-glow" />
              <div className="dev-orbit-ring">
                <span className="dev-orbit-dot" />
              </div>
              <img
                src={avatarUrl}
                alt={name}
                className="dev-avatar" />
            </div>
          </motion.div>
          
          {/* Info section */}
          <div className="dev-info">
            <motion.div variants={itemVariants}>
              <h3 className="dev-name">{name}</h3>
              <p className="dev-title">{title}</p>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              {/* Button row: Contact Me + GitHub */}
              <div className="dev-btn-row">
                <button
                  className="dev-contact-btn text-left px-px"
                  onClick={handleContactClick}>
                  <Mail className="dev-mail-icon" />
                  <span className="mx-0 my-0 font-sans font-bold text-base text-left px-0 py-0">Contact  </span>
                </button>
                {githubUrl &&
                <button
                  className="dev-contact-btn"
                  onClick={() => {
                    haptics.light();
                    openExternal(githubUrl);
                  }}>
                    <Github className="w-4 h-4" />
                    <span className="font-sans font-bold text-base">GitHub</span>
                  </button>
                }
              </div>

              {/* Website link inside card */}
              {websiteUrl &&
                <button
                  onClick={handleWebsiteClick}
                  className="dev-website-link">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{new URL(websiteUrl).hostname.replace('www.', '')}</span>
                </button>
              }
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>);

}