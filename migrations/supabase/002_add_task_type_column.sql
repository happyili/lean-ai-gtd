-- Add task_type column to records table
ALTER TABLE records 
ADD COLUMN IF NOT EXISTS task_type VARCHAR(20) DEFAULT 'work';

-- Create index for task_type
CREATE INDEX IF NOT EXISTS idx_records_task_type ON records(task_type);

-- Update existing records to have default task_type
UPDATE records SET task_type = 'work' WHERE task_type IS NULL;