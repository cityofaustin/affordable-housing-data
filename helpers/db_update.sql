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

-- CREATE TABLE NOTE for note taking
-- SELECT @@default_storage_engine;
-- InnoDB
CREATE TABLE IF NOT EXISTS notes (
    note_id INT AUTO_INCREMENT,
    property_id INT(11) NOT NULL,
    note_text VARCHAR(1000) NOT NULL,
    created_on DATETIME NOT NULL,
    created_by INT(11) NOT NULL,
    delete_flag TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (note_id)
) 