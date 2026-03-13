import cron from 'node-cron';
import { agentTrainingService } from '../services/agentTraining.service';

/**
 * Weekly Agent Training Job
 * 
 * Runs every Monday at 6:00 AM to analyze feedback from the previous week
 * and automatically improve agent prompts.
 */
export function startWeeklyTrainingJob() {
  // Run every Monday at 6:00 AM
  // Cron format: "minute hour day month day-of-week"
  // '0 6 * * 1' = At 06:00 on Monday
  
  cron.schedule('0 6 * * 1', async () => {
    try {
      console.log('\n🎓 ===== WEEKLY AGENT TRAINING CYCLE =====');
      console.log('📅 Date:', new Date().toISOString());
      
      const updates = await agentTrainingService.runTrainingCycle();
      
      if (updates.length === 0) {
        console.log('⏭️  No new lessons to learn this week. Skipping training.');
      } else {
        console.log(`✅ Training complete! Updated ${updates.length} agent(s):`);
        updates.forEach(update => {
          console.log(`   - ${update.agent_name}: ${update.improvement_areas.join(', ')}`);
        });
      }
      
      console.log('🎓 ===== TRAINING CYCLE COMPLETE =====\n');
    } catch (error) {
      console.error('❌ Weekly training job failed:', error);
    }
  }, {
    timezone: "America/Denver" // Tony's timezone
  });

  console.log('📚 Weekly training job scheduled (Mondays at 6:00 AM MDT)');
}

/**
 * Run training immediately (for testing)
 */
export async function runTrainingNow() {
  console.log('🎓 Running training cycle immediately (manual trigger)...');
  
  try {
    const updates = await agentTrainingService.runTrainingCycle();
    console.log(`✅ Training complete! Updated ${updates.length} agent(s)`);
    return updates;
  } catch (error) {
    console.error('❌ Training failed:', error);
    throw error;
  }
}
