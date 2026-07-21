CREATE TABLE IF NOT EXISTS `DayWorkReview` (
  `id` VARCHAR(191) NOT NULL,
  `traineeId` VARCHAR(191) NOT NULL,
  `dayNumber` INT NOT NULL,
  `reviewerId` VARCHAR(191) NOT NULL,
  `notes` TEXT NULL,
  `rating` INT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `DayWorkReview_traineeId_dayNumber_key` (`traineeId`, `dayNumber`),
  INDEX `DayWorkReview_traineeId_idx` (`traineeId`),
  INDEX `DayWorkReview_reviewerId_idx` (`reviewerId`),
  CONSTRAINT `DayWorkReview_traineeId_fkey`
    FOREIGN KEY (`traineeId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `DayWorkReview_reviewerId_fkey`
    FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
