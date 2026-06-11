# TMS — Diagrams (3 required)

Export each block at [mermaid.live](https://mermaid.live) → PNG.

| # | Save as |
|---|---------|
| 1 | `TMS-01-System.png` |
| 2 | `TMS-02-Database.png` |
| 3 | `TMS-03-Flow.png` |

Attach with [DATABASE-DESIGN.md](./DATABASE-DESIGN.md) when sending to manager.

---

## 1. System overview

```mermaid
flowchart LR
    subgraph Users
        E[Employee]
        T[Team Lead]
        A[Admin]
    end

    subgraph App["TMS Web App"]
        UI[Pages and Dashboards]
        API[API Layer]
    end

    subgraph Data
        DB[(MySQL Database)]
    end

    E --> UI
    T --> UI
    A --> UI
    UI --> API
    API --> DB
```

---

## 2. Database ERD

```mermaid
erDiagram
    User ||--o| TraineeProfile : has
    User ||--o{ Enrollment : enrolls
    User ||--o{ LessonProgress : tracks
    User ||--o{ QuizAttempt : takes
    User ||--o{ DailySubmission : submits

    Course ||--o{ Module : contains
    Module ||--o{ Lesson : contains
    Lesson ||--o{ Topic : has
    Lesson ||--o| Quiz : may_have

    Course ||--o{ Enrollment : offers
    Quiz ||--o{ QuizQuestion : has

    TrainingDay ||--o{ DailySubmission : schedules
    DailySubmission ||--o| TrainerReview : reviewed
    DailySubmission ||--o| QAReview : reviewed
```

---

## 3. Onboarding flow

```mermaid
flowchart TD
    A[Login] --> B[Account and tool setup]
    B --> C[Read policies]
    C --> D[Team introduction]
    D --> E[Project training]
    E --> F[Certification quiz 80 percent]
    F --> G[Certified]

    E --> H[15-day project training]
    H --> I[Daily submission per phase]
    I --> J[Team Lead and QA review]
```
