import type { DotType, CornerSquareType, CornerDotType } from '@/components/portfolio/qr/qr-types';

export interface PresetTheme {
  id: string;
  name: string;
  emoji: string;
  dotsStyle: DotType;
  cornersSquareStyle: CornerSquareType;
  cornersDotStyle: CornerDotType;
  useGradient: boolean;
  gradientType: 'linear' | 'radial';
  gradientColor1: string;
  gradientColor2: string;
  gradientRotation: number;
  fgColor: string;
  bgColor: string;
  swatch: string;
}

export const PRESET_THEMES: PresetTheme[] = [
  { id: 'classic', name: 'Classic', emoji: '⬛', dotsStyle: 'square', cornersSquareStyle: 'square', cornersDotStyle: 'square', useGradient: false, gradientType: 'linear', gradientColor1: '#000000', gradientColor2: '#000000', gradientRotation: 0, fgColor: '#000000', bgColor: '#ffffff', swatch: '#000000' },
  { id: 'ocean', name: 'Ocean', emoji: '🌊', dotsStyle: 'rounded', cornersSquareStyle: 'extra-rounded', cornersDotStyle: 'dot', useGradient: true, gradientType: 'linear', gradientColor1: '#0077b6', gradientColor2: '#00b4d8', gradientRotation: 135, fgColor: '#0077b6', bgColor: '#ffffff', swatch: 'linear-gradient(135deg, #0077b6, #00b4d8)' },
  { id: 'sunset', name: 'Sunset', emoji: '🌅', dotsStyle: 'classy-rounded', cornersSquareStyle: 'extra-rounded', cornersDotStyle: 'dot', useGradient: true, gradientType: 'linear', gradientColor1: '#ff6b35', gradientColor2: '#f7c59f', gradientRotation: 45, fgColor: '#ff6b35', bgColor: '#ffffff', swatch: 'linear-gradient(45deg, #ff6b35, #f7c59f)' },
  { id: 'neon', name: 'Neon', emoji: '💚', dotsStyle: 'dots', cornersSquareStyle: 'dot', cornersDotStyle: 'dot', useGradient: true, gradientType: 'linear', gradientColor1: '#39ff14', gradientColor2: '#00ffff', gradientRotation: 90, fgColor: '#39ff14', bgColor: '#0a0a0a', swatch: 'linear-gradient(90deg, #39ff14, #00ffff)' },
  { id: 'monochrome', name: 'Mono', emoji: '🤍', dotsStyle: 'extra-rounded', cornersSquareStyle: 'extra-rounded', cornersDotStyle: 'dot', useGradient: false, gradientType: 'linear', gradientColor1: '#333333', gradientColor2: '#333333', gradientRotation: 0, fgColor: '#333333', bgColor: '#f5f5f5', swatch: '#333333' },
  { id: 'berry', name: 'Berry', emoji: '🫐', dotsStyle: 'classy', cornersSquareStyle: 'extra-rounded', cornersDotStyle: 'dot', useGradient: true, gradientType: 'radial', gradientColor1: '#8b5cf6', gradientColor2: '#ec4899', gradientRotation: 0, fgColor: '#8b5cf6', bgColor: '#ffffff', swatch: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
  { id: 'forest', name: 'Forest', emoji: '🌲', dotsStyle: 'rounded', cornersSquareStyle: 'extra-rounded', cornersDotStyle: 'dot', useGradient: true, gradientType: 'linear', gradientColor1: '#2d6a4f', gradientColor2: '#52b788', gradientRotation: 135, fgColor: '#2d6a4f', bgColor: '#ffffff', swatch: 'linear-gradient(135deg, #2d6a4f, #52b788)' },
  { id: 'royal', name: 'Royal', emoji: '👑', dotsStyle: 'classy', cornersSquareStyle: 'extra-rounded', cornersDotStyle: 'dot', useGradient: true, gradientType: 'linear', gradientColor1: '#1e3a5f', gradientColor2: '#c9a227', gradientRotation: 135, fgColor: '#1e3a5f', bgColor: '#0a1628', swatch: 'linear-gradient(135deg, #1e3a5f, #c9a227)' },
  { id: 'candy', name: 'Candy', emoji: '🍬', dotsStyle: 'dots', cornersSquareStyle: 'dot', cornersDotStyle: 'dot', useGradient: true, gradientType: 'linear', gradientColor1: '#ff6b6b', gradientColor2: '#feca57', gradientRotation: 90, fgColor: '#ff6b6b', bgColor: '#ffffff', swatch: 'linear-gradient(90deg, #ff6b6b, #feca57)' },
  { id: 'midnight', name: 'Midnight', emoji: '🌙', dotsStyle: 'extra-rounded', cornersSquareStyle: 'extra-rounded', cornersDotStyle: 'dot', useGradient: true, gradientType: 'linear', gradientColor1: '#667eea', gradientColor2: '#764ba2', gradientRotation: 135, fgColor: '#667eea', bgColor: '#1a1a2e', swatch: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { id: 'coral', name: 'Coral', emoji: '🪸', dotsStyle: 'classy-rounded', cornersSquareStyle: 'extra-rounded', cornersDotStyle: 'dot', useGradient: true, gradientType: 'linear', gradientColor1: '#ff6348', gradientColor2: '#ff9f43', gradientRotation: 45, fgColor: '#ff6348', bgColor: '#ffffff', swatch: 'linear-gradient(45deg, #ff6348, #ff9f43)' },
  { id: 'ice', name: 'Ice', emoji: '🧊', dotsStyle: 'rounded', cornersSquareStyle: 'extra-rounded', cornersDotStyle: 'dot', useGradient: true, gradientType: 'linear', gradientColor1: '#a8edea', gradientColor2: '#fed6e3', gradientRotation: 135, fgColor: '#a8edea', bgColor: '#ffffff', swatch: 'linear-gradient(135deg, #a8edea, #fed6e3)' },
];
