# Social Media Manager Feature

## Overview
Complete content workflow management for Real Life Trading's social media presence. Handles video editing, Canva content creation, approval workflow, and publishing coordination.

---

## Features

### 1. Video Editing Workflow

**Purpose:** Upload raw videos → Agents edit → Download finished videos

**Flow:**
1. **Tony uploads** raw video with editing instructions
2. **Agent assigned** to video (auto or manual)
3. **Agent edits** video (external tools like DaVinci, Premiere)
4. **Agent uploads** edited version
5. **Tony downloads** finished video

**Statuses:**
- `pending` - Just uploaded, waiting for editing
- `in_progress` - Agent is editing
- `complete` - Edited version ready to download
- `downloaded` - Tony has downloaded it

**UI Sections:**
- Upload area (drag & drop or click)
- Videos Being Edited (pending/in progress)
- Videos Ready to Download (complete, highlighted in green)
- Downloaded (archived)

---

### 2. Social Content Creation & Approval

**Purpose:** Agents create graphics/posts in Canva → Submit for review → Tony approves → Agents post

**Flow:**
1. **Agent creates** content in Canva (Instagram post, YouTube thumbnail, etc.)
2. **Agent uploads** to dashboard with Canva link
3. **Status:** `pending_review`
4. **Tony reviews:** Click "Review Now"
5. **Tony decides:**
   - **Approve** → Agent can post it
   - **Reject** → Agent revises (with feedback)
6. **Approved content** → Agent posts to platform

**Content Types:**
- Instagram posts (1080x1080)
- YouTube thumbnails (1920x1080)
- Twitter/X graphics
- Stories
- TikTok covers
- LinkedIn posts
- Facebook graphics

**Platforms Tracked:**
- Instagram
- YouTube
- Twitter/X
- TikTok
- Facebook
- LinkedIn

**UI Sections:**
- Pending Your Review (yellow border, needs action)
- Approved & Ready to Post (green, can be downloaded/posted)
- Rejected (collapsible, with feedback)

---

## Database Tables

### `video_uploads`
Stores uploaded videos and their editing workflow.

**Fields:**
- `id`, `filename`, `original_filename`, `file_path`, `file_size`
- `status` (pending/in_progress/complete/downloaded)
- `editing_instructions` - What Tony wants done
- `assigned_to` - Which agent is editing
- `uploaded_at`, `started_editing_at`, `completed_at`, `downloaded_at`
- `edited_file_path`, `edited_file_size` - Final version
- `notes`, `tags`

---

### `social_content`
Social media graphics, posts, thumbnails created by agents.

**Fields:**
- `id`, `content_type`, `title`, `description`
- `platform` (instagram/youtube/twitter/etc.)
- `status` (draft/pending_review/approved/rejected/posted)
- `file_path`, `preview_path`, `file_size`
- `dimensions` (1080x1080, etc.)
- `created_with` (canva/photoshop/figma)
- `created_by` - Agent name
- `canva_design_url` - Link to edit in Canva
- `submitted_for_review_at`, `reviewed_by`, `reviewed_at`, `review_notes`
- `scheduled_post_date`, `posted_at`, `post_url`
- `tags`, `notes`

---

### `content_reviews`
History of Tony's reviews (for tracking and learning).

**Fields:**
- `content_id`, `reviewer`, `status`, `feedback`, `reviewed_at`

---

### `scheduled_posts`
Content scheduled to be posted (future feature).

**Fields:**
- `content_id`, `platform`, `scheduled_for`, `status`, `posted_at`, `post_url`

---

### `content_calendar`
Editorial calendar planning (future feature).

**Fields:**
- `date`, `platform`, `content_type`, `title`, `description`, `content_id`, `status`

---

## API Endpoints

### Video Editing

**GET** `/api/social-media/videos`  
List all videos (filter by status)

**POST** `/api/social-media/videos/upload`  
Upload video for editing (multipart/form-data)

**POST** `/api/social-media/videos/:id/edited`  
Upload edited version (agent)

**GET** `/api/social-media/videos/:id/download`  
Download video file (Tony)

**PUT** `/api/social-media/videos/:id/assign`  
Assign video to agent

---

### Social Content

**GET** `/api/social-media/content`  
List all content (filter by status/platform)

**POST** `/api/social-media/content`  
Create new content (agent uploads from Canva)

**PUT** `/api/social-media/content/:id/submit-review`  
Agent submits content for Tony's review

**PUT** `/api/social-media/content/:id/review`  
Tony approves or rejects content

**GET** `/api/social-media/content/:id/download`  
Download content file

**DELETE** `/api/social-media/content/:id`  
Delete content

---

## UI Components

### `SocialMedia.tsx` (Main Page)
- Tab switcher: Video Editing | Social Content
- Renders `VideoSection` or `ContentSection`

### `VideoSection.tsx`
- Upload area
- Three sections:
  1. Videos Being Edited
  2. Videos Ready to Download (green highlight)
  3. Downloaded (archived)
- Status badges (pending/in progress/complete/downloaded)
- Download buttons
- File size display

