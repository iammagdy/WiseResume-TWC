# Wise AI

### The Next-Generation Career Assistant
Wise AI is not just a resume builder—it's an intelligent career companion designed to give you a competitive edge in the job market. Leveraging advanced AI, real-time analytics, and recruiter-level insights, Wise AI helps you craft the perfect resume, simulate interviews, and tailor your application to every opportunity.

## 🚀 Key Features

### 🤖 Recruiter Simulator
Gain insider confidence before you even apply. Our AI acts as a hiring manager, reviewing your resume and conducting simulated interviews to provide actionable feedback.
![Recruiter Simulator Screenshot](docs/images/recruiter-simulator.png)

### 🔒 Biometric Security (Mobile First)
Your career data is sensitive. Wise AI protects your personal information with enterprise-grade security, including FaceID and TouchID integration for seamless and secure mobile access.
![Biometric Security Screenshot](docs/images/biometric-security.png)

### 🎯 Intelligent Tailoring
Stop sending generic resumes. Wise AI analyzes job descriptions in real-time and rewrites your resume to highlight the skills and experience that matter most for that specific role.
![Intelligent Tailoring Screenshot](docs/images/intelligent-tailoring.png)

---

## 🛠 Tech Stack

This project is built with a modern, high-performance stack:

-   **Frontend:** [React](https://react.dev/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/)
-   **Backend & Auth:** [Supabase](https://supabase.com/) (PostgreSQL, Edge Functions, Auth)
-   **State Management:** [TanStack Query](https://tanstack.com/query/latest)

---

## 💻 Getting Started (For Developers)

Follow these instructions to set up the project locally for development and contribution.

### Prerequisites

-   **Node.js** (v18 or higher)
-   **npm** (v9 or higher) or **Bun** (v1.0 or higher)
-   **Git**

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <YOUR_GIT_URL>
    cd wise-ai
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    bun install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory. You will need your Supabase project credentials.

    ```bash
    cp .env.example .env
    ```

    Add the following variables to your `.env` file:

    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
    ```

    > **Note:** If you do not have a Supabase project yet, you can create one for free at [database.new](https://database.new). You will also need to deploy the Edge Functions located in the `supabase/functions` directory to enable AI features.

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    bun dev
    ```

    Open [http://localhost:8080](http://localhost:8080) in your browser to see the app.

---

## 📦 Deployment

### Deploy with Lovable
Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on **Share -> Publish**. Changes made via Lovable will be committed automatically to this repo.

### Deploy with Vercel
The easiest way to deploy your Next.js/Vite app is to use the [Vercel Platform](https://vercel.com/new).

1.  Push your code to a Git repository (GitHub, GitLab, BitBucket).
2.  Import your project into Vercel.
3.  Add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` environment variables in the Vercel dashboard.
4.  Click **Deploy**.

### Deploy with Netlify
1.  Push your code to a Git repository.
2.  Log in to Netlify and click **New site from Git**.
3.  Select your repository.
4.  Add your environment variables in **Site settings > Build & deploy > Environment**.
5.  Click **Deploy site**.

---

## 📂 Project Structure

```
src/
├── components/        # Reusable UI components (Shadcn, Layouts, etc.)
├── contexts/          # React Contexts (Auth, Theme, etc.)
├── hooks/             # Custom React Hooks
├── integrations/      # Third-party integrations (Supabase client)
├── lib/               # Utility functions and helpers
├── pages/             # Route components (Dashboard, Editor, etc.)
├── store/             # Global state management (Zustand)
└── types/             # TypeScript type definitions

supabase/
├── functions/         # Supabase Edge Functions (AI logic)
└── config.toml        # Supabase configuration
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch: `git checkout -b feature/your-feature-name`.
3.  Make your changes and commit them: `git commit -m 'Add some feature'`.
4.  Push to the branch: `git push origin feature/your-feature-name`.
5.  Submit a pull request.

---

## 📄 License

This project is proprietary software. All rights reserved.
