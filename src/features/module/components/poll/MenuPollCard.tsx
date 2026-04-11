// MenuPollCard — interactive poll bubble. Members tap items to include them
// in their order, then submit. Admins see a "breakdown" CTA that opens the
// aggregated sheet with per-item and per-order counts.

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { Check, ClipboardList, MessageCircle } from 'lucide-react';
import type { ChatMessage, MenuPollPayload, ModuleId } from '@/shared/types';
import { formatChatDate } from '@/shared/utils/date';
import { useModuleStore } from '../../stores/moduleStore';
import { useAuthStore, selectIsAdmin } from '@/shared/stores/authStore';
import { CommentsList } from '../chat/CommentsList';
import { PollVoteBreakdownSheet } from './PollVoteBreakdownSheet';

interface MenuPollCardProps {
  moduleId: ModuleId;
  message: ChatMessage;
  payload: MenuPollPayload;
  onReply: () => void;
}

export function MenuPollCard({ moduleId, message, payload, onReply }: MenuPollCardProps) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore(selectIsAdmin);
  const submitPollVote = useModuleStore((s) => s.submitPollVote);
  const getPollVotes = useModuleStore((s) => s.getPollVotes);

  const [selections, setSelections] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const votes = useMemo(
    () => getPollVotes(moduleId, payload.pollId),
    [getPollVotes, moduleId, payload.pollId, message._id]
  );

  const myVote = useMemo(
    () => votes.find((v) => v.voterUserId === user?._id),
    [votes, user?._id]
  );

  function toggleItem(menuItemId: string) {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[menuItemId]) delete next[menuItemId];
      else next[menuItemId] = 1;
      return next;
    });
  }

  async function handleSubmit() {
    if (Object.keys(selections).length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await submitPollVote(moduleId, {
        pollMessageUniqueId: message.uniqueId ?? message._id,
        pollId: payload.pollId,
        unitId: payload.unitId,
        selections,
        notes: notes.trim() || undefined,
      });
      setSelections({});
      setNotes('');
    } catch (err) {
      console.error('submitPollVote failed', err);
    } finally {
      setSubmitting(false);
    }
  }

  const totalSelected = Object.keys(selections).length;
  const hasVoted = !!myVote;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-subtle w-full max-w-[85%] space-y-3 p-4"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-400">
            Menu Poll
          </p>
          <h3 className="truncate text-sm font-semibold text-slate-100">{payload.title}</h3>
          <p className="text-[10px] text-slate-500">
            {formatChatDate(payload.createdAt)} • {payload.items.length} items
          </p>
        </div>
        <div className="flex items-center gap-1">
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setBreakdownOpen(true)}
              className="btn-ghost h-7 px-2 text-xs"
              title={`${votes.length} order${votes.length === 1 ? '' : 's'}`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              {votes.length}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onReply}
            className="btn-ghost h-7 px-2 text-xs"
            aria-label="Reply"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <ul className="space-y-1.5">
        {payload.items.map((item) => {
          const active = (selections[item.menuItemId] ?? 0) > 0;
          const previouslyOrdered = !!myVote?.selections[item.menuItemId];
          return (
            <li key={item.menuItemId}>
              <button
                type="button"
                className={clsx(
                  'flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition',
                  active && 'border-brand-400/50 bg-brand-500/10'
                )}
                onClick={() => toggleItem(item.menuItemId)}
              >
                <span
                  className={clsx(
                    'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition',
                    active
                      ? 'border-brand-400 bg-brand-500 text-white'
                      : 'border-slate-500 text-transparent'
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">{item.name}</p>
                  {item.category ? (
                    <p className="truncate text-[10px] text-slate-500">{item.category}</p>
                  ) : null}
                </div>
                {previouslyOrdered && !active ? (
                  <span className="chip chip-active flex-shrink-0">ordered</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <textarea
        className="input min-h-[36px] resize-none text-xs"
        placeholder="Optional note…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500">
          {hasVoted ? 'Updating your previous order' : 'Tap items to include in your order'}
        </span>
        <button
          type="button"
          className="btn-primary h-8 px-3 text-xs"
          onClick={handleSubmit}
          disabled={totalSelected === 0 || submitting}
        >
          {submitting
            ? '…'
            : hasVoted
              ? 'Update Order'
              : `Order (${totalSelected})`}
        </button>
      </div>

      {message.comments && message.comments.length > 0 ? (
        <CommentsList comments={message.comments} />
      ) : null}

      {breakdownOpen ? (
        <PollVoteBreakdownSheet
          moduleId={moduleId}
          payload={payload}
          votes={votes}
          onClose={() => setBreakdownOpen(false)}
        />
      ) : null}
    </motion.div>
  );
}
