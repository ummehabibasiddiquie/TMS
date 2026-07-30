-- Allow Admin/TL to promote a trainee to a later day without completing earlier checklist items
ALTER TABLE `TraineeProfile`
  ADD COLUMN `forcedCurrentDayNumber` INT NULL;
