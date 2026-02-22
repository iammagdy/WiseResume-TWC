import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InterviewSetup } from '../InterviewSetup';

// Mock framer-motion to render children without animation
vi.mock('framer-motion', () => {
  const Passthrough = ({ children, ...props }: any) => {
    const filteredProps: Record<string, any> = {};
    for (const key of Object.keys(props)) {
      if (['className', 'style', 'onClick', 'disabled'].includes(key)) {
        filteredProps[key] = props[key];
      }
    }
    return <div {...filteredProps}>{children}</div>;
  };
  return {
    motion: new Proxy({}, { get: () => Passthrough }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('@/lib/haptics', () => ({
  haptics: { light: vi.fn(), medium: vi.fn(), selection: vi.fn() },
}));

vi.mock('../CompanyBriefingSheet', () => ({
  CompanyBriefingSheet: () => null,
}));

const baseProps = {
  hasResume: true,
  speechSupported: true,
  speechRecognitionAvailable: true,
  voiceGender: 'female' as const,
  onVoiceGenderChange: vi.fn(),
  onStart: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InterviewSetup banner visibility', () => {
  it('shows no banners and shows mic test when fully supported', () => {
    render(<InterviewSetup {...baseProps} />);
    expect(screen.queryByText(/voice input is not available/i)).toBeNull();
    expect(screen.queryByText(/microphone access is required/i)).toBeNull();
    expect(screen.queryByText(/no resume loaded/i)).toBeNull();
    expect(screen.getByText('Test Microphone')).toBeInTheDocument();
  });

  it('shows mic-blocked banner and mic test when speech available but mic denied', () => {
    render(<InterviewSetup {...baseProps} speechSupported={false} />);
    expect(screen.getByText(/microphone access is required/i)).toBeInTheDocument();
    expect(screen.queryByText(/voice input is not available/i)).toBeNull();
    expect(screen.getByText('Test Microphone')).toBeInTheDocument();
  });

  it('shows voice-unavailable banner and hides mic test when no speech recognition', () => {
    render(
      <InterviewSetup
        {...baseProps}
        speechRecognitionAvailable={false}
        speechSupported={false}
      />,
    );
    expect(screen.getByText(/voice input is not available/i)).toBeInTheDocument();
    expect(screen.queryByText(/microphone access is required/i)).toBeNull();
    expect(screen.queryByText('Test Microphone')).toBeNull();
  });

  it('shows no-resume banner when hasResume is false', () => {
    render(<InterviewSetup {...baseProps} hasResume={false} />);
    expect(screen.getByText(/no resume loaded/i)).toBeInTheDocument();
  });
});
