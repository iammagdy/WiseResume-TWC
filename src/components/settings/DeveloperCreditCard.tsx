import React from 'react';
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
    <div className="dev-card-wrapper">
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
        <div className="dev-card-content">
          {/* Avatar with glow ring and orbit */}
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
          
          {/* Info section */}
          <div className="dev-info">
            <h3 className="dev-name">{name}</h3>
            <p className="dev-title">{title}</p>
            
            {/* Button row: Contact Me + GitHub */}
            <div className="dev-btn-row">
              <button
                className="dev-contact-btn"
                onClick={handleContactClick}>

                <Mail className="dev-mail-icon" />
                <span className="mx-0 my-0 font-sans font-bold text-base text-left px-0 py-0">Contact  </span>
              </button>
              {githubUrl &&
              <button
                className="dev-github-btn px-[45px]"
                onClick={() => {
                  haptics.light();
                  openExternal(githubUrl);
                }}
                aria-label="GitHub">

                  <Github className="w-[1.1rem] h-[1.1rem]" />
                </button>
              }
            </div>
          </div>
        </div>
      </div>
      
      {/* Website link below card */}
      {websiteUrl &&
      <button
        onClick={handleWebsiteClick}
        className="dev-website-link">

          <ExternalLink className="w-3.5 h-3.5" />
          <span>magdysaber.com</span>
        </button>
      }
    </div>);

}