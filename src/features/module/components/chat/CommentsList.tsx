// CommentsList — renders inline comment threads attached to a parent message.

import clsx from 'clsx';
import type { MessageComment } from '@/shared/types';
import { formatShortTime } from '@/shared/utils/date';

interface CommentsListProps {
  comments: MessageComment[];
  align?: 'left' | 'right';
}

export function CommentsList({ comments, align = 'left' }: CommentsListProps) {
  const visible = comments.filter((c) => c.deleted !== 1);
  if (visible.length === 0) return null;

  return (
    <div
      className={clsx(
        'mt-1 max-w-[80%] space-y-1',
        align === 'right' ? 'ml-auto' : 'mr-auto'
      )}
    >
      {visible.map((c) => (
        <div key={c.id || c._id} className="glass-subtle flex flex-col gap-0.5 px-3 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-brand-300">
              {c.userName || 'User'}
            </span>
            {c.created ? (
              <span className="text-[10px] text-slate-500">{formatShortTime(c.created)}</span>
            ) : null}
          </div>
          <p className="break-words text-xs text-slate-200">{c.comment}</p>
        </div>
      ))}
    </div>
  );
}
