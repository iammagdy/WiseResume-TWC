import { describe, it, expect } from 'vitest';
import { AI_HUB_FUNCTIONS, shouldRouteToAppwrite } from '../appwrite-bridge';
import { appwriteFunctions } from '../appwrite-functions';
import fs from 'node:fs';
import path from 'node:path';

describe('Contact & Feedback Routing Regression Suite', () => {
  it('preserves generic send-contact-email inside AI_HUB_FUNCTIONS for ai-gateway routing', () => {
    // send-contact-email must be routed to ai-gateway
    expect(AI_HUB_FUNCTIONS.has('send-contact-email')).toBe(true);
    expect(shouldRouteToAppwrite('send-contact-email')).toBe(true);

    // send-portfolio-contact-email must NOT be in AI_HUB_FUNCTIONS
    expect(AI_HUB_FUNCTIONS.has('send-portfolio-contact-email')).toBe(false);
    expect(shouldRouteToAppwrite('send-portfolio-contact-email')).toBe(false);
  });

  it('keeps sendFeedback.ts invoking generic send-contact-email (bugs, features, crashes)', () => {
    const filePath = path.resolve(__dirname, '../sendFeedback.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Confirms sendFeedback continues to invoke send-contact-email
    expect(content).toContain("'send-contact-email'");
    expect(content).not.toContain("'send-portfolio-contact-email'");
  });

  it('keeps UsernameRequestDialog invoking generic send-contact-email', () => {
    const filePath = path.resolve(__dirname, '../../components/settings/UsernameRequestDialog.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Confirms UsernameRequestDialog continues to invoke send-contact-email
    expect(content).toContain("'send-contact-email'");
    expect(content).not.toContain("'send-portfolio-contact-email'");
  });

  it('routes PortfolioContactForm exclusively through send-portfolio-contact-email', () => {
    const filePath = path.resolve(__dirname, '../../components/portfolio/public/PortfolioContactForm.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Confirms PortfolioContactForm invokes the isolated public route
    expect(content).toContain("'send-portfolio-contact-email'");
    expect(content).not.toContain("invoke('send-contact-email'");
  });

  it('restricts email-service hub to send-portfolio-contact-email and rejects generic contact actions', () => {
    const filePath = path.resolve(__dirname, '../../../appwrite-hubs/email-service/src/main.js');
    const content = fs.readFileSync(filePath, 'utf-8');

    // email-service handles send-portfolio-contact-email
    expect(content).toContain("case 'send-portfolio-contact-email':");
    // email-service does NOT handle send-contact-email in its switch
    expect(content).not.toContain("case 'send-contact-email':");

    // Strictly checks that msgType === 'portfolio_contact'
    expect(content).toContain("msgType !== 'portfolio_contact'");
  });

  it('maintains ai-gateway authenticated execution policy and email-service narrow public policy', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { FUNCTION_EXECUTION_POLICIES } = require('../../../scripts/appwrite-function-policy.cjs');

    // ai-gateway execute is strictly users only
    expect(FUNCTION_EXECUTION_POLICIES['ai-gateway'].execute).toEqual(['users']);
    expect(FUNCTION_EXECUTION_POLICIES['ai-gateway'].classification).toBe('authenticated-user');

    // email-service execute is any for public contact, but internal logic isolates routes
    expect(FUNCTION_EXECUTION_POLICIES['email-service'].execute).toEqual(['any']);
    expect(FUNCTION_EXECUTION_POLICIES['email-service'].classification).toBe('anonymous-public');
  });

  it('prevents caller-supplied action from overriding send-portfolio-contact-email', async () => {
    const { functions } = await import('../../lib/appwrite');
    const { vi } = await import('vitest');

    const createExecutionSpy = vi.spyOn(functions, 'createExecution').mockResolvedValueOnce({
      $id: 'exec-test-1',
      responseStatusCode: 200,
      responseBody: JSON.stringify({ status: 'success' }),
    } as never);

    await appwriteFunctions.invoke('send-portfolio-contact-email', {
      body: {
        action: 'malicious-override-action',
        visitor_name: 'Jane Visitor',
      },
    });

    expect(createExecutionSpy).toHaveBeenCalled();
    const [targetFunctionId, payloadString] = createExecutionSpy.mock.calls[0];
    expect(targetFunctionId).toBe('email-service');

    const parsedPayload = JSON.parse(payloadString as string);
    expect(parsedPayload.action).toBe('send-portfolio-contact-email');
    expect(parsedPayload.visitor_name).toBe('Jane Visitor');

    createExecutionSpy.mockRestore();
  });
});
