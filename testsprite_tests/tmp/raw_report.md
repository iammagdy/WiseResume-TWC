
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** wiseresume-74945019
- **Date:** 2026-03-22
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Create a new resume from the dashboard and land in the editor
- **Test Code:** [TC001_Create_a_new_resume_from_the_dashboard_and_land_in_the_editor.py](./TC001_Create_a_new_resume_from_the_dashboard_and_land_in_the_editor.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Sign-in failed: 'No account found with this email' message displayed after entering example@gmail.com.
- Password entry and sign-in submission could not be performed because the auth flow did not present credential fields for the provided email.
- Dashboard page was not reached because authentication did not succeed.
- Resume creation could not be attempted because the user is not authenticated.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e5cbf5c4-557a-42cf-b7c6-e3df3911d147/2ea24259-ac7d-4587-9f4c-6d1b47457f87
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Dashboard lists resumes as visible cards
- **Test Code:** [TC002_Dashboard_lists_resumes_as_visible_cards.py](./TC002_Dashboard_lists_resumes_as_visible_cards.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- 'No account found with this email' error displayed after entering the test email and clicking Continue.
- Password input did not appear after submitting the email, preventing completion of the sign-in flow.
- Dashboard page was not reached because authentication could not be completed with the available test credentials.
- Alternative auth provider buttons (Google/Apple/LinkedIn) cannot be used with the provided test credentials in this automated test.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e5cbf5c4-557a-42cf-b7c6-e3df3911d147/f9c18057-9720-4d65-bb82-74605b2c3826
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Open an existing resume card to the editor
- **Test Code:** [TC003_Open_an_existing_resume_card_to_the_editor.py](./TC003_Open_an_existing_resume_card_to_the_editor.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Login form not present on /auth - loading spinner persists and no input fields or Sign in button visible
- Cannot access Dashboard because authentication UI never loaded
- Unable to verify resume editor opening because no resume cards or dashboard accessible
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e5cbf5c4-557a-42cf-b7c6-e3df3911d147/e10ecbb2-f101-48ab-a238-cf35053391fc
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Delete a resume from a card menu removes it from the dashboard list
- **Test Code:** [TC005_Delete_a_resume_from_a_card_menu_removes_it_from_the_dashboard_list.py](./TC005_Delete_a_resume_from_a_card_menu_removes_it_from_the_dashboard_list.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Login form not found on /auth page; no email or password input fields present.
- Central loading indicator remained visible after multiple waits (3s, 5s, 5s); the page did not render interactive UI.
- 0 interactive elements detected on the page, preventing any UI interactions required by the test (sign in, dashboard navigation, resume delete).
- Dashboard and resume delete flow could not be exercised because authentication could not be completed due to the loading state.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e5cbf5c4-557a-42cf-b7c6-e3df3911d147/9ace7084-a22c-4a9d-a945-77efa91292c9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Edit contact info and verify auto-save success indication
- **Test Code:** [TC006_Edit_contact_info_and_verify_auto_save_success_indication.py](./TC006_Edit_contact_info_and_verify_auto_save_success_indication.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Login page not rendered: only loading indicator visible and 0 interactive elements on http://localhost:3000/auth
- Email input field not found on the /auth page, so credentials cannot be entered
- Password input field not found on the /auth page
- Sign in button not found on the /auth page, preventing login and navigation to the dashboard
- Dashboard and Editor pages could not be reached because authentication could not be performed
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e5cbf5c4-557a-42cf-b7c6-e3df3911d147/9ead67f3-5da6-4538-a6df-bbc686efcc80
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Switch resume template and verify template applied instantly
- **Test Code:** [TC007_Switch_resume_template_and_verify_template_applied_instantly.py](./TC007_Switch_resume_template_and_verify_template_applied_instantly.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Login form not available on '/auth' — the page remains stuck on a loading indicator, preventing the test from proceeding
- No interactive elements present on the '/auth' page, so authentication cannot be performed
- Dashboard and editor pages could not be reached because login could not be completed
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e5cbf5c4-557a-42cf-b7c6-e3df3911d147/ea6a4269-18d1-4dfa-abb4-e2100daafad4
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 Open AI tool sheet, generate content, and verify results appear
- **Test Code:** [TC008_Open_AI_tool_sheet_generate_content_and_verify_results_appear.py](./TC008_Open_AI_tool_sheet_generate_content_and_verify_results_appear.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Password input not found on /auth after entering email and clicking Continue
- Dashboard page did not load after attempting to sign in
- Editor page (/editor) could not be reached because authentication did not complete
- Kinde sign-in flow presented social/magic-link options but no password-entry option was available
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e5cbf5c4-557a-42cf-b7c6-e3df3911d147/788656d8-6aec-4d6e-b993-de4240a1269f
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Edit experience section and verify auto-save triggers
- **Test Code:** [TC009_Edit_experience_section_and_verify_auto_save_triggers.py](./TC009_Edit_experience_section_and_verify_auto_save_triggers.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Auth page stuck on loading spinner; login form not rendered on /auth.
- No interactive elements found on /auth, preventing the login steps from being executed.
- Unable to verify /dashboard or continue to editor because sign-in cannot be performed.
- Multiple waits did not resolve the loading state, indicating the page may be failing to initialize or external auth is unavailable.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e5cbf5c4-557a-42cf-b7c6-e3df3911d147/e92752e6-1a17-4a0f-8b19-ad3e8ebb01c1
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Access Upload page and see upload control
- **Test Code:** [TC013_Access_Upload_page_and_see_upload_control.py](./TC013_Access_Upload_page_and_see_upload_control.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Upload page did not load: central 'Loading...' indicator present and zero interactive elements on /upload, preventing verification of the upload UI.
- Authentication page did not load: central 'Loading...' indicator present and no login inputs/buttons on /auth, preventing authentication.
- Expected upload-entry texts ('Upload', 'Drag', 'drop', 'PDF', 'DOCX') could not be verified because the upload UI was not rendered.
- No authenticated state was reached because the login form never appeared, so access to the upload feature could not be confirmed.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e5cbf5c4-557a-42cf-b7c6-e3df3911d147/f4527d82-ae06-4a5e-a3a4-2c060ac55db9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 Open an AI tool and generate results from a job description
- **Test Code:** [TC014_Open_an_AI_tool_and_generate_results_from_a_job_description.py](./TC014_Open_an_AI_tool_and_generate_results_from_a_job_description.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Login form not found on /auth page; page displays persistent 'Loading...' state and 0 interactive elements after waiting.
- No interactive inputs or buttons are available to perform authentication (0 interactive elements found).
- Dashboard page could not be reached because authentication cannot be completed.
- AI Studio cannot be accessed since login cannot proceed.
- SPA appears to be stuck initializing or blocked on the client, preventing UI rendering.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e5cbf5c4-557a-42cf-b7c6-e3df3911d147/28bfbe7e-98ed-41e2-94e2-a53a5751ccf3
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016 Attempt to generate with empty context shows validation or remains disabled
- **Test Code:** [TC016_Attempt_to_generate_with_empty_context_shows_validation_or_remains_disabled.py](./TC016_Attempt_to_generate_with_empty_context_shows_validation_or_remains_disabled.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- /auth page remained on a loading state with only a spinner and 'Loading...' text visible (no login UI rendered).
- Email and password input fields and Sign in button are not present on the /auth page, preventing authentication steps.
- No navigation elements or links to reach the dashboard or AI Studio were available, so downstream features (AI Studio, tool cards) could not be tested.
- The application did not render interactive elements after multiple waits and navigations, blocking the verification of required-field behavior.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e5cbf5c4-557a-42cf-b7c6-e3df3911d147/fa960c59-8f45-48a1-94db-857239361815
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC019 Mock Interview page loads and allows selecting an interview mode
- **Test Code:** [TC019_Mock_Interview_page_loads_and_allows_selecting_an_interview_mode.py](./TC019_Mock_Interview_page_loads_and_allows_selecting_an_interview_mode.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Authentication page (/auth) displays only a loading indicator and no interactive elements were detected.
- Login form elements (email, password, Sign in) are not present after multiple wait attempts.
- Authentication could not be completed, so the dashboard page was not reached.
- The Interview page could not be accessed because login could not be performed.
- No alternative navigation elements were available on the page to proceed with login or reach the Interview page.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e5cbf5c4-557a-42cf-b7c6-e3df3911d147/994ad560-b342-443d-ab88-11c11e4a2ac9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC020 Launch a General mock interview session successfully
- **Test Code:** [TC020_Launch_a_General_mock_interview_session_successfully.py](./TC020_Launch_a_General_mock_interview_session_successfully.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Login form not found on /auth; the page shows a persistent loading spinner and 0 interactive elements.
- Authentication cannot be performed because email/password fields and the 'Sign in' button are not present.
- Interview flow cannot be tested because the application remains stuck on loading and navigation to the dashboard is not possible.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e5cbf5c4-557a-42cf-b7c6-e3df3911d147/5b94c9f5-b962-4e1a-a450-1ebb50876a93
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC023 Answer by typing (no microphone) and see it appear in the transcript
- **Test Code:** [TC023_Answer_by_typing_no_microphone_and_see_it_appear_in_the_transcript.py](./TC023_Answer_by_typing_no_microphone_and_see_it_appear_in_the_transcript.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e5cbf5c4-557a-42cf-b7c6-e3df3911d147/04adc4d7-f7b9-44e7-a328-51b0d341747e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC025 Save portfolio with available username, visibility ON, and updated bio/social links
- **Test Code:** [TC025_Save_portfolio_with_available_username_visibility_ON_and_updated_biosocial_links.py](./TC025_Save_portfolio_with_available_username_visibility_ON_and_updated_biosocial_links.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Login failed - no account exists for email 'example@gmail.com' as indicated by the visible message 'No account found with this email'.
- Authentication flow cannot proceed to the password step because the account lookup blocked progression to password entry.
- Dashboard and Portfolio pages could not be reached because sign-in did not complete.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e5cbf5c4-557a-42cf-b7c6-e3df3911d147/c6de8c43-cb30-4181-be75-e801a01db860
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **6.67** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---