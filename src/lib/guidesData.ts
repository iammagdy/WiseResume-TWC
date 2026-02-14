export type GuideCategory = 'resume' | 'cover-letter' | 'interview' | 'career' | 'industry';

export interface Guide {
  slug: string;
  title: string;
  category: GuideCategory;
  readTimeMinutes: number;
  tags: string[];
  content: string;
}

export const GUIDE_CATEGORIES: { id: GuideCategory; label: string }[] = [
  { id: 'resume', label: 'Resume' },
  { id: 'cover-letter', label: 'Cover Letter' },
  { id: 'interview', label: 'Interview' },
  { id: 'career', label: 'Career' },
  { id: 'industry', label: 'Industry' },
];

export const guides: Guide[] = [
  // ── Resume Writing (10) ──
  {
    slug: 'ats-friendly-resume',
    title: 'How to Write an ATS-Friendly Resume',
    category: 'resume',
    readTimeMinutes: 7,
    tags: ['ats', 'keywords', 'formatting'],
    content: `# How to Write an ATS-Friendly Resume

Most companies use Applicant Tracking Systems (ATS) to filter resumes before a human ever sees them. Here's how to get past the bots.

## What Is an ATS?

An ATS is software that scans, parses, and ranks resumes based on keywords, formatting, and relevance to the job description. Over **98% of Fortune 500 companies** use one.

## Key Rules for ATS Compatibility

### 1. Use Standard Section Headers
Stick to recognizable headings:
- **Work Experience** (not "My Journey")
- **Education** (not "Learning Path")
- **Skills** (not "Toolbox")

### 2. Avoid Complex Formatting
- No tables, text boxes, or columns
- No headers/footers (ATS often can't read them)
- Use standard fonts (Arial, Calibri, Times New Roman)
- Save as PDF unless told otherwise

### 3. Mirror Job Description Keywords
- Read the job posting carefully
- Include exact phrases from the listing
- Use both acronyms and full terms (e.g., "Search Engine Optimization (SEO)")

### 4. Use Standard File Naming
Name your file: \`FirstName_LastName_Resume.pdf\`

### 5. Keep It Simple
- Bullet points instead of paragraphs
- No images or graphics
- Standard date formats (Month Year)

## Quick Checklist
- [ ] Standard section headers
- [ ] No tables or columns
- [ ] Keywords from job description included
- [ ] Clean, simple formatting
- [ ] Saved as PDF
- [ ] Contact info at the top (not in header)

## Common ATS Mistakes
1. Using creative templates with sidebars
2. Putting contact info in the header
3. Using icons instead of text
4. Submitting as .docx when PDF is accepted
5. Not tailoring keywords per application

> **Pro Tip:** Use WiseResume's Tailor feature to automatically match your resume keywords to any job description.`,
  },
  {
    slug: 'power-words-for-resumes',
    title: 'Power Words That Make Your Resume Stand Out',
    category: 'resume',
    readTimeMinutes: 5,
    tags: ['action verbs', 'writing', 'impact'],
    content: `# Power Words That Make Your Resume Stand Out

Replace weak verbs with powerful action words that demonstrate impact and leadership.

## Leadership & Management
- **Spearheaded** — Led a major initiative
- **Orchestrated** — Coordinated complex efforts
- **Championed** — Advocated for and drove change
- **Cultivated** — Developed relationships or culture
- **Mobilized** — Organized people toward a goal

## Achievement & Results
- **Accelerated** — Sped up a process or result
- **Exceeded** — Surpassed targets or expectations
- **Transformed** — Fundamentally changed something
- **Pioneered** — Was the first to do something
- **Maximized** — Optimized for best results

## Technical & Analytical
- **Engineered** — Designed and built
- **Automated** — Removed manual processes
- **Architected** — Designed systems or structures
- **Debugged** — Identified and fixed issues
- **Optimized** — Improved performance

## Communication & Collaboration
- **Negotiated** — Reached agreements
- **Facilitated** — Made processes easier
- **Synthesized** — Combined information effectively
- **Articulated** — Communicated clearly
- **Mentored** — Guided others' development

## Words to Avoid
- ❌ "Responsible for" → ✅ "Managed" or "Led"
- ❌ "Helped" → ✅ "Contributed to" or "Supported"
- ❌ "Worked on" → ✅ "Developed" or "Executed"
- ❌ "Did" → ✅ Use a specific action verb
- ❌ "Was part of" → ✅ "Collaborated on"

## Formula for Impact Statements

**Action Verb + Task + Result + Metric**

Examples:
- "**Accelerated** deployment pipeline, **reducing** release time by **40%**"
- "**Spearheaded** customer retention program, **increasing** renewal rate by **25%**"
- "**Automated** reporting workflow, **saving** the team **15 hours/week**"`,
  },
  {
    slug: 'quantify-achievements',
    title: 'How to Quantify Your Achievements',
    category: 'resume',
    readTimeMinutes: 6,
    tags: ['metrics', 'results', 'impact'],
    content: `# How to Quantify Your Achievements

Numbers make your resume 40% more likely to get an interview. Here's how to add metrics everywhere.

## The STAR-M Framework

- **S**ituation — Context
- **T**ask — Your responsibility
- **A**ction — What you did
- **R**esult — The outcome
- **M**etric — The number

## Types of Metrics

### Revenue & Growth
- Revenue generated or influenced
- Sales increase percentage
- New accounts acquired
- Market share gained

### Efficiency & Savings
- Time saved (hours/week)
- Cost reduction ($ or %)
- Process improvement percentage
- Error rate reduction

### Scale & Scope
- Team size managed
- Budget controlled
- Projects delivered
- Users/customers served

### Quality & Satisfaction
- Customer satisfaction scores
- Net Promoter Score improvement
- Quality rating
- Retention rate

## Before & After Examples

| Weak | Strong |
|------|--------|
| Managed a sales team | Led a team of 12 reps, achieving 130% of quarterly quota ($2.4M) |
| Improved customer service | Reduced response time from 24h to 4h, boosting CSAT by 18% |
| Created marketing content | Produced 50+ blog posts generating 200K monthly organic visitors |
| Handled budgets | Managed $1.2M annual budget, delivering projects 8% under budget |

## What If You Don't Have Exact Numbers?

Use approximations:
- "Approximately" or "~"
- Ranges: "15-20 projects"
- Frequency: "200+ daily interactions"
- Comparisons: "Top 5% of performers"

> **Remember:** Even estimates are better than no numbers at all.`,
  },
  {
    slug: 'resume-formats-explained',
    title: 'Resume Formats: Chronological vs Functional vs Hybrid',
    category: 'resume',
    readTimeMinutes: 5,
    tags: ['format', 'structure', 'layout'],
    content: `# Resume Formats Explained

Choosing the right format is the first step to a strong resume.

## Chronological (Most Common)

**Best for:** Steady career progression, same industry

Lists work experience in reverse chronological order.

**Pros:**
- ATS-friendly
- Easy for recruiters to follow
- Shows career growth clearly

**Cons:**
- Highlights employment gaps
- Less ideal for career changers

## Functional (Skills-Based)

**Best for:** Career changers, gaps in employment

Organizes by skills rather than job history.

**Pros:**
- Highlights transferable skills
- Downplays gaps or job-hopping

**Cons:**
- Many ATS struggle to parse it
- Recruiters may be suspicious

## Hybrid (Combination)

**Best for:** Most job seekers

Combines a skills summary with chronological work history.

**Pros:**
- Highlights both skills and experience
- Flexible structure
- ATS-compatible

**Cons:**
- Can be longer
- Requires more effort to organize

## Which Should You Choose?

| Situation | Recommended Format |
|-----------|-------------------|
| Steady career, same field | Chronological |
| Career change | Hybrid |
| Employment gaps | Hybrid or Functional |
| Entry-level | Hybrid |
| Senior/Executive | Chronological |
| Freelancer | Hybrid |

> **Our Recommendation:** Use the **Hybrid format** — it works for 90% of situations and is ATS-friendly.`,
  },
  {
    slug: 'common-resume-mistakes',
    title: '15 Common Resume Mistakes (And How to Fix Them)',
    category: 'resume',
    readTimeMinutes: 6,
    tags: ['mistakes', 'tips', 'improvement'],
    content: `# 15 Common Resume Mistakes

Avoid these pitfalls that can cost you interviews.

## Formatting Mistakes

### 1. Too Long
- Entry-level: 1 page
- Mid-career: 1-2 pages
- Senior/Executive: 2 pages max

### 2. Inconsistent Formatting
- Same font throughout
- Consistent date formats
- Uniform bullet styles

### 3. No White Space
- Use margins of at least 0.5"
- Space between sections
- Don't cram everything in

## Content Mistakes

### 4. Generic Objective Statement
Replace with a tailored professional summary.

### 5. Listing Duties Instead of Achievements
❌ "Responsible for managing team"
✅ "Led 8-person team to deliver project 2 weeks early"

### 6. Not Tailoring to the Job
Customize keywords and achievements for each application.

### 7. Including Irrelevant Experience
Only include what's relevant to the target role.

### 8. Typos and Grammar Errors
Proofread. Then proofread again. Then have someone else proofread.

## Strategic Mistakes

### 9. No Keywords
Mirror the job description's language and terms.

### 10. Missing Contact Information
Include: name, phone, email, LinkedIn, city/state.

### 11. Unprofessional Email
Use firstname.lastname@email.com, not partyanimal99@email.com.

### 12. Including References
"References available upon request" is unnecessary. Remove it.

### 13. Lying or Exaggerating
Background checks exist. Be truthful.

### 14. Using "I" or "My"
Resumes use implied first person. Skip the pronouns.

### 15. Not Using a Modern Template
A clean, modern design shows you're current and professional.`,
  },
  {
    slug: 'career-gap-resume',
    title: 'How to Address Career Gaps on Your Resume',
    category: 'resume',
    readTimeMinutes: 5,
    tags: ['career gaps', 'employment gaps', 'strategy'],
    content: `# How to Address Career Gaps on Your Resume

Career gaps are increasingly common and nothing to be ashamed of. Here's how to handle them.

## Reframe the Narrative

A gap isn't empty time — it's time you spent doing *something*. Frame it positively.

## Strategies by Gap Reason

### Parenting/Caregiving
- List as "Family Care Sabbatical" with dates
- Include any freelance, volunteer, or PTA work
- Emphasize skills: organization, multitasking, budget management

### Health Reasons
- You don't need to disclose specifics
- Simply use "Personal Sabbatical" or "Career Break"
- Focus on what you did to stay current

### Education/Upskilling
- List courses, certifications, bootcamps
- This is a strength, not a weakness

### Layoff/Job Search
- Note any freelance, consulting, or volunteer work
- Include relevant projects or open-source contributions

### Travel
- "Sabbatical — International Travel & Cultural Studies"
- Highlight language skills or cross-cultural competencies

## Resume Formatting Tips

1. **Use years only** (not months) to minimize visible gaps
2. **Include a brief note** in your summary addressing the gap
3. **Lead with skills** using a hybrid format
4. **Fill gaps** with freelance, volunteer, or project work

## What to Say in Interviews

Keep it brief, positive, and forward-looking:

> "I took time to [reason]. During that period, I [productive activity]. I'm now fully focused on [target role] and excited to bring my [relevant skills] to your team."`,
  },
  {
    slug: 'entry-level-resume',
    title: 'Entry-Level Resume Guide: No Experience? No Problem',
    category: 'resume',
    readTimeMinutes: 6,
    tags: ['entry-level', 'new grad', 'first job'],
    content: `# Entry-Level Resume Guide

You don't need years of experience to write a great resume. Here's how to showcase your potential.

## What to Include Instead of Work Experience

### Education (Lead With This)
- Degree, major, GPA (if 3.5+)
- Relevant coursework
- Academic projects
- Honors and awards

### Internships
- Treat like full work experience
- Quantify achievements where possible

### Projects
- Class projects, personal projects, hackathons
- Include tech stack, your role, and outcomes

### Volunteer Work
- Leadership roles
- Skills applied
- Impact made

### Extracurriculars
- Club leadership
- Sports teams (shows teamwork, discipline)
- Student government

### Certifications & Courses
- Online courses (Coursera, edX, Udemy)
- Industry certifications
- Workshops and bootcamps

## Resume Structure for Entry-Level

1. **Contact Information**
2. **Professional Summary** (2-3 sentences about your goals and strengths)
3. **Education**
4. **Projects / Internships**
5. **Skills** (technical and soft)
6. **Activities & Leadership**

## Sample Summary

> "Recent Computer Science graduate with hands-on experience in full-stack development through 3 academic projects and a summer internship. Passionate about building user-friendly applications. Seeking a junior developer role to apply my skills in React, Python, and agile methodologies."

## Pro Tips
- Focus on **transferable skills**: communication, problem-solving, teamwork
- Use the **hybrid format** to lead with skills
- Keep it to **one page**
- Tailor for each application`,
  },
  {
    slug: 'executive-resume',
    title: 'Executive Resume: Leadership-Level Best Practices',
    category: 'resume',
    readTimeMinutes: 6,
    tags: ['executive', 'senior', 'leadership', 'c-suite'],
    content: `# Executive Resume Best Practices

At the leadership level, your resume must demonstrate strategic impact, not just tactical execution.

## Key Differences from Standard Resumes

| Standard Resume | Executive Resume |
|----------------|-----------------|
| Task-focused | Strategy-focused |
| Individual contribution | Team/org impact |
| 1 page | 2 pages acceptable |
| Skills list | Leadership narrative |

## Must-Have Sections

### Executive Summary (Not Objective)
- 4-5 lines
- Industry + years of experience
- Signature achievements (2-3)
- Leadership philosophy in one line

### Core Competencies
- 9-12 leadership-relevant skills
- Strategic Planning, P&L Management, Board Relations
- Digital Transformation, Change Management

### Professional Experience
- Focus on the last 10-15 years
- Lead with scope: revenue, team size, geography
- 3-5 bullets per role maximum
- Every bullet should show strategic impact

### Board & Advisory Roles
- Include current and past board positions
- Industry associations and speaking engagements

## Metrics That Matter at the Executive Level

- Revenue growth ($M or %)
- Cost savings / efficiency gains
- Team/organization size
- Market expansion
- M&A activity
- Investor relations outcomes

## Executive Summary Example

> "Transformational technology executive with 20+ years driving digital innovation across Fortune 500 organizations. Delivered $150M+ in revenue growth through product-led strategies and built engineering teams of 200+. Known for turning around underperforming divisions and establishing data-driven cultures."`,
  },
  {
    slug: 'resume-length-guide',
    title: 'How Long Should Your Resume Be?',
    category: 'resume',
    readTimeMinutes: 4,
    tags: ['length', 'pages', 'formatting'],
    content: `# How Long Should Your Resume Be?

The answer depends on your experience level and industry.

## General Guidelines

| Experience | Recommended Length |
|-----------|-------------------|
| 0-5 years | 1 page |
| 5-15 years | 1-2 pages |
| 15+ years | 2 pages |
| Academic/Research | 2-3+ pages (CV) |
| Federal/Government | 3-5 pages |

## The One-Page Rule

For most job seekers with under 10 years of experience, **one page is ideal**.

### Why?
- Recruiters spend 6-7 seconds on initial scan
- Conciseness shows communication skills
- Forces you to prioritize

### How to Fit on One Page
- Remove outdated experience (15+ years ago)
- Cut irrelevant jobs
- Use concise bullet points (1-2 lines each)
- Reduce margins to 0.5" (no less)
- Use 10-11pt font size

## When Two Pages Are OK
- 10+ years of relevant experience
- Multiple technical skills to list
- Publications, patents, or certifications
- Career changers who need to show transferable skills

## Never Do This
- Don't use 8pt font to squeeze content
- Don't remove all white space
- Don't include a "filler" second page with just 3 lines
- Don't include every job you've ever had

> **Rule of Thumb:** If your second page is less than half full, cut it to one page.`,
  },
  {
    slug: 'skills-section-guide',
    title: 'How to Write a Killer Skills Section',
    category: 'resume',
    readTimeMinutes: 5,
    tags: ['skills', 'technical skills', 'soft skills'],
    content: `# How to Write a Killer Skills Section

Your skills section is prime real estate for ATS keywords and quick recruiter scanning.

## Structure Options

### Simple List (Best for ATS)
\`\`\`
Skills: JavaScript, React, Node.js, Python, AWS, Docker, Agile, CI/CD
\`\`\`

### Categorized (Best for Readability)
\`\`\`
Languages: JavaScript, Python, TypeScript, SQL
Frameworks: React, Node.js, Express, Django
Tools: AWS, Docker, Git, Jenkins
Methods: Agile, Scrum, TDD, CI/CD
\`\`\`

### Proficiency Levels (Use Sparingly)
Only if the job specifically asks for proficiency levels.

## What to Include

### Hard Skills (Always Include)
- Programming languages
- Software and tools
- Certifications
- Technical methodologies
- Industry-specific tools

### Soft Skills (Include Selectively)
Only include soft skills that are:
- Mentioned in the job description
- Backed up by your experience bullets

Good: "Cross-functional Team Leadership" (proven in experience section)
Bad: "Hard worker" (unverifiable)

## Skills to Skip
- Microsoft Office (assumed unless entry-level)
- "Internet research" (everyone can Google)
- Outdated tech (Flash, IE6 optimization)
- Subjective traits (creative, innovative — show, don't tell)

## Pro Tips
1. **Match the job description** — use their exact phrasing
2. **Order by relevance** — most important skills first
3. **Update for each application** — tailor your skills list
4. **Include both acronyms and full names** — "SEO (Search Engine Optimization)"`,
  },

  // ── Cover Letters (5) ──
  {
    slug: 'cover-letter-structure',
    title: 'The Perfect Cover Letter Structure',
    category: 'cover-letter',
    readTimeMinutes: 5,
    tags: ['structure', 'format', 'template'],
    content: `# The Perfect Cover Letter Structure

A well-structured cover letter follows a simple 4-paragraph format.

## Paragraph 1: The Hook
- State the position you're applying for
- How you found it
- One compelling reason you're the right fit

**Example:**
> "As a data scientist with 5 years of experience building ML models that have driven $2M+ in revenue, I was thrilled to see your Senior Data Scientist opening at [Company]."

## Paragraph 2: Why You're Qualified
- 2-3 specific achievements relevant to the role
- Mirror keywords from the job description
- Quantify results

## Paragraph 3: Why This Company
- Show you've researched the company
- Connect your values/goals to their mission
- Mention specific projects, products, or culture aspects

## Paragraph 4: The Close
- Express enthusiasm
- Mention next steps
- Thank them for their time

**Example:**
> "I'd welcome the opportunity to discuss how my experience in [skill] can contribute to [Company]'s [goal]. Thank you for your time and consideration."

## Formatting Rules
- One page maximum
- Same header as your resume
- Professional greeting (Dear [Name], or Dear Hiring Manager)
- 3-4 paragraphs
- Professional sign-off (Sincerely, Best regards)`,
  },
  {
    slug: 'cover-letter-opening',
    title: 'How to Write a Compelling Opening Paragraph',
    category: 'cover-letter',
    readTimeMinutes: 4,
    tags: ['opening', 'hook', 'first impression'],
    content: `# How to Write a Compelling Opening Paragraph

Your opening paragraph determines whether the reader continues or moves on.

## What to Include
1. The specific role you're applying for
2. Your most impressive relevant qualification
3. A hook that makes them want to read more

## Opening Formulas That Work

### The Achievement Lead
> "After increasing SaaS revenue by 45% in my current role, I'm excited to bring my growth marketing expertise to [Company]'s expanding team."

### The Passion Lead
> "As someone who has been following [Company]'s innovation in sustainable energy for three years, I was excited to see the opening for [Role]."

### The Referral Lead
> "When [Name] on your engineering team mentioned you're looking for a backend developer experienced in distributed systems, I knew I had to apply."

### The Problem-Solver Lead
> "I noticed [Company] is expanding into the European market — as someone who's led three successful international launches, I'd love to help."

## Openings to Avoid
- ❌ "I am writing to apply for..." (boring)
- ❌ "To whom it may concern..." (impersonal)
- ❌ "I believe I would be a good fit..." (weak)
- ❌ Starting with your life story
- ❌ Humor (risky in formal contexts)`,
  },
  {
    slug: 'cover-letter-closing',
    title: 'Strong Closing Paragraphs for Cover Letters',
    category: 'cover-letter',
    readTimeMinutes: 3,
    tags: ['closing', 'call to action', 'sign-off'],
    content: `# Strong Closing Paragraphs

Your closing should leave a confident, professional impression and include a clear call to action.

## The Formula

**Enthusiasm + Value proposition + Call to action + Thank you**

## Examples by Tone

### Confident
> "I'm confident that my experience in [skill] would make an immediate impact on [Company]'s [goal]. I'd welcome the chance to discuss this further and am available at your convenience."

### Enthusiastic
> "I'm genuinely excited about the opportunity to join [Company] and contribute to [specific initiative]. I look forward to hearing from you."

### Direct
> "I'd appreciate 20 minutes of your time to discuss how I can help [Company] achieve [goal]. I'll follow up next week if I haven't heard back."

## Sign-Off Options
- **Sincerely** — Safe, professional
- **Best regards** — Slightly warmer
- **Thank you** — Simple and effective
- **Respectfully** — Very formal

## What NOT to Do
- Don't apologize for lack of experience
- Don't say "I hope to hear from you" (passive)
- Don't mention salary expectations (unless asked)
- Don't use "Cheers" or "Thanks!" (too casual)`,
  },
  {
    slug: 'cold-application-cover-letter',
    title: 'Cover Letters for Cold Applications',
    category: 'cover-letter',
    readTimeMinutes: 4,
    tags: ['cold application', 'unsolicited', 'networking'],
    content: `# Cover Letters for Cold Applications

Applying to a company that hasn't posted a job? Here's how to write a compelling unsolicited cover letter.

## When to Send a Cold Application
- Dream company with no current openings
- Small companies that don't always post jobs
- After networking events or informational interviews
- When you have a strong referral

## Structure

### 1. Explain Why This Company
Show genuine knowledge of and interest in their work.

### 2. Identify a Problem You Can Solve
Research their challenges (press releases, annual reports, product reviews) and position yourself as the solution.

### 3. Prove Your Value
Share 2-3 specific, relevant achievements.

### 4. Make the Ask
Request an informational meeting, not a job.

## Example Opening
> "I've admired [Company]'s approach to [specific thing] since [when]. As your team scales to meet [specific challenge you've identified], I believe my background in [skill] could help."

## Pro Tips
- Address a specific person (research on LinkedIn)
- Keep it shorter than a standard cover letter
- Follow up once after 7-10 days
- Connect on LinkedIn before or after
- Mention any mutual connections`,
  },
  {
    slug: 'referral-cover-letter',
    title: 'How to Write a Referral Cover Letter',
    category: 'cover-letter',
    readTimeMinutes: 3,
    tags: ['referral', 'networking', 'connections'],
    content: `# How to Write a Referral Cover Letter

Having a referral can increase your chances of getting hired by up to 10x. Here's how to leverage it properly.

## Drop the Name Early

Mention your referral in the very first sentence:

> "[Referrer's Name], a [their title] at [Company], suggested I reach out regarding the [Position] opening."

## Structure

1. **Open with the referral** — Name, their role, how they recommended you
2. **Connect to the role** — Why you're a great fit (2-3 achievements)
3. **Show company knowledge** — Prove you're not just relying on the referral
4. **Close with action** — Reference the referral again

## Do's and Don'ts

### Do
- Confirm with your referrer before using their name
- Mention how you know each other
- Still make a strong case for yourself
- Thank the referrer separately

### Don't
- Name-drop without substance
- Assume the referral guarantees the job
- Skip researching the company
- Forget to tailor your resume too

## Example
> "After discussing my experience in supply chain optimization with Sarah Chen on your operations team, she encouraged me to apply for the Supply Chain Manager role. With 8 years of experience reducing logistics costs by an average of 22%, I'm excited about the opportunity to bring similar results to [Company]."`,
  },

  // ── Interview Prep (5) ──
  {
    slug: 'star-method',
    title: 'Master the STAR Method for Interviews',
    category: 'interview',
    readTimeMinutes: 6,
    tags: ['star method', 'behavioral', 'answers'],
    content: `# Master the STAR Method

The STAR method is the gold standard for answering behavioral interview questions.

## What Is STAR?

- **S**ituation — Set the scene
- **T**ask — Describe your responsibility
- **A**ction — Explain what you did
- **R**esult — Share the outcome (with numbers!)

## Example Question
*"Tell me about a time you had to meet a tight deadline."*

### Bad Answer
> "I always work well under pressure. I just buckle down and get it done."

### STAR Answer
> **Situation:** "In my previous role, our biggest client moved their product launch up by 3 weeks."
>
> **Task:** "As the project lead, I needed to deliver the marketing campaign on the new timeline without compromising quality."
>
> **Action:** "I restructured the project plan, delegated tasks based on team strengths, and set up daily 15-minute standups. I also negotiated with the client to prioritize the 5 most critical deliverables."
>
> **Result:** "We delivered all priority assets 2 days early, and the campaign generated 40% more leads than projected. The client renewed their contract for 2 more years."

## Common Behavioral Questions to Prepare
1. Tell me about a time you failed
2. Describe a conflict with a coworker
3. When did you go above and beyond?
4. Tell me about a time you led a team
5. Describe a time you had to learn quickly

## Pro Tips
- Prepare 8-10 STAR stories that cover different competencies
- Keep each answer under 2 minutes
- Always end with a measurable result
- Practice out loud, not just in your head`,
  },
  {
    slug: 'behavioral-interview-questions',
    title: '30 Common Behavioral Interview Questions',
    category: 'interview',
    readTimeMinutes: 7,
    tags: ['behavioral', 'questions', 'preparation'],
    content: `# 30 Common Behavioral Interview Questions

Prepare for these questions using the STAR method. Group them by competency.

## Leadership
1. Tell me about a time you led a team through a difficult project
2. Describe a situation where you had to make an unpopular decision
3. How have you motivated someone who was underperforming?
4. Tell me about a time you delegated effectively
5. Describe a time you had to lead without formal authority

## Problem-Solving
6. Tell me about a complex problem you solved
7. Describe a time you had to make a decision with incomplete information
8. How did you handle a situation that didn't go as planned?
9. Tell me about a time you identified a problem before it became critical
10. Describe an innovative solution you implemented

## Teamwork
11. Tell me about a time you worked with a difficult colleague
12. Describe how you handled a disagreement in a team
13. When did you have to compromise to achieve a goal?
14. Tell me about a successful cross-functional project
15. How do you handle it when a team member isn't pulling their weight?

## Communication
16. Describe a time you had to explain something complex to a non-technical audience
17. Tell me about a difficult conversation you had at work
18. How have you handled giving negative feedback?
19. Describe a time you had to persuade someone to see your point of view
20. Tell me about a presentation that went well

## Adaptability
21. Tell me about a time you had to learn something new quickly
22. Describe how you handled a major change at work
23. When did you have to adapt your approach mid-project?
24. Tell me about a time you worked outside your comfort zone
25. How did you handle multiple competing priorities?

## Integrity & Values
26. Tell me about a time you made a mistake and how you handled it
27. Describe a situation where you stood up for what was right
28. When did you have to go against company norms?
29. Tell me about a time you received tough feedback
30. Describe a time you had to admit you were wrong`,
  },
  {
    slug: 'salary-negotiation',
    title: 'How to Negotiate Your Salary Like a Pro',
    category: 'interview',
    readTimeMinutes: 7,
    tags: ['salary', 'negotiation', 'compensation'],
    content: `# How to Negotiate Your Salary

Most people leave money on the table by not negotiating. Here's a proven approach.

## Before the Negotiation

### Research
- Use Glassdoor, Levels.fyi, Payscale, LinkedIn Salary
- Know the range for your role, location, and experience
- Factor in total compensation (base, bonus, equity, benefits)

### Know Your Number
- **Target:** What you ideally want
- **Minimum:** Your walk-away number
- **Anchor:** Your opening ask (10-20% above target)

## During the Negotiation

### Rule 1: Let Them Go First
> "I'd love to learn more about the total compensation package you have in mind for this role."

### Rule 2: Don't Panic
When they give a number, pause. Count to 5. Then respond.

### Rule 3: Counter with Confidence
> "Thank you for that offer. Based on my research and the value I'd bring — particularly my experience in [specific skill] — I was targeting something in the range of [your anchor]."

### Rule 4: Negotiate Beyond Salary
If base salary is firm, negotiate:
- Signing bonus
- Annual bonus target
- Equity/stock options
- Remote work flexibility
- Extra PTO
- Professional development budget
- Title upgrade

## Scripts for Common Situations

### "What are your salary expectations?"
> "I'm focused on finding the right fit. Can you share the budgeted range for this role?"

### "We can't go higher on base"
> "I understand. Would you be open to discussing a signing bonus or additional equity?"

### "This is our final offer"
> "I appreciate your transparency. Before I make my decision, could we discuss [one more thing]?"

## Key Principles
- Always negotiate — 84% of employers expect it
- Be collaborative, not combative
- Get the final offer in writing
- Never accept on the spot — ask for 24-48 hours`,
  },
  {
    slug: 'video-interview-tips',
    title: 'Video Interview Tips: Look Professional on Camera',
    category: 'interview',
    readTimeMinutes: 4,
    tags: ['video', 'remote', 'virtual', 'zoom'],
    content: `# Video Interview Tips

Remote interviews are now standard. Here's how to nail them.

## Setup Checklist

### Tech
- [ ] Test camera, mic, and speakers 30 min before
- [ ] Use a wired internet connection if possible
- [ ] Close unnecessary apps and browser tabs
- [ ] Charge your device or plug in
- [ ] Have a backup device ready

### Environment
- [ ] Clean, neutral background
- [ ] Good lighting (face a window or use a ring light)
- [ ] Camera at eye level
- [ ] Quiet room with door closed
- [ ] "Do not disturb" on phone

### Appearance
- [ ] Dress fully (yes, pants too)
- [ ] Solid colors work best on camera
- [ ] Avoid busy patterns
- [ ] Minimize jewelry that catches light

## During the Interview

### Eye Contact
- Look at the **camera**, not the screen
- Place a small sticky note near your camera as a reminder

### Body Language
- Sit up straight, slightly forward
- Use hand gestures naturally
- Nod to show engagement
- Smile genuinely

### Audio
- Use headphones to avoid echo
- Mute when not speaking (in panel interviews)
- Speak slightly slower than normal
- Pause before answering

## Common Video Interview Mistakes
1. Looking at yourself instead of the camera
2. Forgetting to unmute
3. Having notifications pop up
4. Bad lighting (backlit = silhouette)
5. Cluttered or distracting background
6. Not testing tech beforehand`,
  },
  {
    slug: 'questions-to-ask-interviewer',
    title: '20 Great Questions to Ask Your Interviewer',
    category: 'interview',
    readTimeMinutes: 5,
    tags: ['questions', 'interviewer', 'preparation'],
    content: `# 20 Great Questions to Ask Your Interviewer

"Do you have any questions?" is your chance to stand out and evaluate the company.

## About the Role
1. "What does a typical day look like in this role?"
2. "What are the biggest challenges someone in this position would face?"
3. "What would success look like in the first 90 days?"
4. "How is performance measured for this role?"

## About the Team
5. "Can you tell me about the team I'd be working with?"
6. "What's the team's biggest priority right now?"
7. "How does the team collaborate — what tools do you use?"
8. "What's the management style of the person I'd report to?"

## About Growth
9. "What opportunities for professional development do you offer?"
10. "Where have people in this role progressed to?"
11. "Is there a mentorship program?"
12. "How often are performance reviews conducted?"

## About the Company
13. "What's the company culture like day-to-day?"
14. "What are the company's biggest goals for the next year?"
15. "How has the company changed in the last few years?"
16. "What do you personally enjoy most about working here?"

## Strategic Questions
17. "What's the biggest challenge the company is facing right now?"
18. "How does this role contribute to the company's larger goals?"
19. "Is there anything about my background that gives you pause?"
20. "What are the next steps in the interview process?"

## Questions to Avoid
- ❌ "What does your company do?" (should know this)
- ❌ "How soon can I take vacation?" (too early)
- ❌ "Did I get the job?" (puts them on the spot)
- ❌ Questions answered on their website`,
  },

  // ── Career Advice (5) ──
  {
    slug: 'job-search-strategies',
    title: 'Effective Job Search Strategies for 2025',
    category: 'career',
    readTimeMinutes: 6,
    tags: ['job search', 'strategy', 'applications'],
    content: `# Effective Job Search Strategies

The job market has evolved. Here's what actually works today.

## The Multi-Channel Approach

### 1. Job Boards (30% of your time)
- LinkedIn Jobs, Indeed, Glassdoor
- Set up alerts for target roles
- Apply within 24 hours of posting
- Tailor every application

### 2. Networking (40% of your time)
- Reconnect with former colleagues
- Attend industry events and meetups
- Join professional associations
- Engage on LinkedIn regularly
- Ask for informational interviews

### 3. Direct Outreach (20% of your time)
- Research target companies
- Find hiring managers on LinkedIn
- Send personalized messages
- Follow up once after a week

### 4. Recruiters (10% of your time)
- Connect with industry-specific recruiters
- Keep your LinkedIn profile updated
- Respond promptly to recruiter messages
- Be honest about your requirements

## Weekly Schedule

| Day | Activity |
|-----|----------|
| Monday | Research 5 target companies |
| Tuesday | Apply to 3-5 tailored positions |
| Wednesday | Networking (messages, events) |
| Thursday | Apply to 3-5 more positions |
| Friday | Follow-ups and informational interviews |

## Track Everything
- Spreadsheet or app tracking applications
- Note: company, role, date applied, contact, status
- Follow up after 1 week if no response
- Review and adjust strategy monthly

> **Pro Tip:** Use WiseResume's Application Tracker to manage your entire job search.`,
  },
  {
    slug: 'networking-guide',
    title: 'Professional Networking: Build Genuine Connections',
    category: 'career',
    readTimeMinutes: 5,
    tags: ['networking', 'connections', 'career growth'],
    content: `# Professional Networking Guide

Networking isn't about collecting contacts — it's about building genuine relationships.

## The Mindset Shift

❌ "What can this person do for me?"
✅ "How can we help each other?"

## Where to Network

### Online
- LinkedIn (most important platform)
- Industry Slack communities
- Twitter/X (for thought leadership)
- Virtual conferences and webinars

### In Person
- Industry conferences
- Local meetups (Meetup.com)
- Professional associations
- Alumni events
- Coffee chats

## How to Start a Conversation

### At Events
> "Hi, I'm [Name]. What brought you to this event?"

### On LinkedIn
> "Hi [Name], I came across your post about [topic] and really appreciated your perspective on [specific point]. I'm also working in [field] and would love to connect."

### Following Up
> "It was great meeting you at [event]. I really enjoyed our conversation about [topic]. Would love to continue it over coffee sometime."

## Networking Rules

1. **Give before you ask** — Share articles, make introductions, offer help
2. **Be consistent** — Network when you *don't* need something
3. **Follow up within 48 hours** of meeting someone
4. **Be specific** when asking for help
5. **Keep notes** on your contacts (where you met, what you discussed)
6. **Quality over quantity** — 20 strong connections > 500 acquaintances`,
  },
  {
    slug: 'linkedin-optimization',
    title: 'LinkedIn Profile Optimization Checklist',
    category: 'career',
    readTimeMinutes: 5,
    tags: ['linkedin', 'profile', 'optimization'],
    content: `# LinkedIn Profile Optimization

Your LinkedIn profile is your 24/7 resume. Here's how to make it work harder for you.

## Profile Completeness Checklist

### Photo & Banner
- [ ] Professional headshot (get 14x more views)
- [ ] Custom banner image (company, personal brand, or industry)

### Headline (Most Important)
Don't just list your job title. Use the formula:

**[Role] | [Key Skill] | [Value Proposition]**

Example: "Senior Product Manager | Building Products That Scale | Ex-Google, Ex-Meta"

### About Section (2000 characters)
Structure:
1. Hook — Compelling first line (visible before "See more")
2. Value — What you do and who you help
3. Achievements — 3-5 key accomplishments with numbers
4. Call to action — How to reach you

### Experience
- Mirror your resume but add more context
- Use multimedia: attach presentations, links, articles
- Tag companies and colleagues

### Skills
- Add 50 skills (max allowed)
- Reorder with most relevant on top
- Get endorsements from colleagues

### Recommendations
- Aim for 5+ recommendations
- Give to receive — write for others first
- Ask specific people for specific skill recommendations

## Engagement Strategy

### Post Regularly
- Share industry insights (2-3 times/week)
- Comment on others' posts (5-10/day)
- Celebrate team wins
- Share career lessons

### Content Ideas
- "Here's what I learned from..."
- Industry trend analysis
- Book/course recommendations
- Behind-the-scenes at work
- Career milestone reflections

## Recruiter Visibility
- Turn on "Open to Work" (visible to recruiters only)
- Set job preferences accurately
- Use industry keywords throughout your profile
- Engage with target companies' content`,
  },
  {
    slug: 'personal-branding',
    title: 'Build Your Personal Brand for Career Growth',
    category: 'career',
    readTimeMinutes: 5,
    tags: ['branding', 'visibility', 'thought leadership'],
    content: `# Build Your Personal Brand

In a competitive market, your personal brand is what sets you apart.

## What Is Personal Branding?

It's the intersection of:
- **What you're great at** (skills)
- **What you're passionate about** (interests)
- **What the market needs** (demand)

## Step-by-Step Process

### 1. Define Your Brand
Answer these questions:
- What do I want to be known for?
- What's my unique perspective?
- Who is my target audience?
- What value do I provide?

### 2. Create Your Brand Statement
**"I help [audience] achieve [result] through [method/skill]."**

Example: "I help startups scale their engineering teams through data-driven hiring practices."

### 3. Choose Your Platforms
Pick 1-2 to focus on:
- **LinkedIn** — Professional audience
- **Twitter/X** — Tech, media, startup communities
- **Personal blog** — Deep dives and portfolio
- **YouTube** — Teaching and tutorials
- **GitHub** — Code portfolio

### 4. Create Content Consistently
- Start with one platform
- Post 2-3 times per week minimum
- Share expertise, lessons, and stories
- Engage with your community

### 5. Build Social Proof
- Speak at events (start small — meetups)
- Guest post on industry blogs
- Get featured in podcasts
- Collect testimonials
- Share wins publicly

## Personal Branding Don'ts
- Don't try to appeal to everyone
- Don't be inauthentic
- Don't only self-promote (80/20 rule: give 80%, ask 20%)
- Don't give up after 2 weeks — it takes 6-12 months`,
  },
  {
    slug: 'remote-work-tips',
    title: 'Thriving in Remote Work: Best Practices',
    category: 'career',
    readTimeMinutes: 5,
    tags: ['remote work', 'work from home', 'productivity'],
    content: `# Thriving in Remote Work

Remote work requires intentional habits to stay productive and connected.

## Setting Up for Success

### Workspace
- Dedicated workspace (even a corner counts)
- Ergonomic chair and desk
- Good lighting
- Reliable internet (consider a backup)
- Noise-canceling headphones

### Routine
- Start and end at consistent times
- Morning routine before "commute" to desk
- Get dressed (even if casual)
- Take a real lunch break
- Create an end-of-day shutdown ritual

## Productivity Strategies

### Time Management
- **Time blocking** — Schedule deep work in 90-min blocks
- **Pomodoro Technique** — 25 min work, 5 min break
- **Eat the frog** — Tackle hardest task first
- **Batch meetings** — Group them together

### Communication
- Over-communicate status and progress
- Use async communication when possible
- Be responsive during core hours
- Turn on camera for important meetings
- Document decisions in writing

### Boundaries
- Set "office hours" and share with team
- Use status indicators (Slack, Teams)
- Turn off notifications after hours
- Have a physical trigger to end work (close laptop, change clothes)

## Staying Connected

- Schedule virtual coffee chats with colleagues
- Join optional team activities
- Share personal updates (not just work)
- Visit the office periodically if hybrid
- Build relationships with remote colleagues

## Common Remote Work Challenges

| Challenge | Solution |
|-----------|----------|
| Loneliness | Coworking spaces, daily standups |
| Overworking | Strict end-of-day time |
| Distractions | Dedicated workspace, focus apps |
| Career visibility | Regular 1:1s, document achievements |
| Collaboration | Async tools, recorded Looms |`,
  },

  // ── Industry Insights (5) ──
  {
    slug: 'tech-industry-careers',
    title: 'Tech Industry Career Guide',
    category: 'industry',
    readTimeMinutes: 6,
    tags: ['tech', 'software', 'engineering', 'career paths'],
    content: `# Tech Industry Career Guide

The tech industry offers diverse career paths with strong growth potential.

## Common Tech Roles

### Engineering
- **Software Engineer** — Build products (most common)
- **Frontend/Backend/Full-Stack** — Web development specializations
- **DevOps/SRE** — Infrastructure and reliability
- **Data Engineer** — Data pipelines and infrastructure
- **Mobile Developer** — iOS/Android apps
- **ML/AI Engineer** — Machine learning systems

### Product & Design
- **Product Manager** — Strategy and roadmap
- **UX Designer** — User experience
- **UI Designer** — Visual design
- **UX Researcher** — User insights

### Data
- **Data Scientist** — Analysis and modeling
- **Data Analyst** — Business intelligence
- **Business Analyst** — Requirements and processes

## Career Progression

### Individual Contributor Track
Junior → Mid → Senior → Staff → Principal → Distinguished

### Management Track
Team Lead → Engineering Manager → Director → VP → CTO

## Salary Ranges (US, 2025)

| Role | Entry | Mid | Senior |
|------|-------|-----|--------|
| Software Engineer | $90-120K | $130-180K | $180-300K+ |
| Product Manager | $100-130K | $140-180K | $180-280K+ |
| Data Scientist | $95-125K | $130-170K | $170-250K+ |
| UX Designer | $80-110K | $120-160K | $160-220K+ |

*Note: Total compensation at top companies can be 2-3x base salary with equity.*

## Resume Tips for Tech
- Include GitHub and portfolio links
- List specific technologies and frameworks
- Quantify impact (users served, latency reduced, etc.)
- Show system design and architecture experience
- Highlight open-source contributions`,
  },
  {
    slug: 'healthcare-careers',
    title: 'Healthcare Career Paths & Resume Tips',
    category: 'industry',
    readTimeMinutes: 5,
    tags: ['healthcare', 'medical', 'nursing'],
    content: `# Healthcare Career Paths

Healthcare is one of the fastest-growing sectors with diverse career opportunities.

## Clinical Paths

### Nursing
- CNA → LPN → RN → NP/CNS
- Specializations: ICU, ER, Pediatrics, Oncology
- Growing demand for Nurse Practitioners

### Physicians
- MD/DO → Residency → Fellowship → Attending
- Primary Care vs. Specialist
- Growing: Telemedicine, Geriatrics

### Allied Health
- Physical Therapist
- Occupational Therapist
- Speech-Language Pathologist
- Respiratory Therapist
- Radiologic Technologist

## Non-Clinical Paths

### Administration
- Hospital Administrator
- Practice Manager
- Health Information Manager
- Compliance Officer

### Technology
- Health Informatics
- EHR Implementation
- Clinical Data Analyst
- Telehealth Coordinator

### Business
- Healthcare Consultant
- Pharmaceutical Sales
- Medical Device Sales
- Health Insurance

## Resume Tips for Healthcare
- Include all licenses and certifications prominently
- List clinical rotations and specializations
- Mention EHR systems you've used (Epic, Cerner)
- Highlight patient outcomes and quality metrics
- Include continuing education
- Quantify: patient load, department size, satisfaction scores

## Industry Trends
- Telehealth expansion
- AI in diagnostics
- Value-based care models
- Mental health focus
- Population health management`,
  },
  {
    slug: 'finance-industry-guide',
    title: 'Finance Industry Career Guide',
    category: 'industry',
    readTimeMinutes: 5,
    tags: ['finance', 'banking', 'investment'],
    content: `# Finance Industry Career Guide

Finance offers high-earning potential with multiple specialization paths.

## Major Sectors

### Investment Banking
- Analyst → Associate → VP → Director → MD
- M&A, Capital Markets, Restructuring
- Long hours but high compensation

### Asset Management
- Research Analyst → Portfolio Manager
- Equity, Fixed Income, Alternatives
- More lifestyle-friendly than banking

### Private Equity & Venture Capital
- Associate → Principal → Partner
- Highly competitive entry
- Significant carried interest potential

### Corporate Finance
- Financial Analyst → Finance Manager → CFO
- FP&A, Treasury, Investor Relations
- Better work-life balance

### Financial Technology (FinTech)
- Product Manager, Engineer, Data Scientist
- Payments, Lending, InsurTech, Crypto
- Startup culture with finance expertise

## Key Certifications
- **CFA** — Investment management gold standard
- **CPA** — Accounting and audit
- **FRM** — Risk management
- **Series 7/63** — Securities trading
- **CFP** — Financial planning

## Resume Tips for Finance
- Quantify deal sizes, AUM, portfolio returns
- Lead with relevant certifications
- Highlight Excel, Python, Bloomberg, SQL skills
- Include financial modeling experience
- Show progression in responsibility
- Use precise financial terminology`,
  },
  {
    slug: 'marketing-careers',
    title: 'Marketing Career Guide: From Digital to Brand',
    category: 'industry',
    readTimeMinutes: 5,
    tags: ['marketing', 'digital marketing', 'brand'],
    content: `# Marketing Career Guide

Marketing has evolved dramatically with digital channels. Here's how to navigate your career.

## Career Paths

### Digital Marketing
- SEO Specialist
- PPC/SEM Manager
- Social Media Manager
- Email Marketing Specialist
- Content Marketing Manager
- Growth Marketing Manager

### Brand & Creative
- Brand Manager
- Creative Director
- Copywriter
- Art Director
- Brand Strategist

### Analytics & Strategy
- Marketing Analyst
- Marketing Data Scientist
- Customer Insights Manager
- Market Research Analyst

### Product Marketing
- Product Marketing Manager
- Go-to-Market Strategist
- Competitive Intelligence Analyst

## Progression
Coordinator → Specialist → Manager → Senior Manager → Director → VP → CMO

## Essential Skills

### Technical
- Google Analytics / GA4
- SEO tools (Ahrefs, SEMrush)
- Marketing automation (HubSpot, Marketo)
- A/B testing platforms
- SQL and data visualization
- CMS platforms

### Strategic
- Campaign planning
- Budget management
- Brand positioning
- Customer journey mapping
- Market segmentation

## Resume Tips for Marketing
- **Quantify everything:** CTR, conversion rates, ROI, revenue influenced
- Lead with results, not responsibilities
- Include portfolio link (campaigns, content, designs)
- List specific tools and platforms
- Show progression from tactical to strategic
- Include notable brands or campaigns worked on`,
  },
  {
    slug: 'career-path-general',
    title: 'Finding Your Career Path: A Framework',
    category: 'industry',
    readTimeMinutes: 6,
    tags: ['career path', 'career change', 'planning'],
    content: `# Finding Your Career Path

Not sure what career path to pursue? Use this framework to find clarity.

## The Ikigai Framework

Find the intersection of:
1. **What you love** (Passion)
2. **What you're good at** (Skills)
3. **What the world needs** (Mission)
4. **What you can be paid for** (Profession)

## Self-Assessment Exercise

### Step 1: Audit Your Energy
For one week, track:
- Activities that energize you
- Activities that drain you
- Tasks where time flies
- Skills that come naturally

### Step 2: Identify Your Strengths
Ask 5 people: "What do you think I'm best at?"

Compare their answers with your self-assessment.

### Step 3: Research Industries
- Talk to people in roles you're curious about
- Shadow or volunteer in different environments
- Take online courses to test interest
- Read industry publications

### Step 4: Test Before Committing
- Freelance or contract work
- Side projects
- Volunteer positions
- Part-time courses
- Informational interviews

## Career Change Checklist

- [ ] Identify transferable skills
- [ ] Research target industry salary and growth
- [ ] Talk to 5+ people in the target field
- [ ] Take a relevant course or certification
- [ ] Update resume with transferable skills highlighted
- [ ] Build a portfolio or proof of work
- [ ] Start networking in the new field
- [ ] Consider a bridge role (hybrid of old and new)

## Red Flags of a Wrong Career
- Sunday night dread every week
- No interest in industry developments
- Can't see yourself growing in the role
- Values misalignment with the industry
- Consistently low energy at work

## Making the Transition
1. Don't quit your job immediately
2. Build skills on the side (nights, weekends)
3. Save 6 months of expenses
4. Start with a bridge role if possible
5. Leverage your existing network

> **Remember:** Career changes take 3-12 months of preparation. Be patient with yourself.`,
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find(g => g.slug === slug);
}

export function getGuidesByCategory(category: GuideCategory): Guide[] {
  return guides.filter(g => g.category === category);
}

export function searchGuides(query: string): Guide[] {
  const q = query.toLowerCase();
  return guides.filter(g =>
    g.title.toLowerCase().includes(q) ||
    g.tags.some(t => t.toLowerCase().includes(q)) ||
    g.content.toLowerCase().includes(q)
  );
}
