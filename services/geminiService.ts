
import { GoogleGenAI } from "@google/genai";
import { PosterConfig, MoodType, GeneratedResult } from "../types";

const MOOD_PROMPT_MAP: Record<MoodType, string> = {
  modern: "Modern minimalist high-tech aesthetic, clean product-focused layout, neutral studio background, premium gadget branding",
  dark: "Dark premium luxury theme, cinematic high-contrast lighting, deep obsidian or navy tones, flagship smartphone product photography",
  fresh: "Fresh energetic tech vibe, vibrant and punchy colors, youthful dynamic composition for social media",
  corporate: "Corporate professional tech branding, blue-gray structured palette, clean Swiss-style layout hierarchy",
  creative: "Creative artistic digital style, abstract geometric shapes, bold contemporary typography, innovative mood",
  lifestyle: "Natural lifestyle product placement, warm organic lighting, relatable everyday gadget atmosphere",
};

const TITLE_SIZE_MAP = {
  h1: "Massive Ultra-Bold Headline, hero-level visual weight, dominating the upper hierarchy",
  h2: "Large Modern-Bold Sub-headline, professional commercial marketing scale, balanced weight",
  h3: "Sophisticated Medium Display font, minimal and elegant, understated professional weight",
};

const DEVICE_DESC_MAP = {
  smartphone: "a flagship smartphone with a high-resolution bezel-less display",
  laptop: "a sleek professional ultra-thin aluminum laptop with a vibrant screen",
  pc: "a high-end workstation with a large 4K curved desktop monitor",
  videotron: "a massive high-definition outdoor videotron / digital billboard integrated into a cinematic city environment",
};

export const editImageTask = async (imageData: string, task: 'remove-bg' | 'remove-text' | 'add-text-manual' | 'polish-design', extraPrompt?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let prompt = "";
  if (task === 'remove-bg') {
    prompt = "Isolate the main subject by removing the entire background. Place the subject on a clean, sophisticated, neutral studio backdrop. Enhance lighting and shadows on the subject for a professional product photography look.";
  } else if (task === 'remove-text') {
    prompt = `STRICT MASK-BASED REMOVAL (PRECISION MODE): 
       The image provided has BLUE BRUSH STROKES marking specific areas for removal.
       1. TARGET: Identify all pixels covered by the BLUE color. 
       2. ACTION: Remove ONLY the content directly underneath those blue markings.
       3. INPAINTING: Fill the erased zones by seamlessly sampling from the immediate surrounding background.
       4. FORBIDDEN: Do NOT alter, blur, or remove any text, logos, or objects that are NOT covered by the blue brush.
       5. INTEGRITY: The final image must look original, as if the marked elements never existed, while preserving every other detail of the poster perfectly.`;
  } else if (task === 'add-text-manual') {
    prompt = `STRICT INSTRUCTION: Your goal is to add text to this image exactly as described by the user. 
       User Instruction: "${extraPrompt}"
       1. INTEGRATION: The text must look like a natural, high-end part of the graphic design. 
       2. TYPOGRAPHY: Use high-quality professional fonts that complement the existing poster's style and mood.
       3. CLARITY: Ensure the added text is sharp, perfectly spelled, and highly readable.
       4. AESTHETICS: Balance the composition so the new text doesn't clutter the main subject.`;
  } else if (task === 'polish-design') {
    prompt = `PROFESSIONAL DESIGN REFURBISHMENT: 
       1. COMPOSITION REPAIR: Analyze the entire image for unnatural gaps or empty spaces. 
       2. SEAMLESS HARMONY: Smooth out textures and adjust the background elements (lighting, shapes, gradients) to ensure a perfectly flowing, professional composition.
       3. VISUAL FLOW: Reconnect separated design elements so the poster looks like an original, high-end studio-designed asset.
       4. ENHANCE: Subtly polish colors and contrast for a commercial-grade final output. 
       DO NOT ADD NEW TEXT. FOCUS ON COMPOSITION INTEGRITY.`;
  }

  const parts = [
    { text: prompt },
    { inlineData: { mimeType: 'image/png', data: imageData.split(',')[1] } }
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
    });

    let imageUrl = '';
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) throw new Error("Editing failed. No image returned.");
    return imageUrl;
  } catch (err: any) {
    console.error("Gemini Edit Error:", err);
    throw new Error("Failed to process image. " + (err.message || "Unknown error"));
  }
};

