import React from 'react';
import { Store, MessageSquarePlus, Building2, HelpCircle } from 'lucide-react';

export type NavTab = 'directory' | 'report' | 'manager' | 'help';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'directory' as NavTab, label: 'Shop Directory', icon: Store },
    { id: 'report' as NavTab, label: 'Submit Update', icon: MessageSquarePlus },
    { id: 'manager' as NavTab, label: 'Shop Manager', icon: Building2 },
    { id: 'help' as NavTab, label: 'How It Works', icon: HelpCircle },
  ];

  return (
    <nav
      className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm"
      aria-label="Main Navigation"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1 ${
                  isActive
                    ? 'bg-brand-50 text-brand-800 border-b-2 border-brand-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-700' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
