import { OptimizedResume } from "@/lib/ai/resumeOptimizer";

export interface ResumeDiff {
  summaryDiff: {
    old: string;
    new: string;
    isChanged: boolean;
  };
  headerChanges: { field: string; old: string; new: string }[];
  skillChanges: { section: string; old: string; new: string }[];
  projectChanges: {
    title: string;
    oldBullets: string[];
    newBullets: string[];
    isChanged: boolean;
  }[];
  educationChanges: { degree: string; old: string; new: string }[];
}

export function computeResumeDiff(oldVariant: OptimizedResume, newVariant: OptimizedResume): ResumeDiff {
  const diff: ResumeDiff = {
    summaryDiff: { old: "", new: "", isChanged: false },
    headerChanges: [],
    skillChanges: [],
    projectChanges: [],
    educationChanges: [],
  };

  // Summary
  if (oldVariant.summary !== newVariant.summary) {
    diff.summaryDiff = {
      old: oldVariant.summary,
      new: newVariant.summary,
      isChanged: true,
    };
  }

  // Header
  const headerKeys: (keyof typeof oldVariant.header)[] = [
    "fullName",
    "targetHeadline",
    "email",
    "phone",
    "location",
    "portfolioUrl",
    "githubUrl",
    "linkedinUrl",
  ];
  headerKeys.forEach((key) => {
    if (oldVariant.header[key] !== newVariant.header[key]) {
      diff.headerChanges.push({
        field: key,
        old: oldVariant.header[key] || "",
        new: newVariant.header[key] || "",
      });
    }
  });

  // Skills
  const allSkillCategories = Array.from(new Set([
    ...oldVariant.skills.map((s) => s.category),
    ...newVariant.skills.map((s) => s.category),
  ]));

  allSkillCategories.forEach((cat) => {
    const oldSkill = oldVariant.skills.find((s) => s.category === cat)?.skillsText || "";
    const newSkill = newVariant.skills.find((s) => s.category === cat)?.skillsText || "";
    if (oldSkill !== newSkill) {
      diff.skillChanges.push({
        section: cat,
        old: oldSkill,
        new: newSkill,
      });
    }
  });

  // Projects
  const allProjectTitles = Array.from(new Set([
    ...oldVariant.projects.map((p) => p.title),
    ...newVariant.projects.map((p) => p.title),
  ]));

  allProjectTitles.forEach((title) => {
    const oldProj = oldVariant.projects.find((p) => p.title === title);
    const newProj = newVariant.projects.find((p) => p.title === title);
    
    const oldBullets = oldProj?.bullets || [];
    const newBullets = newProj?.bullets || [];

    const isChanged = JSON.stringify(oldBullets) !== JSON.stringify(newBullets);
    
    if (isChanged) {
      diff.projectChanges.push({
        title,
        oldBullets,
        newBullets,
        isChanged: true,
      });
    }
  });

  // Education
  const allEdu = Array.from(new Set([
    ...oldVariant.education.map((e) => e.degree),
    ...newVariant.education.map((e) => e.degree),
  ]));

  allEdu.forEach((degree) => {
    const oldEdu = oldVariant.education.find((e) => e.degree === degree);
    const newEdu = newVariant.education.find((e) => e.degree === degree);
    const oldText = oldEdu ? `${oldEdu.university} - ${oldEdu.location}` : "";
    const newText = newEdu ? `${newEdu.university} - ${newEdu.location}` : "";

    if (oldText !== newText) {
      diff.educationChanges.push({
        degree,
        old: oldText,
        new: newText,
      });
    }
  });

  return diff;
}
