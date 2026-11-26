import React, { useState, useEffect, useMemo } from 'react';
import { Shop } from '../../types';
import { fetchShops, DEMO_LOCALITY } from './api';
import { ShopCard } from './ShopCard';
import { ShopFilter } from './ShopFilter';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';

interface ShopListProps {
  onSelectShop: (shopId: string) => void;
}

export const ShopList: React.FC<ShopListProps> = ({ onSelectShop }) => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedLocality, setSelectedLocality] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadShops = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchShops(selectedLocality);
      setShops(data);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to load shop directory. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, [selectedLocality]);

  const filteredShops = useMemo(() => {
    if (!searchQuery.trim()) {
      return shops;
    }
    const q = searchQuery.toLowerCase().trim();
    return shops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.addressOrLandmark.toLowerCase().includes(q) ||
        s.shopId.toLowerCase().includes(q)
    );
  }, [shops, searchQuery]);

  const localities = useMemo(() => [DEMO_LOCALITY], []);

  if (loading) {
    return <LoadingState message="Loading Fair Price Shop directory..." />;
  }

  if (error) {
    return <ErrorState title="Directory Load Error" message={error} onRetry={loadShops} />;
  }

  return (
    <div className="space-y-6">
      {/* Directory Introduction Banner */}
      <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-2">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Fair Price Shop Directory
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
          Browse authorized Fair Price Shops in your locality before travelling. Check shop
          landmarks and operating information.
        </p>
      </section>

      {/* Filter and Search Bar */}
      <ShopFilter
        localities={localities}
        selectedLocality={selectedLocality}
        onLocalityChange={setSelectedLocality}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={filteredShops.length}
      />

      {/* Shop Cards Grid or Empty State */}
      {filteredShops.length === 0 ? (
        <EmptyState
          title="No Fair Price Shops Found"
          message="No shops match your current search or locality filter. Try resetting your search query or selecting a different locality."
          actionText="Clear Filter & Show All"
          onAction={() => {
            setSelectedLocality('ALL');
            setSearchQuery('');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShops.map((shop) => (
            <ShopCard key={shop.shopId} shop={shop} onSelect={onSelectShop} />
          ))}
        </div>
      )}
    </div>
  );
};
