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

  it('renders Navigation tabs with enabled directory and disabled future tabs', () => {
    const handleTabChange = vi.fn();
    render(<Navigation activeTab="directory" onTabChange={handleTabChange} />);

    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Shop Directory')).toBeInTheDocument();
    expect(screen.getByText('Submit Update')).toBeInTheDocument();
    expect(screen.getByText('Shop Manager')).toBeInTheDocument();

    // Verify Phase badges for future phases
    expect(screen.getByText('Phase 4')).toBeInTheDocument();
    expect(screen.getByText('Phase 5')).toBeInTheDocument();

    // Shop Directory is available and active
    const directoryTab = screen.getByText('Shop Directory').closest('button');
    expect(directoryTab).not.toBeDisabled();
    expect(directoryTab).toHaveAttribute('aria-current', 'page');

    // How It Works is available and clickable
    const helpTab = screen.getByText('How It Works').closest('button');
    expect(helpTab).not.toBeDisabled();
    if (helpTab) {
      fireEvent.click(helpTab);
    }
    expect(handleTabChange).toHaveBeenCalledWith('help');

    // Future tabs are disabled
    const disabledTab = screen.getByText('Submit Update').closest('button');
    expect(disabledTab).toBeDisabled();
    expect(disabledTab).toHaveAttribute('aria-disabled', 'true');
    if (disabledTab) {
      fireEvent.click(disabledTab);
    }
    expect(handleTabChange).toHaveBeenCalledTimes(1); // was only called with 'help'
  });

  it('renders Footer with public service disclaimer and territory', () => {
    render(<Footer />);
    expect(screen.getByText(/Important Public Service Notice & Disclaimer:/i)).toBeInTheDocument();
    expect(screen.getByText(/not an official government portal/i)).toBeInTheDocument();
    expect(screen.getByText(/Pilot Territory: Demo Locality A/i)).toBeInTheDocument();
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
