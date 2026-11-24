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

  it('renders Navigation tabs and triggers tab change', () => {
    const handleTabChange = vi.fn();
    render(<Navigation activeTab="directory" onTabChange={handleTabChange} />);

    expect(screen.getByText('Shop Directory')).toBeInTheDocument();
    expect(screen.getByText('Submit Update')).toBeInTheDocument();
    expect(screen.getByText('Shop Manager')).toBeInTheDocument();
    expect(screen.getByText('How It Works')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Submit Update'));
    expect(handleTabChange).toHaveBeenCalledWith('report');
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
