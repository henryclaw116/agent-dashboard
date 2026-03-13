const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'LeadPipelineSection.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add promotion functions after handleSubmitLeadQualityFeedback (around line 345)
const promotionFunctions = `
  const promoteToScorer = async () => {
    if (!selectedLead) return;
    
    if (!confirm('Approve this lead for scoring?\n\nThis will mark it as KEEP and send to the Scorer agent.')) {
      return;
    }
    
    try {
      setSaving(true);
      await api.patch(\`/social-leads/\${selectedLead.id}\`, {
        stage1_status: 'KEEP'
      });
      
      alert('✅ Lead approved! Sent to Scorer agent.');
      setSelectedLead(null);
      loadLeads();
    } catch (error) {
      console.error('Failed to promote lead:', error);
      alert('Failed to promote lead');
    } finally {
      setSaving(false);
    }
  };

  const promoteToRouter = async () => {
    if (!selectedLead) return;
    
    const score = prompt('Enter lead score (0-100):', '75');
    if (!score) return;
    
    const category = prompt('Enter pain category (complexity/time/confidence/cost):', 'complexity');
    if (!category) return;
    
    try {
      setSaving(true);
      await api.patch(\`/social-leads/\${selectedLead.id}\`, {
        stage2_score: parseInt(score),
        stage2_pain_category: category,
        stage2_pain_summary: 'Manually scored by Tony'
      });
      
      alert('✅ Lead scored! Sent to Router agent.');
      setSelectedLead(null);
      loadLeads();
    } catch (error) {
      console.error('Failed to promote lead:', error);
      alert('Failed to promote lead');
    } finally {
      setSaving(false);
    }
  };

  const promoteToWriter = async () => {
    if (!selectedLead) return;
    
    if (!selectedLandingPage) {
      alert('Please select a landing page first');
      return;
    }
    
    if (!confirm(\`Send to Writer agent?\n\nLanding page: \${selectedLandingPage}\`)) {
      return;
    }
    
    try {
      setSaving(true);
      await api.patch(\`/social-leads/\${selectedLead.id}\`, {
        stage3_landing_url: selectedLandingPage,
        stage3_reasoning: 'Landing page selected by Tony'
      });
      
      alert('✅ Landing page assigned! Sent to Writer agent.');
      setSelectedLead(null);
      loadLeads();
    } catch (error) {
      console.error('Failed to promote lead:', error);
      alert('Failed to promote lead');
    } finally {
      setSaving(false);
    }
  };
`;

// Insert promotion functions before openLeadDetails function
content = content.replace(
  /const openLeadDetails = \(lead: PipelineLead\)/,
  promotionFunctions + '\n  const openLeadDetails = (lead: PipelineLead)'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Added stage promotion functions');
