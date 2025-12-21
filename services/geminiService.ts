import { GoogleGenAI } from "@google/genai";

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

  // Ultra-strict prompt for fidelity
  const prompt = `
  TASK: Create a pixel-perfect vector-style recreation of the attached image.
  
  STRICT CONSTRAINTS (MUST FOLLOW):
  1. EXACT TRACE: The output must preserve the exact geometry, pose, facial expressions, and proportions of the original image. Do not change the shape of eyes, hands, or objects.
  2. NO HALLUCINATIONS: Do not add details that are not in the source. Do not remove details that are in the source (except text if specified).
  3. STYLE: Clean vector art. Flat colors, smooth curves, no noise, no compression artifacts.
  4. FIDELITY: If the original image has a specific facial expression (e.g., squinting), the output MUST have the exact same expression. If the hand is in a specific gesture, the output MUST have the exact same gesture.
  5. ROLE: Act as a photocopier that applies a "Vector Art" filter. Do not act as an artist reimagining the scene.
  6. COMPOSITION: If the target aspect ratio (canvas size) is different from the source image, CENTER the original content on the canvas and add padding (letterbox/pillarbox) using the background color. DO NOT stretch, distort, or crop the subject to fit.
  ${removeText ? '7. TEXT REMOVAL: Remove all text, typography, letters, logos, and numbers from the image. Heal the areas where text was located by seamlessly blending the background or object texture to match the surrounding area as if the text never existed.' : ''}

  The resulting image should look like the original image was opened in Adobe Illustrator and automatically traced with high fidelity settings.
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
        // Use the detected aspect ratio to prevent cropping/distortion
        imageConfig: {
          aspectRatio: aspectRatio,
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