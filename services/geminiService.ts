
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
       3. INPAINTING: Fill the erased zones by seamlessly sampling from the surrounding background.
       4. FORBIDDEN: Do NOT alter, blur, or remove any text, logos, or objects that are NOT covered by the blue brush.
       5. INTEGRITY: The final image must look original, as if the marked elements never existed.`;
  } else if (task === 'add-text-manual') {
    prompt = `STRICT INSTRUCTION: Your goal is to add text to this image exactly as described by the user. 
       User Instruction: "${extraPrompt}"
       1. INTEGRATION: The text must look like a natural, high-end part of the graphic design. 
       2. TYPOGRAPHY: Use high-quality professional fonts that complement the existing style.
       3. CLARITY: Ensure the added text is sharp and highly readable.`;
  } else if (task === 'polish-design') {
    prompt = `PROFESSIONAL DESIGN REFURBISHMENT: 
       1. COMPOSITION REPAIR: Analyze the entire image for unnatural gaps. 
       2. SEAMLESS HARMONY: Smooth out textures and adjust the background elements to ensure a perfectly flowing, professional composition.
       3. VISUAL FLOW: Reconnect separated design elements.
       4. ENHANCE: Subtly polish colors and contrast. 
       5. RESTRICTION: DO NOT ADD NEW TEXT. DO NOT ADD ANY LOGOS OR ICONS.`;
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
  
  // If backgroundOnly is true, we strictly ignore everything else
  if (config.backgroundOnly) {
    const prompt = `You are an elite Digital Environment Artist.
    TASK: Generate a World-Class Cinematic Studio Background Plate.
    - MOOD: ${MOOD_PROMPT_MAP[config.mood]}
    - VISUALS: Create a pure, high-end commercial environment. Use elegant lighting, sophisticated textures, and professional depth-of-field.
    - STRICT PROHIBITION: 
      1. ABSOLUTELY NO TEXT. 
      2. ABSOLUTELY NO LOGOS. 
      3. ABSOLUTELY NO SMARTPHONES, LAPTOPS, OR HARDWARE DEVICES.
      4. ABSOLUTELY NO PEOPLE.
    - FOCUS: Pure artistic atmosphere, lighting, and premium studio composition. This will be used as a design plate for a luxury tech brand.
    - VARIATION ${variationIndex + 1}: ${variationIndex === 0 ? 'Geometric light play' : variationIndex === 1 ? 'Soft volumetric mist' : 'Sharp neon edge reflections'}.
    TECHNICAL QUALITY: 8k resolution, photorealistic, cinematic rendering.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ text: prompt }],
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
      throw new Error(err.message || "Background generation failed.");
    }
  }

  const hasBranding = config.logoIconBase64 || config.logoTextBase64;
  const layoutInstruction = `ADHERENCE TO GRID: ${hasBranding ? `Place the provided branding assets precisely in the ${config.logoPosition.replace('-', ' ')} sector.` : "STRICTLY DO NOT add any logos, icons, symbols, or branding marks. Keep the layout free of logos."} Variation #${variationIndex + 1}.`;
  
  const titlePart = config.title.trim() 
    ? `- Main Title: "${config.title}" using ${TITLE_SIZE_MAP[config.titleSize]}.` 
    : "- Main Title: DO NOT ADD ANY MAIN TITLE TEXT.";
  
  const taglinePart = config.tagline.trim()
    ? `- Tagline: Must be exactly "${config.tagline}".`
    : "- Tagline: DO NOT ADD ANY TAGLINE TEXT.";
    
  const marketingPart = config.marketing.trim()
    ? `- Marketing Handle: Must be exactly "${config.marketing}".`
    : "- Marketing Handle: DO NOT ADD ANY SOCIAL MEDIA TEXT.";

  const typographyInstruction = `TYPOGRAPHY ACCURACY & STYLE: 
  ${titlePart}
  ${taglinePart}
  ${marketingPart}
  - CRITICAL: IF A TEXT FIELD IS EMPTY, DO NOT ADD TEXT FOR IT.
  - STYLE: Use a clean, professional, high-end modern font. Use creative typographic arrangements for maximum visual appeal.`;

  const brandingLogic = `BRANDING ASSET INTEGRATION:
  ${config.logoIconBase64 && config.logoTextBase64 
    ? "- BOTH ASSETS PROVIDED: Combine Icon and Text Logo into a unified lockup." 
    : config.logoIconBase64 
      ? "- ONLY ICON PROVIDED: Use ONLY provided graphic icon."
      : config.logoTextBase64
        ? "- ONLY TEXT PROVIDED: Use ONLY provided typographic logo."
        : "- NO ASSETS PROVIDED: ABSOLUTELY DO NOT ADD ANY LOGO OR ICON."}`;

  let visualContext = "";
  if (config.noMockup) {
    visualContext = `
    TASK: Design a high-impact Editorial Style Typography-First Poster.
    - NO HARDWARE: Strictly DO NOT include any smartphones, laptops, PCs, or hardware devices.
    - ART DIRECTION: Create a premium, cinematic abstract background that complements the text. Use dynamic light streaks, elegant gradients, or high-end studio textures.
    - TYPOGRAPHY FOCUS: Since there is no physical product, the TYPOGRAPHY IS THE HERO. Arrange the text with extreme professional flair, balancing white space and bold focal points to attract customers instantly.
    - DESIGN STYLE: Think high-fashion magazine covers or elite tech launch visuals. Use sophisticated layering where text might interact with background light/shadows.
    `;
  } else {
    const mockupLogic = config.mockupScreenshot
      ? `MOCKUP INTEGRATION: Map the provided screenshot image EXACTLY onto the ${config.mockupType} screen. Ensure realistic integration with reflections and glass textures.`
      : `MOCKUP HARDWARE: Render ${DEVICE_DESC_MAP[config.mockupType]} as the centerpiece with commercial-grade studio lighting.`;
    
    visualContext = `
    TASK: Design a hyper-realistic commercial poster for ${DEVICE_DESC_MAP[config.mockupType]}.
    ${mockupLogic}
    `;
  }

  const prompt = `You are a World-Class Senior Graphic Design Expert. 
  
  ${visualContext}
  
  ${brandingLogic}
  
  STRICT RULES:
  1. NO TYPOS: Verify every character. 
  2. NO SELF-BRANDING: Do NOT include watermarks/text not explicitly provided.
  3. COMPOSITION: ${layoutInstruction}
  4. FONTS: ${typographyInstruction}
  
  VISUALS:
  - MOOD: ${MOOD_PROMPT_MAP[config.mood]}
  - LIGHTING: Variation ${variationIndex + 1}: ${variationIndex === 0 ? 'Dramatic rim lighting' : variationIndex === 1 ? 'Soft studio flood' : 'Neon accent glares'}.
  
  TECHNICAL QUALITY: 8k resolution, photorealistic, commercial photography standards.`;

  const parts: any[] = [{ text: prompt }];
  
  if (config.logoIconBase64) {
    parts.push({ inlineData: { mimeType: 'image/png', data: config.logoIconBase64.split(',')[1] } });
  }
  if (config.logoTextBase64) {
    parts.push({ inlineData: { mimeType: 'image/png', data: config.logoTextBase64.split(',')[1] } });
  }
  if (!config.noMockup && config.mockupScreenshot) {
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
