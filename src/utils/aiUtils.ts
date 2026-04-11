import { GenerateContentParameters } from "@google/genai";

// Convert Gemini-style contents to OpenAI messages array
function geminiContentsToMessages(contents: any): { role: string; content: string }[] {
  if (typeof contents === 'string') {
    return [{ role: 'user', content: contents }];
  }
  if (Array.isArray(contents)) {
    return contents.map((c: any) => {
      const role = c.role === 'model' ? 'assistant' : (c.role || 'user');
      let content = '';
      if (c.parts) {
        content = c.parts.map((p: any) => p.text || '').join('');
      } else if (typeof c === 'string') {
        content = c;
      }
      return { role, content };
    });
  }
  return [];
}

async function generateWithOpenAI(params: GenerateContentParameters): Promise<{ text: string }> {
  const openAiKey = (process as any).env.OPENAI_API_KEY;
  if (!openAiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const userMessages = geminiContentsToMessages(params.contents);
  const systemInstruction = params.config?.systemInstruction as string | undefined;
  const isJsonMode = params.config?.responseMimeType === 'application/json';

  const messages: { role: string; content: string }[] = [];

  let systemPrompt = systemInstruction || '';
  if (isJsonMode) {
    systemPrompt += '\n\nIMPORTANT: Respond with valid JSON only. No markdown, no code blocks, just raw JSON.';
  }
  if (systemPrompt.trim()) {
    messages.push({ role: 'system', content: systemPrompt.trim() });
  }
  messages.push(...userMessages);

  const requestBody: any = {
    model: 'gpt-4o-mini',
    messages,
  };
  if (isJsonMode) {
    requestBody.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error ${response.status}: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return { text };
}

export async function generateContentWithRetry(
  ai: any,
  params: GenerateContentParameters,
  maxRetries = 5,
  initialDelay = 3000
): Promise<{ text: string }> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (err: any) {
      lastError = err;
      const errorStr = (err.message || JSON.stringify(err)).toLowerCase();

      const isRetryable =
        errorStr.includes('503') ||
        errorStr.includes('429') ||
        errorStr.includes('500') ||
        errorStr.includes('unavailable') ||
        errorStr.includes('high demand') ||
        errorStr.includes('overloaded') ||
        errorStr.includes('deadline exceeded');

      if (isRetryable && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i) + Math.random() * 1000;
        console.warn(`[AI RETRY] Attempt ${i + 1} failed. Retrying in ${Math.round(delay)}ms... Error: ${errorStr}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Non-retryable error or last retry — fall through to OpenAI
      break;
    }
  }

  // Gemini failed — try OpenAI fallback
  const openAiKey = (process as any).env.OPENAI_API_KEY;
  if (openAiKey) {
    console.warn('[AI FALLBACK] Gemini unavailable, switching to OpenAI fallback...');
    try {
      return await generateWithOpenAI(params);
    } catch (fallbackErr: any) {
      console.error('[AI FALLBACK] OpenAI also failed:', fallbackErr.message);
    }
  }

  throw lastError;
}
