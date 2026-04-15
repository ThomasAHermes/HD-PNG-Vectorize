import { GoogleGenAI } from "@google/genai/web";

// Use Gemini 2.5 Flash Image which is performant and works with standard keys
const MODEL_NAME = 'gemini-2.5-flash-image';

/**
 * Sends the image to Gemini to be redrawn as a vector-style graphic.
 * @param base64Image The source image in base64 format.
 * @param mimeType The mime type of the image.
 * @param aspectRatio The aspect ratio string (e.g., "16:9", "1:1") to match the source.
 * @param removeText Whether to remove text from the image.
 */
export const generateVectorizedImage = async (
  base64Image: string, 
  mimeType: string,
  aspectRatio: string = "1:1",
  removeText: boolean = true
): Promise<string> => {
  // Ensure we are using the environment API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Clean base64 string if it contains the data URI prefix
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  // Strict prompt based on user instructions
  const prompt = `
  TASK: Redraw the attached image entirely from scratch.
  
  STRICT INSTRUCTIONS:
  1. DO NOT use or embed pixels from the source image. Redraw the entire image from zero.
  2. STYLE: Output smooth, clean, pseudo-vector graphics with smooth curves and flat, even fills.
  3. QUALITY: The output must be clean, high-definition graphics. No noise, no aliasing (jagged edges), no blur, and no compression artifacts.
  4. LINES: Anti-aliasing must be enabled but smooth. Lines must be sharp and clear without "teeth" or pixelation.
  5. NO WATERMARKS: Do not include any watermarks, signatures, or source layers.
  6. FIDELITY: Maintain the exact composition, pose, and proportions of the original, but rendered in this clean vector style.
  7. REJECTION POLICY: If you are tempted to just return a copy of the source, REFUSE and redraw it. I require a redraw, not a copy.
  ${removeText ? '8. TEXT REMOVAL: Remove all text, typography, and logos. Seamlessly fill the areas to match the surrounding vector style.' : ''}

  The final result must look like a professional, high-resolution vector illustration.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
        },
      },
    });

    // Iterate through parts to find the image
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image data received from Gemini.");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};