-- Allow checklist items to be either onboarding ticks or hands-on training work
ALTER TABLE `CurriculumChecklistItem`
  ADD COLUMN `kind` VARCHAR(191) NOT NULL DEFAULT 'CHECKLIST';
