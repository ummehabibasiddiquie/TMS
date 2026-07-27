-- Assigned working hours on training work (curriculum checklist WORK items)
ALTER TABLE `CurriculumChecklistItem`
  ADD COLUMN `assignedHours` DOUBLE NULL;
