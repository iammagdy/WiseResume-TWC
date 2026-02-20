# WiseResume - AI Resume Editor

WiseResume is an advanced AI-powered career assistant designed to help job seekers optimize their resumes, simulate interviews, and navigate their career paths with confidence. Powered by **Wise AI**, this application leverages cutting-edge artificial intelligence to provide personalized feedback and tailoring.

**Part of the Wise Universe.**

## Key Features

- **Recruiter Simulator**: Test your resume against AI-simulated recruiters to identify strengths and weaknesses before you apply.
- **Biometric Security**: Mobile-first security ensures your personal data is protected with the latest biometric authentication standards.
- **Agentic Chat**: Engage with an intelligent career advisor for real-time resume tailoring, gap analysis, and interview preparation.
- **Intelligent Tailoring**: Automatically customize your resume for specific job descriptions to increase your chances of passing ATS filters.

## Getting Started

To run this project locally:

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    # or
    bun install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    # or
    bun dev
    ```

## Development

This project is built with:
- Vite
- React
- TypeScript
- Tailwind CSS
- Shadcn UI
- Supabase

## Lighthouse Baseline

Run Lighthouse in Chrome DevTools → **Lighthouse** tab → select **Mobile**, check **Performance** + **Best Practices** → click **Analyze**.

| Metric      | Before | After |
|-------------|--------|-------|
| Performance |        |       |
| FCP         |        |       |
| LCP         |        |       |
| TBT         |        |       |
| CLS         |        |       |

## React Profiling Steps

1. Install the [React Developer Tools](https://react.dev/learn/react-developer-tools) browser extension.
2. Open **Profiler** tab → click **Record** → interact with the app (navigate, edit CV, open modals).
3. Stop recording and inspect components with high **render time** or frequent re-renders.
4. Apply `React.memo`, `useMemo`, or `useCallback` to identified hot spots.

## Real Device & Throttling Testing

1. Find your machine's local IP (`ipconfig` / `ifconfig`).
2. Open `http://<your-ip>:8080` on your phone (same Wi-Fi network).
3. In Chrome DevTools → **Network** tab → enable **Slow 3G**; → **Performance** tab → enable **4× CPU slowdown**.
4. Verify:
   - No layout breaks at any width.
   - No white frames or flickers on refresh.
   - ElectricBorder and page-transition animations remain smooth.

## License

Copyright © Wise AI. All rights reserved.
