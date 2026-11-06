'use strict';

/**
 * Widens users.avatar_url from VARCHAR(500) to TEXT so that
 * base64-encoded profile photos can be stored.
 *
 * SQLite does not support ALTER COLUMN at all.  The standard Sequelize
 * changeColumn helper creates a _backup table and re-inserts, but fails
 * on the unique-constraint duplicate caused by existing rows.  We instead
 * use the minimal raw-SQL approach: create a new TEXT column, copy the data,
 * drop the old one — or, since SQLite TEXT already accepts any length without
 * a declared size, we can simply rename the strategy:
 *
 * Actually the simplest SQLite-safe fix is to just use queryInterface.addColumn
 * with the new name and drop the old one — but that loses data.
 *
 * The correct approach is raw PRAGMA + CREATE TABLE AS:
 * We disable FK, do a full table rebuild, re-enable FK.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    if (dialect === 'sqlite') {
      const q = queryInterface.sequelize;
      await q.query('PRAGMA foreign_keys = OFF');
      await q.query('PRAGMA legacy_alter_table = ON');
      try {
        // Rename existing table
        await q.query('ALTER TABLE `users` RENAME TO `users_old_avatar`');

        // Recreate with TEXT avatar_url — copy all column definitions from the model
        await q.query(`
          CREATE TABLE \`users\` (
            \`id\`                        INTEGER PRIMARY KEY AUTOINCREMENT,
            \`institution_id\`            INTEGER,
            \`department_id\`             INTEGER,
            \`program_id\`                INTEGER,
            \`student_number\`            VARCHAR(50) UNIQUE,
            \`employee_number\`           VARCHAR(50) UNIQUE,
            \`first_name\`               VARCHAR(100) NOT NULL,
            \`last_name\`                VARCHAR(100) NOT NULL,
            \`email\`                     VARCHAR(191) NOT NULL UNIQUE,
            \`password_hash\`             VARCHAR(255) NOT NULL,
            \`status\`                    VARCHAR(20) NOT NULL DEFAULT 'active',
            \`avatar_url\`               TEXT,
            \`bio\`                       TEXT,
            \`phone\`                     VARCHAR(40),
            \`timezone\`                  VARCHAR(80) DEFAULT 'Asia/Manila',
            \`email_verified\`            INTEGER DEFAULT 1,
            \`failed_login_attempts\`     INTEGER DEFAULT 0,
            \`locked_until\`              DATETIME,
            \`last_login_at\`             DATETIME,
            \`password_reset_token\`      VARCHAR(191),
            \`password_reset_expires\`    DATETIME,
            \`notification_preferences\`  TEXT,
            \`created_at\`               DATETIME NOT NULL,
            \`updated_at\`               DATETIME NOT NULL
          )
        `);

        // Copy data
        await q.query(`
          INSERT INTO \`users\`
          SELECT
            id, institution_id, department_id, program_id,
            student_number, employee_number, first_name, last_name,
            email, password_hash, status, avatar_url, bio, phone,
            timezone, email_verified, failed_login_attempts, locked_until,
            last_login_at, password_reset_token, password_reset_expires,
            notification_preferences, created_at, updated_at
          FROM \`users_old_avatar\`
        `);

        // Drop old table
        await q.query('DROP TABLE `users_old_avatar`');
      } finally {
        await q.query('PRAGMA legacy_alter_table = OFF');
        await q.query('PRAGMA foreign_keys = ON');
      }
    } else {
      // MySQL / PostgreSQL — standard column alter
      await queryInterface.changeColumn('users', 'avatar_url', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // For reverting: just change model back — data truncation risk acceptable in rollback
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'sqlite') {
      await queryInterface.changeColumn('users', 'avatar_url', {
        type: Sequelize.STRING(500),
        allowNull: true
      });
    }
    // SQLite rollback not implemented — no data is lost going TEXT→VARCHAR in SQLite
  }
};
