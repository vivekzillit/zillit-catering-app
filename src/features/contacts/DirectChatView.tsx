// DirectChatView — 1:1 or group chat interface. Reuses the glassmorphism
// bubble style from the unit-scoped chat.

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/authStore';
import { formatShortTime } from '@/shared/utils/date';
import { decryptAES256CBC, encryptAES256CBC } from '@/shared/crypto';
import * as convoApi from './api/conversations';
import type { Conversation, DirectMessage } from './api/conversations';

interface DirectChatViewProps {
  conversation: Conversation;
  onBack: () => void;
}

export function DirectChatView({ conversation, onBack }: DirectChatViewProps) {
  const self = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Resolve conversation title
  const title =
    conversation.name ||
    conversation.participantDetails
      ?.filter((p) => p._id !== self?._id)
      .map((p) => p.name)
      .join(', ') ||
    'Chat';

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await convoApi.fetchMessages(conversation._id);
      // Decrypt each message
      const decrypted = await Promise.all(
        raw.map(async (m) => {
          try {
            const plain = await decryptAES256CBC(m.message);
            return { ...m, message: plain };
          } catch {
            return m; // if decrypt fails, show raw (probably already plaintext in dev)
          }
        })
      );
      setMessages(decrypted);
    } catch (err) {
      console.error('fetchMessages failed', err);
    } finally {
      setLoading(false);
    }
  }, [conversation._id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Auto-refresh every 5 seconds for new messages
  useEffect(() => {
    const id = setInterval(loadMessages, 5_000);
    return () => clearInterval(id);
  }, [loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const encrypted = await encryptAES256CBC(text.trim());
      const msg = await convoApi.sendMessage(conversation._id, encrypted);
      // Optimistic append with decrypted text
      setMessages((prev) => [...prev, { ...msg, message: text.trim() }]);
      setText('');
    } catch (err) {
      console.error('sendMessage failed', err);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Build a lookup for participant names
  const nameMap = new Map(
    (conversation.participantDetails ?? []).map((p) => [p._id, p.name])
  );

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      {/* Header */}
      <header className="glass flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="btn-ghost h-8 w-8 !p-0"
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          <p className="text-[10px] text-slate-400">
            {conversation.type === 'group'
              ? `${conversation.participantDetails?.length ?? 0} members`
              : 'Direct message'}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No messages yet. Say hi!
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.sender === self?._id;
            const senderName = nameMap.get(msg.sender) ?? 'Unknown';
            return (
              <div
                key={msg._id}
                className={clsx(
                  'flex flex-col gap-0.5',
                  isSelf ? 'items-end' : 'items-start'
                )}
              >
                {!isSelf && conversation.type === 'group' ? (
                  <span className="px-1 text-[10px] font-semibold text-brand-300">
                    {senderName}
                  </span>
                ) : null}
                <div
                  className={clsx(
                    'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                    isSelf
                      ? 'bg-brand-500/20 text-slate-100 border border-brand-400/30'
                      : 'glass-subtle text-slate-200'
                  )}
                >
                  <p className="whitespace-pre-line break-words">{msg.message}</p>
                  <span className="mt-1 block text-right text-[10px] text-slate-400">
                    {msg.created ? formatShortTime(msg.created) : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="glass border-t hr-soft px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            className="input min-h-[42px] max-h-32 resize-none"
            placeholder="Write a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="btn-primary h-[42px]"
            onClick={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
