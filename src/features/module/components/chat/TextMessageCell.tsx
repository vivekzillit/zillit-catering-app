// TextMessageCell — text + optional attachment chat bubble with inline
// actions (reply / edit / delete) and an inline edit mode.
//
// Caterers see a "To: <name>" label on outbound DMs and a "from <name>"
// label on inbound DMs so threads are intelligible.

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check, MessageCircle, Pencil, Trash2, X } from 'lucide-react';
import type { ChatMessage, ModuleId } from '@/shared/types';
import { formatShortTime } from '@/shared/utils/date';
import { useModuleStore } from '../../stores/moduleStore';
import { useAuthStore, selectIsAdmin } from '@/shared/stores/authStore';
import { CommentsList } from './CommentsList';
import { AttachmentView } from './AttachmentView';

interface TextMessageCellProps {
  moduleId: ModuleId;
  message: ChatMessage;
  text: string;
  isSelf: boolean;
  onReply: () => void;
}

export function TextMessageCell({
  moduleId,
  message,
  text,
  isSelf,
  onReply,
}: TextMessageCellProps) {
  const isAdmin = useAuthStore(selectIsAdmin);
  const lookupUserName = useModuleStore((s) => s.lookupUserName);
  const editChatMessage = useModuleStore((s) => s.editChatMessage);
  const deleteChatMessage = useModuleStore((s) => s.deleteChatMessage);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep the draft in sync if the underlying message text changes while
  // we're NOT editing (e.g. a socket update landed).
  useEffect(() => {
    if (!editing) setDraft(text);
  }, [text, editing]);

  // Focus + select the textarea when entering edit mode.
  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [editing]);

  // Who was this directed to? (caterer-only metadata)
  const receiverLabel =
    isAdmin && message.receiver
      ? lookupUserName(moduleId, message.unitId, message.receiver)
      : null;

  // The *other* party — caterers reading a member's message.
  const senderLabel =
    isAdmin && !isSelf && message.sender
      ? lookupUserName(moduleId, message.unitId, message.sender)
      : null;

  const attachment = message.attachment ?? null;
  const showAttachment = !!attachment && !!(attachment.url || attachment.media);
  const canEdit = isSelf && !showAttachment; // attachments can't be edited
  const canDelete = isSelf || isAdmin;
  const wasEdited = (message.updated ?? 0) > (message.created ?? 0);

  async function handleSaveEdit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === text || busy) {
      setEditing(false);
      setDraft(text);
      return;
    }
    setBusy(true);
    try {
      await editChatMessage(moduleId, message._id, trimmed);
      setEditing(false);
    } catch (err) {
      console.error('editMessage failed', err);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (busy) return;
    if (!confirm('Delete this message?')) return;
    setBusy(true);
    try {
      await deleteChatMessage(moduleId, message._id);
    } catch (err) {
      console.error('deleteMessage failed', err);
    } finally {
      setBusy(false);
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(false);
      setDraft(text);
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
  }

  return (
    <div
      className={clsx(
        'group flex flex-col gap-1',
        isSelf ? 'items-end' : 'items-start'
      )}
    >
      <div
        className={clsx(
          'relative max-w-[80%] rounded-2xl px-4 py-2 text-sm backdrop-blur-lg',
          isSelf
            ? 'bg-brand-500/20 text-slate-100 border border-brand-400/30'
            : 'glass-subtle text-slate-200'
        )}
      >
        {senderLabel && !isSelf ? (
          <p className="mb-1 text-[10px] font-semibold text-brand-300">
            {senderLabel}
          </p>
        ) : null}

        {receiverLabel && isSelf ? (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-300">
            To: {receiverLabel}
          </p>
        ) : null}

        {showAttachment ? (
          <div className="mb-2">
            <AttachmentView attachment={attachment!} />
          </div>
        ) : null}

        {editing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              className="w-full resize-none rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-sm text-slate-100 focus:border-brand-400/60 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
              rows={Math.min(6, Math.max(1, draft.split('\n').length))}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleEditKeyDown}
              disabled={busy}
            />
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200 disabled:opacity-50"
                onClick={() => {
                  setEditing(false);
                  setDraft(text);
                }}
                disabled={busy}
                aria-label="Cancel edit"
                title="Cancel (Esc)"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded-md p-1 text-brand-300 hover:bg-brand-500/20 hover:text-brand-200 disabled:opacity-50"
                onClick={handleSaveEdit}
                disabled={busy || draft.trim() === ''}
                aria-label="Save edit"
                title="Save (Enter)"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : text ? (
          <p className="whitespace-pre-line break-words">{text}</p>
        ) : null}

        <div className="mt-1 flex items-center justify-end gap-2">
          {message.receiver && !isAdmin ? (
            <span className="text-[10px] text-brand-300">private</span>
          ) : null}
          {wasEdited && !editing ? (
            <span className="text-[10px] italic text-slate-500">edited</span>
          ) : null}
          <span className="text-[10px] text-slate-400">
            {message.created ? formatShortTime(message.created) : ''}
          </span>
        </div>
      </div>

      {/* Action row — reveal on hover/focus. */}
      {!editing ? (
        <div
          className={clsx(
            'flex items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100',
            isSelf ? 'pr-1' : 'pl-1'
          )}
        >
          <ActionButton
            label="Reply"
            onClick={onReply}
            icon={<MessageCircle className="h-3 w-3" />}
          />
          {canEdit ? (
            <ActionButton
              label="Edit"
              onClick={() => setEditing(true)}
              icon={<Pencil className="h-3 w-3" />}
            />
          ) : null}
          {canDelete ? (
            <ActionButton
              label="Delete"
              onClick={handleDelete}
              icon={<Trash2 className="h-3 w-3" />}
              danger
              disabled={busy}
            />
          ) : null}
        </div>
      ) : null}

      {message.comments && message.comments.length > 0 ? (
        <CommentsList comments={message.comments} align={isSelf ? 'right' : 'left'} />
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  danger,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={clsx(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition disabled:opacity-50',
        danger
          ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
          : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
