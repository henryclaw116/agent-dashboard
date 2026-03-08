import express from 'express';
import { db } from '../server';

const router = express.Router();

/**
 * GET /api/dashboard/overview
 * Main dashboard view with all key metrics
 */
router.get('/overview', async (req, res) => {
  try {
    // Get active projects with percent complete
    const projectsQuery = await db.query(`
      SELECT id, name, description, status, percent_complete, priority, target_date
      FROM projects
      WHERE status = 'active'
      ORDER BY priority ASC, created_at DESC
    `);

    // Get open blockers
    const blockersQuery = await db.query(`
      SELECT b.*, p.name as project_name
      FROM blockers b
      LEFT JOIN projects p ON b.project_id = p.id
      WHERE b.status = 'open'
      ORDER BY b.created_at DESC
    `);

    // Get tasks in progress
    const tasksQuery = await db.query(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.status = 'in_progress'
      ORDER BY t.priority ASC
    `);

    // Get today's activity count
    const activityQuery = await db.query(`
      SELECT COUNT(*) as count
      FROM activity_log
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    // Get unread notifications
    const notificationsQuery = await db.query(`
      SELECT *
      FROM notifications
      WHERE read = FALSE
      ORDER BY priority ASC, created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      projects: projectsQuery.rows,
      blockers: blockersQuery.rows,
      tasks_in_progress: tasksQuery.rows,
      today_activity_count: parseInt(activityQuery.rows[0].count),
      notifications: notificationsQuery.rows
    });
  } catch (error: any) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/daily-recap/:date
 * Get daily recap for specific date (defaults to today)
 */
router.get('/daily-recap/:date?', async (req, res) => {
  try {
    const date = req.params.date || new Date().toISOString().split('T')[0];

    const recap = await db.query(`
      SELECT *
      FROM daily_recaps
      WHERE recap_date = $1
    `, [date]);

    if (recap.rows.length === 0) {
      // Generate recap on-the-fly if not exists
      const generated = await generateDailyRecap(date);
      return res.json({ success: true, recap: generated, generated: true });
    }

    res.json({ success: true, recap: recap.rows[0] });
  } catch (error: any) {
    console.error('Daily recap error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/stats
 * Overall statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
        (SELECT COUNT(*) FROM tasks WHERE status = 'complete' AND DATE(completed_at) = CURRENT_DATE) as tasks_completed_today,
        (SELECT COUNT(*) FROM tasks WHERE status = 'in_progress') as tasks_in_progress,
        (SELECT COUNT(*) FROM blockers WHERE status = 'open') as open_blockers,
        (SELECT COUNT(*) FROM notifications WHERE read = FALSE) as unread_notifications
    `);

    res.json({ success: true, stats: stats.rows[0] });
  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper function to generate daily recap
 */
async function generateDailyRecap(date: string) {
  // Get all activity for the date
  const activity = await db.query(`
    SELECT
      project_id,
      activity_type,
      description,
      metadata
    FROM activity_log
    WHERE DATE(created_at) = $1
    ORDER BY created_at DESC
  `, [date]);

  // Get tasks completed on date
  const completedTasks = await db.query(`
    SELECT t.*, p.name as project_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE DATE(t.completed_at) = $1
  `, [date]);

  // Get tasks created on date
  const createdTasks = await db.query(`
    SELECT COUNT(*) as count
    FROM tasks
    WHERE DATE(created_at) = $1
  `, [date]);

  // Group by project
  const projectsSummary: any = {};
  activity.rows.forEach((act: any) => {
    if (!projectsSummary[act.project_id]) {
      projectsSummary[act.project_id] = {
        completed: [],
        working_on: [],
        next_up: []
      };
    }
  });

  completedTasks.rows.forEach((task: any) => {
    if (projectsSummary[task.project_id]) {
      projectsSummary[task.project_id].completed.push(task.title);
    }
  });

  return {
    recap_date: date,
    projects_summary: projectsSummary,
    tasks_completed: completedTasks.rows.length,
    tasks_created: parseInt(createdTasks.rows[0].count),
    files_changed: activity.rows.filter((a: any) => a.activity_type === 'file_changed').length
  };
}

export default router;
