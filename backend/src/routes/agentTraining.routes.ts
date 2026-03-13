import { Router, Request, Response } from 'express';
import { agentTrainingService } from '../services/agentTraining.service';

const router = Router();

/**
 * POST /api/agent-training/run
 * Trigger training cycle manually
 */
router.post('/run', async (req: Request, res: Response) => {
  try {
    console.log('🎓 Manual training cycle triggered');
    
    const updates = await agentTrainingService.runTrainingCycle();
    
    res.json({
      success: true,
      message: `Training complete! Updated ${updates.length} agent(s)`,
      updates
    });
  } catch (error: any) {
    console.error('Error running training cycle:', error);
    res.status(500).json({ 
      error: 'Failed to run training cycle', 
      details: error.message 
    });
  }
});

/**
 * GET /api/agent-training/history
 * Get training history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const history = await agentTrainingService.getTrainingHistory(limit);
    
    res.json({
      success: true,
      history
    });
  } catch (error: any) {
    console.error('Error fetching training history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch training history', 
      details: error.message 
    });
  }
});

/**
 * GET /api/agent-training/latest-prompts
 * Get latest trained prompts
 */
router.get('/latest-prompts', async (req: Request, res: Response) => {
  try {
    const prompts = await agentTrainingService.getLatestPrompts();
    
    if (!prompts) {
      return res.json({
        success: true,
        message: 'No training history yet',
        prompts: null
      });
    }
    
    res.json({
      success: true,
      prompts
    });
  } catch (error: any) {
    console.error('Error fetching latest prompts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch latest prompts', 
      details: error.message 
    });
  }
});

/**
 * GET /api/agent-training/stats
 * Get training statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const history = await agentTrainingService.getTrainingHistory(100);
    
    const stats = {
      total_training_cycles: history.length,
      last_training_date: history[0]?.training_date || null,
      total_reply_lessons: history.reduce((sum, h) => sum + h.reply_lessons.length, 0),
      total_quality_lessons: history.reduce((sum, h) => sum + h.quality_lessons.length, 0),
      agents_trained: {
        writer: history.filter(h => h.writer_prompt).length,
        scorer: history.filter(h => h.scorer_guidelines).length,
        router: history.filter(h => h.router_rules).length
      }
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error('Error fetching training stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch training stats', 
      details: error.message 
    });
  }
});

export default router;
