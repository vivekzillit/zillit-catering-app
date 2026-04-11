// ChatWindow — the message stream for the active unit. Dispatches each
// message to the right cell based on its parsed structured-message kind.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ChatMessage, ModuleId } from '@/shared/types';
import { parseStructured } from '../../utils/structuredMessageParser';
import { useModuleStore, useModuleState } from '../../stores/moduleStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { TextMessageCell } from './TextMessageCell';
import { MessageComposer } from './MessageComposer';
import { MenuPollCard } from '../poll/MenuPollCard';
import { PollVoteCard } from '../poll/PollVoteCard';
import { humanizeLabel } from '@/shared/utils/date';

interface ChatWindowProps {
  moduleId: ModuleId;
}

export function ChatWindow({ moduleId }: ChatWindowProps) {
  const state = useModuleState(moduleId);
  const user = useAuthStore((s) => s.user);
  const shouldShowPollVote = useModuleStore((s) => s.shouldShowPollVote);
  const isLatestPollVote = useModuleStore((s) => s.isLatestPollVote);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);

  // Filter + dedup messages for display:
  //  - hide deleted messages
  //  - hide poll votes the user isn't allowed to see (non-admin strangers)
  //  - dedup poll votes keyed by voter so only the canonical copy shows
  const visible = useMemo(() => {
    const out: ChatMessage[] = [];
    for (const msg of state.messages) {
      if (msg.isDeleted || msg.deleted === 1) continue;
      const parsed = parseStructured(msg.message);

      if (parsed.kind === 'pollVote') {
        if (!shouldShowPollVote(parsed.payload)) continue;
        if (!isLatestPollVote(moduleId, parsed.payload, msg._id)) continue;
      }

      out.push(msg);
    }
    out.sort((a, b) => (a.created ?? 0) - (b.created ?? 0));
    return out;
  }, [state.messages, moduleId, shouldShowPollVote, isLatestPollVote]);

  // Auto-scroll to bottom when new messages land
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visible.length]);

  const unit = state.units.find((u) => u._id === state.activeUnitId);
  const unitLabel = humanizeLabel(unit?.unitName) || 'Chat';

  return (
    <div className="glass flex h-full min-h-0 flex-col">
      <header className="border-b hr-soft px-5 py-4">
        <h2 className="text-lg font-semibold">{unitLabel} Chat</h2>
        <p className="text-xs text-slate-400">
          {visible.length} message{visible.length === 1 ? '' : 's'}
        </p>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {state.loadingChat && state.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading chat…
          </div>
        ) : visible.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No messages yet. Post a menu poll or say hi.
          </div>
        ) : (
          visible.map((msg) => {
            const parsed = parseStructured(msg.message);
            const isSelf = msg.sender === user?._id;
            if (parsed.kind === 'menuPoll') {
              return (
                <MenuPollCard
                  key={msg._id}
                  moduleId={moduleId}
                  message={msg}
                  payload={parsed.payload}
                  onReply={() => setReplyTarget(msg)}
                />
              );
            }
            if (parsed.kind === 'pollVote') {
              return (
                <PollVoteCard
                  key={msg._id}
                  moduleId={moduleId}
                  message={msg}
                  payload={parsed.payload}
                  onReply={() => setReplyTarget(msg)}
                />
              );
            }
            return (
              <TextMessageCell
                key={msg._id}
                moduleId={moduleId}
                message={msg}
                text={parsed.text}
                isSelf={isSelf}
                onReply={() => setReplyTarget(msg)}
              />
            );
          })
        )}
      </div>

      <MessageComposer
        moduleId={moduleId}
        replyTarget={replyTarget}
        onClearReply={() => setReplyTarget(null)}
      />
    </div>
  );
}
