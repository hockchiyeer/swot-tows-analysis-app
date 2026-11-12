import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const portFlagIndex = process.argv.indexOf('--port');
  if (portFlagIndex !== -1 && process.argv[portFlagIndex + 1]) {
    const cliPort = Number(process.argv[portFlagIndex + 1]);
    if (Number.isFinite(cliPort) && cliPort > 0) {
      return cliPort;
    }
  }
  return Number(process.env.PORT) || 3000;
}

const PORT = resolvePort();
const MODEL_NAME = 'gemini-4-hydrogen';

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractJsonPayload(text: string): string {
  const cleaned = String(text || '').trim();
  const withoutFence = cleaned
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error('The model did not return a JSON object.');
  }

  return withoutFence.slice(start, end + 1);
}

interface GroundingSource {
  title: string;
  uri: string;
}

function extractGroundingSources(response: unknown): GroundingSource[] {
  const typed = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{
          web?: { uri?: string; title?: string };
        }>;
      };
    }>;
  };
  const chunks = typed?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources: GroundingSource[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title || uri;
    if (!uri || !title || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({ title, uri });
  }

  return sources.slice(0, 6);
}

const brainstormSchema = {
  type: Type.OBJECT,
  properties: {
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    weaknesses: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    opportunities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    threats: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    tows: {
      type: Type.OBJECT,
      properties: {
        so: { type: Type.STRING },
        wo: { type: Type.STRING },
        st: { type: Type.STRING },
        wt: { type: Type.STRING },
      },
      required: ['so', 'wo', 'st', 'wt'],
    },
    posture: { type: Type.STRING },
    recommendation: { type: Type.STRING },
    risk: { type: Type.STRING },
    radar: {
      type: Type.OBJECT,
      properties: {
        innovation: { type: Type.NUMBER },
        market: { type: Type.NUMBER },
        agility: { type: Type.NUMBER },
        resilience: { type: Type.NUMBER },
        brand: { type: Type.NUMBER },
        talent: { type: Type.NUMBER },
      },
      required: ['innovation', 'market', 'agility', 'resilience', 'brand', 'talent'],
    },
  },
  required: [
    'strengths',
    'weaknesses',
    'opportunities',
    'threats',
    'tows',
    'posture',
    'recommendation',
    'risk',
    'radar',
  ],
};

async function generateBrainstormWithRetry(ai: GoogleGenAI, client: string, objective: string) {
  const prompt = `Create a concise but decision-useful SWOT and TOWS analysis for ${client} with the objective "${objective}". Use current web information when it materially helps. Return strict JSON with this exact shape: {"strengths":[],"weaknesses":[],"opportunities":[],"threats":[],"tows":{"so":"","wo":"","st":"","wt":""},"posture":"","recommendation":"","risk":"","radar":{"innovation":0,"market":0,"agility":0,"resilience":0,"brand":0,"talent":0}}`;
  const systemInstruction =
    'Act like a management consultant. Ground claims in Google Search when helpful. Keep each SWOT list to 3-5 crisp items and keep radar values between 0 and 100.';

  const maxAttempts = 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
          responseSchema: brainstormSchema,
        },
      });
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number })?.status;
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw error;
      }
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
      }
    }
  }

  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/gemini/brainstorm', async (req: Request, res: Response) => {
    const client = typeof req.body?.client === 'string' ? req.body.client.trim() : '';
    const objective = typeof req.body?.objective === 'string' ? req.body.objective.trim() : '';

    if (!client || !objective) {
      res.status(400).json({ error: 'Client and objective are required.' });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    try {
      const response = await generateBrainstormWithRetry(ai, client, objective);
      const rawText = response.text || '';
      const payload = extractJsonPayload(rawText);
      const parsed = JSON.parse(payload);
      const sources = extractGroundingSources(response);

      res.json({
        ...parsed,
        sources,
      });
    } catch (error) {
      console.error('Gemini brainstorm error:', error);
      const errObj = error as { status?: number; message?: string };
      const status = typeof errObj?.status === 'number' && errObj.status >= 400 ? errObj.status : 500;
      let message = errObj?.message || 'Gemini request failed.';

      if (status === 400 || status === 403) {
        message = 'Gemini API key is invalid or lacks permission. Please verify GEMINI_API_KEY in Settings > Secrets.';
      } else if (status === 429) {
        message = 'Gemini API quota exceeded. Please try again shortly or check your quota in Settings > Secrets.';
      } else if (status === 404) {
        message = 'Configured Gemini model was not found.';
      }

      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
