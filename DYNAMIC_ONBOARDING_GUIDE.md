# Dynamic Onboarding System Implementation Guide

## Overview

This document describes the new dynamic, role-based, approval-driven onboarding system that replaces the previous static onboarding flow.

## Architecture

### Database Schema Changes

The following new models were added to the Prisma schema:

1. **OnboardingTemplate** - Master template for onboarding configurations
2. **TeamIntroduction** - Dynamic team introduction modules
3. **TeamEmployee** - Employee assignments within team introductions
4. **OnboardingCourseAssignment** - Course assignments within templates
5. **CourseEmployeeProgress** - Employee progress tracking for courses
6. **CourseQuiz** - Quizzes specific to onboarding courses
7. **Enhanced QuizQuestion** - Extended to support both lesson and course quizzes
8. **Enhanced QuizAttempt** - Extended to support approval workflow

### State Machine

The onboarding system follows this state machine:

```
LOCKED → ACTIVE → DONE → PENDING_APPROVAL → APPROVED/COMPLETED
                                      ↓
                                  REJECTED
```

## Features

### 1. Admin Panel (Dynamic Control System)

#### Team Introduction Module
- **Location**: `/admin/onboarding`
- **Capabilities**:
  - Create/update/delete team intro content
  - Manage employee assignments with roles, managers, and metadata
  - Fully dynamic (no hardcoded data)

#### Training Modules
- **Capabilities**:
  - Create training modules dynamically
  - Assign courses to employees
  - Track completion status per employee
  - Configure passing scores

#### Quiz System
- **Capabilities**:
  - Create quizzes per course
  - Define questions, options, and correct answers
  - Set passing criteria (default 80%)
  - Configure maximum attempts (default 3)
  - Quizzes unlock only after course completion approval

#### Approval System
- **Capabilities**:
  - Team lead/admin must approve:
    - Course completion
    - Quiz completion
    - Onboarding step completion
  - No step is considered complete without approval
  - Approval workflow with notes and timestamps

### 2. Employee Side (Dynamic Onboarding Flow)

#### Onboarding Flow
- **Location**: `/onboarding`
- **Dynamic Steps**:
  1. Team Introduction
  2. Training Modules
  3. Certification Quiz
  4. Final Completion

- **Step Status**:
  - Locked / Active / Completed / Pending Approval
  - Progress indicator
  - Next step unlocking based on completion + approval

#### Progress Rules
- Step 2 unlocks only after Step 1 completed + approved
- Step 3 unlocks only after all assigned courses are completed + approved
- Step 4 unlocks only after all quizzes passed + approved

#### Course Flow
1. Employee completes assigned courses
2. Status becomes "pending approval"
3. Lead approves → course marked completed
4. Only then quizzes become available

#### Quiz Flow
1. Only visible after approved course completion
2. Employee attempts quiz
3. Auto-evaluated score
4. Goes to pending approval
5. Lead approves → quiz marked complete

## API Endpoints

### Admin Management

#### Templates
- `GET /api/admin/onboarding/templates` - List all templates
- `POST /api/admin/onboarding/templates` - Create new template
- `GET /api/admin/onboarding/templates/[templateId]` - Get single template
- `PATCH /api/admin/onboarding/templates/[templateId]` - Update template
- `DELETE /api/admin/onboarding/templates/[templateId]` - Delete template

#### Team Introductions
- `POST /api/admin/onboarding/team-intros` - Create team intro
- `PATCH /api/admin/onboarding/team-intros/[introId]` - Update team intro
- `DELETE /api/admin/onboarding/team-intros/[introId]` - Delete team intro
- `POST /api/admin/onboarding/team-intros/[introId]/employees` - Add employee
- `PATCH /api/admin/onboarding/team-intros/[introId]/employees/[employeeId]` - Update employee
- `DELETE /api/admin/onboarding/team-intros/[introId]/employees/[employeeId]` - Remove employee

#### Course Assignments
- `POST /api/admin/onboarding/course-assignments` - Create course assignment
- `PATCH /api/admin/onboarding/course-assignments/[assignmentId]` - Update assignment
- `DELETE /api/admin/onboarding/course-assignments/[assignmentId]` - Delete assignment
- `POST /api/admin/onboarding/course-assignments/[assignmentId]/assign` - Assign to employees

#### Quizzes
- `POST /api/admin/onboarding/course-assignments/[assignmentId]/quizzes` - Create quiz
- `PATCH /api/admin/onboarding/course-assignments/[assignmentId]/quizzes/[quizId]` - Update quiz
- `DELETE /api/admin/onboarding/course-assignments/[assignmentId]/quizzes/[quizId]` - Delete quiz
- `POST /api/admin/onboarding/course-assignments/[assignmentId]/quizzes/[quizId]/questions` - Add question

### Approval Workflow

#### Approvals
- `POST /api/admin/onboarding/approvals/steps` - Approve step completion
- `POST /api/admin/onboarding/approvals/courses` - Approve course completion
- `POST /api/admin/onboarding/approvals/quizzes` - Approve quiz attempt
- `GET /api/admin/onboarding/approvals/pending` - Get all pending approvals

### Employee Actions

#### Dynamic Onboarding
- `GET /api/onboarding/dynamic` - Get user's dynamic onboarding flow
- `POST /api/onboarding/dynamic/steps/[stepId]/complete` - Mark step as complete
- `POST /api/onboarding/dynamic/courses/[progressId]/complete` - Mark course as complete
- `POST /api/onboarding/dynamic/quizzes/[quizId]/attempt` - Submit quiz attempt

