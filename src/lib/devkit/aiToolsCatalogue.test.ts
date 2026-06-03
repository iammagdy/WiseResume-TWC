import { describe, expect, it } from 'vitest';
import {
  AI_TOOLS_CATALOGUE,
  TOOL_CREDIT_COSTS,
  TOOL_GATEWAY_DEFAULTS,
} from './aiToolsCatalogue';

describe('aiToolsCatalogue', () => {
  it('has 23 tools matching the gateway feature set', () => {
    expect(AI_TOOLS_CATALOGUE).toHaveLength(23);
  });

  it('every tool has a valid appArea', () => {
    const validAreas = ['resume-editor', 'tailoring', 'chat', 'documents', 'portfolio'];
    for (const tool of AI_TOOLS_CATALOGUE) {
      expect(validAreas).toContain(tool.appArea);
    }
  });

  it('every tool creditCost matches TOOL_CREDIT_COSTS', () => {
    for (const tool of AI_TOOLS_CATALOGUE) {
      expect(tool.creditCost).toBe(TOOL_CREDIT_COSTS[tool.id]);
    }
  });

  it('every tool gatewayDefault matches TOOL_GATEWAY_DEFAULTS or is null', () => {
    for (const tool of AI_TOOLS_CATALOGUE) {
      if (tool.gatewayDefault === null) {
        expect(TOOL_GATEWAY_DEFAULTS[tool.id]).toBeUndefined();
      } else {
        expect(tool.gatewayDefault).toEqual(TOOL_GATEWAY_DEFAULTS[tool.id]);
      }
    }
  });

  it('wise-ai-chat is annotated as sharedRouteWith agentic-chat and not route-split', () => {
    const wiseAi = AI_TOOLS_CATALOGUE.find(t => t.id === 'wise-ai-chat');
    expect(wiseAi?.sharedRouteWith).toBe('agentic-chat');
    // Both share the same default routing — no split
    expect(wiseAi?.gatewayDefault).toEqual(TOOL_GATEWAY_DEFAULTS['agentic-chat']);
  });

  it('score-resume is pool-fallback (no dedicated gateway route)', () => {
    const scoring = AI_TOOLS_CATALOGUE.find(t => t.id === 'score-resume');
    expect(scoring?.gatewayDefault).toBeNull();
    expect(TOOL_GATEWAY_DEFAULTS['score-resume']).toBeUndefined();
  });

  it('ask-portfolio has a dedicated groq route', () => {
    const portfolio = AI_TOOLS_CATALOGUE.find(t => t.id === 'ask-portfolio');
    expect(portfolio?.gatewayDefault).not.toBeNull();
    expect(portfolio?.gatewayDefault?.provider).toBe('groq');
  });

  it('no duplicate tool IDs', () => {
    const ids = AI_TOOLS_CATALOGUE.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
