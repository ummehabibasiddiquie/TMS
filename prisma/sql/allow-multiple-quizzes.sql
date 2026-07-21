-- Allow multiple quizzes per lesson
ALTER TABLE `Quiz` DROP FOREIGN KEY `Quiz_lessonId_fkey`;
ALTER TABLE `Quiz` DROP INDEX `Quiz_lessonId_key`;
CREATE INDEX `Quiz_lessonId_fkey` ON `Quiz`(`lessonId`);
ALTER TABLE `Quiz` ADD CONSTRAINT `Quiz_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `Lesson`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
