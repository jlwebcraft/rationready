import React from 'react';
import { Store, ShieldCheck, MapPin } from 'lucide-react';

interface HeaderProps {
  pilotLocality?: string;
  isDemo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  pilotLocality = 'Demo Locality A',
  isDemo = true,
}) => {
  return (
    <header className="bg-brand-800 text-white shadow-md border-b border-brand-900">
      {/* Top emergency / pilot notification strip */}
      <div className="bg-brand-950 px-4 py-1.5 text-xs font-medium text-brand-200 border-b border-brand-900 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-400 shrink-0" />
          <span>Community Public Distribution System (PDS) Visit Planning Assistant</span>
        </div>
        {isDemo && (
          <span className="bg-amber-400 text-amber-950 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
            Demo Prototype Data
          </span>
        )}
      </div>

      {/* Main header body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="bg-white/10 p-2.5 rounded-lg border border-white/10 shadow-inner flex items-center justify-center">
            <Store className="w-7 h-7 text-white" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                RationReady
              </h1>
              <span className="text-xs bg-brand-700/80 text-brand-100 px-2 py-0.5 rounded-full border border-brand-600 font-mono">
                v0.1
              </span>
            </div>
            <p className="text-sm text-brand-100 font-medium">Know before you go.</p>
          </div>
        </div>

        {/* Locality & Status Pill */}
        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <div className="bg-brand-900/80 border border-brand-700 px-3 py-1.5 rounded-md text-xs flex items-center space-x-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <div>
              <span className="text-brand-300 block text-[10px] uppercase font-semibold">
                Active Locality
              </span>
              <span className="font-semibold text-white">{pilotLocality}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
