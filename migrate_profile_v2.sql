ALTER TABLE profiles ADD COLUMN careerStage TEXT;
ALTER TABLE profiles ADD COLUMN yearsOfExperience INTEGER;
ALTER TABLE profiles ADD COLUMN workType TEXT;
ALTER TABLE profiles ADD COLUMN salaryRange TEXT;
ALTER TABLE profiles ADD COLUMN workAuthorized INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN requiresVisa INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN targetCountries TEXT DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN primarySkills TEXT DEFAULT '[]';
