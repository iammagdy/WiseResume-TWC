import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PdfOptionsFooter } from './PdfOptionsFooter';

describe('PdfOptionsFooter', () => {
  it('keeps branding enabled and locked without a verified Premium entitlement', () => {
    const onBrandingChange = vi.fn();
    render(
      <PdfOptionsFooter
        visible
        showPageNumbers
        showBranding={false}
        isPremium={false}
        onPageNumbersChange={vi.fn()}
        onBrandingChange={onBrandingChange}
      />,
    );

    const branding = screen.getByRole('switch', { name: /wiseresume badge/i });
    expect(branding).toBeChecked();
    expect(branding).toBeDisabled();
    fireEvent.click(branding);
    expect(onBrandingChange).not.toHaveBeenCalled();
  });

  it('lets a verified Premium user remove branding', () => {
    const onBrandingChange = vi.fn();
    render(
      <PdfOptionsFooter
        visible
        showPageNumbers
        showBranding
        isPremium
        onPageNumbersChange={vi.fn()}
        onBrandingChange={onBrandingChange}
      />,
    );

    fireEvent.click(screen.getByRole('switch', { name: /wiseresume badge/i }));
    expect(onBrandingChange).toHaveBeenCalledWith(false);
  });

  it('hides page-number controls for ATS-focused PDF while retaining branding control', () => {
    render(
      <PdfOptionsFooter
        visible
        showPageNumberControl={false}
        showPageNumbers
        showBranding
        isPremium
        onPageNumbersChange={vi.fn()}
        onBrandingChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole('switch', { name: /page numbers/i })).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /wiseresume badge/i })).toBeInTheDocument();
  });

  it('does not leave hidden controls in the accessibility tree', () => {
    const { container } = render(
      <PdfOptionsFooter
        visible={false}
        showPageNumbers
        showBranding
        isPremium
        onPageNumbersChange={vi.fn()}
        onBrandingChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
