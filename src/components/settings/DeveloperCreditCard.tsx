import React from 'react';
import { Mail, ExternalLink } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import './DeveloperCreditCard.css';

interface DeveloperCreditCardProps {
  name: string;
  title: string;
  avatarUrl: string;
  websiteUrl?: string;
  onContactClick: () => void;
}

export function DeveloperCreditCard({
  name,
  title,
  avatarUrl,
  websiteUrl,
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
      
      {/* Glass card */}
      <div className="dev-card">
        {/* Floating particles */}
        <div className="dev-particles">
          <span />
          <span />
          <span />
        </div>
        
        {/* Content layout */}
        <div className="dev-card-content">
          {/* Avatar with glow ring */}
          <div className="dev-avatar-container">
            <div className="dev-avatar-glow" />
            <img 
              src={avatarUrl} 
              alt={name}
              className="dev-avatar"
            />
          </div>
          
          {/* Info section */}
          <div className="dev-info">
            <h3 className="dev-name">{name}</h3>
            <p className="dev-title">{title}</p>
            
            {/* Contact button */}
            <button 
              className="dev-contact-btn"
              onClick={handleContactClick}
            >
              <Mail className="w-4 h-4" />
              <span>Contact Me</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Website link below card */}
      {websiteUrl && (
        <button 
          onClick={handleWebsiteClick}
          className="dev-website-link"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>magdysaber.com</span>
        </button>
      )}
    </div>
  );
}
