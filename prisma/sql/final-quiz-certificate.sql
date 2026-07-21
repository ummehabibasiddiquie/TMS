-- Final Quiz certificate (issued on quiz completion)

CREATE TABLE IF NOT EXISTS `FinalQuizCertificate` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `attemptId` VARCHAR(191) NOT NULL,
  `quizTitle` VARCHAR(191) NOT NULL,
  `score` DOUBLE NOT NULL,
  `cycle` INT NOT NULL DEFAULT 1,
  `status` VARCHAR(191) NOT NULL DEFAULT 'APPROVED',
  `certifiedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewedAt` DATETIME(3) NULL,
  `reviewedById` VARCHAR(191) NULL,
  `reviewNote` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `FinalQuizCertificate_attemptId_key`(`attemptId`),
  INDEX `FinalQuizCertificate_userId_idx`(`userId`),
  INDEX `FinalQuizCertificate_status_idx`(`status`),
  CONSTRAINT `FinalQuizCertificate_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FinalQuizCertificate_attemptId_fkey`
    FOREIGN KEY (`attemptId`) REFERENCES `FinalEvaluationAttempt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FinalQuizCertificate_reviewedById_fkey`
    FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
