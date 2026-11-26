import React from 'react';
import { Store, MessageSquarePlus, Building2, HelpCircle } from 'lucide-react';

export type NavTab = 'directory' | 'report' | 'manager' | 'help';

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
  phaseBadge?: string;
}

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs: NavItem[] = [
    {
      id: 'help',
      label: 'How It Works',
      icon: HelpCircle,
      available: true,
    },
    {
      id: 'directory',
      label: 'Shop Directory',
      icon: Store,
      available: true,
    },
    {
      id: 'report',
      label: 'Submit Update',
      icon: MessageSquarePlus,
      available: false,
      phaseBadge: 'Phase 4',
    },
    {
      id: 'manager',
      label: 'Shop Manager',
      icon: Building2,
      available: false,
      phaseBadge: 'Phase 5',
    },
  ];

  return (
    <nav
      className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm"
      aria-label="Main Navigation"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = !tab.available;

            return (
              <button
                key={tab.id}
                disabled={isDisabled}
                aria-disabled={isDisabled}
                onClick={() => !isDisabled && onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-2 min-h-11 rounded-md text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1 ${
                  isDisabled
                    ? 'opacity-60 cursor-not-allowed text-slate-400 bg-slate-50 border border-transparent'
                    : isActive
                      ? 'bg-brand-50 text-brand-800 border-b-2 border-brand-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                aria-current={isActive ? 'page' : undefined}
                title={isDisabled ? `${tab.label} (Scheduled for ${tab.phaseBadge})` : tab.label}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isDisabled ? 'text-slate-300' : isActive ? 'text-brand-700' : 'text-slate-400'
                  }`}
                />
                <span>{tab.label}</span>
                {tab.phaseBadge && (
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium">
                    {tab.phaseBadge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
