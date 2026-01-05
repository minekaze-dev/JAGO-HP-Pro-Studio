
import { GoogleGenAI, Type } from "@google/genai";
import { PosterConfig, MoodType, GeneratedResult, CaptionToolsResult } from "../types";

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

export const generateMarketingCaptions = async (ageRange: string, website: string, platform: string): Promise<CaptionToolsResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Anda adalah Spesialis Social Media Marketing Senior. 
  Analisis website ini: ${website}. 
  
  PLATFORM TARGET: ${platform}.
  KONTEKS BRAND: JAGO-HP adalah website review HP berbasis AI tercanggih yang membantu pengguna menemukan smartphone yang paling pas sesuai kebutuhan dan budget mereka.
  
  TUGAS: Buatkan strategi caption media sosial dalam BAHASA INDONESIA yang menarik untuk target audiens usia ${ageRange} khusus untuk platform ${platform}.
  TUJUAN: Mengajak orang untuk mengunjungi website ${website} dan menggunakan AI JAGO-HP untuk memilih HP baru.

  Hasilkan:
  - 3 Caption Pendek.
  - 3 Caption Panjang.
  - 5 Hashtag.

  Kembalikan HANYA objek JSON dengan format:
  { 
    "shortCaptions": ["..."], 
    "longCaptions": ["..."], 
    "hashtags": ["#jagohp", "..."] 
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shortCaptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            longCaptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["shortCaptions", "longCaptions", "hashtags"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (err: any) {
    throw new Error("Gagal menghasilkan caption. Silakan coba lagi nanti.");
  }
};

const generateCopy = async (config: PosterConfig, variationIndex: number): Promise<{ caption: string; hashtags: string[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Buat caption postingan media sosial Bahasa Indonesia untuk brand JAGO-HP. Konteks variasi #${variationIndex + 1}. Produk: ${config.title || "Smartphone Terbaru"}. Tone: ${config.mood}. Hashtag wajib: #jagohp. JSON: { "caption": "...", "hashtags": ["#jagohp", "..."] }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            caption: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["caption", "hashtags"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch {
    return { caption: "Dapatkan smartphone impian Anda dengan bantuan AI JAGO-HP.", hashtags: ["#jagohp", "#Tech"] };
  }
};

export const editImageTask = async (
  imageData: string, 
  task: 'remove-bg' | 'remove-text', 
  bgColor?: string,
  maskData?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let prompt = "";
  
  if (task === 'remove-bg') {
    prompt = bgColor 
      ? `Detect the main subject in the center. Completely replace the background with a flat solid color: ${bgColor}. Maintain professional studio lighting on the subject.`
      : "Detect the main subject and remove the background completely to make it transparent or solid white. Keep edges crisp and professional.";
  } else if (task === 'remove-text') {
    prompt = "The provided images include a base image and a mask. The red areas in the second image indicate objects or text that must be erased. Cleanly remove these elements and seamlessly fill the background to match the original surrounding textures.";
  }

  const parts: any[] = [
    { text: prompt },
    { inlineData: { mimeType: 'image/png', data: imageData.split(',')[1] } }
  ];

  if (maskData) {
    parts.push({ inlineData: { mimeType: 'image/png', data: maskData.split(',')[1] } });
  }

  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts } });
  let imageUrl = '';
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
  }
  return imageUrl;
};

const fetchSingleVariation = async (config: PosterConfig, variationIndex: number, isRevision: boolean = false): Promise<GeneratedResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const copy = await generateCopy(config, variationIndex);

  if (config.backgroundOnly) {
    const prompt = `Studio background photography. MOOD: ${MOOD_PROMPT_MAP[config.mood]}. Empty professional space, cinematic depth, no devices, no text. ${config.manualPrompt ? "ADDITIONAL VISUAL DETAILS: " + config.manualPrompt : ""}`;
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
    return { imageUrl, promptUsed: prompt, caption: copy.caption, hashtags: copy.hashtags };
  }

  const deviceDesc = DEVICE_DESC_MAP[config.mockupType];
  const moodDesc = MOOD_PROMPT_MAP[config.mood];
  const titleSizeDesc = TITLE_SIZE_MAP[config.titleSize];

  // Logic for Social Context Text (e.g., IG Handle)
  const isSocialHandle = config.marketing.includes('@') || config.marketing.toLowerCase().includes('ig:') || config.marketing.toLowerCase().includes('instagram:');
  const socialHandlePrompt = isSocialHandle 
    ? `- SOCIAL HANDLE: Place the text "${config.marketing}" in a very small, professional, unobtrusive font at the bottom center or bottom corner of the poster.` 
    : `- SOCIAL CONTEXT: Use "${config.marketing}" as additional branding inspiration.`;

  const hasUserText = config.title.trim() !== "" || config.tagline.trim() !== "";
  const textInstruction = hasUserText 
    ? `
- Primary Title: "${config.title}" (${titleSizeDesc}).
- Tagline: "${config.tagline}".
${socialHandlePrompt}
    `
    : "- TYPOGRAPHY: DO NOT generate any text, headlines, or brand names. The output must be PURELY VISUAL with no letters or symbols, except perhaps the small social handle if specified.";

  const brandingInstruction = (config.logoIconBase64 || config.logoTextBase64)
    ? `- LOGO OVERLAY: The provided image assets are high-fidelity brand logos. Place them cleanly as crisp floating overlays at the ${config.logoPosition} position.`
    : "- BRANDING: DO NOT add any default or generic logos.";

  let mainPrompt = `Professional Tech Marketing Visual:
Target Hardware: ${config.noMockup ? "None (product-less background)" : deviceDesc}.
Aesthetic: ${moodDesc}.
Text Hierarchy: ${textInstruction}
${brandingInstruction}
${config.manualPrompt ? "- CUSTOM ENHANCEMENTS: " + config.manualPrompt : ""}

COMPOSITION RULES:
${config.mockupScreenshot ? `- SCREEN MAPPING: Use the provided screenshot image context. Map it perfectly onto the display of the ${config.mockupType}.` : `- SCREEN CONTENT: Generate a sleek high-tech UI matching the ${config.mood} theme.`}
- Quality: Commercial studio photography, 8K resolution feel.
- Format: Strictly respect ${config.ratio} aspect ratio.
${config.noMockup ? "- Focus exclusively on clean typography and abstract background plate." : ""}`;

  const parts: any[] = [{ text: mainPrompt }];
  
  if (config.logoIconBase64) parts.push({ inlineData: { mimeType: 'image/png', data: config.logoIconBase64.split(',')[1] } });
  if (config.logoTextBase64) parts.push({ inlineData: { mimeType: 'image/png', data: config.logoTextBase64.split(',')[1] } });
  if (config.mockupScreenshot) parts.push({ inlineData: { mimeType: 'image/png', data: config.mockupScreenshot.split(',')[1] } });

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
  return { imageUrl, promptUsed: mainPrompt, caption: copy.caption, hashtags: copy.hashtags };
};

export const generatePosterBatch = async (config: PosterConfig, isRevision: boolean = false): Promise<GeneratedResult[]> => {
  return Promise.all([
    fetchSingleVariation(config, 0, isRevision),
    fetchSingleVariation(config, 1, isRevision),
    fetchSingleVariation(config, 2, isRevision),
    fetchSingleVariation(config, 3, isRevision)
  ]);
};
