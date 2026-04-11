// MessageComposer — compose bar for new messages and replies.
//
// Behaviour matches the iOS catering/craft-service app:
//   - Caterers / admins see a "Select User" dropdown. Picking a user
//     direct-messages them (message.receiver = userId). Default is
//     "All Users" (broadcast, receiver = null).
//   - Regular members don't see the dropdown at all. Their messages are
//     always broadcast to the unit (receiver = null).
//   - Paperclip button opens a file picker supporting image / video /
//     audio / document. The file is uploaded first, then a message is sent
//     with the resulting attachment metadata.
//   - Replying posts a comment on the parent message instead of a new
//     top-level message.

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Send,
  Users,
  X,
} from 'lucide-react';
import type {
  Attachment,
  ChatMessage,
  MessageType,
  ModuleId,
  User,
} from '@/shared/types';
import { useModuleStore, useModuleState } from '../../stores/moduleStore';
import { useAuthStore, selectIsAdmin } from '@/shared/stores/authStore';
import { parseStructured, displayText } from '../../utils/structuredMessageParser';
import { uploadFile } from '@/shared/api/upload';
import { resolveAssetUrl } from '@/shared/utils/assetUrl';

interface MessageComposerProps {
  moduleId: ModuleId;
  replyTarget: ChatMessage | null;
  onClearReply: () => void;
}

const ACCEPT_ATTR =
  'image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

function guessMessageType(file: File): MessageType {
  const mime = file.type || '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
}

