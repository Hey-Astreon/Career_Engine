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
    ...oldVariant.skills.map((s) => s.categoryName),
    ...newVariant.skills.map((s) => s.categoryName),
  ]));

  allSkillCategories.forEach((cat) => {
    const oldSkill = oldVariant.skills.find((s) => s.categoryName === cat)?.skillsText || "";
    const newSkill = newVariant.skills.find((s) => s.categoryName === cat)?.skillsText || "";
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
  const oldEdu = oldVariant.education;
  const newEdu = newVariant.education;
  if (oldEdu && newEdu) {
    const oldText = `${oldEdu.degree} - ${oldEdu.university} (${oldEdu.period})`;
    const newText = `${newEdu.degree} - ${newEdu.university} (${newEdu.period})`;
    if (oldText !== newText || oldEdu.coursework !== newEdu.coursework) {
      diff.educationChanges.push({
        degree: newEdu.degree || oldEdu.degree,
        old: oldText,
        new: newText,
      });
    }
  }

  return diff;
}
