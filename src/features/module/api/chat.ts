// Chat API — matches the iOS catering/chat endpoint surface.
// Messages and inline comments are AES-encrypted on the wire; this layer
// encrypts on send and decrypts on receive so the rest of the app only
// deals with plaintext.

import { api } from '@/shared/api/client';
import { toCamelCase, stringifyForWire } from '@/shared/wire';
import { encryptAES256CBC, decryptAES256CBC } from '@/shared/crypto';
import type {
  ModuleId,
  ChatMessage,
  SendMessageRequest,
  PostCommentRequest,
  MessageComment,
} from '@/shared/types';

interface Envelope<T> {
  status: number;
  message: string;
  data: T;
}

function cc<T>(raw: unknown): T {
  return toCamelCase(raw as never) as unknown as T;
}

const WIRE_OPTS = {
  headers: { 'Content-Type': 'application/json' },
  transformRequest: [(d: unknown) => d],
};

export async function hydrateMessage(m: ChatMessage): Promise<ChatMessage> {
  const plaintext = m.message ? await decryptAES256CBC(m.message) : '';
  const rawComments = (m.comments ?? []) as unknown as Array<
    Partial<MessageComment> & { _id?: string; sender?: string; comment?: string; message?: string }
  >;
  const comments: MessageComment[] = await Promise.all(
    rawComments.map(async (c) => {
      const encrypted = (c.message ?? c.comment ?? '') as string;
      const plainComment = encrypted ? await decryptAES256CBC(encrypted) : '';
      return {
        ...c,
        _id: c._id,
        id: c._id ?? c.id ?? '',
        userId: c.sender ?? '',
        userName: c.userName ?? c.sender ?? 'Someone',
        comment: plainComment,
      } as MessageComment;
    })
  );
  return {
    ...m,
    message: plaintext,
    comments,
    isDeleted: (m.deleted ?? 0) > 0,
  };
}

export async function fetchMessages(
  moduleId: ModuleId,
  unitId: string
): Promise<ChatMessage[]> {
  if (!unitId) return [];
  const lastUpdated = Date.now();
  const orderType = 'previous';
  try {
    const { data } = await api.get<Envelope<unknown>>(
      `/${moduleId}/chat/${unitId}/${lastUpdated}/${orderType}`
    );
    const raw = cc<ChatMessage[]>(data.data) ?? [];
    return Promise.all(raw.map(hydrateMessage));
  } catch (err) {
    console.error('fetchMessages failed', err);
    return [];
  }
}

export async function sendMessage(
  moduleId: ModuleId,
  req: SendMessageRequest
): Promise<ChatMessage> {
  // Message text is always encrypted at rest. For media messages we still
  // encrypt the caption / placeholder body so the backend never sees
  // plaintext in the `message` column.
  const encryptedMessage = await encryptAES256CBC(req.message);

  // Strip `undefined` before wire-hashing so the body is byte-stable.
  const wirePayload: Record<string, unknown> = {
    ...req,
    message: encryptedMessage,
  };
  if (wirePayload.receiver == null) delete wirePayload.receiver;
  if (wirePayload.attachment == null) delete wirePayload.attachment;

  const wireBody = stringifyForWire(wirePayload);
  const { data } = await api.post<Envelope<unknown>>(`/${moduleId}/chat`, wireBody, WIRE_OPTS);
  const raw = cc<ChatMessage>(data.data);
  // We just sent `req.message` as plaintext, so skip re-decrypt.
  return {
    ...raw,
    message: req.message,
    unitId: raw.unitId ?? req.unitId,
    receiver: raw.receiver ?? req.receiver ?? null,
    attachment: raw.attachment ?? req.attachment ?? null,
    comments: raw.comments ?? [],
    isDeleted: (raw.deleted ?? 0) > 0,
  };
}

export async function postComment(
  moduleId: ModuleId,
  messageId: string,
  req: PostCommentRequest
): Promise<ChatMessage> {
  const encryptedMessage = await encryptAES256CBC(req.message);
  const wireBody = stringifyForWire({ ...req, message: encryptedMessage });
  const { data } = await api.post<Envelope<unknown>>(
    `/${moduleId}/chat/comments/${messageId}`,
    wireBody,
    WIRE_OPTS
  );
  const raw = cc<ChatMessage>(data.data);
  return hydrateMessage(raw);
}

/**
 * Edit a message the current user previously sent. Body is re-encrypted
 * before going on the wire, matching how `sendMessage` stores plaintext.
 */
export async function editMessage(
  moduleId: ModuleId,
  messageId: string,
  plaintext: string
): Promise<ChatMessage> {
  const encryptedMessage = await encryptAES256CBC(plaintext);
  const wireBody = stringifyForWire({ message: encryptedMessage });
  const { data } = await api.put<Envelope<unknown>>(
    `/${moduleId}/chat/${messageId}`,
    wireBody,
    WIRE_OPTS
  );
  const raw = cc<ChatMessage>(data.data);
  return {
    ...raw,
    message: plaintext, // skip re-decrypt — we already know the plaintext
    comments: raw.comments ?? [],
    isDeleted: (raw.deleted ?? 0) > 0,
  };
}

/**
 * Soft-delete a message (the backend sets `deleted: 1`).
 */
export async function deleteMessage(
  moduleId: ModuleId,
  messageId: string
): Promise<void> {
  await api.delete<Envelope<unknown>>(`/${moduleId}/chat/${messageId}`);
}
