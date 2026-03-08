import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../server';
import { broadcast } from '../server';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.body.upload_type || 'video';
    const dir = path.join(__dirname, '../../uploads', uploadType === 'video' ? 'videos' : 'content');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB limit
});

// ===== VIDEO EDITING ROUTES =====

/**
 * GET /api/social-media/videos
 * List all video uploads with filtering
 */
router.get('/videos', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = 'SELECT * FROM video_uploads';
    const params: any[] = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY uploaded_at DESC';
    
    const result = await db.query(query, params);
    res.json({ success: true, videos: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/social-media/videos/upload
 * Upload video for editing
 */
router.post('/videos/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }
    
    const { editing_instructions, tags } = req.body;
    
    const result = await db.query(`
      INSERT INTO video_uploads (
        filename,
        original_filename,
        file_path,
        file_size,
        editing_instructions,
        tags
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      req.file.filename,
      req.file.originalname,
      req.file.path,
      req.file.size,
      editing_instructions,
      tags ? tags.split(',') : []
    ]);
    
    // Log activity
    await db.query(`
      INSERT INTO activity_log (activity_type, description, metadata)
      VALUES ('video_uploaded', $1, $2)
    `, [
      `Video uploaded for editing: ${req.file.originalname}`,
      JSON.stringify({ video_id: result.rows[0].id })
    ]);
    
    broadcast({ type: 'video_uploaded', video: result.rows[0] });
    
    res.json({ success: true, video: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/social-media/videos/:id/edited
 * Upload edited version of video
 */
router.post('/videos/:id/edited', upload.single('edited_video'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No edited video file uploaded' });
    }
    
    const { notes } = req.body;
    
    const result = await db.query(`
      UPDATE video_uploads
      SET edited_file_path = $1,
          edited_file_size = $2,
          status = 'complete',
          completed_at = NOW(),
          notes = $3
      WHERE id = $4
      RETURNING *
    `, [req.file.path, req.file.size, notes, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Log activity
    await db.query(`
      INSERT INTO activity_log (activity_type, description, metadata)
      VALUES ('video_edited', $1, $2)
    `, [
      `Edited video ready: ${result.rows[0].original_filename}`,
      JSON.stringify({ video_id: id })
    ]);
    
    broadcast({ type: 'video_edited_complete', video: result.rows[0] });
    
    res.json({ success: true, video: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/social-media/videos/:id/download
 * Download edited video
 */
router.get('/videos/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT * FROM video_uploads WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const video = result.rows[0];
    const filePath = video.edited_file_path || video.file_path;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    // Mark as downloaded
    await db.query(`
      UPDATE video_uploads SET downloaded_at = NOW() WHERE id = $1
    `, [id]);
    
    res.download(filePath, video.original_filename);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/social-media/videos/:id/assign
 * Assign video to agent for editing
 */
router.put('/videos/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;
    
    const result = await db.query(`
      UPDATE video_uploads
      SET assigned_to = $1,
          status = 'in_progress',
          started_editing_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [assigned_to, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    broadcast({ type: 'video_assigned', video: result.rows[0] });
    
    res.json({ success: true, video: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SOCIAL CONTENT ROUTES =====

/**
 * GET /api/social-media/content
 * List all social content with filtering
 */
router.get('/content', async (req, res) => {
  try {
    const { status, platform, content_type } = req.query;
    
    let query = 'SELECT * FROM social_content WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (platform) {
      query += ` AND platform = $${paramIndex++}`;
      params.push(platform);
    }
    
    if (content_type) {
      query += ` AND content_type = $${paramIndex++}`;
      params.push(content_type);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await db.query(query, params);
    res.json({ success: true, content: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/social-media/content
 * Create new social content
 */
router.post('/content', upload.single('file'), async (req, res) => {
  try {
    const {
      content_type,
      title,
      description,
      platform,
      dimensions,
      created_with,
      created_by,
      canva_design_url,
      tags
    } = req.body;
    
    const result = await db.query(`
      INSERT INTO social_content (
        content_type,
        title,
        description,
        file_path,
        file_size,
        platform,
        dimensions,
        created_with,
        created_by,
        canva_design_url,
        tags
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      content_type,
      title,
      description,
      req.file?.path,
      req.file?.size,
      platform,
      dimensions,
      created_with || 'canva',
      created_by,
      canva_design_url,
      tags ? tags.split(',') : []
    ]);
    
    broadcast({ type: 'content_created', content: result.rows[0] });
    
    res.json({ success: true, content: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/social-media/content/:id/submit-review
 * Submit content for Tony's review
 */
router.put('/content/:id/submit-review', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      UPDATE social_content
      SET status = 'pending_review',
          submitted_for_review_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Create notification for Tony
    await db.query(`
      INSERT INTO notifications (
        notification_type,
        title,
        message,
        priority
      )
      VALUES ('content_review', $1, $2, 2)
    `, [
      `New content ready for review: ${result.rows[0].title}`,
      `${result.rows[0].content_type} for ${result.rows[0].platform}`
    ]);
    
    broadcast({ type: 'content_submitted_for_review', content: result.rows[0] });
    
    res.json({ success: true, content: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/social-media/content/:id/review
 * Approve or reject content
 */
router.put('/content/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body; // status: 'approved' or 'rejected'
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }
    
    const result = await db.query(`
      UPDATE social_content
      SET status = $1,
          reviewed_by = 'tony',
          reviewed_at = NOW(),
          review_notes = $2
      WHERE id = $3
      RETURNING *
    `, [status, feedback, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Log review
    await db.query(`
      INSERT INTO content_reviews (content_id, reviewer, status, feedback)
      VALUES ($1, 'tony', $2, $3)
    `, [id, status, feedback]);
    
    broadcast({ type: 'content_reviewed', content: result.rows[0], review: { status, feedback } });
    
    res.json({ success: true, content: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/social-media/content/:id/download
 * Download content file
 */
router.get('/content/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT * FROM social_content WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    const content = result.rows[0];
    
    if (!content.file_path || !fs.existsSync(content.file_path)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(content.file_path, `${content.title}${path.extname(content.file_path)}`);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/social-media/content/:id
 * Delete content
 */
router.delete('/content/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      DELETE FROM social_content WHERE id = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Delete file from disk if exists
    if (result.rows[0].file_path && fs.existsSync(result.rows[0].file_path)) {
      fs.unlinkSync(result.rows[0].file_path);
    }
    
    res.json({ success: true, message: 'Content deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