### `ContentSection.tsx`
- Three sections:
  1. Pending Your Review (yellow highlight, needs action)
  2. Approved & Ready to Post
  3. Rejected (collapsible, shows feedback)
- Review interface:
  - Click "Review Now"
  - Add feedback (optional)
  - Approve or Reject buttons
- Platform badges (Instagram, YouTube, etc.)
- Canva link button
- Download button for approved content

---

## Workflow Examples

### Video Editing Example

1. **Tony:** Uploads `RLT_Weekly_Recap.mp4`
   - Instructions: "Cut intro, add lower thirds, export 1080p"
2. **Dashboard:** Shows in "Videos Being Edited" as `pending`
3. **Agent:** Sees video, starts editing
4. **Agent:** Updates status to `in_progress`
5. **Agent:** Finishes edit, uploads edited version
6. **Dashboard:** Video moves to "Videos Ready to Download" (green)
7. **Tony:** Downloads finished video
8. **Dashboard:** Video moves to "Downloaded"

---

### Social Content Example

1. **Agent:** Creates Instagram post in Canva
   - Size: 1080x1080
   - Content: "$200 Strategy Challenge promo"
2. **Agent:** Exports PNG from Canva
3. **Agent:** Uploads to dashboard with Canva link
4. **Agent:** Submits for review
5. **Dashboard:** Shows in "Pending Your Review" (yellow)
6. **Tony:** Clicks "Review Now"
7. **Tony:** Clicks "Approve" (or "Reject" with feedback)
8. **Dashboard:** Moves to "Approved & Ready to Post"
9. **Agent:** Sees approval, posts to Instagram
10. **Agent:** Updates with post URL

---

## File Storage

**Videos:** `backend/uploads/videos/`  
**Content:** `backend/uploads/content/`

**Structure:**
```
uploads/
├── videos/
│   ├── 1234567890-abc123.mp4 (original)
│   └── 1234567891-def456.mp4 (edited)
└── content/
    ├── 1234567892-ghi789.png (Instagram post)
    └── 1234567893-jkl012.jpg (YouTube thumbnail)
```

**Naming:** `{timestamp}-{random}.{ext}`  
**Limit:** 2GB per file (configurable)

---

## Dependencies

**Backend:**
- `multer` - File upload handling
- `@types/multer` - TypeScript types

**Install:**
```bash
cd backend
npm install multer @types/multer
```

---

## Security Considerations

1. **File size limits:** 2GB max (videos can be large)
2. **File type validation:** Only allow video/image types
3. **Path traversal protection:** Multer handles safely
4. **Authentication:** Assumes Tony is logged in (add auth later)
5. **Virus scanning:** Consider adding ClamAV for uploaded files

---

## Future Enhancements

### Phase 2
- Auto-post to social platforms (Instagram API, YouTube API, etc.)
- Scheduled posting
- Content calendar view
- Performance analytics (views, engagement)

### Phase 3
- AI caption generation
- Hashtag suggestions
- A/B testing for posts
- Multi-agent collaboration (one designs, one reviews, one posts)

### Phase 4
- Video editing in-browser (simple trim/crop)
- Thumbnail generator
- Batch operations
- Export to Google Drive/Dropbox

---

## Navigation

**Added to Agent Dashboard:**
- New tab: "Social Media" (camera icon)
- Located between "Blockers" and "Activity"

**Access:** `http://localhost:3000/social-media`

---

## Files Created

1. `database/social-media-schema.sql` - Database tables
2. `backend/src/routes/socialMedia.routes.ts` - API endpoints
3. `frontend/src/pages/SocialMedia.tsx` - Main page
4. `frontend/src/components/social/VideoSection.tsx` - Video workflow
5. `frontend/src/components/social/ContentSection.tsx` - Content approval
6. Updated `App.tsx` - Added route
7. Updated `Layout.tsx` - Added navigation
8. Updated `server.ts` - Registered routes
9. `docs/SOCIAL-MEDIA-FEATURE.md` - This documentation

**Total:** 9 files

---

**Status:** ✅ Complete  
**Ready to Use:** After `npm install multer @types/multer` in backend

---

## Usage Instructions

### For Tony

**Video Editing:**
1. Go to Social Media → Video Editing tab
2. Drag & drop or click to upload video
3. (Optional) Add editing instructions
4. Wait for agent to finish
5. Download from "Videos Ready to Download" section

**Social Content Approval:**
1. Go to Social Media → Social Content tab
2. See "Pending Your Review" section
3. Click "Review Now" on any content
4. View in Canva (optional) via link
5. Add feedback (optional)
6. Click "Approve" or "Reject"
7. Download approved content if needed

### For Agents

**Video Editing:**
1. See pending videos in dashboard
2. Download original video
3. Edit in your preferred tool
4. Upload edited version via API
5. Notify Tony when complete

**Social Content:**
1. Create design in Canva
2. Export image/file
3. Upload to dashboard with Canva link
4. Submit for review
5. If approved: Post to platform
6. If rejected: Revise based on feedback

---

**Last Updated:** March 7, 2026  
**Version:** 1.0
