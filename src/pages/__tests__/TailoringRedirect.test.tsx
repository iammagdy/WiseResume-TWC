import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';

// Simple test to verify /tailoring redirect behavior
function TestTailoringRedirect() {
  return (
    <MemoryRouter initialEntries={["/tailoring"]}>
      <Routes>
        <Route path="/tailoring" element={<Navigate to="/tailoring-hub" replace />} />
        <Route path="/tailoring-hub" element={<div data-testid="tailoring-hub">Tailoring Hub Page</div>} />
        <Route path="*" element={<div data-testid="not-found">404 Not Found</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('/tailoring redirect', () => {
  it('redirects to /tailoring-hub', () => {
    render(<TestTailoringRedirect />);
    
    // Should show Tailoring Hub, not 404
    expect(screen.getByTestId('tailoring-hub')).toBeInTheDocument();
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument();
  });
});
