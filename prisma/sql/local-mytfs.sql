-- Local HRMS (mytfs) schema for TMS development.
-- Creates only the tables TMS reads.

CREATE DATABASE IF NOT EXISTS mytfs
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mytfs;

CREATE TABLE IF NOT EXISTS project_category (
  project_category_id INT AUTO_INCREMENT PRIMARY KEY,
  project_category_name VARCHAR(191) NOT NULL
);

CREATE TABLE IF NOT EXISTS project (
  project_id INT AUTO_INCREMENT PRIMARY KEY,
  project_name VARCHAR(191) NOT NULL,
  project_code VARCHAR(64) NULL,
  project_description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  project_category_id INT NULL,
  KEY idx_project_active (is_active),
  KEY idx_project_category (project_category_id)
);

CREATE TABLE IF NOT EXISTS tfs_user (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  user_email VARCHAR(191) NOT NULL,
  user_number VARCHAR(64) NULL,
  user_name VARCHAR(191) NULL,
  is_delete TINYINT(1) NULL DEFAULT 0,
  KEY idx_tfs_user_email (user_email),
  KEY idx_tfs_user_number (user_number)
);

CREATE TABLE IF NOT EXISTS task_work_tracker (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL,
  production DECIMAL(12, 2) NULL DEFAULT 0,
  billable_hours VARCHAR(32) NULL,
  actual_billable_hours VARCHAR(32) NULL,
  date_time DATETIME NULL,
  is_active TINYINT(1) NULL DEFAULT 1,
  KEY idx_twt_user_project (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS qc_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  project_id INT NOT NULL,
  qc_score DECIMAL(8, 2) NULL,
  KEY idx_qc_agent_project (agent_id, project_id)
);

-- Seed categories / projects (ids stay stable for curriculum links)
INSERT INTO project_category (project_category_id, project_category_name)
VALUES (1, 'Training')
ON DUPLICATE KEY UPDATE project_category_name = VALUES(project_category_name);

INSERT INTO project (project_id, project_name, project_code, project_description, is_active, project_category_id)
VALUES
  (1, 'Altrum', 'ALT', 'Local demo practice project', 1, 1),
  (2, 'Landscape', 'LND', 'Local landscape practice project', 1, 1),
  (3, 'Demo QA', 'DQA', 'Local QA practice project', 1, 1)
ON DUPLICATE KEY UPDATE
  project_name = VALUES(project_name),
  is_active = 1;

-- Demo HRMS users — match these when creating TMS trainees
INSERT INTO tfs_user (user_id, user_email, user_number, user_name, is_delete)
VALUES
  (101, 'trainee1@company.in', 'EMP001', 'Trainee One', 0),
  (102, 'trainee2@company.in', 'EMP002', 'Trainee Two', 0),
  (103, 'admin@company.in', 'ADMIN01', 'Admin', 0)
ON DUPLICATE KEY UPDATE
  user_email = VALUES(user_email),
  user_number = VALUES(user_number),
  user_name = VALUES(user_name),
  is_delete = 0;

-- Sample work for Trainee 1 on Altrum
DELETE FROM task_work_tracker WHERE user_id = 101 AND project_id = 1;
INSERT INTO task_work_tracker
  (user_id, project_id, production, billable_hours, actual_billable_hours, date_time, is_active)
VALUES
  (101, 1, 12, '4', '4.5', NOW() - INTERVAL 1 DAY, 1),
  (101, 1, 8, '3', '3', NOW(), 1);

DELETE FROM qc_records WHERE agent_id = 101 AND project_id = 1;
INSERT INTO qc_records (agent_id, project_id, qc_score)
VALUES
  (101, 1, 92),
  (101, 1, 88);
