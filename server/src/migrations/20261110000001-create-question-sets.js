'use strict';

const models = require('../models');

module.exports = {
  async up() {
    await models.QuestionSet.sync({ alter: false });
    await models.QuestionSetQuestion.sync({ alter: false });
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('question_set_questions')) {
      await queryInterface.dropTable('question_set_questions');
    }
    if (tables.includes('question_sets')) {
      await queryInterface.dropTable('question_sets');
    }
  }
};
