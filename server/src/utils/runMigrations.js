const { sequelize, Sequelize } = require('../models');
const migrations = [
  ['20261028000001-create-lms-schema.js', require('../migrations/20261028000001-create-lms-schema')],
  ['20261103000001-add-student-placements.js', require('../migrations/20261103000001-add-student-placements')],
  ['20261105000001-add-joincodes-and-attendance.js', require('../migrations/20261105000001-add-joincodes-and-attendance')],
  ['20261105000001-widen-avatar-url.js', require('../migrations/20261105000001-widen-avatar-url')]
];
const logger = require('../config/logger');

async function runMigrations() {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.createTable('SequelizeMeta', {
    name: {
      type: Sequelize.STRING(191),
      allowNull: false,
      unique: true,
      primaryKey: true
    }
  }).catch(() => {});

  for (const [migrationName, migration] of migrations) {
    const [existing] = await sequelize.query(
      `SELECT name FROM SequelizeMeta WHERE name = :name`,
      { replacements: { name: migrationName } }
    );

    await migration.up(queryInterface, Sequelize);

    if (!existing || existing.length === 0) {
      await sequelize.query(
        `INSERT INTO SequelizeMeta (name) VALUES (:name)`,
        { replacements: { name: migrationName } }
      );
      logger.info({ migration: migrationName }, 'Database migration executed and recorded in SequelizeMeta');
    } else {
      logger.info({ migration: migrationName }, 'Database schema verified up to date');
    }
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migrations completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = runMigrations;
