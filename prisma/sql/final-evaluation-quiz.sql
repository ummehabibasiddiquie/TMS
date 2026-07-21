-- Final evaluation quiz + evaluationCycle (apply if not using prisma db push)

ALTER TABLE `TraineeProfile`
  ADD COLUMN `evaluationCycle` INT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS `FinalEvaluationQuiz` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `passingScore` INT NOT NULL DEFAULT 90,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `FinalEvaluationQuestion` (
  `id` VARCHAR(191) NOT NULL,
  `quizId` VARCHAR(191) NOT NULL,
  `question` TEXT NOT NULL,
  `options` TEXT NOT NULL,
  `correct` VARCHAR(191) NOT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `FinalEvaluationQuestion_quizId_idx`(`quizId`),
  CONSTRAINT `FinalEvaluationQuestion_quizId_fkey`
    FOREIGN KEY (`quizId`) REFERENCES `FinalEvaluationQuiz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `FinalEvaluationAttempt` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `quizId` VARCHAR(191) NOT NULL,
  `cycle` INT NOT NULL DEFAULT 1,
  `score` DOUBLE NOT NULL,
  `passed` BOOLEAN NOT NULL,
  `answers` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `FinalEvaluationAttempt_userId_quizId_cycle_key`(`userId`, `quizId`, `cycle`),
  INDEX `FinalEvaluationAttempt_userId_idx`(`userId`),
  INDEX `FinalEvaluationAttempt_quizId_idx`(`quizId`),
  CONSTRAINT `FinalEvaluationAttempt_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FinalEvaluationAttempt_quizId_fkey`
    FOREIGN KEY (`quizId`) REFERENCES `FinalEvaluationQuiz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
