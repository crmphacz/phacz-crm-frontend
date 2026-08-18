import { useEffect, useRef, useState } from 'react';
import { Bot, Sparkles, Send, Trash2, Users, Filter, Building2, FileText } from 'lucide-react';
import { useStore } from '../store';
import { formatRelativeTime, getInitials } from '../utils';
import { ApiError } from '../api/client';

const SUGGESTED_PROMPTS: { icon: React.ElementType; label: string }[] = [
  { icon: Filter, label: 'Quantos corretores estão ativos em cada etapa do funil?' },
  { icon: Building2, label: 'Quais clientes têm interesse no Jardins do Sul?' },
  { icon: Users, label: 'Como está a performance do Rafael Costa?' },
  { icon: FileText, label: 'Quais propostas estão pendentes de resposta?' },
];

export function PhaczIAView() {
  const messages = useStore((s) => s.chatMessages);
  const sendChatMessage = useStore((s) => s.sendChatMessage);
  const clearChat = useStore((s) => s.clearChat);
  const currentUser = useStore((s) => s.currentUser);
  const ensurePhaczIaLoaded = useStore((s) => s.ensurePhaczIaLoaded);

  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensurePhaczIaLoaded().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    setInput('');
    setThinking(true);
    try {
      await sendChatMessage(trimmed);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Não foi possível falar com a PHACZ IA agora.');
    } finally {
      setThinking(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#f0f2f5' }}>
      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-6 py-4 flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #d55006, #eb5f18)' }}
            >
              <Bot size={20} color="#fff" />
            </div>
            <div className="min-w-0">
              <h1 className="font-questrial text-xl text-gray-800 flex items-center gap-2">
                PHACZ IA
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ backgroundColor: '#fff7ed', color: '#d55006', border: '1px solid #fed7aa' }}
                >
                  Beta
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                Assistente inteligente para consultar e analisar os dados do seu CRM
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => clearChat()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <Trash2 size={13} /> <span className="hidden sm:inline">Limpar conversa</span>
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <EmptyState onPick={sendMessage} />
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                role={m.role}
                content={m.content}
                createdAt={m.criadoEm}
                userInitials={currentUser ? getInitials(currentUser.nome) : 'U'}
                userColor={currentUser?.cor ?? '#d55006'}
              />
            ))
          )}

          {thinking && <TypingIndicator />}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 sm:px-6 py-4 flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex items-end gap-3">
          <input
            className="form-input flex-1"
            placeholder="Pergunte sobre corretores, clientes, funis ou propostas..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={thinking}
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            style={{ backgroundColor: '#d55006' }}
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #d55006, #eb5f18)' }}
      >
        <Sparkles size={28} color="#fff" />
      </div>
      <div>
        <h2 className="font-questrial text-lg text-gray-800">Como posso te ajudar?</h2>
        <p className="text-sm text-gray-400 mt-1 max-w-md">
          Pergunte sobre corretores, funis, clientes finais, propostas e indicadores de performance —
          eu consulto os dados reais do CRM antes de responder.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 w-full max-w-lg">
        {SUGGESTED_PROMPTS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            onClick={() => onPick(label)}
            className="flex items-start gap-2.5 p-3.5 rounded-xl border text-left text-sm text-gray-600 hover:border-orange-300 hover:bg-orange-50/40 transition-all"
            style={{ borderColor: '#e5e7eb' }}
          >
            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff7ed' }}>
              <Icon size={14} style={{ color: '#d55006' }} />
            </span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ role, content, createdAt, userInitials, userColor }: {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  userInitials: string;
  userColor: string;
}) {
  const isUser = role === 'user';
  return (
    <div className={`flex items-end gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
        style={isUser ? { backgroundColor: userColor } : { background: 'linear-gradient(135deg, #d55006, #eb5f18)' }}
      >
        {isUser ? userInitials : <Bot size={15} />}
      </div>
      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
          style={
            isUser
              ? { backgroundColor: '#d55006', color: '#fff', borderBottomRightRadius: 4 }
              : { backgroundColor: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderBottomLeftRadius: 4 }
          }
        >
          {content}
        </div>
        <span className="text-xs text-gray-300 px-1">{formatRelativeTime(createdAt)}</span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white"
        style={{ background: 'linear-gradient(135deg, #d55006, #eb5f18)' }}
      >
        <Bot size={15} />
      </div>
      <div className="px-4 py-3 rounded-2xl flex items-center gap-1" style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderBottomLeftRadius: 4 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{ backgroundColor: '#d1d5db', animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
