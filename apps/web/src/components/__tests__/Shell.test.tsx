import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';
import { Navigation } from '../Navigation';
import { Footer } from '../Footer';
import { LoadingState } from '../LoadingState';
import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';

describe('Application Shell Components', () => {
  it('renders Header with product name and tagline', () => {
    render(<Header pilotLocality="Demo Locality A" isDemo={true} />);
    expect(screen.getByText('RationReady')).toBeInTheDocument();
    expect(screen.getByText('Know before you go.')).toBeInTheDocument();
    expect(screen.getByText('Demo Locality A')).toBeInTheDocument();
    expect(screen.getByText('Demo Prototype Data')).toBeInTheDocument();
  });

  it('renders Navigation tabs with disabled indicators for future phases', () => {
    const handleTabChange = vi.fn();
    render(<Navigation activeTab="help" onTabChange={handleTabChange} />);

    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Shop Directory')).toBeInTheDocument();
    expect(screen.getByText('Submit Update')).toBeInTheDocument();
    expect(screen.getByText('Shop Manager')).toBeInTheDocument();

    // Verify Phase badges
    expect(screen.getByText('Phase 2')).toBeInTheDocument();
    expect(screen.getByText('Phase 4')).toBeInTheDocument();
    expect(screen.getByText('Phase 5')).toBeInTheDocument();

    // Disabled tabs do not trigger tab change
    const disabledTab = screen.getByText('Shop Directory').closest('button');
    expect(disabledTab).toBeDisabled();
    expect(disabledTab).toHaveAttribute('aria-disabled', 'true');
    if (disabledTab) {
      fireEvent.click(disabledTab);
    }
    expect(handleTabChange).not.toHaveBeenCalled();

    // Active/available tab triggers change
    const activeTab = screen.getByText('How It Works').closest('button');
    expect(activeTab).not.toBeDisabled();
    if (activeTab) {
      fireEvent.click(activeTab);
    }
    expect(handleTabChange).toHaveBeenCalledWith('help');
  });

  it('renders Footer with public service disclaimer', () => {
    render(<Footer />);
    expect(screen.getByText(/Important Public Service Notice & Disclaimer:/i)).toBeInTheDocument();
    expect(screen.getByText(/not an official government portal/i)).toBeInTheDocument();
  });

  it('renders LoadingState with accessible role', () => {
    render(<LoadingState message="Loading demo data..." />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading demo data...')).toBeInTheDocument();
  });

  it('renders EmptyState and triggers action', () => {
    const handleAction = vi.fn();
    render(<EmptyState title="No shops" onAction={handleAction} actionText="Reset" />);
    expect(screen.getByText('No shops')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Reset'));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders ErrorState with alert role and triggers retry', () => {
    const handleRetry = vi.fn();
    render(<ErrorState title="API Error" onRetry={handleRetry} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('API Error')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Try Again'));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
