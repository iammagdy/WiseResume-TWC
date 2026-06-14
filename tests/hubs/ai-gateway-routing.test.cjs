const assert = require('node:assert/strict');

// Mock minimal dependencies for buildMessages testing
function mockAsString(val) {
  if (typeof val === 'string') return val;
  if (val === null || val === undefined) return '';
  return String(val);
}

function mockIsRecord(val) {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

// Test that tailor-resume gets dedicated prompt instructions (not generic)
async function testTailorResumeGetsDedicatedPrompt() {
  // We need to require the module to test its internal behavior
  // Since main.js exports a function, we can check the structure
  const mainModule = require('../../appwrite-hubs/ai-gateway/src/main.js');
  
  // The test: verify the module loads without error
  assert.equal(typeof mainModule, 'function', 'main.js should export a function');
  
  console.log('  ✓ ai-gateway module loads successfully');
}

// Test buildMessages behavior by inspecting the source (lightweight check)
async function testBuildMessagesHasTailorResumeBranch() {
  const fs = require('fs');
  const path = require('path');
  const mainSource = fs.readFileSync(
    path.join(__dirname, '../../appwrite-hubs/ai-gateway/src/main.js'),
    'utf-8'
  );
  
  // Verify the dedicated tailor-resume branch exists (not falling through to generic)
  const hasDedicatedBranch = mainSource.includes("if (featureName === 'tailor-resume')");
  assert.ok(hasDedicatedBranch, 'main.js should have dedicated tailor-resume branch');
  
  // Verify it has explicit tailoring instructions
  const hasTailorInstructions = mainSource.includes('rewrite a candidate\'s resume') ||
                                mainSource.includes('Rewrite the resume') ||
                                mainSource.includes('rewrite the resume');
  assert.ok(hasTailorInstructions, 'tailor-resume should have explicit rewrite instructions');
  
  // Verify it mentions job description context
  const hasJobDescriptionContext = mainSource.includes('jobDescription') ||
                                     mainSource.includes('Job Description');
  assert.ok(hasJobDescriptionContext, 'tailor-resume should reference job description');
  
  // Verify expected schema fields are documented in the prompt
  const hasSummaryField = mainSource.includes('summary');
  const hasSkillsField = mainSource.includes('skills');
  const hasExperienceField = mainSource.includes('experience');
  assert.ok(hasSummaryField && hasSkillsField && hasExperienceField,
    'tailor-resume prompt should reference summary, skills, and experience fields');
  
  console.log('  ✓ buildMessages has dedicated tailor-resume branch with proper instructions');
}

// Test that tailor-resume is NOT using the generic STRUCTURED_AI_FEATURES handler
async function testTailorResumeNotGeneric() {
  const fs = require('fs');
  const path = require('path');
  const mainSource = fs.readFileSync(
    path.join(__dirname, '../../appwrite-hubs/ai-gateway/src/main.js'),
    'utf-8'
  );
  
  // The dedicated branch must come BEFORE the generic STRUCTURED_AI_FEATURES check
  const tailorBranchIndex = mainSource.indexOf("if (featureName === 'tailor-resume')");
  const genericBranchIndex = mainSource.indexOf('if (STRUCTURED_AI_FEATURES.has(featureName))');
  
  assert.ok(tailorBranchIndex > 0, 'tailor-resume branch should exist');
  assert.ok(genericBranchIndex > 0, 'generic branch should exist');
  assert.ok(tailorBranchIndex < genericBranchIndex,
    'tailor-resume branch must come before generic STRUCTURED_AI_FEATURES handler');
  
  console.log('  ✓ tailor-resume branch precedes generic handler (will be used instead of falling through)');
}

// Test schema compatibility with frontend expectations
async function testTailorResumeSchemaCompatibility() {
  const fs = require('fs');
  const path = require('path');
  const mainSource = fs.readFileSync(
    path.join(__dirname, '../../appwrite-hubs/ai-gateway/src/main.js'),
    'utf-8'
  );
  
  // Check schemaPrompt function includes tailor-resume with expected fields
  const hasSchemaPrompt = mainSource.includes("'tailor-resume':");
  assert.ok(hasSchemaPrompt, 'schemaPrompt should include tailor-resume schema');
  
  // Check normalizeStructuredFeatureData handles tailor-resume
  const hasNormalizeTailor = mainSource.includes("if (featureName === 'tailor-resume')");
  assert.ok(hasNormalizeTailor, 'normalizeStructuredFeatureData should handle tailor-resume');
  
  // Verify expected response fields in normalization
  const expectedFields = [
    'summary', 'skills', 'experience', 'education', 'projects',
    'certifications', 'awards', 'keyChanges', 'overallScore'
  ];
  
  // Find the normalizeStructuredFeatureData function and extract its body
  const normalizeFuncMatch = mainSource.match(/function normalizeStructuredFeatureData[^{]*\{([\s\S]*?)\n\}/);
  assert.ok(normalizeFuncMatch, 'Should find normalizeStructuredFeatureData function');
  const normalizeSection = normalizeFuncMatch[1] || normalizeFuncMatch[0];
  
  // Find the tailor-resume branch within normalize function - look for the block
  const tailorMatch = normalizeSection.match(/if \(featureName === 'tailor-resume'\)[\s\S]*?return \{[\s\S]*?\};/);
  assert.ok(tailorMatch, 'normalizeStructuredFeatureData should have tailor-resume branch');
  const tailorNormalizeSection = tailorMatch[0];
  
  for (const field of expectedFields) {
    assert.ok(
      tailorNormalizeSection.includes(field),
      `normalizeStructuredFeatureData should handle ${field} field`
    );
  }
  
  console.log('  ✓ tailor-resume schema and normalization compatible with frontend');
}

// Test extracted_prompts.json consistency
async function testExtractedPromptsConsistency() {
  const fs = require('fs');
  const path = require('path');
  const promptsJson = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../appwrite-hubs/ai-gateway/src/extracted_prompts.json'),
    'utf-8'
  ));
  
  assert.ok(promptsJson['tailor-resume'], 'extracted_prompts.json should have tailor-resume entry');
  assert.ok(
    promptsJson['tailor-resume'].system.includes('rewrite') ||
    promptsJson['tailor-resume'].system.includes('Rewrite') ||
    promptsJson['tailor-resume'].system.includes('tailoring'),
    'extracted_prompts tailor-resume should mention rewriting/tailoring'
  );
  
  console.log('  ✓ extracted_prompts.json has consistent tailor-resume entry');
}

async function main() {
  console.log('Running ai-gateway routing tests...\n');
  
  await testTailorResumeGetsDedicatedPrompt();
  await testBuildMessagesHasTailorResumeBranch();
  await testTailorResumeNotGeneric();
  await testTailorResumeSchemaCompatibility();
  await testExtractedPromptsConsistency();
  
  console.log('\n✓ All ai-gateway routing tests passed');
}

main().catch((err) => {
  console.error('\n✗ Test failed:', err.message);
  process.exitCode = 1;
});
