// AttachmentView — renders an attachment inside a chat bubble.
//
// Mirrors the iOS catering app's supported asset types:
//   - image  → inline preview (click to open full-size)
//   - video  → native <video> player
//   - audio  → native <audio> player
//   - document / file → download card

import { FileText, ExternalLink } from 'lucide-react';
import type { Attachment } from '@/shared/types';
import { resolveAssetUrl } from '@/shared/utils/assetUrl';

interface AttachmentViewProps {
  attachment: Attachment;
}

export function AttachmentView({ attachment }: AttachmentViewProps) {
  const rawUrl = attachment.url || attachment.media || '';
  if (!rawUrl) return null;

  const url = resolveAssetUrl(rawUrl);
  const thumb = resolveAssetUrl(attachment.thumbnail) || url;
  const type = (attachment.assetType ?? guessFromContentType(attachment.contentType)) || 'file';

  if (type === 'image') {
    return (
      <a href={url} target="_blank" rel="noreferrer noopener">
        <img
          src={thumb}
          alt={attachment.name ?? 'attachment'}
          className="max-h-64 max-w-full rounded-xl border border-white/10 object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (type === 'video') {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        className="max-h-64 max-w-full rounded-xl border border-white/10"
      />
    );
  }

  if (type === 'audio') {
    return <audio src={url} controls className="w-full max-w-xs" />;
  }

  // document / file fallback
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="flex max-w-xs items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10"
    >
      <FileText className="h-6 w-6 flex-shrink-0 text-brand-300" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-100">
          {attachment.name ?? 'Attachment'}
        </p>
        {attachment.fileSize ? (
          <p className="text-[10px] text-slate-500">{formatBytes(attachment.fileSize)}</p>
        ) : null}
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
    </a>
  );
}

function guessFromContentType(ct?: string): Attachment['assetType'] | null {
  if (!ct) return null;
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('video/')) return 'video';
  if (ct.startsWith('audio/')) return 'audio';
  return 'document';
}

function formatBytes(size: string | number | undefined): string {
  const n = typeof size === 'string' ? Number(size) : size;
  if (!n || !Number.isFinite(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
