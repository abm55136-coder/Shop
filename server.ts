import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '12mb' }));

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
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

async function withGeminiRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = msg.includes('503') || msg.includes('429') || msg.includes('UNAVAILABLE');
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

function formatApiError(err: unknown, fallback: string): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : fallback;
  try {
    const parsed = JSON.parse(raw) as { error?: { code?: number; message?: string } };
    if (parsed?.error?.message) {
      return {
        status: parsed.error.code === 503 ? 503 : 500,
        message: parsed.error.message,
      };
    }
  } catch {
    // raw is plain text
  }
  if (raw.includes('not configured')) {
    return { status: 503, message: raw };
  }
  return { status: 500, message: raw || fallback };
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Sitara Cloth House API' });
});

app.post('/api/ai/assistant', async (req, res) => {
  try {
    const { question, language, shopContext } = req.body as {
      question: string;
      language?: 'en' | 'ur';
      shopContext?: Record<string, unknown>;
    };
    if (!question || typeof question !== 'string' || !question.trim()) {
      res.status(400).json({ error: 'Question is required.' });
      return;
    }
    const ai = getGeminiClient();
    const langInstruction =
      language === 'ur'
        ? 'Reply primarily in clear, natural Urdu script (اردو) with PKR numbers clearly formatted.'
        : 'Reply in clear, concise English (or bilingual Urdu/English if the user writes in Urdu/Roman Urdu).';

    const response = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Shop Data Context:\n${JSON.stringify(shopContext ?? {}, null, 2)}\n\nMerchant Question: ${question.trim()}`,
        config: {
          systemInstruction: `You are the AI Business Manager for Sitara Cloth House (03425984394), a Pakistani retail & wholesale textile business selling Lawn, Cotton, Khaddar, Linen, Silk, Chiffon, Velvet, and Organza. ${langInstruction} Base your calculations strictly on the provided Shop Data Context. Keep answers practical, crisp, and actionable with bullet points.`,
        },
      })
    );

    res.json({ reply: response.text ?? 'No response generated.' });
  } catch (err) {
    const formatted = formatApiError(err, 'AI assistant request failed.');
    console.error('AI assistant error:', formatted.message);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

app.post('/api/ai/voice-bill', async (req, res) => {
  try {
    const { transcript, products } = req.body as {
      transcript: string;
      products: Array<{ id: string; sku: string; name: string; nameUrdu?: string; category: string }>;
    };
    if (!transcript || !Array.isArray(products)) {
      res.status(400).json({ error: 'Transcript and products list are required.' });
      return;
    }
    const ai = getGeminiClient();
    const response = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Catalogue:\n${JSON.stringify(products)}\n\nVoice/Text Billing Command: "${transcript}"`,
        config: {
          systemInstruction:
            'Extract cloth items and quantities from the spoken or typed billing order (English, Urdu, or Roman Urdu). Match each requested item to the closest product ID from the provided Catalogue. Also detect if wholesale or retail rate is requested.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              priceMode: {
                type: Type.STRING,
                description: 'Either "retail" or "wholesale". Default to "retail" unless wholesale/thok is mentioned.',
              },
              customerName: {
                type: Type.STRING,
                description: 'Optional customer name if mentioned in the command, otherwise empty string.',
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    productId: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    matchedName: { type: Type.STRING },
                  },
                  required: ['productId', 'quantity', 'matchedName'],
                },
              },
              summary: { type: Type.STRING },
            },
            required: ['priceMode', 'items', 'summary'],
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    const formatted = formatApiError(err, 'Voice billing parsing failed.');
    console.error('Voice bill error:', formatted.message);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

app.post('/api/ai/parse-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body as {
      imageBase64: string;
      mimeType: string;
    };
    if (!imageBase64 || !mimeType) {
      res.status(400).json({ error: 'Receipt image data and mimeType are required.' });
      return;
    }
    const ai = getGeminiClient();
    const response = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
            {
              text: 'Inspect this shop bill, textile receipt, or handwritten Khata slip. Extract the final total amount in PKR (numeric), vendor or customer name, date if visible, and a concise summary of items/notes.',
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedAmount: { type: Type.NUMBER, description: 'Final total amount on the bill as a number.' },
              partyName: { type: Type.STRING, description: 'Supplier or customer name visible on bill.' },
              billDate: { type: Type.STRING, description: 'Date on the bill in YYYY-MM-DD if visible, else empty.' },
              note: { type: Type.STRING, description: 'Brief 1-line description of items or bill reference.' },
            },
            required: ['detectedAmount', 'partyName', 'note'],
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    const formatted = formatApiError(err, 'Receipt scanning failed.');
    console.error('Parse receipt error:', formatted.message);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

app.post('/api/ai/insights', async (req, res) => {
  try {
    const { language, shopContext } = req.body as {
      language?: 'en' | 'ur';
      shopContext: Record<string, unknown>;
    };
    const ai = getGeminiClient();
    const response = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze Sitara Cloth House performance and stock levels:\n${JSON.stringify(shopContext, null, 2)}`,
        config: {
          systemInstruction: `Provide 3 concise, high-impact business insights for Sitara Cloth House: (1) Low-stock restock prediction, (2) Profit & margin optimization, (3) Expense or Khata collection recommendation. Language: ${language === 'ur' ? 'Urdu (اردو)' : 'English'}.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              insights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    detail: { type: Type.STRING },
                    priority: { type: Type.STRING, description: 'high, medium, or normal' },
                  },
                  required: ['title', 'detail', 'priority'],
                },
              },
            },
            required: ['insights'],
          },
        },
      })
    );
    const parsed = JSON.parse((response.text ?? '{"insights":[]}').trim());
    res.json(parsed);
  } catch (err) {
    const formatted = formatApiError(err, 'Insights generation failed.');
    console.error('Insights error:', formatted.message);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sitara Cloth House server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
