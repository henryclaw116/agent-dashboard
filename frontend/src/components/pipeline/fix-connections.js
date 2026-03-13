const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'AgentOrgChart.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: In onClose, keep connection mode active and only reset connectingTo
content = content.replace(
  /onClose=\{\(\) => \{[\s\S]*?setShowRelationshipModal\(false\);[\s\S]*?setConnectionMode\(false\);[\s\S]*?setConnectingFrom\(null\);[\s\S]*?setConnectingTo\(null\);[\s\S]*?setEditingRelationship\(null\);[\s\S]*?\}\}/,
  `onClose={() => {
            setShowRelationshipModal(false);
            // Keep connection mode active and source selected for multiple connections
            setConnectingTo(null);
            setEditingRelationship(null);
          }}`
);

// Fix 2: In onCreated, reset only connectingTo to allow connecting to another agent
content = content.replace(
  /onCreated=\{[\s\S]*?loadRelationships\(\);[\s\S]*?\}\}/,
  `onCreated={(relationshipId?: number, relationshipData?: any) => {
            // Save for undo
            if (relationshipId && relationshipData && !editingRelationship) {
              saveStateForUndo({
                type: 'create_relationship',
                relationshipId,
                relationship: relationshipData
              });
            }
            
            // Keep connection mode and source agent - reset only target for multiple connections
            setShowRelationshipModal(false);
            setConnectingTo(null);
            setEditingRelationship(null);
            loadRelationships();
          }}`
);

// Fix 3: Update banner text to indicate multiple connections
content = content.replace(
  /→ Selected: <strong>\{connectingFrom\.name\}<\/strong> → Click another agent to connect/,
  '→ Selected: <strong>{connectingFrom.name}</strong> → Click agents to connect (can connect to multiple)'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Multi-agent connections enabled');
console.log('  - Connection mode stays active after creating a relationship');
console.log('  - Source agent stays selected');
console.log('  - Can connect one agent to multiple other agents');
