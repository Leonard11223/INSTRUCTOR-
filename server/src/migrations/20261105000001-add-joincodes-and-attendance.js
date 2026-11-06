'use strict';

const models = require('../models');

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const columns = await queryInterface.describeTable(tableName);
  if (!columns[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (models.AttendanceSession) {
      await models.AttendanceSession.sync({ alter: false });
    }
    if (models.AttendanceRecord) {
      await models.AttendanceRecord.sync({ alter: false });
    }

    await addColumnIfMissing(queryInterface, 'classes', 'join_code', {
      type: Sequelize.STRING(12),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'classes', 'join_code_enabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    try {
      await queryInterface.addIndex('classes', ['join_code'], {
        unique: true,
        name: 'classes_join_code_unique'
      });
    } catch (err) {
      // Index might already exist
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('classes')) {
      const columns = await queryInterface.describeTable('classes');
      for (const columnName of ['join_code', 'join_code_enabled']) {
        if (columns[columnName]) {
          await queryInterface.removeColumn('classes', columnName);
        }
      }
    }

    if (tables.includes('attendance_records')) {
      await queryInterface.dropTable('attendance_records');
    }
    if (tables.includes('attendance_sessions')) {
      await queryInterface.dropTable('attendance_sessions');
    }
  }
};
