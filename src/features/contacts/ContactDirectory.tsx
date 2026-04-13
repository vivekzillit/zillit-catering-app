// ContactDirectory — list all users in the project with phone numbers
// and quick-action buttons for calling and starting a 1:1 chat.

import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { Loader2, MessageSquare, Phone, PhoneCall, Users } from 'lucide-react';
import type { User } from '@/shared/types';
import { useAuthStore } from '@/shared/stores/authStore';
import { Glass } from '@/shared/components/Glass';
import * as convoApi from './api/conversations';
import type { Conversation } from './api/conversations';
import { DirectChatView } from './DirectChatView';

export default function ContactDirectory() {
  const self = useAuthStore((s) => s.user);
  const [contacts, setContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await convoApi.fetchContacts();
      setContacts(data);
    } catch (err) {
      console.error('fetchContacts failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  async function startChat(contact: User) {
    try {
      const convo = await convoApi.createConversation([contact._id], 'direct');
      // Enrich participantDetails if missing (happens on creation)
      if (!convo.participantDetails || convo.participantDetails.length === 0) {
        convo.participantDetails = [
          { _id: self?._id ?? '', name: self?.name ?? '' },
          { _id: contact._id, name: contact.name },
        ];
      }
      setActiveConvo(convo);
    } catch (err) {
      console.error('createConversation failed', err);
    }
  }

  async function startGroupChat() {
    try {
      const catererIds = contacts
        .filter((c) => c.role === 'caterer' || c.role === 'admin' || c.adminAccess)
        .map((c) => c._id);
      if (catererIds.length === 0) return;
      const convo = await convoApi.createConversation(catererIds, 'group', 'All Caterers');
      setActiveConvo(convo);
    } catch (err) {
      console.error('createGroupConversation failed', err);
    }
  }

  if (activeConvo) {
    return (
      <DirectChatView
        conversation={activeConvo}
        onBack={() => setActiveConvo(null)}
      />
    );
  }

  const caterers = contacts.filter(
    (c) => (c.role === 'caterer' || c.role === 'admin' || c.adminAccess) && c._id !== self?._id
  );
  const others = contacts.filter(
    (c) => !caterers.some((cat) => cat._id === c._id) && c._id !== self?._id
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-xl font-semibold">Contacts</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading contacts…
        </div>
      ) : (
        <>
          {/* Group chat CTA */}
          {caterers.length > 0 ? (
            <button
              type="button"
              className="btn-secondary w-full justify-center"
              onClick={startGroupChat}
            >
              <Users className="h-4 w-4" />
              Group Chat with All Caterers ({caterers.length})
            </button>
          ) : null}

          {/* Caterers section */}
          {caterers.length > 0 ? (
            <Section label="Caterers">
              {caterers.map((c) => (
                <ContactCard
                  key={c._id}
                  contact={c}
                  onChat={() => startChat(c)}
                />
              ))}
            </Section>
          ) : null}

          {/* Other team members */}
          {others.length > 0 ? (
            <Section label="Team">
              {others.map((c) => (
                <ContactCard
                  key={c._id}
                  contact={c}
                  onChat={() => startChat(c)}
                />
              ))}
            </Section>
          ) : null}

          {contacts.length <= 1 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              No other team members in this project yet.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ContactCard({ contact, onChat }: { contact: User; onChat: () => void }) {
  return (
    <Glass className="flex items-center gap-4 px-4 py-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">
        {contact.name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-100">{contact.name}</p>
        <p className="truncate text-[10px] text-slate-400">
          {contact.department || contact.role || ''}
          {contact.email ? ` · ${contact.email}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {contact.phone ? (
          <a
            href={`tel:${contact.phone}`}
            className={clsx('btn-ghost h-8 w-8 !p-0 text-green-400 hover:bg-green-500/10')}
            title={`Zillit: ${contact.phone}`}
            aria-label="Call Zillit number"
          >
            <Phone className="h-4 w-4" />
          </a>
        ) : null}
        {contact.gsmPhone ? (
          <a
            href={`tel:${contact.gsmPhone}`}
            className="btn-ghost h-8 w-8 !p-0 text-blue-400 hover:bg-blue-500/10"
            title={`GSM: ${contact.gsmPhone}`}
            aria-label="Call GSM number"
          >
            <PhoneCall className="h-4 w-4" />
          </a>
        ) : null}
        <button
          type="button"
          className="btn-ghost h-8 w-8 !p-0 text-brand-400 hover:bg-brand-500/10"
          onClick={onChat}
          title="Chat"
          aria-label="Chat"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>
    </Glass>
  );
}
