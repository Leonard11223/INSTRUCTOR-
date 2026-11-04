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
    await models.StudentPlacement.sync({ alter: false });

    await addColumnIfMissing(queryInterface, 'classes', 'eligible_program_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'classes', 'eligible_year_level', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'classes', 'eligible_cohort_section', {
      type: Sequelize.STRING(60),
      allowNull: true
    });
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('classes')) {
      const columns = await queryInterface.describeTable('classes');
      for (const columnName of ['eligible_cohort_section', 'eligible_year_level', 'eligible_program_id']) {
        if (columns[columnName]) {
          await queryInterface.removeColumn('classes', columnName);
        }
      }
    }

    if (tables.includes('student_placements')) {
      await queryInterface.dropTable('student_placements');
    }
  }
};
