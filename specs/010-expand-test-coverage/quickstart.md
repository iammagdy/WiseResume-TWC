# Quickstart: Testing Guide

**Feature Branch**: `010-expand-test-coverage` (in `fix/analysis-gaps`) | **Date**: 2026-03-13

## Running Expanded Tests

Execute specific domains:
```bash
npm run test -- src/__tests__/auth
npm run test -- src/__tests__/resume
npm run test -- src/__tests__/settings
```

Run test suite with coverage visualization:
```bash
npm run test:coverage
```
Ensure global lines, functions, statements, and branches all show `>80%`.

## Troubleshooting
If routing redirects fail in auth flow, verify `useKindeAuth().isAuthenticated` mock is properly defined via the `mock-kinde-auth.ts` setup overrides rather than attempting to mock the node module inside each test block.
