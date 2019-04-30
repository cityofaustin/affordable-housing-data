-- Alter table sql statements
-- new field to mark verfication deletion
ALTER TABLE AffordableHousingDataHub.PropertyVerifications
ADD COLUMN deleted_flag TINYINT(1) NOT NULL DEFAULT 0 AFTER verified;

-- new field for user access role
-- admin_flag=1 power user
-- admin_flag=2 Agent
-- admin_flag=3 Navigator
-- admin_flag=4 landlord
ALTER TABLE AffordableHousingDataHub.Users
ADD COLUMN admin_flag TINYINT(1) NOT NULL DEFAULT 0;