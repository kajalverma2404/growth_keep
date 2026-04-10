import { GenerateContentParameters, GenerateContentResponse } from "@google/genai";

export async function generateContentWithRetry(
  ai: any,
  params: GenerateContentParameters,
  maxRetries = 5,
  initialDelay = 3000
): Promise<GenerateContentResponse> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (err: any) {
      lastError = err;
      const errorStr = (err.message || JSON.stringify(err)).toLowerCase();
      
      // Check for 503 (Service Unavailable), 429 (Too Many Requests), or 500 (Internal Server Error)
      const isRetryable = 
        errorStr.includes('503') || 
        errorStr.includes('429') || 
        errorStr.includes('500') ||
        errorStr.includes('unavailable') || 
        errorStr.includes('high demand') ||
        errorStr.includes('overloaded') ||
        errorStr.includes('deadline exceeded');

      if (isRetryable && i < maxRetries - 1) {
        // Exponential backoff with jitter
        const delay = (initialDelay * Math.pow(2, i)) + (Math.random() * 1000);
        console.warn(`[AI RETRY] Attempt ${i + 1} failed. Retrying in ${Math.round(delay)}ms... Error: ${errorStr}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
