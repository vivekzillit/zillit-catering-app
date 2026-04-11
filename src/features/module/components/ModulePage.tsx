// ModulePage — the shared shell rendered by both CateringPage and
// CraftServicePage. Holds the unit tab bar, the menu list on the left,
// and the chat stream on the right.

import { useEffect } from 'react';
import type { ModuleId } from '@/shared/types';
import { useModuleStore, useModuleState } from '../stores/moduleStore';
import { UnitTabs } from './UnitTabs';
import { MenuListView } from './MenuListView';
import { ChatWindow } from './chat/ChatWindow';

interface ModulePageProps {
  moduleId: ModuleId;
}

export function ModulePage({ moduleId }: ModulePageProps) {
  const state = useModuleState(moduleId);
  const loadUnits = useModuleStore((s) => s.loadUnits);
  const loadMenu = useModuleStore((s) => s.loadMenu);
  const loadMessages = useModuleStore((s) => s.loadMessages);
  const loadUnitMembers = useModuleStore((s) => s.loadUnitMembers);
  const connectRealtime = useModuleStore((s) => s.connectRealtime);
  const setActiveUnitRoom = useModuleStore((s) => s.setActiveUnitRoom);

  // Fetch units once per module mount
  useEffect(() => {
    loadUnits(moduleId);
  }, [moduleId, loadUnits]);

  // Open a persistent socket subscription for this module. The store
  // upserts incoming messages so the ChatWindow re-renders live.
  useEffect(() => {
    const unsubscribe = connectRealtime(moduleId);
    return () => unsubscribe();
  }, [moduleId, connectRealtime]);

  // Fetch menu + chat + members whenever the active unit changes, and
  // re-join the socket room so we only receive events for the visible
  // unit.
  useEffect(() => {
    if (!state.activeUnitId) return;
    loadMenu(moduleId, state.activeUnitId);
    loadMessages(moduleId, state.activeUnitId);
    loadUnitMembers(moduleId, state.activeUnitId);
    setActiveUnitRoom(moduleId, state.activeUnitId);
  }, [
    moduleId,
    state.activeUnitId,
    loadMenu,
    loadMessages,
    loadUnitMembers,
    setActiveUnitRoom,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <UnitTabs moduleId={moduleId} />

      {state.error ? (
        <div className="glass border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="min-h-0 overflow-hidden">
          <MenuListView moduleId={moduleId} />
        </section>
        <section className="min-h-0 overflow-hidden">
          <ChatWindow moduleId={moduleId} />
        </section>
      </div>
    </div>
  );
}
