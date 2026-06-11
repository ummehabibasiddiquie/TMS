# TMS — Data Flow Documentation

How data moves through the system (read/write paths).  
**Related:** [DATABASE-DESIGN.md](./DATABASE-DESIGN.md) §6 · [DIAGRAMS.md](./DIAGRAMS.md)

**Export diagrams:** Copy Mermaid blocks → [mermaid.live](https://mermaid.live) → PNG.

---

## 1. Login & session

```mermaid
sequenceDiagram
    participant U as User Browser
    participant API as /api/auth/login
    participant DB as MySQL

    U->>API: email + password
    API->>DB: find User by email
    API->>API: verify bcrypt password
    API->>U: Set session cookie (user id)
    U->>U: Redirect to dashboard by role
```

**Tables:** `User`  
**Reads:** email, passwordHash, role  
**Writes:** session cookie only (no DB write on login)

---

## 2. Course learning & progress

```mermaid
flowchart TD
    A[User opens course] --> B[Read Enrollment]
    B --> C[Load Course → Module → Lesson → Topic]
    C --> D[User studies content]
    D --> E[POST /api/progress]
    E --> F[Upsert LessonProgress]
    F --> G[Update watchPercent / completed]
    G --> H[Recalculate Enrollment.progressPercent]
```

**Tables:** `Enrollment`, `LessonProgress`, `Lesson`, `Topic`  
**Key fields:** `watchPercent`, `completed`, `progressPercent`, `lastLessonId`

---

## 3. Quiz submit & course completion

```mermaid
flowchart TD
    A[User submits quiz] --> B[POST /api/quiz/submit]
    B --> C[Load Quiz + QuizQuestion]
    C --> D[Compare answers → score]
    D --> E[Insert QuizAttempt]
    E --> F[Upsert LessonProgress quizPassed]
    F --> G{Score >= passingScore?}
    G -->|Yes| H[Mark lesson completed]
    G -->|No| I[Keep lesson incomplete]
    H --> J[Recalculate course progress]
    J --> K[Update LearningStreak]
    K --> L[Check Achievement rules]
```

**Tables:** `QuizAttempt`, `LessonProgress`, `Enrollment`, `LearningStreak`, `UserAchievement`  
**Key fields:** `score`, `passed`, `answers` (JSON)

---

## 4. Daily training submission & reviews

```mermaid
flowchart TD
    A[Trainee submits day phase] --> B[POST /api/training/submit]
    B --> C[Insert or update DailySubmission]
    C --> D[Team Lead reviews]
    D --> E[POST /api/reviews trainer]
    E --> F[Insert TrainerReview]
    C --> G[QA reviews]
    G --> H[POST /api/reviews QA]
    H --> I[Insert QAReview]
```

**Tables:** `DailySubmission`, `TrainerReview`, `QAReview`, `TrainingDay`, `TrainingPhaseConfig`  
**Unique:** one row per `userId` + `dayNumber` + `phase`

---

## 5. Admin content management

```mermaid
flowchart LR
    A[Admin] --> B[/admin/content]
    B --> C[CRUD Course Module Lesson]
    C --> D[API /api/courses modules lessons topics]
    D --> E[(MySQL)]
    B --> F[QuizQuestionManager]
    F --> G[/api/quiz/questions]
    G --> E
```

**Tables:** `Course`, `Module`, `Lesson`, `Topic`, `Quiz`, `QuizQuestion`

---

## 6. Onboarding flow (planned — UI partly static today)

*Target flow when fully integrated with database.*

```mermaid
flowchart TD
    S1[Step 1 Account setup] --> S2[Step 2 Policies]
    S2 --> S3[Step 3 Team intro]
    S3 --> S4[Step 4 Landscape training]
    S4 --> S5[Step 5 Certification quiz]
    S5 --> P{Pass 80%?}
    P -->|Yes| CERT[Store certification record]
    P -->|No| S4
    S4 --> LP[LessonProgress / modules read]
    S5 --> QA[QuizAttempt]
```

**Today:** steps 1–5 shown from `onboarding-data.ts`; quiz not always saved to DB.  
**Planned tables:** onboarding step progress (see DATABASE-DESIGN §8).

---

## 7. Reporting data sources

| Report need | Query from |
|-------------|------------|
| Who completed a course | `Enrollment.status`, `completedAt` |
| Lesson-level detail | `LessonProgress` |
| Quiz results | `QuizAttempt` |
| Daily productivity/quality | `DailySubmission` |
| Review pending | `TrainerReview.status`, `QAReview.status` |
| Trainee assignment | `TraineeProfile` + `User` |

---

## Document map

| Section | Topic |
|---------|--------|
| §1 | Login |
| §2 | Learning progress |
| §3 | Quiz |
| §4 | Daily training + reviews |
| §5 | Admin content |
| §6 | Onboarding (planned integration) |
| §7 | Reporting |

*Update this file when a new API or flow is added. Log changes in [DEVELOPMENT-LOG.md](./DEVELOPMENT-LOG.md).*
