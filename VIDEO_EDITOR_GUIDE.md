# Video Editor Agent - Quick Start Guide

## When You Receive a Video Editing Task

You'll be spawned with a task containing:
- Video ID
- Video Path  
- Editing Instructions

## How to Edit the Video

### Step 1: Verify DaVinci Resolve is Running

```bash
# Check if DaVinci Resolve is running
ps aux | grep -i resolve
```

If not running, you'll need to start it (or have it started). For headless automation, DaVinci Resolve must be running.

### Step 2: Run the Automated Workflow

```bash
# Source the Resolve environment
source ~/.resolve_env

# Run the editing workflow with the video ID
python3 ~/video-editing-workflow.py <VIDEO_ID>
```

Replace `<VIDEO_ID>` with the actual video ID from your task.

### Example:

If your task says "Video ID: 5", run:

```bash
source ~/.resolve_env && python3 ~/video-editing-workflow.py 5
```

## What the Workflow Does Automatically

1. ✅ Connects to DaVinci Resolve
2. ✅ Downloads/locates the video file
3. ✅ Creates a new project
4. ✅ Imports the video into media pool
5. ✅ Creates timeline
6. ✅ Parses editing instructions
7. ✅ Applies edits (remove silences, normalize audio, etc.)
8. ✅ Renders the final video
9. ✅ Uploads edited video back to dashboard
10. ✅ Updates status to "complete"

## Current Limitations

The workflow script is **Phase 1 - Basic Automation**. It handles:
- ✅ Project setup and media import
- ✅ Basic timeline creation
- ✅ Rendering and export
- ✅ Upload back to dashboard

**Manual/Screen Control Still Needed For:**
- 🟡 Advanced audio processing (Fairlight page)
- 🟡 Silence detection and removal
- 🟡 Filler word removal
- 🟡 B-roll insertion
- 🟡 Color grading with scopes

## Reporting Status

Update Tony via Discord after running the workflow:

```
✅ Video editing complete!

Video ID: [X]
Original: [filename]
Duration: [X minutes]
What was done:
  • [List key edits applied]
  
Edited video uploaded to dashboard - ready for review!
```

If the workflow fails, report:

```
❌ Video editing failed

Video ID: [X]
Error: [error message]
Next steps: [what you need to proceed]
```

## Environment Variables

These are already set in `~/.resolve_env`:

```bash
export RESOLVE_SCRIPT_API="/opt/resolve/Developer/Scripting"
export RESOLVE_SCRIPT_LIB="/opt/resolve/libs/Fusion/fusionscript.so"
export PYTHONPATH="$PYTHONPATH:$RESOLVE_SCRIPT_API/Modules/"
export DASHBOARD_API="http://192.168.0.97:3002"
```

## Troubleshooting

**"Could not connect to DaVinci Resolve"**
- Make sure DaVinci Resolve is running
- Check that the Python API is enabled in Preferences → System → General

**"Failed to import media"**
- Verify the video file exists at the path provided
- Check file permissions
- Make sure the video format is supported (MP4, MOV, etc.)

**"Render failed"**
- Check available disk space
- Verify render settings are valid
- Check DaVinci Resolve logs

## Next Phase (Coming Soon)

Phase 2 will add:
- Automatic silence detection and removal
- Filler word detection (AI-powered)
- Smart B-roll insertion
- Advanced audio processing via Fairlight API
- Multi-camera sync
- Template-based editing

For now, use the automated workflow for the basics, then handle advanced edits manually or via screen control as needed.
