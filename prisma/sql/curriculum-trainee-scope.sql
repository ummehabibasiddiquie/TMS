-- Per-trainee day schedules: GLOBAL default + optional copy per trainee (scopeKey = userId)
ALTER TABLE `CurriculumDay`
  ADD COLUMN `scopeKey` VARCHAR(191) NOT NULL DEFAULT 'GLOBAL' AFTER `id`;

-- Drop old unique on dayNumber alone (name may vary)
ALTER TABLE `CurriculumDay` DROP INDEX `CurriculumDay_dayNumber_key`;

ALTER TABLE `CurriculumDay`
  ADD UNIQUE INDEX `CurriculumDay_scopeKey_dayNumber_key` (`scopeKey`, `dayNumber`);

ALTER TABLE `CurriculumDay`
  ADD INDEX `CurriculumDay_scopeKey_idx` (`scopeKey`);
