-- Daily work log: link submission to project; Team Lead quality score on review
ALTER TABLE `DailySubmission`
  ADD COLUMN `projectId` VARCHAR(191) NULL;

ALTER TABLE `DailySubmission`
  ADD INDEX `DailySubmission_projectId_fkey` (`projectId`);

ALTER TABLE `DailySubmission`
  ADD CONSTRAINT `DailySubmission_projectId_fkey`
  FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `TrainerReview`
  ADD COLUMN `qualityScore` DOUBLE NULL;
