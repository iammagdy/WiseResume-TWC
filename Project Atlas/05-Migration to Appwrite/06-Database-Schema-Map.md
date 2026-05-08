# 06 - Database Schema Map (Finalized)

**Architecture:** SQL (Supabase) has been fully ported to Documents (Appwrite).

## Ported Collections (99 total)
All 99 tables from Supabase now exist as Collections in the 'main' database.

### Core Schema Detail
1. **profiles**
   - `user_id`: String (UUID) - Primary Link
   - `email`: String - Contact/Login
   - `full_name`: String
   - `username`: String
   - `onboarding_completed`: Boolean
   - `avatar_url`: String (500 chars)

2. **resumes**
   - `user_id`: String
   - `title`: String
   - `template`: String
   - `content`: String (Large JSON storage)

3. **ai_credits**
   - `user_id`: String
   - `daily_usage`: Integer
   - `daily_limit`: Integer

4. **subscriptions**
   - `user_id`: String
   - `plan`: String (free, pro, premium)
   - `trial_expires_at`: DateTime

## Porting Logic
- All JSONB columns from Supabase are stored as **Stringified JSON** in Appwrite attributes.
- Relationships are maintained via manual `user_id` queries in Frontend Hooks.
