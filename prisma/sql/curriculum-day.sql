-- Day-wise onboarding + training curriculum
CREATE TABLE IF NOT EXISTS `CurriculumDay` (
  `id` VARCHAR(191) NOT NULL,
  `scopeKey` VARCHAR(191) NOT NULL DEFAULT 'GLOBAL',
  `dayNumber` INT NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `dayType` VARCHAR(191) NOT NULL DEFAULT 'TRAINING',
  `projectName` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CurriculumDay_scopeKey_dayNumber_key` (`scopeKey`, `dayNumber`),
  INDEX `CurriculumDay_scopeKey_idx` (`scopeKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CurriculumChecklistItem` (
  `id` VARCHAR(191) NOT NULL,
  `dayId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `CurriculumChecklistItem_dayId_idx` (`dayId`),
  CONSTRAINT `CurriculumChecklistItem_dayId_fkey`
    FOREIGN KEY (`dayId`) REFERENCES `CurriculumDay`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CurriculumDayLesson` (
  `id` VARCHAR(191) NOT NULL,
  `dayId` VARCHAR(191) NOT NULL,
  `lessonId` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CurriculumDayLesson_dayId_lessonId_key` (`dayId`, `lessonId`),
  INDEX `CurriculumDayLesson_dayId_idx` (`dayId`),
  INDEX `CurriculumDayLesson_lessonId_idx` (`lessonId`),
  CONSTRAINT `CurriculumDayLesson_dayId_fkey`
    FOREIGN KEY (`dayId`) REFERENCES `CurriculumDay`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CurriculumDayLesson_lessonId_fkey`
    FOREIGN KEY (`lessonId`) REFERENCES `Lesson`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `UserChecklistProgress` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `itemId` VARCHAR(191) NOT NULL,
  `completed` BOOLEAN NOT NULL DEFAULT false,
  `completedAt` DATETIME(3) NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `UserChecklistProgress_userId_itemId_key` (`userId`, `itemId`),
  INDEX `UserChecklistProgress_userId_idx` (`userId`),
  INDEX `UserChecklistProgress_itemId_idx` (`itemId`),
  CONSTRAINT `UserChecklistProgress_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserChecklistProgress_itemId_fkey`
    FOREIGN KEY (`itemId`) REFERENCES `CurriculumChecklistItem`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
