'use strict';

/**
 * Generalizes assignment and lesson types so the LMS works for ALL courses
 * (Math, Science, English, …) — not only IT/Networking.
 *
 * Additively widens the `assignment_type` and `lesson_type` enums with
 * subject-agnostic values. Every existing value is retained, so existing
 * rows and any code referencing the legacy values keep working unchanged.
 *
 *   assignments.assignment_type  += written_work, performance_task, project,
 *                                  recitation, case_study
 *   lessons.lesson_type          += demonstration, lecture, activity
 *
 * SQLite stores ENUMs as plain TEXT and enforces no DB-level constraint, so the
 * JS-level model/validator changes are sufficient there — this migration is a
 * no-op on SQLite. MySQL needs the column widened via changeColumn.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'sqlite') {
      // SQLite has no native ENUM (stored as TEXT) — nothing to widen at the DB level.
      return;
    }

    await queryInterface.changeColumn('assignments', 'assignment_type', {
      type: Sequelize.ENUM(
        'standard', 'programming', 'laboratory', 'network_config', 'project_milestone',
        'written_work', 'performance_task', 'project', 'recitation', 'case_study'
      ),
      allowNull: true,
      defaultValue: 'standard'
    });

    await queryInterface.changeColumn('lessons', 'lesson_type', {
      type: Sequelize.ENUM(
        'reading', 'video', 'laboratory', 'coding_exercise', 'interactive',
        'demonstration', 'lecture', 'activity'
      ),
      allowNull: true,
      defaultValue: 'reading'
    });
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'sqlite') {
      return;
    }
    // Revert to the original enum sets. NOTE: this assumes no rows still use the
    // new values — re-map or delete such rows before rolling back on MySQL.
    await queryInterface.changeColumn('assignments', 'assignment_type', {
      type: Sequelize.ENUM('standard', 'programming', 'laboratory', 'network_config', 'project_milestone'),
      allowNull: true,
      defaultValue: 'standard'
    });
    await queryInterface.changeColumn('lessons', 'lesson_type', {
      type: Sequelize.ENUM('reading', 'video', 'laboratory', 'coding_exercise', 'interactive'),
      allowNull: true,
      defaultValue: 'reading'
    });
  }
};