const fetchSingleVariation = async (config: PosterConfig, variationIndex: number, isRevision: boolean = false): Promise<GeneratedResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const layoutInstruction = `ADHERENCE TO GRID: Place the branding elements precisely in the ${config.logoPosition.replace('-', ' ')} sector. Use variation #${variationIndex + 1} of cinematic framing.`;
  
  const typographyInstruction = `TYPOGRAPHY ACCURACY & STYLE: 
  - Main Title: "${config.title}" using ${TITLE_SIZE_MAP[config.titleSize]}.
  - CRITICAL: NO TYPOS. The text in the poster must match EXACTLY character-for-character with: "${config.title}".
  - STYLE: Use a clean, professional, high-end modern SANS-SERIF font (similar to Inter or Helvetica).
  - TAGLINE: Must be exactly "${config.tagline}".
  - MARKETING: Must be exactly "${config.marketing || ''}".
  ${isRevision ? "- EMERGENCY CHECK: Previous version had spelling errors. Double-verify every single letter in all text fields before finalizing the image." : ""}`;

  const brandingLogic = `BRANDING ASSET INTEGRATION:
  ${config.logoIconBase64 && config.logoTextBase64 
    ? "- BOTH ASSETS PROVIDED: Combine the 'Brand Icon' and 'Brand Text Logo' into a single unified high-end logo lockup." 
    : config.logoIconBase64 
      ? "- ONLY ICON PROVIDED: Use ONLY the provided graphic icon. DO NOT add any arbitrary or phantom text next to it."
      : config.logoTextBase64
        ? "- ONLY TEXT PROVIDED: Use ONLY the provided typographic logo asset. Do not add any extra icons."
        : "- NO ASSETS PROVIDED: Create a subtle, generic premium placeholder mark."}`;

  const mockupLogic = config.mockupScreenshot
    ? `MOCKUP INTEGRATION: You are provided with a reference screenshot. Map this image EXACTLY onto the ${config.mockupType} screen. Ensure the screen content is perfectly integrated, sharp, and realistic within the hardware environment.`
    : `MOCKUP HARDWARE: Render ${DEVICE_DESC_MAP[config.mockupType]} as the centerpiece.`;

  const prompt = `You are a World-Class Senior Graphic Design Expert at a top-tier tech advertising agency. 
  
  TASK: Design a hyper-realistic commercial poster for ${DEVICE_DESC_MAP[config.mockupType]} using the provided assets.
  
  ${brandingLogic}
  
  ${mockupLogic}
  
  STRICT RULES:
  1. ABSOLUTELY NO TYPOS: Verify every character in the generated image. "${config.title}", "${config.tagline}", and "${config.marketing}" must be spelled perfectly. 
  2. NO SELF-BRANDING: Do NOT include "JAGO-HP", "JAGOHP", or any other watermarks/text not explicitly provided in the Art Direction.
  3. COMPOSITION: ${layoutInstruction}
  4. FONTS: ${typographyInstruction}
  
  VISUALS:
  - MAIN SUBJECT: ${DEVICE_DESC_MAP[config.mockupType]} featuring premium materials.
  - MOOD: ${MOOD_PROMPT_MAP[config.mood]}
  - LIGHTING: Variation ${variationIndex + 1}: ${variationIndex === 0 ? 'Dramatic rim lighting' : variationIndex === 1 ? 'Soft studio flood' : 'Neon accent glares'}.
  
  TECHNICAL QUALITY: 8k resolution, photorealistic rendering, commercial photography standards, 300dpi clarity.`;

  const parts: any[] = [{ text: prompt }];
  
  if (config.logoIconBase64) {
    parts.push({ inlineData: { mimeType: 'image/png', data: config.logoIconBase64.split(',')[1] } });
  }
  if (config.logoTextBase64) {
    parts.push({ inlineData: { mimeType: 'image/png', data: config.logoTextBase64.split(',')[1] } });
  }
  if (config.mockupScreenshot) {
    parts.push({ inlineData: { mimeType: 'image/png', data: config.mockupScreenshot.split(',')[1] } });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { imageConfig: { aspectRatio: config.ratio } }
    });

    let imageUrl = '';
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) throw new Error("API did not return an image part.");
    return { imageUrl, promptUsed: prompt };
  } catch (err: any) {
    console.error("Gemini Image Generation Error:", err);
    throw new Error(err.message || "Failed to generate image.");
  }
};

export const generatePosterBatch = async (config: PosterConfig, isRevision: boolean = false): Promise<GeneratedResult[]> => {
  return Promise.all([
    fetchSingleVariation(config, 0, isRevision),
    fetchSingleVariation(config, 1, isRevision),
    fetchSingleVariation(config, 2, isRevision)
  ]);
};
