
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  name: 'name',
  employeeId: 'employeeId',
  role: 'role',
  dateOfJoining: 'dateOfJoining',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TraineeProfileScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  projectAssigned: 'projectAssigned',
  trainerId: 'trainerId',
  qaId: 'qaId',
  trainingStarted: 'trainingStarted',
  trainingStatus: 'trainingStatus',
  readyForProduction: 'readyForProduction',
  currentDayNumber: 'currentDayNumber',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CourseScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  thumbnail: 'thumbnail',
  published: 'published',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LearningPathScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  published: 'published',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LearningPathCourseScalarFieldEnum = {
  id: 'id',
  pathId: 'pathId',
  courseId: 'courseId',
  order: 'order'
};

exports.Prisma.ModuleScalarFieldEnum = {
  id: 'id',
  courseId: 'courseId',
  title: 'title',
  description: 'description',
  order: 'order'
};

exports.Prisma.LessonScalarFieldEnum = {
  id: 'id',
  moduleId: 'moduleId',
  title: 'title',
  description: 'description',
  order: 'order',
  lessonType: 'lessonType',
  durationMin: 'durationMin'
};

exports.Prisma.TopicScalarFieldEnum = {
  id: 'id',
  lessonId: 'lessonId',
  title: 'title',
  contentType: 'contentType',
  contentUrl: 'contentUrl',
  contentBody: 'contentBody',
  order: 'order',
  durationSec: 'durationSec'
};

exports.Prisma.QuizScalarFieldEnum = {
  id: 'id',
  lessonId: 'lessonId',
  title: 'title',
  passingScore: 'passingScore'
};

exports.Prisma.QuizQuestionScalarFieldEnum = {
  id: 'id',
  quizId: 'quizId',
  question: 'question',
  options: 'options',
  correct: 'correct',
  order: 'order'
};

exports.Prisma.AssignmentScalarFieldEnum = {
  id: 'id',
  lessonId: 'lessonId',
  title: 'title',
  instructions: 'instructions'
};

exports.Prisma.PrerequisiteScalarFieldEnum = {
  id: 'id',
  courseId: 'courseId',
  prereqCourseId: 'prereqCourseId'
};

exports.Prisma.CompletionRuleScalarFieldEnum = {
  id: 'id',
  courseId: 'courseId',
  requireAllLessons: 'requireAllLessons',
  requireQuizPass: 'requireQuizPass',
  minWatchPercent: 'minWatchPercent'
};

exports.Prisma.EnrollmentScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  courseId: 'courseId',
  status: 'status',
  progressPercent: 'progressPercent',
  lastLessonId: 'lastLessonId',
  lastActivityAt: 'lastActivityAt',
  totalTimeSec: 'totalTimeSec',
  enrolledAt: 'enrolledAt',
  completedAt: 'completedAt'
};

exports.Prisma.LessonProgressScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  lessonId: 'lessonId',
  completed: 'completed',
  watchPercent: 'watchPercent',
  timeSpentSec: 'timeSpentSec',
  quizScore: 'quizScore',
  quizPassed: 'quizPassed',
  assignmentDone: 'assignmentDone',
  completedAt: 'completedAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.QuizAttemptScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  quizId: 'quizId',
  score: 'score',
  passed: 'passed',
  answers: 'answers',
  createdAt: 'createdAt'
};

exports.Prisma.AssignmentSubmissionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  assignmentId: 'assignmentId',
  content: 'content',
  submittedAt: 'submittedAt'
};

exports.Prisma.LearningStreakScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  currentStreak: 'currentStreak',
  longestStreak: 'longestStreak',
  lastLearnDate: 'lastLearnDate'
};

exports.Prisma.AchievementScalarFieldEnum = {
  id: 'id',
  code: 'code',
  title: 'title',
  description: 'description',
  icon: 'icon',
  milestone: 'milestone'
};

exports.Prisma.UserAchievementScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  achievementId: 'achievementId',
  earnedAt: 'earnedAt'
};

exports.Prisma.LessonNoteScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  lessonId: 'lessonId',
  content: 'content',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiscussionCommentScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  lessonId: 'lessonId',
  content: 'content',
  createdAt: 'createdAt'
};

exports.Prisma.TrainingDayScalarFieldEnum = {
  id: 'id',
  title: 'title',
  projectName: 'projectName',
  description: 'description'
};

exports.Prisma.DayRequiredLearningScalarFieldEnum = {
  id: 'id',
  dayId: 'dayId',
  courseId: 'courseId',
  lessonId: 'lessonId',
  label: 'label',
  required: 'required'
};

exports.Prisma.TrainingPhaseConfigScalarFieldEnum = {
  id: 'id',
  dayId: 'dayId',
  phase: 'phase',
  productivityTarget: 'productivityTarget',
  qualityTarget: 'qualityTarget',
  qcDeadline: 'qcDeadline'
};

exports.Prisma.DailySubmissionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  dayNumber: 'dayNumber',
  phase: 'phase',
  sopRead: 'sopRead',
  tasksCompleted: 'tasksCompleted',
  productivityPct: 'productivityPct',
  qualityPct: 'qualityPct',
  issues: 'issues',
  learningComplete: 'learningComplete',
  submittedAt: 'submittedAt'
};

exports.Prisma.QAReviewScalarFieldEnum = {
  id: 'id',
  submissionId: 'submissionId',
  reviewerId: 'reviewerId',
  feedback: 'feedback',
  errorCount: 'errorCount',
  qualityScore: 'qualityScore',
  status: 'status',
  reviewedAt: 'reviewedAt'
};

exports.Prisma.TrainerReviewScalarFieldEnum = {
  id: 'id',
  submissionId: 'submissionId',
  reviewerId: 'reviewerId',
  remarks: 'remarks',
  status: 'status',
  reviewedAt: 'reviewedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  TraineeProfile: 'TraineeProfile',
  Course: 'Course',
  LearningPath: 'LearningPath',
  LearningPathCourse: 'LearningPathCourse',
  Module: 'Module',
  Lesson: 'Lesson',
  Topic: 'Topic',
  Quiz: 'Quiz',
  QuizQuestion: 'QuizQuestion',
  Assignment: 'Assignment',
  Prerequisite: 'Prerequisite',
  CompletionRule: 'CompletionRule',
  Enrollment: 'Enrollment',
  LessonProgress: 'LessonProgress',
  QuizAttempt: 'QuizAttempt',
  AssignmentSubmission: 'AssignmentSubmission',
  LearningStreak: 'LearningStreak',
  Achievement: 'Achievement',
  UserAchievement: 'UserAchievement',
  LessonNote: 'LessonNote',
  DiscussionComment: 'DiscussionComment',
  TrainingDay: 'TrainingDay',
  DayRequiredLearning: 'DayRequiredLearning',
  TrainingPhaseConfig: 'TrainingPhaseConfig',
  DailySubmission: 'DailySubmission',
  QAReview: 'QAReview',
  TrainerReview: 'TrainerReview'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
