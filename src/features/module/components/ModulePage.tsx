// ModulePage — the shared shell for both CateringPage and CraftServicePage.
//
// Layout:
//   Caterers:  [Menu (CRUD)]  [Orders Dashboard | Chat]
//   Members:   [Menu (order)]  [My Orders | Chat]

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ClipboardList, MessageSquare } from 'lucide-react';
import type { ModuleId } from '@/shared/types';
import { useModuleStore, useModuleState } from '../stores/moduleStore';
import { useAuthStore, selectIsAdmin } from '@/shared/stores/authStore';
import { UnitTabs } from './UnitTabs';
import { MenuListView } from './MenuListView';
import { ChatWindow } from './chat/ChatWindow';
import { OrderDashboard } from './OrderDashboard';
import { MyOrdersPanel } from './MyOrdersPanel';

type RightTab = 'orders' | 'chat';

interface ModulePageProps {
  moduleId: ModuleId;
}

export function ModulePage({ moduleId }: ModulePageProps) {
  const state = useModuleState(moduleId);
  const isAdmin = useAuthStore(selectIsAdmin);
  const loadUnits = useModuleStore((s) => s.loadUnits);
  const loadMenu = useModuleStore((s) => s.loadMenu);
  const loadMessages = useModuleStore((s) => s.loadMessages);
  const loadUnitMembers = useModuleStore((s) => s.loadUnitMembers);
  const connectRealtime = useModuleStore((s) => s.connectRealtime);
  const setActiveUnitRoom = useModuleStore((s) => s.setActiveUnitRoom);

  const [rightTab, setRightTab] = useState<RightTab>('orders');

  useEffect(() => {
    loadUnits(moduleId);
  }, [moduleId, loadUnits]);

  useEffect(() => {
    const unsubscribe = connectRealtime(moduleId);
    return () => unsubscribe();
  }, [moduleId, connectRealtime]);

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
        {/* Left column: Menu */}
        <section className="min-h-0 overflow-hidden">
          <MenuListView moduleId={moduleId} />
        </section>

        {/* Right column: tabbed Orders / Chat */}
        <section className="flex min-h-0 flex-col overflow-hidden">
          {/* Tab switcher */}
          <div className="glass mb-2 flex items-center gap-1 px-3 py-1.5">
            <TabButton
              active={rightTab === 'orders'}
              onClick={() => setRightTab('orders')}
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              label="Orders"
            />
            <TabButton
              active={rightTab === 'chat'}
              onClick={() => setRightTab('chat')}
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              label="Chat"
            />
          </div>

          {/* Tab content */}
          <div className="min-h-0 flex-1 overflow-hidden">
            {rightTab === 'orders' ? (
              isAdmin ? (
                <OrderDashboard moduleId={moduleId} />
              ) : (
                <MyOrdersPanel moduleId={moduleId} />
              )
            ) : (
              <ChatWindow moduleId={moduleId} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      className={clsx(
        'flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition',
        active
          ? 'bg-brand-500/20 text-brand-300'
          : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
