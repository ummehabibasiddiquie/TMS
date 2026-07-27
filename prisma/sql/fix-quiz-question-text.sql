-- Allow longer quiz question text / option JSON (MySQL VARCHAR(191) was too short for imports)
ALTER TABLE `QuizQuestion` MODIFY COLUMN `question` TEXT NOT NULL;
ALTER TABLE `QuizQuestion` MODIFY COLUMN `options` TEXT NOT NULL;
ALTER TABLE `QuizQuestion` MODIFY COLUMN `correct` TEXT NOT NULL;
