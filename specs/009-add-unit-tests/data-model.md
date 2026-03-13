# Data Model: Unit Tests

This project purely implements unit testing frameworks and tests. It does not introduce new persistent database entities or affect the production backend schema.

## Core Application Interfaces Modeled (Mocks)
While no real entities are created, the test suite relies on mock representations of the following:

- **Supabase Profiles**: Mocked profile data with attributes `id`, `fullName`, `username`, `jobTitle`, `avatarUrl`, `portfolioEnabled`.
- **Supabase Resumes**: Mocked resume models for resume selection utilities.
- **Kinde User**: Mocked authentication tokens and user lifecycle events.
