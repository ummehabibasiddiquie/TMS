import fs from "fs";

const path = "prisma/schema.prisma";
let s = fs.readFileSync(path, "utf8");

const maps = {
  User: "user",
  ProjectCertification: "projectcertification",
  TraineeProfile: "traineeprofile",
  Course: "course",
  Module: "module",
  Lesson: "lesson",
  Topic: "topic",
  Quiz: "quiz",
  QuizQuestion: "quizquestion",
  Assignment: "assignment",
  Prerequisite: "prerequisite",
  CompletionRule: "completionrule",
  Enrollment: "enrollment",
  LessonProgress: "lessonprogress",
  LessonProgressOverride: "lessonprogressoverride",
  QuizAttempt: "quizattempt",
  AssignmentSubmission: "assignmentsubmission",
  LearningStreak: "learningstreak",
  Achievement: "achievement",
  UserAchievement: "userachievement",
  LessonNote: "lessonnote",
  DiscussionComment: "discussioncomment",
  CurriculumDay: "curriculumday",
  CurriculumChecklistItem: "curriculumchecklistitem",
  CurriculumDayLesson: "curriculumdaylesson",
  UserChecklistProgress: "userchecklistprogress",
  FinalEvaluationQuiz: "finalevaluationquiz",
  FinalEvaluationQuestion: "finalevaluationquestion",
  FinalEvaluationAttempt: "finalevaluationattempt",
  FinalQuizCertificate: "finalquizcertificate",
  FinalQuizRetakeGrant: "finalquizretakegrant",
  DailySubmission: "dailysubmission",
  QAReview: "qareview",
  TrainerReview: "trainerreview",
  DayWorkReview: "dayworkreview",
  TraineeWorkMetric: "traineeworkmetric",
  AppConfig: "appconfig",
  ProjectCategory: "projectcategory",
  Project: "project",
  ProjectAssignment: "projectassignment",
};

for (const [model, table] of Object.entries(maps)) {
  const re = new RegExp(`(model ${model}[\\s\\S]*?)(\\n})`, "m");
  if (!re.test(s)) {
    console.error("missing model:", model);
    process.exit(1);
  }
  s = s.replace(re, (full, body, close) => {
    if (body.includes("@@map(")) return full;
    return `${body}\n  @@map("${table}")${close}`;
  });
}

fs.writeFileSync(path, s);
console.log("Added @@map to", Object.keys(maps).length, "models");
