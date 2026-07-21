-- Certification approval workflow for ProjectCertification
-- Run once against MySQL (safe to re-run if columns already exist — skip failed ALTERs).

ALTER TABLE `ProjectCertification`
  ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING_REVIEW';

ALTER TABLE `ProjectCertification`
  ADD COLUMN `reviewedAt` DATETIME(3) NULL;

ALTER TABLE `ProjectCertification`
  ADD COLUMN `reviewedById` VARCHAR(191) NULL;

ALTER TABLE `ProjectCertification`
  ADD COLUMN `reviewNote` TEXT NULL;

-- Existing rows with no reviewer stay pending (do NOT auto-approve)
UPDATE `ProjectCertification`
SET `status` = 'PENDING_REVIEW'
WHERE `passed` = 1 AND `reviewedAt` IS NULL;

UPDATE `ProjectCertification`
SET `status` = 'FAILED'
WHERE `passed` = 0 AND (`status` IS NULL OR `status` = '' OR `status` = 'PENDING_REVIEW');

CREATE INDEX `ProjectCertification_status_idx` ON `ProjectCertification`(`status`);
CREATE INDEX `ProjectCertification_reviewedById_idx` ON `ProjectCertification`(`reviewedById`);
