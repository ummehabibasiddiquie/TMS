-- Optional: run manually on the server if you cannot connect from your PC.
-- Safer approach: use  npm run db:reset-remote-and-push -- --confirm  from the project instead.
--
-- mysql -u tfs -p tms_prod < prisma/sql/drop-all-tms-tables.sql

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `UserAchievement`;
DROP TABLE IF EXISTS `UserChecklistProgress`;
DROP TABLE IF EXISTS `FinalQuizRetakeGrant`;
DROP TABLE IF EXISTS `FinalQuizCertificate`;
DROP TABLE IF EXISTS `FinalEvaluationAttempt`;
DROP TABLE IF EXISTS `FinalEvaluationQuestion`;
DROP TABLE IF EXISTS `FinalEvaluationQuiz`;
DROP TABLE IF EXISTS `TraineeWorkMetric`;
DROP TABLE IF EXISTS `DayWorkReview`;
DROP TABLE IF EXISTS `TrainerReview`;
DROP TABLE IF EXISTS `QAReview`;
DROP TABLE IF EXISTS `DailySubmission`;
DROP TABLE IF EXISTS `ProjectAssignment`;
DROP TABLE IF EXISTS `ProjectCertification`;
DROP TABLE IF EXISTS `Project`;
DROP TABLE IF EXISTS `ProjectCategory`;
DROP TABLE IF EXISTS `AppConfig`;
DROP TABLE IF EXISTS `CurriculumDayLesson`;
DROP TABLE IF EXISTS `CurriculumChecklistItem`;
DROP TABLE IF EXISTS `CurriculumDay`;
DROP TABLE IF EXISTS `DiscussionComment`;
DROP TABLE IF EXISTS `LessonNote`;
DROP TABLE IF EXISTS `UserAchievement`;
DROP TABLE IF EXISTS `Achievement`;
DROP TABLE IF EXISTS `LearningStreak`;
DROP TABLE IF EXISTS `AssignmentSubmission`;
DROP TABLE IF EXISTS `QuizAttempt`;
DROP TABLE IF EXISTS `LessonProgressOverride`;
DROP TABLE IF EXISTS `LessonProgress`;
DROP TABLE IF EXISTS `Enrollment`;
DROP TABLE IF EXISTS `CompletionRule`;
DROP TABLE IF EXISTS `Prerequisite`;
DROP TABLE IF EXISTS `Assignment`;
DROP TABLE IF EXISTS `QuizQuestion`;
DROP TABLE IF EXISTS `Quiz`;
DROP TABLE IF EXISTS `Topic`;
DROP TABLE IF EXISTS `Lesson`;
DROP TABLE IF EXISTS `Module`;
DROP TABLE IF EXISTS `Course`;
DROP TABLE IF EXISTS `TraineeProfile`;
DROP TABLE IF EXISTS `ProjectCertification`;
DROP TABLE IF EXISTS `User`;

-- Legacy lowercase names (old production dump)
DROP TABLE IF EXISTS `userachievement`;
DROP TABLE IF EXISTS `userchecklistprogress`;
DROP TABLE IF EXISTS `finalquizretakegrant`;
DROP TABLE IF EXISTS `finalquizcertificate`;
DROP TABLE IF EXISTS `finalevaluationattempt`;
DROP TABLE IF EXISTS `finalevaluationquestion`;
DROP TABLE IF EXISTS `finalevaluationquiz`;
DROP TABLE IF EXISTS `traineeworkmetric`;
DROP TABLE IF EXISTS `dayworkreview`;
DROP TABLE IF EXISTS `trainerreview`;
DROP TABLE IF EXISTS `qareview`;
DROP TABLE IF EXISTS `dailysubmission`;
DROP TABLE IF EXISTS `projectassignment`;
DROP TABLE IF EXISTS `projectcertification`;
DROP TABLE IF EXISTS `project`;
DROP TABLE IF EXISTS `projectcategory`;
DROP TABLE IF EXISTS `appconfig`;
DROP TABLE IF EXISTS `curriculumdaylesson`;
DROP TABLE IF EXISTS `curriculumchecklistitem`;
DROP TABLE IF EXISTS `curriculumday`;
DROP TABLE IF EXISTS `discussioncomment`;
DROP TABLE IF EXISTS `lessonnote`;
DROP TABLE IF EXISTS `achievement`;
DROP TABLE IF EXISTS `learningstreak`;
DROP TABLE IF EXISTS `assignmentsubmission`;
DROP TABLE IF EXISTS `quizattempt`;
DROP TABLE IF EXISTS `lessonprogressoverride`;
DROP TABLE IF EXISTS `lessonprogress`;
DROP TABLE IF EXISTS `enrollment`;
DROP TABLE IF EXISTS `completionrule`;
DROP TABLE IF EXISTS `prerequisite`;
DROP TABLE IF EXISTS `assignment`;
DROP TABLE IF EXISTS `quizquestion`;
DROP TABLE IF EXISTS `quiz`;
DROP TABLE IF EXISTS `topic`;
DROP TABLE IF EXISTS `lesson`;
DROP TABLE IF EXISTS `module`;
DROP TABLE IF EXISTS `course`;
DROP TABLE IF EXISTS `traineeprofile`;
DROP TABLE IF EXISTS `user`;

SET FOREIGN_KEY_CHECKS = 1;
