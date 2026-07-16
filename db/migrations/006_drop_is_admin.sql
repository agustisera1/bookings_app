-- up

-- The admin role was removed from the system (only guest and host remain), so
-- nothing reads this column anymore. NOTE: this is one-way — `down` restores
-- the column with its original definition (001), not who was an admin.
ALTER TABLE users DROP COLUMN is_admin;

-- down

ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
