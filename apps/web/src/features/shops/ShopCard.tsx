import React from 'react';
import { Store, MapPin, ChevronRight, AlertTriangle } from 'lucide-react';
import { Shop } from '../../types';

interface ShopCardProps {
  shop: Shop;
  onSelect: (shopId: string) => void;
}

export const ShopCard: React.FC<ShopCardProps> = ({ shop, onSelect }) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center space-x-1 bg-brand-50 text-brand-800 text-xs font-semibold px-2 py-0.5 rounded border border-brand-200">
            <MapPin className="w-3 h-3 text-brand-600" />
            <span>{shop.locality}</span>
          </span>

          {shop.isDemoData && (
            <span
              className="inline-flex items-center space-x-1 bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300 tracking-wider uppercase"
              title="This record is synthetic demonstration data. Not a verified ration shop."
            >
              <AlertTriangle className="w-3 h-3 text-amber-700" />
              <span>Demo Data</span>
            </span>
          )}
        </div>

        {/* Shop Name & Header */}
        <div className="flex items-start space-x-3">
          <div className="bg-brand-50 p-2.5 rounded-lg text-brand-700 border border-brand-100 shrink-0">
            <Store className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">{shop.name}</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {shop.shopId}</p>
          </div>
        </div>

        {/* Address / Landmark */}
        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
          <span className="font-medium text-slate-700 block mb-0.5">Landmark:</span>
          {shop.addressOrLandmark}
        </p>
      </div>

      {/* Action CTA */}
      <button
        onClick={() => onSelect(shop.shopId)}
        className="w-full inline-flex items-center justify-center space-x-2 bg-brand-700 hover:bg-brand-800 text-white font-semibold text-xs sm:text-sm py-2.5 px-4 min-h-11 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1"
        aria-label={`View details for ${shop.name}`}
      >
        <span>View Shop Details</span>
        <ChevronRight className="w-4 h-4 text-brand-200" />
      </button>
    </div>
  );
};
