# 🔗 Agent Relationships & Workflow Builder

## ✅ What's Been Built

### Database Layer
- ✅ `agent_relationships` table - stores connections between agents
- ✅ `workflow_templates` table - reusable workflow patterns
- ✅ Auto-hierarchy calculation based on Y position (vertical placement)
- ✅ Auto-routing functions for task delegation
- ✅ Relationship network views

### Backend API
- ✅ POST /api/relationships - Create connection
- ✅ GET /api/relationships - List all connections  
- ✅ PUT /api/relationships/:id - Update connection
- ✅ DELETE /api/relationships/:id - Remove connection
- ✅ GET /api/relationships/agent/:id - Get agent's connections

### Relationship Types Supported
1. **reports_to** - Manager/subordinate reporting structure
2. **delegates_to** - Task delegation (from → to)
3. **approves_for** - Approval workflow (to approves from's work)
4. **collaborates_with** - Equal peers working together
5. **escalates_to** - Issue escalation path
6. **feeds_to** - Output → Input pipeline
7. **backs_up** - Backup/redundancy relationship

### Auto-Hierarchy Rules
- **Y Position** determines hierarchy automatically
- **Lower Y** (higher on canvas) = higher in hierarchy
- **Same Y** (within 50px) = same level/peers
- **Parent relationships** auto-assigned based on vertical position + "reports_to" connections

## 🎯 Next: Frontend Connection UI (To Build)

The backend is ready. Here's what needs to be built in the frontend:

### Connection Drawing Mode
```typescript
// Add to AgentOrgChart.tsx

const [connectionMode, setConnectionMode] = useState(false);
const [connectingFrom, setConnectingFrom] = useState<Agent | null>(null);
const [relationships, setRelationships] = useState<Relationship[]>([]);

// Enable connection mode
<button onClick={() => setConnectionMode(true)}>
  Connect Agents
</button>

// Click agent #1 → Click agent #2 → Show modal
const handleAgentClickInConnectMode = (agent: Agent) => {
  if (!connectingFrom) {
    setConnectingFrom(agent);
  } else {
    // Show relationship modal
    showRelationshipModal(connectingFrom, agent);
  }
};
```

### Relationship Configuration Modal

When connecting two agents, show a modal:

**Modal UI:**
```
┌─────────────────────────────────────────────┐
│  Connect: Marketing Agent → Content Agent   │
├─────────────────────────────────────────────┤
│                                              │
│  Relationship Type:                          │
│  ○ Reports To (Content Agent manages)        │
│  ○ Delegates To (Marketing can assign tasks)│
│  ● Feeds To (Marketing output → Content)     │
│  ○ Approves For (Content approves Marketing) │
│  ○ Collaborates With (Equal peers)           │
│  ○ Escalates To (Issues go to Content)       │
│  ○ Backs Up (Content backs up Marketing)     │
│                                              │
│  Workflow Options:                           │
│  ☑ Auto-route completed tasks                │
│  ☐ Require approval before routing           │
│  ☐ Only route high-priority tasks            │
│                                              │
│  Task Filter (optional):                     │
│  Tags: [content, video, social]              │
│                                              │
│  Line Style:                                 │
│  Color: [Blue ▼]  Style: [Solid ▼]          │
│  Label: Content Pipeline                     │
│                                              │
│  Notes:                                      │
│  Marketing creates drafts, Content reviews   │
│                                              │
│         [Cancel]  [Create Connection]        │
└─────────────────────────────────────────────┘
```

### Visual Connection Lines

Draw SVG arrows between connected agents:

```typescript
const renderRelationshipLines = () => {
  return relationships.map(rel => {
    const fromAgent = agents.find(a => a.id === rel.from_agent_id);
    const to_agent = agents.find(a => a.id === rel.to_agent_id);
    
    if (!fromAgent || !toAgent) return null;
    
    const x1 = fromAgent.position_x + 120; // Center of card
    const y1 = fromAgent.position_y + 80;  // Bottom
    const x2 = toAgent.position_x + 120;
    const y2 = toAgent.position_y;         // Top
    
    return (
      <g key={rel.id}>
        {/* Arrow line */}
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={rel.line_color || '#3B82F6'}
          strokeWidth="2"
          strokeDasharray={rel.line_style === 'dashed' ? '5,5' : '0'}
          markerEnd="url(#arrowhead)"
        />
        {/* Label */}
        {rel.label && (
          <text
            x={(x1 + x2) / 2}
            y={(y1 + y2) / 2}
            fill="#374151"
            fontSize="12"
            textAnchor="middle"
          >
            {rel.label}
          </text>
        )}
      </g>
    );
  });
};

// Arrow marker definition
<defs>
  <marker
    id="arrowhead"
    markerWidth="10"
    markerHeight="10"
    refX="9"
    refY="3"
    orient="auto"
  >
    <polygon
      points="0 0, 10 3, 0 6"
      fill="#3B82F6"
    />
  </marker>
</defs>
```

### Workflow Features

**Auto-Routing:**
When Marketing Agent completes a task with `tags: ['content']`, and there's a `feeds_to` relationship to Content Agent with auto-routing enabled:
→ System automatically creates a new task assigned to Content Agent
→ New task includes Marketing's output as input
→ Dependency chain maintained

**Approval Workflow:**
When Junior Agent completes a task, and there's an `approves_for` relationship to Senior Agent:
→ Task marked "pending_approval"
→ Notification sent to Senior Agent
→ Senior reviews and approves/rejects
→ If approved, task routed to next step

**Escalation:**
When Support Agent encounters an issue tagged "escalate", and there's an `escalates_to` relationship to Manager:
→ New high-priority task created for Manager
→ Original task linked as reference
→ Alert generated

## 📊 Visual Hierarchy Example

```
Y=100   ┌─────────┐
        │   CEO   │ ← Top of canvas = highest authority
        └────┬────┘
             │ reports_to
     ┌───────┴───────┐
Y=300│               │
   ┌─▼──┐        ┌──▼─┐
   │ VP │────────│ VP │ ← Same Y = same level/peers
   │Mkt│collabs │Dev │
   └─┬──┘        └──┬─┘
     │              │
Y=500│              │
   ┌─▼────┐     ┌──▼──┐
   │Social│─────│Builder│ ← reports_to VPs above
   │ Mgr  │feeds│       │
   └──────┘     └───────┘
```

**Hierarchy auto-calculated:**
- CEO: level 0 (Y=100, top)
- VPs: level 1 (Y=300)
- Managers: level 2 (Y=500)

**Relationships define workflow:**
- Social Mgr `feeds_to` Builder (output → input)
- Both VPs `collaborates_with` each other (peers)
- Everyone `reports_to` someone above them

## 🚀 Integration Code Examples

### Create a Relationship (API)
```javascript
await fetch('https://backend.../api/relationships', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    from_agent_id: 1,  // Marketing Agent
    to_agent_id: 3,    // Content Agent
    relationship_type: 'feeds_to',
    workflow_config: {
      auto_route_tasks: true,
      task_filter: { tags: ['content', 'social'] },
      routing_rules: {
        on_complete: 'delegate',
        priority: 5
      }
    },
    line_color: '#10B981',  // Green
    line_style: 'solid',
    label: 'Content Pipeline'
  })
});
```

### Task Auto-Routing (Automatic)
When Marketing Agent completes a task:
```javascript
// In your agent's completion handler:
await fetch(`${API}/api/orchestration/tasks/${taskId}/complete`, {
  method: 'POST',
  body: JSON.stringify({
    result: {
      draft_content: "...",
      images: ["..."],
      status: "ready_for_review"
    }
  })
});

// System automatically:
// 1. Checks for active relationships from this agent
// 2. Finds "feeds_to" relationships with auto_route_tasks=true
// 3. Creates new task for Content Agent with Marketing's output
// 4. Links tasks via dependency chain
```

## 🎨 UI Components Needed

1. **Connection Mode Toggle Button**
   - "Connect Agents" button in toolbar
   - Active state shows "Click two agents to connect"
   - Cancel button to exit mode

2. **Relationship Configuration Modal**
   - Relationship type selector (radio buttons)
   - Workflow toggles (checkboxes)
   - Task filter inputs
   - Visual style pickers (color, line style)
   - Label text input
   - Notes textarea

3. **Connection Line Renderer**
   - SVG layer behind agent cards
   - Arrow markers
   - Labels at midpoint
   - Click to edit/delete
   - Hover to highlight path

4. **Hierarchy Indicator**
   - Visual indicator showing agent's level
   - "Level 0", "Level 1", etc. badge
   - Color coding by hierarchy

## 📋 Implementation Checklist

Backend (DONE):
- [x] Database tables created
- [x] API routes created
- [x] Auto-hierarchy function
- [x] Auto-routing function
- [x] Relationship views

Frontend (TODO):
- [ ] Add connection mode state
- [ ] Click-to-connect handler
- [ ] Relationship configuration modal
- [ ] SVG connection lines renderer
- [ ] Load relationships on mount
- [ ] Real-time relationship updates
- [ ] Edit/delete existing connections
- [ ] Hierarchy level indicator

## 🎯 Quick Start for Development

1. **Load relationships:**
```typescript
const [relationships, setRelationships] = useState([]);

useEffect(() => {
  api.get('/relationships').then(res => {
    setRelationships(res.data.relationships);
  });
}, []);
```

2. **Enable connect mode:**
```typescript
<button onClick={() => setConnectionMode(!connectionMode)}>
  {connectionMode ? 'Cancel' : 'Connect Agents'}
</button>
```

3. **Handle agent clicks in connect mode:**
```typescript
const handleAgentClick = (agent) => {
  if (!connectionMode) {
    // Normal click - show details
    onAgentClick(agent);
  } else {
    // Connect mode - draw connection
    if (!connectingFrom) {
      setConnectingFrom(agent);
    } else {
      showRelationshipModal(connectingFrom, agent);
    }
  }
};
```

4. **Create relationship:**
```typescript
const createRelationship = async (config) => {
  const res = await api.post('/relationships', {
    from_agent_id: connectingFrom.id,
    to_agent_id: connectingTo.id,
    ...config
  });
  setRelationships([...relationships, res.data.relationship]);
  setConnectionMode(false);
  setConnectingFrom(null);
};
```

---

**Backend is ready to go!** Just need to build the frontend UI components to visualize and create the connections.
