-- Editable org chart nodes for onboarding "Meet the team"
CREATE TABLE IF NOT EXISTS `OnboardingOrgNode` (
  `id` VARCHAR(191) NOT NULL,
  `parentId` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NULL,
  `blurb` TEXT NOT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `OnboardingOrgNode_parentId_idx` (`parentId`),
  CONSTRAINT `OnboardingOrgNode_parentId_fkey`
    FOREIGN KEY (`parentId`) REFERENCES `OnboardingOrgNode`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