export function MessageComposer({
  moduleId,
  replyTarget,
  onClearReply,
}: MessageComposerProps) {
  const { activeUnitId, membersByUnitId } = useModuleState(moduleId);
  const sendTextMessage = useModuleStore((s) => s.sendTextMessage);
  const replyToMessage = useModuleStore((s) => s.replyToMessage);
  const isAdmin = useAuthStore(selectIsAdmin);
  const self = useAuthStore((s) => s.user);

  const members: User[] = useMemo(
    () => (activeUnitId ? membersByUnitId[activeUnitId] ?? [] : []),
    [activeUnitId, membersByUnitId]
  );

  // Receiver tri-state:
  //   undefined → caterer hasn't picked yet (compose fields hidden)
  //   null      → broadcast to "All Users"
  //   string    → direct-message the chosen user
  // Members never see the picker, so we default them to `null` (broadcast).
  const [receiverId, setReceiverId] = useState<string | null | undefined>(
    isAdmin ? undefined : null
  );
  const [text, setText] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{
    attachment: Attachment;
    messageType: MessageType;
    file: File;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Reset receiver when unit changes so a caterer's selection doesn't leak
  // from one unit's chat into another. Members always stay broadcast.
  useEffect(() => {
    setReceiverId(isAdmin ? undefined : null);
    setPendingAttachment(null);
    setUploadError(null);
  }, [activeUnitId, isAdmin]);

  // Caterer hasn't explicitly chosen a recipient yet → lock the compose row.
  const recipientChosen = !isAdmin || receiverId !== undefined;

  // Close user picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [pickerOpen]);

  const selectableMembers = useMemo(
    () => members.filter((m) => m._id !== self?._id),
    [members, self?._id]
  );

  const receiverName =
    receiverId === undefined
      ? 'Select Recipient'
      : receiverId == null
        ? 'All Users'
        : members.find((m) => m._id === receiverId)?.name ?? 'Unknown';

  const disabled =
    !activeUnitId ||
    !recipientChosen ||
    (text.trim() === '' && !pendingAttachment) ||
    sending ||
    uploading;

  async function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so picking the same file again re-triggers
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await uploadFile(file);
      const messageType = guessMessageType(file);
      const attachment: Attachment = {
        key: uploaded.key,
        url: uploaded.url,
        media: uploaded.url,
        thumbnail: uploaded.thumbnail ?? uploaded.url,
        name: file.name,
        contentType: uploaded.contentType ?? file.type ?? '',
        fileSize: uploaded.fileSize ?? String(file.size),
        assetType:
          messageType === 'document'
            ? 'document'
            : (messageType as 'image' | 'video' | 'audio'),
      };
      setPendingAttachment({ attachment, messageType, file });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function clearPendingAttachment() {
    setPendingAttachment(null);
    setUploadError(null);
  }

  async function handleSend() {
    if (disabled || !activeUnitId) return;
    const body = text.trim() || pendingAttachment?.file.name || '';
    setSending(true);
    try {
      if (replyTarget) {
        await replyToMessage(moduleId, {
          parentMessageId: replyTarget._id,
          unitId: activeUnitId,
          replyText: body,
        });
        onClearReply();
      } else {
        await sendTextMessage(moduleId, {
          unitId: activeUnitId,
          text: body,
          // Coerce undefined → null so an unchosen state is never sent as
          // a DM. `recipientChosen` already blocks the UI in that case.
          receiver: isAdmin ? (receiverId ?? null) : null,
          attachment: pendingAttachment?.attachment,
          messageType: pendingAttachment?.messageType ?? 'text',
        });
      }
      setText('');
      setPendingAttachment(null);
    } catch (err) {
      console.error('send failed', err);
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

  return (
    <div className="border-t hr-soft px-5 py-3">
      {/* Reply banner */}
      {replyTarget ? (
        <div className="glass-subtle mb-2 flex items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-brand-400">
              Replying to
            </p>
            <p className="truncate text-xs text-slate-300">
              {displayText(parseStructured(replyTarget.message))}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
            aria-label="Cancel reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Caterer-only user picker */}
      {isAdmin && !replyTarget ? (
        <div ref={pickerRef} className="relative mb-2">
          <button
            type="button"
            className={clsx(
              'flex w-full items-center justify-between gap-2 rounded-xl border px-3 text-xs font-semibold transition',
              !recipientChosen
                ? 'animate-pulse border-brand-400/60 bg-brand-500/15 py-2.5 text-brand-200 hover:bg-brand-500/25'
                : 'border-brand-400/30 bg-brand-500/10 py-1.5 text-brand-300 hover:bg-brand-500/20',
              receiverId != null && 'border-brand-400/60 bg-brand-500/20'
            )}
            onClick={() => setPickerOpen((v) => !v)}
          >
            <span className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              {recipientChosen ? `To: ${receiverName}` : 'Choose a recipient to start messaging'}
            </span>
            <ChevronDown className={clsx('h-3.5 w-3.5 transition', pickerOpen && 'rotate-180')} />
          </button>
          {pickerOpen ? (
            <div className="glass absolute bottom-full left-0 right-0 z-30 mb-1 max-h-64 overflow-y-auto p-1 text-sm">
              <button
                type="button"
                className={clsx(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-white/10',
                  receiverId == null && 'bg-brand-500/20 text-brand-300'
                )}
                onClick={() => {
                  setReceiverId(null);
                  setPickerOpen(false);
                }}
              >
                <Users className="h-4 w-4" />
                <span className="font-semibold">All Users</span>
                <span className="ml-auto text-[10px] text-slate-500">broadcast</span>
              </button>
              {selectableMembers.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-500">No other members yet.</p>
              ) : (
                selectableMembers.map((m) => (
                  <button
                    key={m._id}
                    type="button"
                    className={clsx(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-white/10',
                      receiverId === m._id && 'bg-brand-500/20 text-brand-300'
                    )}
                    onClick={() => {
                      setReceiverId(m._id);
                      setPickerOpen(false);
                    }}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[10px] font-bold text-white">
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">{m.name}</span>
                      {m.role ? (
                        <span className="block truncate text-[10px] text-slate-500">{m.role}</span>
                      ) : null}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Compose row, attachment preview, and errors are gated on having
          either an explicit recipient choice (caterer) or a reply target. */}
      {!recipientChosen ? null : (
      <>
      {/* Attachment preview */}
      {pendingAttachment ? (
        <div className="glass-subtle mb-2 flex items-center gap-2 px-3 py-2">
          {pendingAttachment.messageType === 'image' && pendingAttachment.attachment.url ? (
            <img
              src={resolveAssetUrl(pendingAttachment.attachment.url)}
              alt="preview"
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-brand-300" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-200">
              {pendingAttachment.file.name}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {pendingAttachment.messageType}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
            onClick={clearPendingAttachment}
            aria-label="Remove attachment"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {uploadError ? (
        <p className="mb-2 text-xs text-red-300">{uploadError}</p>
      ) : null}

      {/* Compose row */}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={handleFilePicked}
        />
        <button
          type="button"
          className="btn-ghost h-[42px]"
          onClick={() => fileInputRef.current?.click()}
          disabled={!activeUnitId || uploading}
          aria-label="Attach file"
          title="Attach image, video, audio or document"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </button>
        <textarea
          className="input min-h-[42px] max-h-32 resize-none"
          placeholder={
            replyTarget
              ? 'Write a reply…'
              : isAdmin && receiverId
                ? `Message ${receiverName}…`
                : 'Write a message…'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!activeUnitId}
        />
        <button
          type="button"
          className="btn-primary h-[42px]"
          onClick={handleSend}
          disabled={disabled}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
      </>
      )}
    </div>
  );
}
