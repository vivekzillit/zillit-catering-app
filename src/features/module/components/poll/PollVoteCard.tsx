// PollVoteCard — summary bubble of a single user's vote. Only visible to the
// voter themselves and to admins (enforced by moduleStore.shouldShowPollVote).

import { motion } from 'framer-motion';
import { Lock, MessageCircle } from 'lucide-react';
import type { ChatMessage, ModuleId, PollVotePayload } from '@/shared/types';
import { formatChatDate } from '@/shared/utils/date';
import { useModuleStore } from '../../stores/moduleStore';
import { CommentsList } from '../chat/CommentsList';

interface PollVoteCardProps {
  moduleId: ModuleId;
  message: ChatMessage;
  payload: PollVotePayload;
  onReply: () => void;
}

export function PollVoteCard({ moduleId, message, payload, onReply }: PollVoteCardProps) {
  const findMenuItem = useModuleStore((s) => s.findMenuItem);
  const getMenuPollPayload = useModuleStore((s) => s.getMenuPollPayload);

  const itemIds = Object.keys(payload.selections);
  const totalItems = itemIds.length;

  function resolveName(id: string): string {
    const menuItem = findMenuItem(moduleId, id);
    if (menuItem) return menuItem.name;
    const search = getMenuPollPayload(moduleId, message._id);
    const match = search?.items.find((i) => i.menuItemId === id);
    return match?.name ?? 'Item';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-subtle w-full max-w-[80%] space-y-2 border border-brand-400/20 bg-brand-500/5 p-3"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lock className="h-3 w-3 text-brand-400" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-400">
            {payload.voterName} ordered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">
            {formatChatDate(payload.votedAt)}
          </span>
          <button
            type="button"
            onClick={onReply}
            className="text-slate-400 hover:text-slate-200"
            aria-label="Reply"
          >
            <MessageCircle className="h-3 w-3" />
          </button>
        </div>
      </header>
      <ul className="space-y-1">
        {itemIds.map((id) => (
          <li key={id} className="flex items-center gap-2 text-xs">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
            <span className="truncate text-slate-200">{resolveName(id)}</span>
          </li>
        ))}
      </ul>
      {payload.notes ? (
        <p className="rounded-lg bg-white/5 px-2 py-1 text-[11px] italic text-slate-300">
          “{payload.notes}”
        </p>
      ) : null}
      <p className="text-[10px] text-slate-500">
        {totalItems} item{totalItems === 1 ? '' : 's'} ordered
      </p>
      {message.comments && message.comments.length > 0 ? (
        <CommentsList comments={message.comments} />
      ) : null}
    </motion.div>
  );
}
