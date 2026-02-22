

# Add "Seed Sample Jobs" Button for Testing

## Overview

Add a developer/testing button that inserts 5 realistic sample jobs into the database. The button will appear on the **Saved Jobs tab empty state** in `ApplicationsPage.tsx`, so testers can quickly populate data without manually filling out forms.

## Sample Data

Five diverse jobs covering different types, locations, and salary ranges:

1. **Frontend Engineer** at TechCorp (Remote, Full-time, $90k-$130k)
2. **Product Designer** at DesignStudio (New York, Full-time, $85k-$120k)
3. **Backend Developer** at CloudScale (San Francisco, Contract, $70-$90/hr)
4. **Marketing Manager** at GrowthLab (Chicago, Full-time, $75k-$95k)
5. **Data Analyst Intern** at DataVault (Remote, Internship, $25/hr)

Each includes a realistic description with requirements, making them useful for testing the Tailor Resume and Job Match flows.

## Changes

### File: `src/lib/sampleJobs.ts` (new)

A data file exporting an array of 5 sample job objects matching the `createJob` input shape. Each includes title, company, location, job_type, salary_range, description, and requirements.

### File: `src/pages/ApplicationsPage.tsx`

In the "Saved Jobs" tab empty state (around line 450+), add a secondary "Add Sample Jobs" button below the existing "Save a Job" button. It will:

1. Call `createJob.mutateAsync()` for each sample job in sequence
2. Show a loading state while inserting
3. Toast on success ("5 sample jobs added!")
4. Only appear when the jobs list is empty (disappears after seeding)

The button will use a `FlaskConical` (or `TestTube2`) icon and muted styling to signal it's a dev/test helper, not a primary action.

## Technical Details

| File | Change |
|------|--------|
| `src/lib/sampleJobs.ts` | New file -- array of 5 sample job objects |
| `src/pages/ApplicationsPage.tsx` | Import sample data + add seed button to Saved Jobs empty state |

No database changes, no new dependencies. Uses existing `useJobMutations().createJob` hook.

