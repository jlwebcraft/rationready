import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShopList } from '../ShopList';
import { ShopDetail } from '../ShopDetail';
import { ShopCard } from '../ShopCard';
import { ShopFilter } from '../ShopFilter';
import { DEMO_SHOPS } from '../api';

describe('Shop Directory Frontend Components', () => {
  describe('ShopCard', () => {
    const shop = DEMO_SHOPS[0];

    it('renders shop card with name, locality, landmark, and demo data badge', () => {
      const handleSelect = vi.fn();
      render(<ShopCard shop={shop} onSelect={handleSelect} />);

      expect(screen.getByText('Demo Shop 01')).toBeInTheDocument();
      expect(screen.getByText('Demo Locality A')).toBeInTheDocument();
      expect(screen.getByText(/Fictional Demonstration Facility 01/i)).toBeInTheDocument();
      expect(screen.getByText(/Demo Data/i)).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: /View details for Demo Shop 01/i });
      fireEvent.click(btn);
      expect(handleSelect).toHaveBeenCalledWith('demo-shop-001');
    });
  });

  describe('ShopFilter', () => {
    it('renders locality options and search input', () => {
      const handleLocality = vi.fn();
      const handleSearch = vi.fn();

      render(
        <ShopFilter
          localities={['Demo Locality A']}
          selectedLocality="ALL"
          onLocalityChange={handleLocality}
          searchQuery=""
          onSearchChange={handleSearch}
          totalCount={5}
        />
      );

      expect(screen.getByLabelText(/Locality:/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search by shop name/i)).toBeInTheDocument();
      expect(screen.getByText(/Showing 5 Fair Price Shops/i)).toBeInTheDocument();

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Demo Locality A' } });
      expect(handleLocality).toHaveBeenCalledWith('Demo Locality A');

      fireEvent.change(screen.getByPlaceholderText(/Search by shop name/i), {
        target: { value: 'Shop 02' },
      });
      expect(handleSearch).toHaveBeenCalledWith('Shop 02');
    });
  });

  describe('ShopList', () => {
    it('renders the five synthetic shops in the directory', async () => {
      const handleSelect = vi.fn();
      render(<ShopList onSelectShop={handleSelect} />);

      await waitFor(() => {
        expect(screen.getByText('Fair Price Shop Directory')).toBeInTheDocument();
      });

      expect(screen.getByText('Demo Shop 01')).toBeInTheDocument();
      expect(screen.getByText('Demo Shop 02')).toBeInTheDocument();
      expect(screen.getByText('Demo Shop 03')).toBeInTheDocument();
      expect(screen.getByText('Demo Shop 04')).toBeInTheDocument();
      expect(screen.getByText('Demo Shop 05')).toBeInTheDocument();
    });

    it('filters shops using the search input', async () => {
      render(<ShopList onSelectShop={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Demo Shop 01')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by shop name/i);
      fireEvent.change(searchInput, { target: { value: 'Sector Gamma' } });

      expect(screen.getByText('Demo Shop 03')).toBeInTheDocument();
      expect(screen.queryByText('Demo Shop 01')).not.toBeInTheDocument();
      expect(screen.queryByText('Demo Shop 02')).not.toBeInTheDocument();
    });

    it('displays EmptyState when no shops match search query', async () => {
      render(<ShopList onSelectShop={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Demo Shop 01')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by shop name/i);
      fireEvent.change(searchInput, { target: { value: 'Nonexistent Shop' } });

      expect(screen.getByText('No Fair Price Shops Found')).toBeInTheDocument();
      const clearBtn = screen.getByRole('button', { name: /Clear Filter & Show All/i });
      fireEvent.click(clearBtn);

      expect(screen.getByText('Demo Shop 01')).toBeInTheDocument();
    });
  });

  describe('ShopDetail', () => {
    it('renders shop details with demo notice, landmark, and unavailable hours notice', async () => {
      const handleBack = vi.fn();
      render(<ShopDetail shopId="demo-shop-001" onBack={handleBack} />);

      await waitFor(() => {
        expect(screen.getByText('Demo Shop 01')).toBeInTheDocument();
      });

      expect(screen.getByText(/Shop Code: demo-shop-001/i)).toBeInTheDocument();
      expect(screen.getByText(/Demonstration Prototype Record:/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Fictional Demonstration Facility 01, Sector Alpha/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Verified operating hours not yet provided/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Operational Status & Reports \(Phase 3 Roadmap\):/i)
      ).toBeInTheDocument();

      const backBtn = screen.getByRole('button', { name: /Back to Fair Price Shop directory/i });
      fireEvent.click(backBtn);
      expect(handleBack).toHaveBeenCalledTimes(1);
    });

    it('renders ErrorState for an unknown shopId', async () => {
      const handleBack = vi.fn();
      render(<ShopDetail shopId="nonexistent-shop-id" onBack={handleBack} />);

      await waitFor(() => {
        expect(screen.getByText('Shop Not Found')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Shop with ID 'nonexistent-shop-id' was not found/i)
      ).toBeInTheDocument();
    });
  });
});
