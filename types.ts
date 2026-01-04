
export type MoodType = 'modern' | 'dark' | 'fresh' | 'corporate' | 'creative' | 'lifestyle';
export type AspectRatioType = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type PositionType = 'top-left' | 'top-center' | 'top-right' | 'bottom-center';
export type TitleSizeType = 'h1' | 'h2' | 'h3';
export type MockupDeviceType = 'smartphone' | 'laptop' | 'pc' | 'videotron';

export type CustomToolMode = 'remove-bg' | 'ai-eraser' | 'add-text' | 'add-sticker' | 'add-shape' | 'add-logo';

export interface CustomLayer {
  id: string;
  type: 'text' | 'sticker' | 'shape' | 'logo';
  content: string; // For text: content. For shape: 'rect'/'circle'. For sticker: emoji. For logo: 'custom'.
  imageData?: string; // Base64 for custom logo
  x: number;
  y: number;
  fontSize: number; // For text size, sticker size, or baseline scale
  fontFamily?: string;
  color: string;
  opacity: number;
  // Text specific properties
  bgActive?: boolean;
  bgColor?: string;
  bgOpacity?: number;
  // Shape/Logo specific properties
  width?: number;
  height?: number;
}

export interface PosterConfig {
  title: string;
  tagline: string;
  marketing: string;
  mood: MoodType;
  ratio: AspectRatioType;
  logoIconBase64?: string;
  logoTextBase64?: string;
  mockupScreenshot?: string;
  mockupType: MockupDeviceType;
  logoPosition: PositionType;
  titleSize: TitleSizeType;
  noMockup: boolean;
  backgroundOnly: boolean;
}

export interface GeneratedResult {
  imageUrl: string;
  promptUsed: string;
}

export interface GeneratedBatch {
  results: GeneratedResult[];
  timestamp: number;
}
