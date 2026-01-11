
import { GoogleGenAI, Type } from "@google/genai";
import { PosterConfig, MoodType, GeneratedResult, CaptionToolsResult } from "../types";

const BRAND_COLOR = "#ffcc00"; // JAGO-HP Signature Yellow

const MOOD_PROMPT_MAP: Record<MoodType, string> = {
  modern: `Architectural High-Tech Minimalism: pristine obsidian black surfaces with ultra-smooth matte textures. Lighting: soft diffused #ffcc00 yellow ambient occlusion in corners, sharp surgical white top-down lighting. Composition: wide negative spaces, Bauhaus-inspired geometric precision, sleek carbon-fiber subtle details.`,
  dark: `Stealth Luxury Tech: Cinematic high-contrast noir aesthetic. Background: polished black marble and liquid obsidian. Lighting: ray-traced #ffcc00 yellow laser lines slicing through darkness, volumetric yellow haze, intense chiaroscuro. Effects: lens flares, shallow depth of field, premium gloss reflections.`,
  fresh: `High-Octane Kinetic Energy: Dynamic motion-blurred black liquid particles and shards flying across the frame. Palette: aggressive #ffcc00 yellow splashes and energetic light trails. Background: charcoal concrete texture with yellow neon 'glitch' accents. Composition: tilted Dutch angles, high-speed photography vibe.`,
  corporate: `Precision Industrial Engineering: Technical blueprint overlays and 3D wireframe grids in soft #ffcc00 yellow. Background: dark brushed titanium or matte slate. Lighting: professional multiple-point studio lighting, uniform and clean. Style: Swiss-grid typography layout, high-end commercial hardware photography.`,
  creative: `Cyberpunk Digital Abstract: A surreal void of floating matte black spheres and #ffcc00 yellow holographic light-rings. Effects: chromatic aberration, digital noise patterns, glowing yellow fiber-optic cables. Concept: a fusion of futuristic AI neural networks and abstract liquid metal flow.`,
  lifestyle: `Elite Boutique Tech Sanctuary: An atmospheric, moody tech setup. Background: high-end black walnut furniture with subtle yellow LED strips. Lighting: warm golden-hour #ffcc00 light pouring through a window into a dark room. Mood: cozy but sophisticated, bokeh-rich background, premium gadget aesthetic.`,
};

const TITLE_SIZE_MAP = {
  h1: "Massive Hero-Level Display Typography: ultra-bold, thick stems, metallic #ffcc00 finish with soft yellow glow.",
  h2: "Elegant Modernist Headline: bold and wide, sharp edges, pure #ffcc00 yellow with subtle drop shadow.",
  h3: "Sophisticated Technical Label: thin high-contrast sans-serif, #ffcc00 yellow outline or solid fill.",
};

const DEVICE_DESC_MAP = {
  smartphone: "a flagship smartphone with a curved obsidian black glass body and titanium rails",
  laptop: "a sleek professional matte black ultra-thin laptop with a glowing #ffcc00 logo",
  pc: "a high-end liquid-cooled black gaming PC workstation with custom #ffcc00 internal lighting",
  videotron: "a massive digital 8K videotron screen towering over a dark urban rain-slicked street with yellow reflections",
  car: "a high-performance black sports car or high-end supercar with professional #ffcc00 yellow sponsor decals and aerodynamic body wrap",
  truck: "a massive heavy-duty black transport semi-truck with a clean #ffcc00 yellow corporate branding wrap on its side trailer",
};

// Always extract search grounding URLs if googleSearch is used as required by guidelines.
export const generateMarketingCaptions = async (ageRange: string, website: string, platform: string): Promise<CaptionToolsResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Anda adalah Spesialis Social Media Marketing Senior. 
  Analisis website ini: ${website}. 
  
  PLATFORM TARGET: ${platform}.
  KONTEKS BRAND: JAGO-HP adalah website review HP berbasis AI tercanggih dengan identitas visual HITAM & KUNING (#ffcc00).
  
  TUGAS: Buatkan strategi caption media sosial dalam BAHASA INDONESIA yang menarik untuk target audiens usia ${ageRange} khusus untuk platform ${platform}.
  TUJUAN: Mengajak orang untuk mengunjungi website ${website}.

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

    const result = JSON.parse(response.text || "{}");
    
    // Extracting URLs from groundingChunks as required by guidelines
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || chunk.web?.uri,
      uri: chunk.web?.uri
    })).filter((s: any) => s.uri);

    return { ...result, sources };
  } catch (err: any) {
    throw new Error("Gagal menghasilkan caption.");
  }
};

