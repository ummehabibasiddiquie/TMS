-- Run on VPS after importing tms_local.sql (lowercase table names).
-- Prisma on Linux expects PascalCase: User, TraineeProfile, etc.
--
--   mysql -u tfs -p tms_prod < rename-lowercase-to-prisma.sql
--
-- Upload this file to /root/ first (WinSCP), then run the command above.

USE tms_prod;

SET FOREIGN_KEY_CHECKS = 0;

RENAME TABLE
  `achievement` TO `Achievement`,
  `appconfig` TO `AppConfig`,
  `assignment` TO `Assignment`,
  `assignmentsubmission` TO `AssignmentSubmission`,
  `completionrule` TO `CompletionRule`,
  `course` TO `Course`,
  `curriculumchecklistitem` TO `CurriculumChecklistItem`,
  `curriculumday` TO `CurriculumDay`,
  `curriculumdaylesson` TO `CurriculumDayLesson`,
  `dailysubmission` TO `DailySubmission`,
  `dayworkreview` TO `DayWorkReview`,
  `discussioncomment` TO `DiscussionComment`,
  `enrollment` TO `Enrollment`,
  `finalevaluationattempt` TO `FinalEvaluationAttempt`,
  `finalevaluationquestion` TO `FinalEvaluationQuestion`,
  `finalevaluationquiz` TO `FinalEvaluationQuiz`,
  `finalquizcertificate` TO `FinalQuizCertificate`,
  `finalquizretakegrant` TO `FinalQuizRetakeGrant`,
  `learningstreak` TO `LearningStreak`,
  `lesson` TO `Lesson`,
  `lessonnote` TO `LessonNote`,
  `lessonprogress` TO `LessonProgress`,
  `lessonprogressoverride` TO `LessonProgressOverride`,
  `module` TO `Module`,
  `prerequisite` TO `Prerequisite`,
  `project` TO `Project`,
  `projectassignment` TO `ProjectAssignment`,
  `projectcategory` TO `ProjectCategory`,
  `projectcertification` TO `ProjectCertification`,
  `qareview` TO `QAReview`,
  `quiz` TO `Quiz`,
  `quizattempt` TO `QuizAttempt`,
  `quizquestion` TO `QuizQuestion`,
  `topic` TO `Topic`,
  `traineeprofile` TO `TraineeProfile`,
  `traineeworkmetric` TO `TraineeWorkMetric`,
  `trainerreview` TO `TrainerReview`,
  `user` TO `User`,
  `userachievement` TO `UserAchievement`,
  `userchecklistprogress` TO `UserChecklistProgress`;

SET FOREIGN_KEY_CHECKS = 1;
