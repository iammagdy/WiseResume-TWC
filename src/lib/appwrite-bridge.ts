import { functions as appwriteFunctions } from '@/lib/appwrite';

/**
 * FULL AI & OPS INVENTORY: 
 * These functions are routed through the secure Appwrite AI-Gateway Hub.
 */
const AI_HUB_FUNCTIONS = new Set([
  // Core AI
  'agentic-chat', 'wise-ai-chat', 'analyze-resume', 'score-resume',
  'resume-section-ai', 'editor-ai', 'recruiter-simulation',
  
  // Document Generation
  'generate-cover-letter', 'generate-portfolio-bio', 'generate-question-bank', 
  'generate-resignation-letter', 'generate-fix-suggestions',
  
  // Job & Tailoring
  'tailor-resume', 'parse-job', 'parse-resume', 'suggest-template', 
  'smart-fit-rewrite', 'optimize-for-linkedin', 'validate-tailor',
  
  // Career & Portfolio
  'career-assessment', 'ask-portfolio', 'company-briefing', 'detect-and-humanize',
  
  // PDF & Infrastructure (Redirecting to old Supabase or keeping stubs)
  'export-resume-pdf', 'export-portfolio-pdf', 'send-contact-email',

  // Billing / Coupon
  'validate-coupon', 'redeem-coupon'
]);

export async function invokeAppwriteHub(fnName: string, options: any) {
  if (AI_HUB_FUNCTIONS.has(fnName)) {
    // SPECIAL CASE: PDF Generation
    // During migration, if we haven't built the PDF worker in Appwrite, 
    // we return a clear error or a placeholder.
    if (fnName.includes('pdf')) {
       return { data: null, error: { message: "PDF Download is being optimized for the new engine. Please try again in a few minutes." } };
    }

    try {
      const response = await appwriteFunctions.createExecution(
        'ai-gateway', 
        JSON.stringify({
          featureName: fnName,
          ... (options.body || {})
        }), 
        false, 
        '/', 
        'POST'
      );
      
      if (response.status === 'failed') throw new Error(response.errors || 'AI Hub Execution Failed');
      const result = JSON.parse(response.responseBody);
      // AI routes return { status, data, message }; ops routes (email, coupon) return flat JSON.
      // Fall through to the full result when result.data is absent so both shapes work.
      const payload = result.data !== undefined ? result.data : result;
      return { data: payload, error: result.status === 'error' ? { message: result.message } : null };
    } catch (err: any) {
      console.error('[Appwrite Hub Error]:', err.message);
      return { data: null, error: { message: "AI Feature temporarily unavailable during migration." } };
    }
  }
  throw new Error(`Function ${fnName} should be called directly via Appwrite SDK.`);
}

export function shouldRouteToAppwrite(fnName: string): boolean {
  return AI_HUB_FUNCTIONS.has(fnName);
}
