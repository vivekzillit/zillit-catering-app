// Contacts + DM API helpers.

import { api } from '@/shared/api/client';
import { toCamelCase } from '@/shared/wire';
import type { User } from '@/shared/types';

interface Envelope<T> { status: number; message: string; data: T; }
function cc<T>(raw: unknown): T { return toCamelCase(raw as never) as unknown as T; }

// ────────── Types ──────────

export interface ConversationParticipant {
  _id: string;
  name: string;
  avatar?: string;
  role?: string;
  department?: string;
  phone?: string;
  gsmPhone?: string;
}

export interface Conversation {
  _id: string;
  participants: string[];
  participantDetails: ConversationParticipant[];
  type: 'direct' | 'group';
  name?: string;
  lastMessageAt?: number;
  created?: number;
}

export interface DirectMessage {
  _id: string;
  conversationId: string;
  sender: string;
  message: string;      // AES-encrypted on wire, decrypted client-side
  messageType?: string;
  attachment?: { key?: string; url?: string; thumbnail?: string; name?: string; contentType?: string; fileSize?: string } | null;
  created?: number;
  updated?: number;
  deleted?: number;
}

// ────────── API ──────────

export async function fetchContacts(): Promise<User[]> {
  const { data } = await api.get<Envelope<unknown>>('/contacts');
  return cc<User[]>(data.data) ?? [];
}

export async function fetchConversations(): Promise<Conversation[]> {
  const { data } = await api.get<Envelope<unknown>>('/conversations');
  return cc<Conversation[]>(data.data) ?? [];
}

export async function createConversation(
  participantIds: string[],
  type: 'direct' | 'group' = 'direct',
  name?: string
): Promise<Conversation> {
  const { data } = await api.post<Envelope<unknown>>('/conversations', {
    participant_ids: participantIds,
    type,
    name: name ?? '',
  });
  return cc<Conversation>(data.data);
}

export async function fetchMessages(
  conversationId: string,
  lastUpdated?: number
): Promise<DirectMessage[]> {
  const params = lastUpdated ? `?lastUpdated=${lastUpdated}` : '';
  const { data } = await api.get<Envelope<unknown>>(
    `/conversations/${conversationId}/messages${params}`
  );
  return cc<DirectMessage[]>(data.data) ?? [];
}

export async function sendMessage(
  conversationId: string,
  message: string,
  messageType = 'text'
): Promise<DirectMessage> {
  const { data } = await api.post<Envelope<unknown>>(
    `/conversations/${conversationId}/messages`,
    { message, message_type: messageType }
  );
  return cc<DirectMessage>(data.data);
}