const generateCopy = async (config: PosterConfig, variationIndex: number): Promise<{ caption: string; hashtags: string[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Buat caption postingan media sosial Bahasa Indonesia untuk brand JAGO-HP (Hitam-Kuning Tech). Konteks variasi #${variationIndex + 1}. Produk: ${config.title || "Smartphone Terbaru"}. Tone: ${config.mood}. Hashtag wajib: #jagohp. JSON: { "caption": "...", "hashtags": ["#jagohp", "..."] }`;

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
      ? `Detect subject. Replace background with solid color: ${bgColor}. Maintain professional studio lighting.`
      : "Detect main subject and remove background completely. Clean edges.";
  } else if (task === 'remove-text') {
    prompt = "The red areas in the mask indicate objects/text to be erased. Seamlessly fill the background.";
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

const fetchSingleVariation = async (config: PosterConfig, variationIndex: number): Promise<GeneratedResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const copy = await generateCopy(config, variationIndex);

  if (config.backgroundOnly) {
    const prompt = `Elite Studio Tech Environment: Dark Black and #ffcc00 Yellow theme. ${MOOD_PROMPT_MAP[config.mood]}. Empty professional gallery space, cinematic atmospheric perspective, macro textures, no devices, no text. ${config.manualPrompt ? "ADDITIONAL STYLING: " + config.manualPrompt : ""}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
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

  const hasUserText = config.title.trim() !== "" || config.tagline.trim() !== "";
  const textInstruction = hasUserText 
    ? `- Headline: "${config.title}" (${titleSizeDesc}).\n- Sub-Headline: "${config.tagline}" (Color: white or soft #ffcc00, minimal font).`
    : "- VISUAL ONLY: No text elements, focus on pure #ffcc00 yellow light and obsidian black shapes.";

  // Fix: Removed incorrect assignment to brandingInstruction which was causing an error.
  const heroInstruction = config.subjectImageBase64
    ? `HERO SUBJECT: Use the provided product/subject image as the centerpiece of the poster. Integrate it into the 3D environment. Apply sharp #ffcc00 yellow rim-lights and cinematic obsidian reflections to its surface so it matches the JAGO-HP brand aesthetic perfectly. Remove its original background if necessary.`
    : config.logoTextBase64
      ? `- BRANDING: Place user-provided logo text at ${config.logoPosition}. Apply a subtle #ffcc00 yellow aura.`
      : "- BRANDING: Keep clean, use abstract black/yellow tech patterns only.";

  const screenshotInstruction = config.mockupScreenshot 
    ? `CRITICAL DISPLAY MAPPING: You MUST embed the user-provided screenshot image precisely onto the surface of the ${config.mockupType} (as a screen content for tech, or a high-quality side-wrap/decal for vehicles). It must be perfectly warped to fit the perspective. The screenshot should appear as a professional high-resolution graphic.`
    : `GRAPHIC CONTENT: Generate a sleek high-tech interactive UI or racing decal set in #ffcc00 yellow that matches the ${config.mood} theme perfectly.`;

  let mainPrompt = `JAGO-HP PREMIUM ADVERTISING POSTER:
BRAND DNA: Deep Obsidian Black and Vibrant #ffcc00 Yellow.
${config.subjectImageBase64 ? "HERO MODE: CENTERED PRODUCT ADVERTISING." : "MOCKUP PLATFORM: " + (config.noMockup ? "No hardware" : deviceDesc)}
${heroInstruction}
${screenshotInstruction}
MOOD STYLE: ${moodDesc}.
TYPOGRAPHY: ${textInstruction}
${config.manualPrompt ? "- USER ENHANCEMENT: " + config.manualPrompt : ""}

TECHNICAL SPECIFICATIONS:
- Lighting: Global illumination, volumetric yellow rays, cinematic shadows, high-end gloss reflections.
- Composition: Dynamic 3D perspective, balanced weight, professional advertising studio quality.
- Ratio: ${config.ratio}.
- Theme: Dark Elite JAGO-HP Branding.`;

  const parts: any[] = [{ text: mainPrompt }];
  
  if (config.subjectImageBase64) parts.push({ inlineData: { mimeType: 'image/png', data: config.subjectImageBase64.split(',')[1] } });
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

export const generatePosterBatch = async (config: PosterConfig): Promise<GeneratedResult[]> => {
  return Promise.all([
    fetchSingleVariation(config, 0),
    fetchSingleVariation(config, 1),
    fetchSingleVariation(config, 2),
    fetchSingleVariation(config, 3)
  ]);
};
