import { render, screen, fireEvent } from '@testing-library/react';
import { UploadZone } from './UploadZone';
import { vi, describe, it, expect } from 'vitest';

describe('UploadZone', () => {
  it('renders with button role and accessible label', () => {
    render(<UploadZone>Upload Here</UploadZone>);
    const zone = screen.getByRole('button');
    expect(zone).toBeInTheDocument();
    expect(zone).toHaveAttribute('aria-label', 'Upload resume file');
    expect(zone).toHaveTextContent('Upload Here');
  });

  it('calls onUploadClick when clicked', () => {
    const handleClick = vi.fn();
    render(<UploadZone onUploadClick={handleClick}>Click Me</UploadZone>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onUploadClick when Enter key is pressed', () => {
    const handleClick = vi.fn();
    render(<UploadZone onUploadClick={handleClick}>Enter Me</UploadZone>);

    const button = screen.getByRole('button');
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onUploadClick when Space key is pressed', () => {
    const handleClick = vi.fn();
    render(<UploadZone onUploadClick={handleClick}>Space Me</UploadZone>);

    const button = screen.getByRole('button');
    button.focus();
    fireEvent.keyDown(button, { key: ' ', code: 'Space' });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger when isProcessing is true', () => {
    const handleClick = vi.fn();
    render(<UploadZone isProcessing={true} onUploadClick={handleClick}>Processing</UploadZone>);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('tabIndex', '-1');

    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies correct classes for dragging state', () => {
    const { container } = render(<UploadZone isDragging={true}>Dragging</UploadZone>);
    // We check if the class for dragging (bg-primary/10) is present
    expect(container.firstChild).toHaveClass('bg-primary/10');
    expect(container.firstChild).toHaveClass('border-primary');
  });
});
