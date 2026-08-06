-- Production target for training work items (day curriculum)
ALTER TABLE `curriculumchecklistitem`
  ADD COLUMN `productionTarget` DOUBLE NULL AFTER `assignedHours`;
