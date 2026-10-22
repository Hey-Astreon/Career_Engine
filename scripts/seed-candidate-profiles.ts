import { db } from "../src/lib/db";
import { getMasterResumeBaseline } from "../src/lib/resumeBaseline";

export async function seedCandidateProfiles() {
  console.log("=== SYNCHRONIZING CANDIDATE PROFILES & PROJECTS IN DATABASE ===");

  const candidates = ["roushan", "ayushi"] as const;

  for (const slug of candidates) {
    const baseline = getMasterResumeBaseline(slug);
    const folder = slug === "ayushi" ? "2_Ayushi_Raj" : "3_Roushan_Kumar";
    const masterPdf = slug === "ayushi" ? "Ayushi_Raj_Resume.pdf" : "Roushan_Kumar_Resume.pdf";
    const masterResumePath = `public/candidates/${folder}/${masterPdf}`;

    console.log(`\nSyncing candidate profile [${slug}]: ${baseline.header.fullName}`);

    // Upsert Profile
    const profile = await db.profile.upsert({
      where: { slug },
      update: {
        fullName: baseline.header.fullName,
        title: baseline.header.targetHeadline,
        location: baseline.header.location,
        phone: baseline.header.phone,
        email: baseline.header.email,
        portfolioUrl: baseline.header.portfolioUrl,
        githubUrl: baseline.header.githubUrl,
        linkedinUrl: baseline.header.linkedinUrl,
        masterResumePath,
        primarySkills: baseline.skills.map((s) => s.skillsText).join(", "),
        highestEducation: baseline.education.degree,
        workAuthorized: true,
        requiresVisa: false,
      },
      create: {
        slug,
        fullName: baseline.header.fullName,
        title: baseline.header.targetHeadline,
        location: baseline.header.location,
        phone: baseline.header.phone,
        email: baseline.header.email,
        portfolioUrl: baseline.header.portfolioUrl,
        githubUrl: baseline.header.githubUrl,
        linkedinUrl: baseline.header.linkedinUrl,
        masterResumePath,
        primarySkills: baseline.skills.map((s) => s.skillsText).join(", "),
        highestEducation: baseline.education.degree,
        workAuthorized: true,
        requiresVisa: false,
      },
    });

    console.log(`  -> Profile upserted with ID: ${profile.id}`);

    // Clean existing projects for this profile and re-seed
    await db.project.deleteMany({ where: { profileId: profile.id } });
    console.log(`  -> Cleared existing projects for profile.`);

    for (const proj of baseline.projects) {
      await db.project.create({
        data: {
          profileId: profile.id,
          title: proj.title,
          techStack: proj.techStack,
          liveDemoUrl: proj.liveDemoUrl,
          githubUrl: proj.githubUrl,
          architecture: proj.bullets[0] || "Engineered core distributed systems and resilient workflows.",
          bulletPoints: proj.bullets.join("\n"),
        },
      });
      console.log(`  -> Created project: ${proj.title.slice(0, 60)}...`);
    }

    // Clean existing virtual simulations for this profile and re-seed
    await db.virtualExperience.deleteMany({ where: { profileId: profile.id } });
    console.log(`  -> Cleared existing virtual experiences for profile.`);

    for (const sim of baseline.simulations) {
      await db.virtualExperience.create({
        data: {
          profileId: profile.id,
          company: sim.company,
          roleTitle: sim.roleTitle,
          period: sim.period,
          problemScope: sim.problemScope,
          actionTaken: sim.actionTaken,
          outcome: sim.engineeringOutcome,
        },
      });
      console.log(`  -> Created simulation: ${sim.company} (${sim.roleTitle})`);
    }
  }

  console.log("\nCandidate database synchronization completed successfully!");
}

if (process.argv[1]?.includes("seed-candidate-profiles")) {
  seedCandidateProfiles()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding error:", err);
      process.exit(1);
    });
}
