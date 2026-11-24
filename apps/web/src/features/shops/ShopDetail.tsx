import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Store,
  MapPin,
  Clock,
  AlertTriangle,
  Info,
  Calendar,
  ShieldAlert,
} from 'lucide-react';
import { Shop } from '../../types';
import { fetchShopById } from './api';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

interface ShopDetailProps {
  shopId: string;
  onBack: () => void;
}

export const ShopDetail: React.FC<ShopDetailProps> = ({ shopId, onBack }) => {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadShop = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchShopById(shopId);
      if (!data) {
        setError(`Shop with ID '${shopId}' was not found.`);
      } else {
        setShop(data);
      }
    } catch {
      setError('Unable to load shop details. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShop();
  }, [shopId]);

  if (loading) {
    return <LoadingState message="Loading shop information..." />;
  }

  if (error || !shop) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-brand-700 hover:text-brand-800 bg-white border border-slate-200 px-3 py-1.5 min-h-11 rounded-md shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </button>
        <ErrorState
          title="Shop Not Found"
          message={error || `Could not find shop with ID '${shopId}'.`}
          onRetry={loadShop}
        />
      </div>
    );
  }

  const formattedDate = new Date(shop.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold text-brand-700 hover:text-brand-900 bg-white border border-slate-200 hover:border-slate-300 px-3 sm:px-4 py-2 min-h-11 rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1"
          aria-label="Back to Fair Price Shop directory"
        >
          <ArrowLeft className="w-4 h-4 text-brand-700" />
          <span>Back to Directory</span>
        </button>
      </div>

      {/* Shop Identity Header Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start space-x-3.5">
            <div className="bg-brand-50 p-3 rounded-lg text-brand-700 border border-brand-100 shrink-0">
              <Store className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                  {shop.name}
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Shop Code: {shop.shopId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {shop.isDemoData && (
              <span className="inline-flex items-center space-x-1.5 bg-amber-100 text-amber-950 text-xs font-bold px-2.5 py-1 rounded border border-amber-300 tracking-wider uppercase">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                <span>Demo Data</span>
              </span>
            )}
            <span className="inline-flex items-center space-x-1 bg-brand-50 text-brand-800 text-xs font-semibold px-2.5 py-1 rounded border border-brand-200">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              <span>{shop.locality}</span>
            </span>
          </div>
        </div>

        {/* Demo Notice Alert */}
        {shop.isDemoData && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-900 flex items-start space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Demonstration Prototype Record:</strong> This shop is a synthetic test entry
              for {shop.locality}. All information is for hackathon evaluation only and does not
              represent an official operational Fair Price Shop.
            </p>
          </div>
        )}
      </div>

      {/* Shop Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Address and Landmark Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <MapPin className="w-4 h-4 text-brand-700" />
            <span>Location & Landmark</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs text-slate-700 space-y-1">
            <span className="font-semibold text-slate-900 block">Demonstration Landmark:</span>
            <p className="leading-relaxed">{shop.addressOrLandmark}</p>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            * Note: Verified physical address and geographic coordinates are not provided for
            synthetic prototype records.
          </p>
        </div>

        {/* Operating Hours Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <Clock className="w-4 h-4 text-brand-700" />
            <span>Operating Hours</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs text-slate-700">
            {shop.openingHours ? (
              <span className="font-semibold text-slate-900">{shop.openingHours}</span>
            ) : (
              <span className="text-slate-500 italic">
                Verified operating hours not yet provided.
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 pt-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Last Directory Update: {formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Phase 3 Status Notice */}
      <div className="bg-slate-100 rounded-lg border border-slate-200 p-5 text-xs text-slate-700 flex items-start space-x-3">
        <Info className="w-5 h-5 text-brand-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-900 block">
            Operational Status & Reports (Phase 3 Roadmap):
          </span>
          <p className="leading-relaxed text-slate-600">
            Live crowdsourced waiting queue times, electronic Point of Sale (ePOS) terminal status,
            and essential commodity stock reports (Rice, Wheat, Sugar) for this shop will be
            introduced in Phase 3.
          </p>
        </div>
      </div>
    </div>
  );
};
