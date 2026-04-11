// Module store — holds catering and craft-service state side-by-side
// keyed by moduleId, so switching between the two tabs is instant and
// each module's menu / messages / units are cached independently.
//
// Every method takes `moduleId` as the first argument. Internally it
// writes into `state.byModule[moduleId]` via an immutable update.

import { create } from 'zustand';
import type {
  ModuleId,
  Unit,
  MenuItem,
  ChatMessage,
  MenuPollItem,
  MenuPollPayload,
  PollVotePayload,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
  User,
  Attachment,
  MessageType,
} from '@/shared/types';
import { MODULE_IDS } from '@/shared/types';
import * as unitsApi from '../api/units';
import * as menuApi from '../api/menu';
import * as chatApi from '../api/chat';
import { subscribeChat, joinUnitRoom, leaveUnitRoom } from '@/shared/api/socket';
import { encodeMenuPoll, encodePollVote, parseStructured } from '../utils/structuredMessageParser';
import { epochMsNow, formatChatDate, humanizeLabel, safeUUID } from '@/shared/utils/date';
import { useAuthStore } from '@/shared/stores/authStore';

interface ModuleState {
  units: Unit[];
  menuItems: MenuItem[];
  messages: ChatMessage[];
  activeUnitId: string;
  membersByUnitId: Record<string, User[]>;
  loadingUnits: boolean;
  loadingMenu: boolean;
  loadingChat: boolean;
  loadingMembers: boolean;
  error: string | null;
}

function emptyState(): ModuleState {
  return {
    units: [],
    menuItems: [],
    messages: [],
    activeUnitId: '',
    membersByUnitId: {},
    loadingUnits: false,
    loadingMenu: false,
    loadingChat: false,
    loadingMembers: false,
    error: null,
  };
}

interface RootState {
  byModule: Record<ModuleId, ModuleState>;

  // fetchers
  loadUnits: (moduleId: ModuleId) => Promise<void>;
  loadMenu: (moduleId: ModuleId, unitId: string) => Promise<void>;
  loadMessages: (moduleId: ModuleId, unitId: string) => Promise<void>;
  loadUnitMembers: (moduleId: ModuleId, unitId: string) => Promise<User[]>;

  // mutations
  setActiveUnit: (moduleId: ModuleId, unitId: string) => void;
  createMenuItem: (moduleId: ModuleId, req: CreateMenuItemRequest) => Promise<MenuItem>;
  updateMenuItem: (moduleId: ModuleId, id: string, req: UpdateMenuItemRequest) => Promise<MenuItem>;
  deleteMenuItem: (moduleId: ModuleId, id: string) => Promise<void>;

  postMenuPoll: (
    moduleId: ModuleId,
    items: MenuItem[],
    unitId: string,
    mealType: string
  ) => Promise<ChatMessage>;

  submitPollVote: (
    moduleId: ModuleId,
    args: {
      pollMessageUniqueId: string;
      pollId: string;
      unitId: string;
      selections: Record<string, number>;
      notes?: string;
    }
  ) => Promise<void>;

  sendTextMessage: (
    moduleId: ModuleId,
    args: {
      unitId: string;
      text: string;
      receiver?: string | null;
      attachment?: Attachment;
      messageType?: MessageType;
    }
  ) => Promise<ChatMessage>;

  replyToMessage: (
    moduleId: ModuleId,
    args: { parentMessageId: string; unitId: string; replyText: string }
  ) => Promise<ChatMessage>;

  editChatMessage: (
    moduleId: ModuleId,
    messageId: string,
    text: string
  ) => Promise<ChatMessage>;

  deleteChatMessage: (moduleId: ModuleId, messageId: string) => Promise<void>;

  // realtime
  connectRealtime: (moduleId: ModuleId) => () => void;
  setActiveUnitRoom: (moduleId: ModuleId, unitId: string) => void;
  upsertIncomingMessage: (moduleId: ModuleId, msg: ChatMessage) => void;
  removeIncomingMessage: (moduleId: ModuleId, messageId: string) => void;

  // selectors
  getPollVotes: (moduleId: ModuleId, pollId: string) => PollVotePayload[];
  isLatestPollVote: (moduleId: ModuleId, vote: PollVotePayload, messageId: string) => boolean;
  shouldShowPollVote: (vote: PollVotePayload) => boolean;
  getMenuPollPayload: (moduleId: ModuleId, messageId: string) => MenuPollPayload | null;
  findMenuItem: (moduleId: ModuleId, menuItemId: string) => MenuItem | null;
  getUnitMembers: (moduleId: ModuleId, unitId: string) => User[];
  lookupUserName: (moduleId: ModuleId, unitId: string, userId: string) => string;
}

