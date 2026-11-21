import React, { useState } from 'react';
import { Bot, Mic, MicOff, Send, Sparkles, TrendingUp } from 'lucide-react';
import type { Language, PriceMode, Product, ShopState } from '../types/shop';
import { TRANSLATIONS } from '../i18n/translations';
import {
  computeFinancialReport,
  getLowStockProducts,
  type CartDraftItem,
} from '../utils/shopLogic';

interface Props {
  state: ShopState;
  language: Language;
  onAddVoiceItemsToCart: (items: CartDraftItem[], priceMode?: PriceMode) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface AIInsight {
  title: string;
  detail: string;
  priority: string;
}

export const AiAssistantView: React.FC<Props> = ({
  state,
  language,
  onAddVoiceItemsToCart,
}) => {
  const t = TRANSLATIONS[language];
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text:
        language === 'ur'
          ? 'السلام علیکم! میں ستارہ کلاتھ ہاؤس کا سمارٹ اے آئی بزنس مینیجر ہوں۔ آپ منافع، اسٹاک یا کھاتہ کے بارے میں اردو یا انگریزی میں پوچھ سکتے ہیں۔'
          : 'Assalam-o-Alaikum! I am your Sitara Cloth House AI Business Manager. Ask me about daily profit, low-stock predictions, customer Khata collections, or speak/type an order for Smart Voice Billing.',
    },
  ]);
  const [loadingChat, setLoadingChat] = useState(false);

  // Voice billing
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceResultMsg, setVoiceResultMsg] = useState('');
  const [parsingVoice, setParsingVoice] = useState(false);

  // Insights
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [aiError, setAiError] = useState('');

  const buildShopContext = () => {
    const monthly = computeFinancialReport({
      invoices: state.invoices,
      expenses: state.expenses,
      parties: state.parties,
      period: 'monthly',
    });
    const lowStock = getLowStockProducts(state.products).map((p) => ({
      name: p.name,
      sku: p.sku,
      stock: p.stock,
      minStock: p.minStock,
    }));
    return {
      shopName: state.profile.shopName,
      totalProducts: state.products.length,
      lowStock,
      monthlySummary: monthly,
      topDebtors: state.parties
        .filter((p) => p.type === 'customer' && p.balance > 0)
        .map((p) => ({ name: p.name, balance: p.balance })),
      salesmenCount: state.salesmen.length,
    };
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loadingChat) return;
    const userText = question.trim();
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: userText }]);
    setQuestion('');
    setLoadingChat(true);
    setAiError('');

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userText,
          language,
          shopContext: buildShopContext(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI request failed.');
      }
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', text: data.reply },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach AI Manager.';
      setAiError(msg);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleStartSpeech = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceResultMsg(
        'Microphone speech recognition is not supported in this browser. Type your order below (e.g., "2 Gul Ahmed Lawn and 1 Boski Silk").'
      );
      return;
    }

    const recognition = new SpeechRec() as {
      lang: string;
      interimResults: boolean;
      onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onerror: () => void;
      onend: () => void;
      start: () => void;
    };
    recognition.lang = language === 'ur' ? 'ur-PK' : 'en-PK';
    recognition.interimResults = false;
    setListening(true);
    setVoiceResultMsg('Listening...');

    recognition.onresult = (event) => {
      const spoken = event.results[0]?.[0]?.transcript ?? '';
      setVoiceTranscript(spoken);
      setListening(false);
      setVoiceResultMsg(`Captured: "${spoken}"`);
    };
    recognition.onerror = () => {
      setListening(false);
      setVoiceResultMsg('Microphone permission denied or unavailable. Type your order below.');
    };
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const handleParseVoiceBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceTranscript.trim()) return;
    setParsingVoice(true);
    setVoiceResultMsg('');

    try {
      const res = await fetch('/api/ai/voice-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: voiceTranscript.trim(),
          products: state.products.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            nameUrdu: p.nameUrdu,
            category: p.category,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Voice billing parse failed.');

      const matchedItems: CartDraftItem[] = [];
      for (const item of data.items || []) {
        const prod = state.products.find((p: Product) => p.id === item.productId);
        if (prod && item.quantity > 0) {
          matchedItems.push({ product: prod, quantity: Number(item.quantity) });
        }
      }
      if (matchedItems.length > 0) {
        onAddVoiceItemsToCart(matchedItems, data.priceMode);
        setVoiceResultMsg(
          `Added ${matchedItems.length} fabric line(s) to Billing Cart (${data.summary || 'Ready'}).`
        );
      } else {
        setVoiceResultMsg('Could not match any fabric SKU from that phrase. Try naming Lawn, Cotton, Silk, or Velvet.');
      }
    } catch (err) {
      setVoiceResultMsg(err instanceof Error ? err.message : 'Voice parse error.');
    } finally {
      setParsingVoice(false);
    }
  };

  const handleLoadInsights = async () => {
    setLoadingInsights(true);
    setAiError('');
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          shopContext: buildShopContext(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate insights.');
      setInsights(data.insights || []);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI Insights unavailable.');
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Bilingual AI Business Manager Chat */}
      <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              {t.aiManagerTitle}
            </h2>
          </div>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            English &amp; اردو
          </span>
        </div>

        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-3.5 rounded-xl text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? 'bg-emerald-800 text-white ml-8'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 mr-8'
              }`}
            >
              {m.text}
            </div>
          ))}
          {loadingChat && (
            <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs text-stone-500 mr-8">
              Analyzing Sitara Cloth House records...
            </div>
          )}
        </div>

        {aiError && (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {aiError}
          </p>
        )}

        <form onSubmit={handleSendChat} className="flex gap-2">
          <label htmlFor="ai-chat-input" className="sr-only">
            Ask AI Business Manager
          </label>
          <input
            id="ai-chat-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              language === 'ur'
                ? 'آج کا منافع یا کم اسٹاک پوچھیں...'
                : 'Ask about profit, stock predictions, or Khata recovery...'
            }
            className="flex-1 px-4 py-2.5 min-h-[44px] rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100"
          />
          <button
            type="submit"
            disabled={loadingChat}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium inline-flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            Ask
          </button>
        </form>
      </section>

      {/* Right: Smart Voice Billing + Low-Stock Predictions */}
      <div className="lg:col-span-5 space-y-6">
        <section className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 inline-flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              {t.voiceBillTitle}
            </h2>
            <button
              type="button"
              onClick={handleStartSpeech}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 ${
                listening
                  ? 'bg-red-600 text-white'
                  : 'border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200'
              }`}
            >
              {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              {listening ? 'Listening' : 'Speak'}
            </button>
          </div>

          <form onSubmit={handleParseVoiceBill} className="space-y-3">
            <textarea
              rows={3}
              value={voiceTranscript}
              onChange={(e) => setVoiceTranscript(e.target.value)}
              placeholder='Example: "2 Gul Ahmed Lawn aur 3 meter Emerald Velvet wholesale rate par bill karo"'
              className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100"
            />
            <button
              type="submit"
              disabled={parsingVoice}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium inline-flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {parsingVoice ? 'Parsing Order...' : 'Convert to Billing Cart'}
            </button>
          </form>

          {voiceResultMsg && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">{voiceResultMsg}</p>
          )}
        </section>

        <section className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 inline-flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              AI Predictions &amp; Restock Advisor
            </h2>
            <button
              type="button"
              onClick={handleLoadInsights}
              disabled={loadingInsights}
              className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium"
            >
              {loadingInsights ? 'Analyzing...' : 'Analyze Now'}
            </button>
          </div>

          {insights.length === 0 ? (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Click Analyze Now to forecast low-stock items, profit margins, and Khata follow-ups.
            </p>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {insights.map((ins, idx) => (
                <div key={idx} className="py-3 space-y-1">
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {ins.title}
                  </p>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    {ins.detail}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