### Edge Cases

#### Edge Case Handling
- `POST /api/admin/onboarding/edge-cases/validate` - Validate state consistency
- `POST /api/admin/onboarding/edge-cases/reject` - Handle approval rejection
- `POST /api/admin/onboarding/edge-cases/reset` - Reset user progress

## Setup Instructions

### 1. Database Migration

The database schema has been updated. Run:

```bash
npm run db:push
```

### 2. Seed Default Data

To seed the system with default onboarding configuration:

```bash
npm run db:seed:onboarding
```

This creates:
- A default "Standard Onboarding" template
- 4 onboarding steps (Team Intro, Training, Quiz, Final)
- Sample team introduction
- Course assignment (if courses exist)
- Sample quiz with 5 questions

### 3. Access the Admin Panel

Navigate to `/admin/onboarding` to access the dynamic onboarding management interface.

## Role-Based Access Control

### Roles
- **ADMIN**: Full access to all admin features
- **TRAINER**: Can approve completions, view templates, manage team introductions
- **TRAINEE**: Can only view and complete their assigned onboarding

### Middleware Protection
Protected routes are enforced via Next.js middleware:
- `/admin/*` - Admin/Trainer only
- `/onboarding/*` - Authenticated users only
- `/profile/*` - Authenticated users only

## Edge Case Handling

The system includes comprehensive edge case handling:

1. **Partially assigned courses** - Detected and reported
2. **Deleted course during progress** - Handled with status updates
3. **Rejected approvals** - Can reject with reasons and reset status
4. **Employee reassignment mid-flow** - Progress preserved and transferred
5. **Missing approval states** - Detected and can be remediated
6. **Empty onboarding config** - Auto-generated emergency template
7. **Duplicate quiz attempts** - Automatically detected and removed
8. **State consistency validation** - Tools to validate and fix inconsistencies

## Backward Compatibility

The system maintains backward compatibility:
- Static onboarding data still exists in `src/lib/onboarding-data.ts`
- If no dynamic template is found, the system falls back to static data
- Existing APIs remain functional
- Database schema changes are additive (no breaking changes)

## Testing the Workflow

### Complete Flow Test

1. **Admin Setup**:
   - Create onboarding template
   - Add team introduction with employees
   - Assign courses to employees
   - Create quizzes for courses

2. **Employee Experience**:
   - Employee logs in and sees dynamic onboarding
   - Completes team introduction step
   - Status changes to "pending approval"
   - Admin approves step
   - Next step unlocks

3. **Course & Quiz Flow**:
   - Employee completes assigned course
   - Status becomes "pending approval"
   - Admin approves course completion
   - Quiz becomes available
   - Employee takes and passes quiz
   - Quiz goes to "pending approval"
   - Admin approves quiz
   - Next step unlocks

## Troubleshooting

### No onboarding data visible
- Check if an active template exists: `SELECT * FROM OnboardingTemplate WHERE isActive = true`
- Run seed script: `npm run db:seed:onboarding`

### Approvals not working
- Verify user has correct role (ADMIN or TRAINER)
- Check approval status in database
- Ensure step/course is marked as DONE before approval

### Progress not unlocking
- Verify previous step is approved (not just completed)
- Check state consistency with edge case validation API
- Review approval timestamps

### Database errors
- Ensure schema is up to date: `npm run db:push`
- Check database connection in `.env`
- Verify Prisma client is generated: `npx prisma generate`

## File Structure

```
src/
├── app/
│   ├── admin/
│   │   └── onboarding/
│   │       └── page.tsx                    # Admin panel
│   ├── api/
│   │   ├── admin/
│   │   │   └── onboarding/
│   │   │       ├── templates/              # Template CRUD
│   │   │       ├── team-intros/            # Team intro management
│   │   │       ├── course-assignments/    # Course assignment management
│   │   │       ├── approvals/              # Approval workflow
│   │   │       └── edge-cases/             # Edge case handling
│   │   └── onboarding/
│   │       └── dynamic/                    # Employee dynamic API
│   └── onboarding/
│       └── page.tsx                        # Employee onboarding page
├── components/
│   ├── admin/
│   │   └── onboarding/
│   │       └── OnboardingTemplatesManager.tsx  # Admin UI
│   └── onboarding/
│       └── DynamicOnboardingFlow.tsx       # Employee UI
├── lib/
│   ├── dynamic-onboarding.ts               # Core business logic
│   ├── onboarding-edge-cases.ts            # Edge case handlers
│   └── auth.ts                             # Enhanced auth
└── middleware.ts                           # Route protection

prisma/
├── schema.prisma                          # Updated schema
└── seed-dynamic-onboarding.ts             # Seeding script
```

## Future Enhancements

Potential improvements for the system:

1. **Email Notifications** - Notify employees and admins on state changes
2. **Analytics Dashboard** - Track onboarding completion rates and times
3. **Bulk Operations** - Assign multiple employees at once
4. **Template Cloning** - Copy existing templates for new variations
5. **Conditional Steps** - Show/hide steps based on employee attributes
6. **Integration with Training System** - Link with existing course progress
7. **Mobile Optimization** - Enhance UI for mobile devices
8. **Multi-language Support** - Support international teams

## Support

For issues or questions:
1. Check this guide first
2. Review the edge case handling tools
3. Validate state consistency using the provided API
4. Check database logs for errors
5. Review the implementation in `src/lib/dynamic-onboarding.ts`