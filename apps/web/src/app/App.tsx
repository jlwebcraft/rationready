import React, { useState } from 'react';
import { Header } from '../components/Header';
import { Navigation, NavTab } from '../components/Navigation';
import { Footer } from '../components/Footer';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ShopList } from '../features/shops/ShopList';
import { ShopDetail } from '../features/shops/ShopDetail';
import { Clock, Cpu, CheckCircle2, PackageCheck, Info, Layers } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('directory');
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'content' | 'loading' | 'empty' | 'error'>(
    'content'
  );

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    setSelectedShopId(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* 1. Shared Header */}
      <Header pilotLocality="Demo Locality A" isDemo={true} />

      {/* 2. Primary Navigation */}
      <Navigation activeTab={activeTab} onTabChange={handleTabChange} />

      {/* 3. Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Shell State Switcher (Rendered strictly in development/testing mode) */}
        {import.meta.env.DEV === true && (
          <section className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-700">
              <Layers className="w-4 h-4 text-brand-700 shrink-0" />
              <span className="font-semibold">Shell State Preview (Dev Only):</span>
              <span className="text-slate-500 hidden sm:inline">
                Inspect shared application states
              </span>
            </div>
            <div
              className="inline-flex rounded-md shadow-sm overflow-hidden border border-slate-200"
              role="group"
            >
              <button
                onClick={() => setActiveViewMode('content')}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  activeViewMode === 'content'
                    ? 'bg-brand-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                Default View
              </button>
              <button
                onClick={() => setActiveViewMode('loading')}
                className={`px-3 py-1.5 font-medium transition-colors border-l border-slate-200 ${
                  activeViewMode === 'loading'
                    ? 'bg-brand-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                Loading State
              </button>
              <button
                onClick={() => setActiveViewMode('empty')}
                className={`px-3 py-1.5 font-medium transition-colors border-l border-slate-200 ${
                  activeViewMode === 'empty'
                    ? 'bg-brand-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                Empty State
              </button>
              <button
                onClick={() => setActiveViewMode('error')}
                className={`px-3 py-1.5 font-medium transition-colors border-l border-slate-200 ${
                  activeViewMode === 'error'
                    ? 'bg-brand-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                Error State
              </button>
            </div>
          </section>
        )}

        {/* Dynamic Display Based on Selected State */}
        {activeViewMode === 'loading' && (
          <section className="py-8">
            <LoadingState />
          </section>
        )}

        {activeViewMode === 'empty' && (
          <section className="py-8">
            <EmptyState onAction={() => setActiveViewMode('content')} />
          </section>
        )}

        {activeViewMode === 'error' && (
          <section className="py-8">
            <ErrorState onRetry={() => setActiveViewMode('content')} />
          </section>
        )}

        {activeViewMode === 'content' && (
          <>
            {/* Active Tab: Shop Directory */}
            {activeTab === 'directory' && (
              <>
                {selectedShopId ? (
                  <ShopDetail shopId={selectedShopId} onBack={() => setSelectedShopId(null)} />
                ) : (
                  <ShopList onSelectShop={(id) => setSelectedShopId(id)} />
                )}
              </>
            )}

            {/* Active Tab: How It Works */}
            {activeTab === 'help' && (
              <div className="space-y-6">
                {/* Hero / Introduction Banner */}
                <section className="bg-gradient-to-r from-brand-800 to-brand-900 text-white rounded-xl p-6 sm:p-8 shadow-sm">
                  <div className="max-w-3xl space-y-3">
                    <span className="inline-block bg-brand-700 text-brand-100 text-[11px] font-semibold px-2.5 py-0.5 rounded tracking-wide uppercase">
                      Techfest 2026–27 — AWS Campus to Cloud
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      Know Before You Go to Your Ration Shop
                    </h2>
                    <p className="text-sm sm:text-base text-brand-100 leading-relaxed">
                      RationReady helps citizens avoid wasted journeys by checking crowdsourced
                      reports about Fair Price Shop queues, electronic Point of Sale (ePOS) status,
                      and commodity availability before travelling.
                    </p>
                  </div>
                </section>

                {/* The 4 Core Visit Questions Card Grid */}
                <section className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-700" />
                    <span>The 4 Practical Visit Planning Questions</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                      <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                        1
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Shop Location & Freshness
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Where is the shop and when was its operational report last updated by
                        citizens or shop managers?
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                      <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                        <Clock className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">Current Queue Wait</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        What is the current reported waiting time? Evaluated with a 2-hour window
                        and median calculation.
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                      <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">ePOS Device Status</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Is the biometric authentication terminal reported as WORKING? Evaluated with
                        a 4-hour majority rule.
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                      <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
                        <PackageCheck className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Commodity Availability
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        What is the latest status of essential pilot commodities (Rice, Wheat,
                        Sugar)? Valid for 24 hours.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Technical Foundation Overview Card */}
                <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
                    <Info className="w-4 h-4 text-brand-700" />
                    <span>Phase 2 Shop Directory & Data Layer</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Phase 2 introduces the public shop directory, locality filtering, individual
                    shop detail inspection, and DynamoDB data repositories for Shops and Reports.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono text-slate-700">
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Data Status</span>5
                      Synthetic Shops
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Pilot Locality</span>
                      Demo Locality A
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Public APIs</span>
                      GET /shops, GET /shops/:id
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Target Region</span>
                      ap-south-1 (Mumbai)
                    </div>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </main>

      {/* 4. Shared Footer */}
      <Footer />
    </div>
  );
};
