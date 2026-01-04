
import React from 'react';
import { MoodType, AspectRatioType, PositionType, TitleSizeType, MockupDeviceType } from './types';

export const MOOD_OPTIONS: { value: MoodType; label: string; description: string }[] = [
  { value: 'modern', label: 'Modern Minimal', description: 'Clean tech layout, neutral background' },
  { value: 'dark', label: 'Dark Premium', description: 'Cinematic lighting, black/navy background' },
  { value: 'fresh', label: 'Fresh & Energetic', description: 'Vibrant colors, youthful composition' },
  { value: 'corporate', label: 'Corporate Pro', description: 'Structured and blue-gray palette' },
  { value: 'creative', label: 'Creative Artistic', description: 'Abstract shapes, bold typography' },
  { value: 'lifestyle', label: 'Natural Lifestyle', description: 'Warm lighting, everyday usage' },
];

export const MOCKUP_DEVICE_OPTIONS: { value: MockupDeviceType; label: string }[] = [
  { value: 'smartphone', label: 'Smartphone' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'pc', label: 'Desktop PC' },
  { value: 'videotron', label: 'Videotron / Billboard' },
];

export const RATIO_OPTIONS: { value: AspectRatioType; label: string }[] = [
  { value: '9:16', label: '9:16 (TikTok / Reels)' },
  { value: '3:4', label: '3:4 (Instagram Feed)' },
  { value: '1:1', label: '1:1 (Square Post)' },
  { value: '16:9', label: '16:9 (Landscape)' },
];

export const POSITION_OPTIONS: { value: PositionType; label: string }[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-center', label: 'Bottom Center' },
];

export const TITLE_SIZE_OPTIONS: { value: TitleSizeType; label: string; desc: string }[] = [
  { value: 'h1', label: 'H1 Ultra-Bold', desc: 'Maximum Impact' },
  { value: 'h2', label: 'H2 Modern', desc: 'Balanced Professional' },
  { value: 'h3', label: 'H3 Minimal', desc: 'Understated Elegance' },
];

export const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter Sans' },
  { value: 'Orbitron', label: 'Orbitron Tech' },
  { value: 'Montserrat', label: 'Montserrat Bold' },
  { value: 'Playfair Display', label: 'Playfair Serif' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
];

export const STICKER_OPTIONS = [
  { id: 'fire', emoji: '🔥', label: 'Hot' },
  { id: 'robot', emoji: '🤖', label: 'AI Bot' },
  { id: 'sparkles', emoji: '✨', label: 'Magic' },
  { id: 'rocket', emoji: '🚀', label: 'Launch' },
  { id: 'diamond', emoji: '💎', label: 'Premium' },
  { id: 'mobile', emoji: '📱', label: 'Device' },
  { id: 'thunder', emoji: '⚡', label: 'Power' },
  { id: 'star', emoji: '⭐', label: 'Top' },
];

export const Icons = {
  Sparkles: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
  ),
  Download: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
  ),
  Image: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
  ),
  Loader: () => (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
  ),
  Layout: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
  ),
  Tool: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
  ),
  Type: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>
  ),
  Smile: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
  ),
  Palette: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.1 0-.9.7-1.6 1.6-1.6H17c2.8 0 5-2.2 5-5 0-5.5-4.5-10-10-10z"/></svg>
  )
};
