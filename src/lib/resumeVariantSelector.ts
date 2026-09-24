import fs from "fs";
import path from "path";

/**
 * Resume Variant Recommendation Engine
 * Adheres strictly to the official decision matrix codified in usecase.md
 * for Roushan Kumar and Ayushi Raj.
 */

export interface RecommendedResumeVariant {
  variantName: string;
  fileName: string;
  pdfPath: string;
  reasoning: string;
  keyStrengths: string[];
}

function resolveResumePdf(candidateFolder: "2_Ayushi_Raj" | "3_Roushan_Kumar", fileName: string): string {
  const primaryPath = `x:/Career_Engine/${candidateFolder}/14_final_documents/${fileName}`;
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }

  const relativePath = path.resolve(process.cwd(), "..", candidateFolder, "14_final_documents", fileName);
  if (fs.existsSync(relativePath)) {
    return relativePath.replace(/\\/g, "/");
  }

  return primaryPath;
}

export function selectRecommendedResumeVariant(
  profileSlug: string,
  jobTitle: string,
  jobDescription: string = "",
  company: string = "",
  platform: string = ""
): RecommendedResumeVariant {
  const normalizedSlug = (profileSlug || "roushan").toLowerCase();
  const text = `${jobTitle} ${jobDescription} ${company} ${platform}`.toLowerCase();
  const titleLower = jobTitle.toLowerCase();
  const isYcOrStartup = /y\s*combinator|\byc\b|startup|seed|series a|early[- ]stage/i.test(text);

  if (normalizedSlug === "ayushi") {
    // -------------------------------------------------------------------------
    // AYUSHI RAJ DECISION MATRIX (usecase.md)
    // Resume A: AI Product Developer | Resume B: Software Engineer
    // -------------------------------------------------------------------------
    const isAiTarget =
      /\b(ai|llm|llms|genai|generative ai|copilot|ai agent|prompt engineering|gemini|openai|anthropic|langchain|ai platform|fintech)\b/i.test(
        titleLower
      ) ||
      /\b(ai software engineer|ai engineer|ai product|ai application|llm engineer|ai automation|ai tooling)\b/i.test(
        titleLower
      ) ||
      (isYcOrStartup && /\b(ai|llm|model|agent)\b/i.test(text));

    if (isAiTarget || (isYcOrStartup && !/\b(java|spring|enterprise|backend only)\b/i.test(text))) {
      return {
        variantName: "Resume A — AI Product Developer",
        fileName: "Ayushi_Raj_AI_Product_Developer_Resume.pdf",
        pdfPath: resolveResumePdf("2_Ayushi_Raj", "Ayushi_Raj_AI_Product_Developer_Resume.pdf"),
        reasoning: "Selected for AI, GenAI, and high-growth startup opportunities. Highlights IDBI FinSync AI integrations, Astra Vision sandbox, and full-stack product velocity.",
        keyStrengths: ["IDBI FinSync (Gemini API)", "Astra Vision AST Parser", "React & Fastify", "Product Velocity"],
      };
    }

    return {
      variantName: "Resume B — Software Engineer (Backend & Systems)",
      fileName: "Ayushi_Raj_Software_Engineer_Resume.pdf",
      pdfPath: resolveResumePdf("2_Ayushi_Raj", "Ayushi_Raj_Software_Engineer_Resume.pdf"),
      reasoning: "Selected for general SWE, backend APIs, Java/Spring Boot, and enterprise engineering environments. Highlights Alyra Lock zero-knowledge cryptography, Astra Vision sandboxing, and database optimization.",
      keyStrengths: ["Alyra Lock (AES-GCM/PBKDF2)", "Astra Vision Isolation", "Spring Boot & REST APIs", "Database 3NF"],
    };
  }

  // ---------------------------------------------------------------------------
  // ROUSHAN KUMAR 8-VARIANT MATRIX (usecase.md)
  // ---------------------------------------------------------------------------
  // 1. AI Training / Evaluation / Benchmark / RLHF
  if (
    /\b(ai training|code eval|rlhf|annotation|benchmark engineer|eval specialist|scale ai|alignerr|mercor|turing)\b/i.test(
      text
    )
  ) {
    return {
      variantName: "AI Training & Evaluation Engineer",
      fileName: "Roushan_Kumar_AI_Training_Engineer_Resume.pdf",
      pdfPath: resolveResumePdf("3_Roushan_Kumar", "Roushan_Kumar_AI_Training_Engineer_Resume.pdf"),
      reasoning: "Targeted for code evaluation, RLHF annotation, and AI benchmark platforms (Scale AI, Alignerr, Mercor). Highlights Astra Vision code parsing, AST syntax trees, and 100% test verification.",
      keyStrengths: ["Code Quality Benchmarks", "AST Syntax Analysis", "Synthetic Data Validation", "Automated xUnit/JUnit Tests"],
    };
  }

  // 2. AI / GenAI / LLM / Vector Search / AI Platform
  if (/\b(ai engineer|genai|generative ai|llm engineer|ai platform|ai developer|prompt)\b/i.test(titleLower)) {
    return {
      variantName: "AI Engineer",
      fileName: "Roushan_Kumar_AI_Engineer_Resume.pdf",
      pdfPath: resolveResumePdf("3_Roushan_Kumar", "Roushan_Kumar_AI_Engineer_Resume.pdf"),
      reasoning: "Targeted for GenAI, LLM application, and AI platform engineering. Highlights Astra Vision ChromaDB vector search & Tree-Sitter AST, IDBI FinSync Gemini integration, and low-latency execution.",
      keyStrengths: ["Astra Vision (ChromaDB + Tree-Sitter)", "IDBI FinSync (Gemini API)", "FastAPI Microservices", "Subprocess Sandboxes"],
    };
  }

  // 3. Python Developer / Automation / ETL
  if (/\b(python developer|python engineer|etl developer|automation engineer|data pipeline)\b/i.test(titleLower)) {
    return {
      variantName: "Python Developer",
      fileName: "Roushan_Kumar_Python_Developer_Resume.pdf",
      pdfPath: resolveResumePdf("3_Roushan_Kumar", "Roushan_Kumar_Python_Developer_Resume.pdf"),
      reasoning: "Targeted for Python development, data processing, and automation. Highlights FastAPI microservices, PyTest, Tree-Sitter AST parsers, and Walmart Python ETL pipelines.",
      keyStrengths: ["FastAPI Microservices", "Tree-Sitter AST Parsers", "PyTest Test Suites", "Python SQLite ETL"],
    };
  }

  // 4. Backend / Systems / API / .NET / C# / Spring Boot
  if (
    /\b(backend|systems engineer|api engineer|c#|\.net|spring boot|server engineer|distributed)\b/i.test(titleLower)
  ) {
    return {
      variantName: "Backend Engineer",
      fileName: "Roushan_Kumar_Backend_Engineer_Resume.pdf",
      pdfPath: resolveResumePdf("3_Roushan_Kumar", "Roushan_Kumar_Backend_Engineer_Resume.pdf"),
      reasoning: "Targeted for backend services, systems architecture, and API design. Highlights CommBank C#/.NET Core controllers, MongoDB partial updates, xUnit/JUnit test suites, and bitwise data structures.",
      keyStrengths: ["CommBank C#/.NET Web API", "MongoDB $set Atomic Updates", "xUnit & JUnit Test Suites", "Bitwise Max Heap"],
    };
  }

  // 5. Full Stack Engineer / Web Developer
  if (/\b(full stack|fullstack|full-stack|web developer|react developer)\b/i.test(titleLower)) {
    return {
      variantName: "Full Stack Engineer",
      fileName: "Roushan_Kumar_Full_Stack_Engineer_Resume.pdf",
      pdfPath: resolveResumePdf("3_Roushan_Kumar", "Roushan_Kumar_Full_Stack_Engineer_Resume.pdf"),
      reasoning: "Targeted for full stack roles across React, Next.js, Node.js, and backend APIs. Highlights IDBI FinSync Next.js/Fastify dashboard, Alyra Lock React/Express vault, and CommBank Goal Manager.",
      keyStrengths: ["IDBI FinSync Next.js Monorepo", "Alyra Lock React & Express", "CommBank React/Redux Goal Manager", "PostgreSQL & Prisma"],
    };
  }

  // 6. Product Engineer / SaaS / User-Facing
  if (/\b(product engineer|saas engineer|product developer|ui engineer|frontend)\b/i.test(titleLower)) {
    return {
      variantName: "Product Engineer",
      fileName: "Roushan_Kumar_Product_Engineer_Resume.pdf",
      pdfPath: resolveResumePdf("3_Roushan_Kumar", "Roushan_Kumar_Product_Engineer_Resume.pdf"),
      reasoning: "Targeted for product engineering and user-facing SaaS. Highlights user experience, IDBI FinSync wealth management features, Shiptivity Kanban board, and zero-knowledge privacy UX.",
      keyStrengths: ["IDBI FinSync Product UX", "Shiptivity Kanban Workflow", "Alyra Lock Client Privacy", "Next.js & Redux"],
    };
  }

  // 7. Startup Software Engineer (YC / Seed / Series A)
  if (isYcOrStartup) {
    return {
      variantName: "Startup Software Engineer",
      fileName: "Roushan_Kumar_Startup_Software_Engineer_Resume.pdf",
      pdfPath: resolveResumePdf("3_Roushan_Kumar", "Roushan_Kumar_Startup_Software_Engineer_Resume.pdf"),
      reasoning: "Targeted for fast-paced early-stage startups and YC product teams. Highlights autonomous rapid prototyping, sub-200ms latency, zero-to-one feature shipping, and full-stack ownership.",
      keyStrengths: ["Zero-to-One Shipping", "Full-Stack Autonomy", "Sub-200ms Latency", "Automated Test Coverage"],
    };
  }

  // 8. Default: Software Engineer Master
  return {
    variantName: "Software Engineer",
    fileName: "Roushan_Kumar_Software_Engineer_Resume.pdf",
    pdfPath: resolveResumePdf("3_Roushan_Kumar", "Roushan_Kumar_Software_Engineer_Resume.pdf"),
    reasoning: "Balanced general software engineering resume. Covers CommBank .NET simulation, Alyra Lock zero-knowledge security, IDBI FinSync, and Astra Vision developer platform.",
    keyStrengths: ["CommBank C#/.NET Simulation", "Alyra Lock Cryptographic Vault", "IDBI FinSync AI Platform", "Astra Vision AST Sandbox"],
  };
}
