import { GoogleGenerativeAI } from "@google/generative-ai";
import { APP_CONFIG } from "../config";
import {
  AnalysisResponse,
  AnalysisResponseSchema,
  Finding,
  ResponseMeta,
} from "../schema";

export interface GeminiCallParams {
  prompt: string;
  mode: "review" | "debug" | "explain";
  level: "beginner" | "intermediate" | "expert";
  deep: boolean;
}

export interface GeminiCallResult {
  data: Partial<AnalysisResponse>;
  modelUsed: string;
  error?: string;
  rawText?: string;
}

/**
 * Strips markdown code fences from JSON strings if present.
 */
function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/```\s*$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
  }
  return cleaned.trim();
}

/**
 * Server-side Gemini service.
 * Never exposes API key to client.
 * Enforces temperature ~0.2 and responseMimeType="application/json".
 * Retries at most ONCE on JSON parse or validation failure.
 */
export async function callGeminiAnalysis(
  params: GeminiCallParams
): Promise<GeminiCallResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || APP_CONFIG.defaultModel;

  if (!apiKey || apiKey.trim() === "") {
    return {
      data: {},
      modelUsed: "none (API key missing)",
      error: "GEMINI_API_KEY environment variable is not configured on the server.",
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  // Attempt 1
  try {
    const result = await model.generateContent(params.prompt);
    const text = result.response.text();
    const cleaned = cleanJsonString(text);
    const parsed = JSON.parse(cleaned);

    return {
      data: parsed,
      modelUsed: modelName,
      rawText: text,
    };
  } catch (firstErr: unknown) {
    // Retry ONCE with error feedback
    try {
      const retryPrompt = `${params.prompt}\n\nCRITICAL FIX: Your previous response was not valid JSON or failed parsing. Return ONLY raw JSON strictly conforming to the Output Contract without formatting or commentary.`;
      const retryResult = await model.generateContent(retryPrompt);
      const retryText = retryResult.response.text();
      const cleanedRetry = cleanJsonString(retryText);
      const parsedRetry = JSON.parse(cleanedRetry);

      return {
        data: parsedRetry,
        modelUsed: modelName,
        rawText: retryText,
      };
    } catch (secondErr: unknown) {
      const message =
        secondErr instanceof Error
          ? secondErr.message
          : firstErr instanceof Error
          ? firstErr.message
          : "Gemini response was invalid or unreachable";

      return {
        data: {},
        modelUsed: modelName,
        error: `Gemini error: ${message}`,
      };
    }
  }
}