export const useModuleStore = create<RootState>((set, get) => {
  // Immutable update helper — produces a new byModule with one key patched.
  function patch(
    state: RootState,
    moduleId: ModuleId,
    updater: (current: ModuleState) => Partial<ModuleState>
  ): Pick<RootState, 'byModule'> {
    const current = state.byModule[moduleId];
    return {
      byModule: {
        ...state.byModule,
        [moduleId]: { ...current, ...updater(current) },
      },
    };
  }

  return {
    byModule: {
      catering: emptyState(),
      craftservice: emptyState(),
    },

    async loadUnits(moduleId) {
      set((s) => patch(s, moduleId, () => ({ loadingUnits: true, error: null })));
      try {
        const units = await unitsApi.fetchUnits(moduleId);
        set((s) =>
          patch(s, moduleId, (cur) => ({
            units,
            loadingUnits: false,
            activeUnitId: cur.activeUnitId || units[0]?._id || '',
          }))
        );
      } catch (err) {
        set((s) =>
          patch(s, moduleId, () => ({
            loadingUnits: false,
            error: err instanceof Error ? err.message : 'Failed to load units',
          }))
        );
      }
    },

    async loadMenu(moduleId, unitId) {
      if (!unitId) return;
      set((s) => patch(s, moduleId, () => ({ loadingMenu: true, error: null })));
      try {
        const items = await menuApi.fetchMenuList(moduleId, unitId);
        set((s) => patch(s, moduleId, () => ({ menuItems: items, loadingMenu: false })));
      } catch (err) {
        set((s) =>
          patch(s, moduleId, () => ({
            loadingMenu: false,
            error: err instanceof Error ? err.message : 'Failed to load menu',
          }))
        );
      }
    },

    async loadMessages(moduleId, unitId) {
      if (!unitId) return;
      set((s) => patch(s, moduleId, () => ({ loadingChat: true, error: null })));
      try {
        const messages = await chatApi.fetchMessages(moduleId, unitId);
        set((s) => patch(s, moduleId, () => ({ messages, loadingChat: false })));
      } catch (err) {
        set((s) =>
          patch(s, moduleId, () => ({
            loadingChat: false,
            error: err instanceof Error ? err.message : 'Failed to load chat',
          }))
        );
      }
    },

    async loadUnitMembers(moduleId, unitId) {
      if (!unitId) return [];
      const current = get().byModule[moduleId];
      if (current.membersByUnitId[unitId]) return current.membersByUnitId[unitId];
      set((s) => patch(s, moduleId, () => ({ loadingMembers: true })));
      try {
        const members = await unitsApi.fetchUnitMembers(moduleId, unitId);
        set((s) =>
          patch(s, moduleId, (cur) => ({
            loadingMembers: false,
            membersByUnitId: { ...cur.membersByUnitId, [unitId]: members },
          }))
        );
        return members;
      } catch (err) {
        set((s) => patch(s, moduleId, () => ({ loadingMembers: false })));
        console.error('loadUnitMembers failed', err);
        return [];
      }
    },

    setActiveUnit(moduleId, unitId) {
      set((s) => patch(s, moduleId, () => ({ activeUnitId: unitId })));
    },

    async createMenuItem(moduleId, req) {
      const item = await menuApi.createMenuItem(moduleId, req);
      set((s) =>
        patch(s, moduleId, (cur) => ({ menuItems: [item, ...cur.menuItems] }))
      );
      return item;
    },

    async updateMenuItem(moduleId, id, req) {
      const updated = await menuApi.updateMenuItem(moduleId, id, req);
      set((s) =>
        patch(s, moduleId, (cur) => ({
          menuItems: cur.menuItems.map((m) => (m._id === id ? updated : m)),
        }))
      );
      return updated;
    },

    async deleteMenuItem(moduleId, id) {
      await menuApi.deleteMenuItem(moduleId, id);
      set((s) =>
        patch(s, moduleId, (cur) => ({
          menuItems: cur.menuItems.filter((m) => m._id !== id),
        }))
      );
    },

    async postMenuPoll(moduleId, items, unitId, mealType) {
      const pollItems: MenuPollItem[] = items
        .filter((i) => i._id)
        .map((i) => ({
          menuItemId: i._id,
          name: i.name,
          description: i.description || undefined,
          category: i.category,
          thumbnailKey: i.images?.[0]?.thumbnail || i.images?.[0]?.url,
          unitId,
        }));

      const user = useAuthStore.getState().user;
      const titleBase = humanizeLabel(mealType) || 'Menu';
      const title = `${titleBase} — ${formatChatDate(new Date())}`;

      const payload: MenuPollPayload = {
        pollId: safeUUID(),
        unitId,
        mealType,
        title,
        items: pollItems,
        createdBy: user?._id ?? '',
        createdAt: epochMsNow(),
      };

      const msg = await chatApi.sendMessage(moduleId, {
        unitId,
        message: encodeMenuPoll(payload),
        uniqueId: safeUUID(),
        messageGroup: epochMsNow(),
        messageType: 'text',
        pinned: 0,
        dateTime: epochMsNow(),
      });

      set((s) => patch(s, moduleId, (cur) => ({ messages: [...cur.messages, msg] })));
      return msg;
    },

    async submitPollVote(moduleId, args) {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Not logged in');

      const now = epochMsNow();
      const payload: PollVotePayload = {
        pollId: args.pollId,
        pollMessageUniqueId: args.pollMessageUniqueId,
        unitId: args.unitId,
        voterUserId: user._id,
        voterName: user.name,
        selections: args.selections,
        notes: args.notes,
        votedAt: now,
      };

      const admins = resolveUnitAdmins(get().byModule[moduleId].messages, user);
      const withoutVoter = admins.filter((id) => id !== user._id);
      const recipients =
        withoutVoter.length > 0 ? withoutVoter : admins.length > 0 ? admins : [user._id];

      const encoded = encodePollVote(payload);
      for (const adminId of recipients) {
        try {
          const msg = await chatApi.sendMessage(moduleId, {
            unitId: args.unitId,
            message: encoded,
            uniqueId: safeUUID(),
            messageGroup: now,
            messageType: 'text',
            receiver: adminId,
            pinned: 0,
            dateTime: now,
          });
          set((s) => patch(s, moduleId, (cur) => ({ messages: [...cur.messages, msg] })));
        } catch (err) {
          console.error('submitPollVote to admin failed', adminId, err);
        }
      }
    },

    async sendTextMessage(moduleId, args) {
      const now = epochMsNow();
      const msg = await chatApi.sendMessage(moduleId, {
        unitId: args.unitId,
        message: args.text,
        uniqueId: safeUUID(),
        messageGroup: now,
        messageType: args.messageType ?? 'text',
        receiver: args.receiver ?? null,
        attachment: args.attachment,
        pinned: 0,
        dateTime: now,
      });
      set((s) => patch(s, moduleId, (cur) => ({ messages: [...cur.messages, msg] })));
      return msg;
    },

    async replyToMessage(moduleId, args) {
      const msg = await chatApi.postComment(moduleId, args.parentMessageId, {
        unitId: args.unitId,
        message: args.replyText,
        messageType: 'text',
      });
      // Replace the parent message in the store with the updated one
      set((s) =>
        patch(s, moduleId, (cur) => ({
          messages: cur.messages.map((m) => (m._id === args.parentMessageId ? msg : m)),
        }))
      );
      return msg;
    },

    async editChatMessage(moduleId, messageId, text) {
      const updated = await chatApi.editMessage(moduleId, messageId, text);
      set((s) =>
        patch(s, moduleId, (cur) => ({
          messages: cur.messages.map((m) =>
            m._id === messageId ? { ...m, ...updated, message: text } : m
          ),
        }))
      );
      return updated;
    },

    async deleteChatMessage(moduleId, messageId) {
      // Optimistic remove — the socket `chat:delete` event from the server
      // will fire for everyone else and confirm our local removal.
      set((s) =>
        patch(s, moduleId, (cur) => ({
          messages: cur.messages.filter((m) => m._id !== messageId),
        }))
      );
      try {
        await chatApi.deleteMessage(moduleId, messageId);
      } catch (err) {
        console.error('deleteMessage failed', err);
        // Reload on failure so the UI doesn't permanently lose a message.
        const { byModule } = get();
        const unitId = byModule[moduleId].activeUnitId;
        if (unitId) get().loadMessages(moduleId, unitId);
        throw err;
      }
    },

    getPollVotes(moduleId, pollId) {
      const latest = new Map<string, { vote: PollVotePayload; messageId: string }>();
      for (const msg of get().byModule[moduleId].messages) {
        if (msg.isDeleted) continue;
        const parsed = parseStructured(msg.message);
        if (parsed.kind !== 'pollVote') continue;
        if (parsed.payload.pollId !== pollId) continue;

        const entry = latest.get(parsed.payload.voterUserId);
        if (!entry) {
          latest.set(parsed.payload.voterUserId, { vote: parsed.payload, messageId: msg._id });
          continue;
        }
        if (parsed.payload.votedAt > entry.vote.votedAt) {
          latest.set(parsed.payload.voterUserId, { vote: parsed.payload, messageId: msg._id });
        } else if (
          parsed.payload.votedAt === entry.vote.votedAt &&
          msg._id < entry.messageId
        ) {
          latest.set(parsed.payload.voterUserId, { vote: parsed.payload, messageId: msg._id });
        }
      }
      return Array.from(latest.values())
        .map((e) => e.vote)
        .sort((a, b) => b.votedAt - a.votedAt);
    },

    isLatestPollVote(moduleId, vote, messageId) {
      let bestVotedAt = -1;
      let bestMessageId = '';
      for (const msg of get().byModule[moduleId].messages) {
        if (msg.isDeleted) continue;
        const parsed = parseStructured(msg.message);
        if (parsed.kind !== 'pollVote') continue;
        const other = parsed.payload;
        if (other.pollId !== vote.pollId) continue;
        if (other.voterUserId !== vote.voterUserId) continue;
        if (other.votedAt > bestVotedAt) {
          bestVotedAt = other.votedAt;
          bestMessageId = msg._id;
        } else if (other.votedAt === bestVotedAt && msg._id < bestMessageId) {
          bestMessageId = msg._id;
        }
      }
      return bestMessageId === messageId;
    },

    shouldShowPollVote(vote) {
      const user = useAuthStore.getState().user;
      if (!user) return false;
      if (user._id === vote.voterUserId) return true;
      const isAdmin = user.role === 'admin' || user.role === 'caterer' || user.adminAccess === true;
      return isAdmin;
    },

    getMenuPollPayload(moduleId, messageId) {
      const msg = get().byModule[moduleId].messages.find((m) => m._id === messageId);
      if (!msg) return null;
      const parsed = parseStructured(msg.message);
      return parsed.kind === 'menuPoll' ? parsed.payload : null;
    },

    findMenuItem(moduleId, menuItemId) {
      return get().byModule[moduleId].menuItems.find((m) => m._id === menuItemId) ?? null;
    },

    connectRealtime(moduleId) {
      return subscribeChat(moduleId, async (event, rawPayload) => {
        // Convert wire-format snake_case payload into camelCase domain
        // shape, then decrypt the message body before merging.
        const cc = (
          await import('@/shared/wire')
        ).toCamelCase(rawPayload as never) as unknown;

        if (event === 'chat:delete') {
          const obj = cc as { _id?: string };
          if (obj && typeof obj._id === 'string') {
            get().removeIncomingMessage(moduleId, obj._id);
          }
          return;
        }

        const { hydrateMessage } = await import('../api/chat');
        const hydrated = await hydrateMessage(cc as ChatMessage);
        get().upsertIncomingMessage(moduleId, hydrated);
      });
    },

    setActiveUnitRoom(moduleId, unitId) {
      if (unitId) joinUnitRoom(moduleId, unitId);
      else leaveUnitRoom(moduleId);
    },

    upsertIncomingMessage(moduleId, msg) {
      if (!msg || !msg._id) return;
      set((s) =>
        patch(s, moduleId, (cur) => {
          const idx = cur.messages.findIndex((m) => m._id === msg._id);
          if (idx === -1) {
            return { messages: [...cur.messages, msg] };
          }
          const next = cur.messages.slice();
          // Preserve whatever fields we already have if the server omits them
          next[idx] = { ...next[idx], ...msg };
          return { messages: next };
        })
      );
    },

    removeIncomingMessage(moduleId, messageId) {
      if (!messageId) return;
      set((s) =>
        patch(s, moduleId, (cur) => ({
          messages: cur.messages.filter((m) => m._id !== messageId),
        }))
      );
    },

    getUnitMembers(moduleId, unitId) {
      return get().byModule[moduleId].membersByUnitId[unitId] ?? [];
    },

    lookupUserName(moduleId, unitId, userId) {
      if (!userId) return '';
      const self = useAuthStore.getState().user;
      if (self?._id === userId) return 'You';
      const members = get().byModule[moduleId].membersByUnitId[unitId] ?? [];
      const match = members.find((m) => m._id === userId);
      return match?.name || 'Unknown';
    },
  };
});

/**
 * Best-effort admin resolver — since the backend returns `sender` as a bare
 * user id string we don't know roles client-side. Treat every distinct
 * sender in the chat as a potential admin, plus the current user if they
 * have admin/caterer rights. The server-side filters keep private vote
 * messages admin-only regardless.
 */
function resolveUnitAdmins(messages: ChatMessage[], self: User): string[] {
  const seen = new Set<string>();
  const admins: string[] = [];
  for (const m of messages) {
    const senderId = m.sender;
    if (!senderId || seen.has(senderId)) continue;
    seen.add(senderId);
    admins.push(senderId);
  }
  if ((self.role === 'admin' || self.role === 'caterer' || self.adminAccess) && !seen.has(self._id)) {
    admins.push(self._id);
  }
  return admins;
}

// Convenience selectors for components that only care about one module
export function useModuleState(moduleId: ModuleId): ModuleState {
  return useModuleStore((s) => s.byModule[moduleId]);
}

export { MODULE_IDS };
