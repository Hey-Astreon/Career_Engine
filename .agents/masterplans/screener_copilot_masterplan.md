# Phase 3 Masterplan: Screener Q&A Copilot

## Objective
Build a "Screener Q&A Copilot" directly into the ATS Resume Maker. This feature will allow candidates to paste application questions (e.g., "Why should we hire you?") and instantly receive AI-generated answers that are strictly grounded in the customized tailored resume that was just generated for the role.

## Alignment with Core Principles
- **Think:** The core problem is consistency and speed during job applications. By leveraging the already-generated tailored resume, we ensure 100% consistency between the candidate's answers and their submitted PDF.
- **Visualize:** The UI will live right next to the Resume and Cover Letter outputs in the `resume-maker` workspace. The API will be a stateless endpoint accepting the Custom JD, the Tailored Resume, and the Questions.
- **Count Outcomes:** 
  - *No DB Dependency:* By making the API stateless and passing the resume/JD from the client, this feature works perfectly for both automated feed jobs AND Custom JD copy/pastes.
  - *Hallucination Prevention:* The prompt will be hardcoded to strictly forbid hallucinating skills not present in the provided resume context.

## Implementation Steps

### Step 1: Create the Backend API Route
- **File:** `src/app/api/jobs/screener-qa/route.ts`
- **Method:** `POST`
- **Request Body:** `{ questions: string, jobDescription: string, tailoredResume: string }`
- **Logic:**
  1. Validate payload presence.
  2. Construct a strict system prompt instructing the AI to answer the specific questions professionally, drawing **only** from the provided `tailoredResume` and `jobDescription`.
  3. Invoke the Gemini LLM.
  4. Return the generated markdown answers.

### Step 2: Integrate into ATS Resume Maker UI
- **File:** `src/app/(workspace)/resume-maker/page.tsx`
- **State Additions:**
  - `activeOutputTab`: State to toggle between `"resume"`, `"cover_letter"`, and `"screener"`.
  - `screenerQuestions`: The raw text the user pastes.
  - `screenerAnswers`: The resulting markdown from the AI.
  - `isGeneratingScreener`: Loading state for the button.
- **UI Modifications (Right Panel):**
  1. Add a tabbed navigation header (Resume | Cover Letter | Screener Q&A) above the output view.
  2. Create the Screener view:
     - A `<textarea>` for the user to paste their questions.
     - A `Generate Answers` button that triggers the API call.
     - A markdown renderer (`react-markdown`) to display the AI's response once `screenerAnswers` is populated.

## Definition of Done
- A user can generate a resume using Custom JD Mode.
- They can switch to the Screener Q&A tab.
- They can paste a question and hit generate.
- The UI displays an AI-generated answer that perfectly references the tailored resume content.
