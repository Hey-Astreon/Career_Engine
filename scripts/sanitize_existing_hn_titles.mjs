import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.TURSO_DATABASE_URL || "file:dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const adapter = new PrismaLibSql({ url, authToken });
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log("Checking for jobs with un-sanitized titles...");
  const jobs = await prisma.jobPosting.findMany({
    where: {
      OR: [
        { title: { startsWith: "http" } },
        { title: { startsWith: "Remote —" } },
        { title: { startsWith: "Remote -" } },
        { title: { contains: "We're hiring" } },
      ],
    },
  });

  console.log(`Found ${jobs.length} candidate jobs to sanitize.`);

  for (const job of jobs) {
    let title = job.title;
    let company = job.company;

    if (title.startsWith("http")) {
      try {
        const parsed = new URL(title);
        const host = parsed.hostname.replace(/^www\./i, "");
        company = host.split(".")[0];
        company = company.charAt(0).toUpperCase() + company.slice(1);
      } catch {}
      title = "Software Developer";
    }

    if (title.includes("DevOps Engineer")) {
      title = "DevOps Engineer";
    } else {
      title = title
        .replace(/^https?:\/\/[^\s]+/i, "")
        .replace(/^remote\s*[-—–:]\s*/i, "")
        .replace(/^we(?:'re|\s+are)\s+hiring\s+(?:engineers\s+to\s+join\s+our\s+distributed\s+engineering\s+team\s*[:\-—–]?\s*)?/i, "")
        .replace(/^hiring:\s*/i, "")
        .trim();
    }

    if (title.length > 60 && title.includes(":")) {
      const parts = title.split(":");
      title = parts.pop()?.trim() || title;
    }

    console.log(`Updating [${job.id}]: "${job.title}" -> "${title}" (Company: ${company})`);
    await prisma.jobPosting.update({
      where: { id: job.id },
      data: { title, company },
    });
  }

  console.log("Sanitization complete!");
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
