import { describe, expect, it } from 'vitest';
import { DEVTOOLS_PANEL_ALIASES, PANEL_GROUPS } from './devToolsPanelConfig';

describe('devToolsPanelConfig', () => {
  it('promotes AI Control Center into three visible panels', () => {
    const aiGroup = PANEL_GROUPS.find(group => group.label === 'AI Control Center');

    expect(aiGroup?.panels.map(panel => panel.id)).toEqual(['ai-health', 'ai-tools-map', 'ai-keys']);
    expect(aiGroup?.panels.map(panel => panel.title)).toEqual(['AI Health', 'AI Tools Map', 'API Keys']);
  });

  it('uses the approved sidebar labels', () => {
    const titles = PANEL_GROUPS.flatMap(group => group.panels.map(panel => panel.title));

    expect(titles).toContain('Users');
    expect(titles).toContain('Data Integrity');
    expect(titles).toContain('Feature Flags');
    expect(titles).toContain('Audit Log');
    expect(titles).toContain('System Test Runner');
    expect(titles).toContain('Appwrite Functions');
    expect(titles).toContain('WiseHire Queue');
    expect(titles).not.toContain('God Mode (Users)');
    expect(titles).not.toContain('Infrastructure');
    expect(titles).not.toContain('Feature Control');
    expect(titles).not.toContain('History');
    expect(titles).not.toContain('Smoke Runner');
    expect(titles).not.toContain('Deploy Hubs');
    expect(titles).not.toContain('WiseHire Waitlist');
  });

  it('routes legacy AI shortcuts to the new AI surfaces', () => {
    expect(DEVTOOLS_PANEL_ALIASES.ai).toBe('ai-health');
    expect(DEVTOOLS_PANEL_ALIASES.openrouter).toBe('ai-health');
    expect(DEVTOOLS_PANEL_ALIASES['ai-routing']).toBe('ai-tools-map');
    expect(DEVTOOLS_PANEL_ALIASES['ai-keys']).toBe('ai-keys');
  });
});
