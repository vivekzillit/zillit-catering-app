// [MENU_POLL] and [POLL_VOTE] tag-based chat payload encoding.
// Same prefixes and JSON shapes as the iOS StructuredMessageParser.

import type { MenuPollPayload, PollVotePayload } from '@/shared/types';

export const STRUCTURED_TAG = {
  menuPoll: '[MENU_POLL]',
  pollVote: '[POLL_VOTE]',
} as const;

export type StructuredMessage =
  | { kind: 'menuPoll'; payload: MenuPollPayload }
  | { kind: 'pollVote'; payload: PollVotePayload }
  | { kind: 'text'; text: string };

export function parseStructured(body: string | undefined | null): StructuredMessage {
  if (!body) return { kind: 'text', text: '' };

  if (body.startsWith(STRUCTURED_TAG.menuPoll)) {
    try {
      const payload = JSON.parse(body.slice(STRUCTURED_TAG.menuPoll.length)) as MenuPollPayload;
      if (payload && typeof payload.pollId === 'string' && Array.isArray(payload.items)) {
        return { kind: 'menuPoll', payload };
      }
    } catch {
      /* fall through to text */
    }
  }

  if (body.startsWith(STRUCTURED_TAG.pollVote)) {
    try {
      const payload = JSON.parse(body.slice(STRUCTURED_TAG.pollVote.length)) as PollVotePayload;
      if (payload && typeof payload.pollId === 'string' && typeof payload.selections === 'object') {
        return { kind: 'pollVote', payload };
      }
    } catch {
      /* fall through to text */
    }
  }

  return { kind: 'text', text: body };
}

export function encodeMenuPoll(payload: MenuPollPayload): string {
  return STRUCTURED_TAG.menuPoll + JSON.stringify(payload);
}

export function encodePollVote(payload: PollVotePayload): string {
  return STRUCTURED_TAG.pollVote + JSON.stringify(payload);
}

export function displayText(parsed: StructuredMessage): string {
  switch (parsed.kind) {
    case 'menuPoll':
      return `📋 ${parsed.payload.title} (${parsed.payload.items.length} item${parsed.payload.items.length === 1 ? '' : 's'})`;
    case 'pollVote':
      return `🔒 ${parsed.payload.voterName} ordered`;
    case 'text':
      return parsed.text;
  }
}
