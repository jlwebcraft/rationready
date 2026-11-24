import React from 'react';
import { AlertCircle, Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto border-t border-slate-800 text-xs py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Public service disclaimer box */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-slate-300 leading-relaxed text-xs">
            <span className="font-semibold text-white block mb-1">
              Important Public Service Notice & Disclaimer:
            </span>
            RationReady is an independent community-powered visit planning assistant. It is{' '}
            <strong className="text-white">not an official government portal</strong>, does not
            issue ration or commodities, does not conduct entitlement checks, and does not replace
            official PDS or ePOS records. All reports are submitted by visiting citizens or
            authorised shop managers.
          </div>
        </div>

        {/* Bottom copyright & attribution */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800 text-slate-400">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>RationReady — Techfest 2026–27 Campus to Cloud Hackathon sponsored by AWS</span>
          </div>
          <div className="text-center sm:text-right">
            <span>Pilot Territory: Demo Locality A (Synthetic Prototype Data)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
