'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const authPage = fs.readFileSync(path.join(__dirname, '../../src/pages/AuthPage.tsx'), 'utf8');
const verifyPage = fs.readFileSync(path.join(__dirname, '../../src/pages/AuthVerifyEmailPage.tsx'), 'utf8');

const expectedAcceptance = /data\?\.success !== true \|\| data\.delivery !== 'appwrite' \|\| data\.providerAccepted !== true/;

assert.match(authPage, /action: 'send-verification', locale/);
assert.match(authPage, expectedAcceptance);
assert.match(authPage, /Account created! We requested a verification email\./);
assert.doesNotMatch(authPage, /Account created! Check your email to verify your account\./);

assert.match(verifyPage, /action: 'send-verification', locale/);
assert.match(verifyPage, expectedAcceptance);
assert.match(verifyPage, /Verification email request accepted\. Delivery may take a moment\./);
assert.match(verifyPage, /Verification email request was not accepted\. Please try again\./);
assert.doesNotMatch(verifyPage, /Verification email sent — check your inbox\./);

console.log('[TEST] auth verification caller contract passed');
