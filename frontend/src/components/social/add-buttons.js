const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'LeadPipelineSection.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add promotion buttons before the existing action buttons
const promotionButtons = `
              {/* Stage Promotion Buttons */}
              {!showArchive && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">? Manual Stage Promotion</h3>
                  <p className="text-xs text-blue-700 mb-3">Manually push this lead forward through the pipeline</p>
                  
                  <div className="flex gap-2 flex-wrap">
                    {/* Scanner → Scorer */}
                    {!selectedLead.stage2_score && (
                      <button
                        onClick={promoteToScorer}
                        disabled={saving}
                        className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm flex items-center gap-2"
                        title="Mark as KEEP and send to Scorer agent"
                      >
                        ? Approve for Scoring
                      </button>
                    )}
                    
                    {/* Scorer → Router */}
                    {selectedLead.stage2_score && !selectedLead.stage3_landing_url && (
                      <button
                        onClick={promoteToRouter}
                        disabled={saving}
                        className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm flex items-center gap-2"
                        title="Manually score this lead and send to Router"
                      >
                        ? Score & Send to Router
                      </button>
                    )}
                    
                    {/* Router → Writer */}
                    {selectedLead.stage3_landing_url && !selectedLead.stage4_reply_text && (
                      <button
                        onClick={promoteToWriter}
                        disabled={saving || !selectedLandingPage}
                        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2"
                        title="Confirm landing page and send to Writer"
                      >
                        ? Send to Writer
                      </button>
                    )}
                  </div>
                </div>
              )}

`;

// Insert promotion buttons before the Reject button section
content = content.replace(
  /<button\s+onClick=\{handleReject\}/,
  promotionButtons + '              <button onClick={handleReject}'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Added stage promotion buttons to modal');
