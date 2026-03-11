#!/usr/bin/env python3
"""
DaVinci Resolve Video Editing Automation Workflow
Runs on MSI S1 to automate video editing via DaVinci Resolve Python API
"""

import os
import sys
import json
import requests
import time
import subprocess
from pathlib import Path

# Add DaVinci Resolve API to path
RESOLVE_SCRIPT_API = "/opt/resolve/Developer/Scripting"
RESOLVE_SCRIPT_LIB = "/opt/resolve/libs/Fusion/fusionscript.so"
sys.path.append(f"{RESOLVE_SCRIPT_API}/Modules/")

try:
    import DaVinciResolveScript as dvr_script
except ImportError:
    print("❌ DaVinci Resolve Script module not found!")
    print("Make sure DaVinci Resolve is installed and RESOLVE_SCRIPT_API is set correctly")
    sys.exit(1)

# Configuration
DASHBOARD_API = os.environ.get('DASHBOARD_API', 'http://192.168.0.97:3002')
WORKSPACE_DIR = Path("/home/tony/video-editing-workspace")
WORKSPACE_DIR.mkdir(exist_ok=True)

# Helper Functions for DaVinci Resolve Lifecycle Management

def is_resolve_running():
    """Check if DaVinci Resolve is currently running"""
    try:
        result = subprocess.run(['pgrep', '-f', 'resolve'], capture_output=True, text=True)
        return result.returncode == 0 and len(result.stdout.strip()) > 0
    except Exception as e:
        print(f"Warning: Could not check if Resolve is running: {e}")
        return False

def start_resolve():
    """Start DaVinci Resolve in the background"""
    print("🚀 Starting DaVinci Resolve...")
    try:
        # Launch DaVinci Resolve in the background
        # Note: This requires DISPLAY to be set or running in a VNC/X session
        subprocess.Popen(
            ['/opt/resolve/bin/resolve'],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )
        
        # Wait for Resolve to start up (typically takes 30-60 seconds)
        print("⏳ Waiting for DaVinci Resolve to start (this takes ~60 seconds)...")
        max_wait = 120  # 2 minutes max
        wait_interval = 5
        elapsed = 0
        
        while elapsed < max_wait:
            time.sleep(wait_interval)
            elapsed += wait_interval
            
            if is_resolve_running():
                # Give it a few more seconds to fully initialize
                print("   DaVinci Resolve process detected, waiting for API to be ready...")
                time.sleep(15)
                print("✅ DaVinci Resolve started successfully")
                return True
            
            print(f"   Still waiting... ({elapsed}s / {max_wait}s)")
        
        print("❌ DaVinci Resolve failed to start within timeout")
        return False
        
    except Exception as e:
        print(f"❌ Error starting DaVinci Resolve: {e}")
        return False

def stop_resolve():
    """Stop DaVinci Resolve gracefully"""
    print("🛑 Stopping DaVinci Resolve...")
    try:
        # Try graceful shutdown first
        subprocess.run(['pkill', '-TERM', '-f', 'resolve'], check=False)
        
        # Wait a bit for graceful shutdown
        time.sleep(5)
        
        # Force kill if still running
        if is_resolve_running():
            print("   Force killing DaVinci Resolve...")
            subprocess.run(['pkill', '-KILL', '-f', 'resolve'], check=False)
            time.sleep(2)
        
        if not is_resolve_running():
            print("✅ DaVinci Resolve stopped successfully")
            return True
        else:
            print("⚠️  DaVinci Resolve may still be running")
            return False
            
    except Exception as e:
        print(f"❌ Error stopping DaVinci Resolve: {e}")
        return False

class VideoEditor:
    def __init__(self, video_id: int, dashboard_api: str):
        self.video_id = video_id
        self.dashboard_api = dashboard_api
        self.resolve = None
        self.project_manager = None
        self.project = None
        self.media_pool = None
        self.timeline = None
        
    def connect_to_resolve(self):
        """Connect to DaVinci Resolve"""
        print("🔗 Connecting to DaVinci Resolve...")
        try:
            self.resolve = dvr_script.scriptapp('Resolve')
            if not self.resolve:
                raise Exception("Could not connect to DaVinci Resolve. Make sure it's running.")
            
            self.project_manager = self.resolve.GetProjectManager()
            print("✅ Connected to DaVinci Resolve")
            return True
        except Exception as e:
            print(f"❌ Failed to connect: {e}")
            return False
    
    def download_video(self, video_path: str) -> Path:
        """Download video from dashboard"""
        print(f"⬇️  Downloading video ID {self.video_id}...")
        
        # For now, video is already on the filesystem from the upload
        # In production, you might need to download from S3 or similar
        video_file = Path(video_path)
        
        if not video_file.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        # Copy to workspace
        workspace_file = WORKSPACE_DIR / f"video_{self.video_id}_{video_file.name}"
        if not workspace_file.exists():
            import shutil
            shutil.copy(video_file, workspace_file)
        
        print(f"✅ Video ready: {workspace_file}")
        return workspace_file
    
    def create_project(self, video_name: str):
        """Create a new DaVinci Resolve project"""
        project_name = f"{time.strftime('%Y%m%d')}_{video_name}_v{self.video_id}"
        print(f"📁 Creating project: {project_name}")
        
        # Create new project
        self.project = self.project_manager.CreateProject(project_name)
        if not self.project:
            # Try to load if it already exists
            self.project = self.project_manager.LoadProject(project_name)
        
        if not self.project:
            raise Exception(f"Could not create project: {project_name}")
        
        self.media_pool = self.project.GetMediaPool()
        print(f"✅ Project created: {project_name}")
        return True
    
    def import_media(self, video_path: Path):
        """Import video into media pool"""
        print(f"📥 Importing media: {video_path}")
        
        root_folder = self.media_pool.GetRootFolder()
        self.media_pool.SetCurrentFolder(root_folder)
        
        # Import the video
        media_items = self.media_pool.ImportMedia([str(video_path)])
        
        if not media_items or len(media_items) == 0:
            raise Exception("Failed to import media into DaVinci Resolve")
        
        print(f"✅ Media imported: {len(media_items)} clip(s)")
        return media_items
    
    def create_timeline(self, media_items):
        """Create timeline and add media"""
        print("🎬 Creating timeline...")
        
        # Create timeline from first clip
        timeline_name = f"Edit_v{self.video_id}"
        self.timeline = self.media_pool.CreateTimelineFromClips(timeline_name, media_items)
        
        if not self.timeline:
            raise Exception("Failed to create timeline")
        
        print(f"✅ Timeline created: {timeline_name}")
        return self.timeline
    
    def parse_editing_instructions(self, instructions: str) -> dict:
        """Parse editing instructions into actionable commands"""
        print("📝 Parsing editing instructions...")
        
        instructions_lower = instructions.lower()
        
        tasks = {
            'remove_silence': 'silence' in instructions_lower or 'dead air' in instructions_lower,
            'remove_filler': 'filler' in instructions_lower or 'um' in instructions_lower,
            'normalize_audio': 'normalize' in instructions_lower or 'lufs' in instructions_lower,
            'color_correct': 'color' in instructions_lower or 'grade' in instructions_lower,
            'add_broll': 'b-roll' in instructions_lower or 'broll' in instructions_lower,
            'export_youtube': 'youtube' in instructions_lower or 'export' in instructions_lower,
            'export_shorts': 'shorts' in instructions_lower or 'vertical' in instructions_lower or '9:16' in instructions_lower,
        }
        
        # Extract target LUFS if specified
        import re
        lufs_match = re.search(r'-(\d+)\s*lufs', instructions_lower)
        tasks['target_lufs'] = int(lufs_match.group(1)) if lufs_match else -14
        
        print(f"📋 Tasks identified: {[k for k, v in tasks.items() if v and k != 'target_lufs']}")
        return tasks
    
    def apply_basic_edits(self, tasks: dict):
        """Apply basic editing operations"""
        print("✂️  Applying edits...")
        
        # For now, this is a simplified version
        # Full implementation would use DaVinci's Python API to:
        # - Detect and remove silences
        # - Apply audio normalization
        # - Add color correction
        # - etc.
        
        # Basic audio normalization (simplified)
        if tasks.get('normalize_audio'):
            print(f"  🔊 Normalizing audio to {tasks['target_lufs']} LUFS...")
            # In production: Use Fairlight page API to set normalization
            # For now, we'll document this needs screen control or manual setup
        
        if tasks.get('color_correct'):
            print("  🎨 Applying color correction...")
            # In production: Apply LUTs or basic color correction via API
        
        print("✅ Basic edits applied (placeholder - full implementation in progress)")
    
    def render_video(self, output_format: str = 'youtube') -> Path:
        """Render the final video"""
        print(f"🎥 Rendering video for {output_format}...")
        
        # Set render settings
        if output_format == 'youtube':
            preset_name = "YouTube 1080p"
            format_type = "mp4"
        elif output_format == 'shorts':
            preset_name = "YouTube Shorts"
            format_type = "mp4"
        else:
            preset_name = "H.264"
            format_type = "mp4"
        
        # Output path
        output_filename = f"edited_video_{self.video_id}.{format_type}"
        output_path = WORKSPACE_DIR / output_filename
        
        # Set render settings via API
        render_settings = {
            "SelectAllFrames": True,
            "TargetDir": str(WORKSPACE_DIR),
            "CustomName": f"edited_video_{self.video_id}"
        }
        
        self.project.SetRenderSettings(render_settings)
        
        # Add to render queue
        render_job_id = self.project.AddRenderJob()
        
        if not render_job_id:
            raise Exception("Failed to add render job")
        
        print(f"📤 Render job added: {render_job_id}")
        
        # Start rendering
        self.project.StartRendering(render_job_id)
        
        # Wait for render to complete (simplified - should poll status)
        print("⏳ Rendering... (this may take several minutes)")
        
        while self.project.IsRenderingInProgress():
            time.sleep(5)
            print("  ⏳ Still rendering...")
        
        print(f"✅ Render complete: {output_path}")
        return output_path
    
    def upload_edited_video(self, video_path: Path):
        """Upload edited video back to dashboard"""
        print(f"📤 Uploading edited video to dashboard...")
        
        url = f"{self.dashboard_api}/api/social-media/videos/{self.video_id}/edited"
        
        with open(video_path, 'rb') as f:
            files = {'edited_video': f}
            response = requests.post(url, files=files)
        
        if response.status_code == 200:
            print("✅ Edited video uploaded successfully")
            return True
        else:
            print(f"❌ Upload failed: {response.status_code} - {response.text}")
            return False
    
    def cleanup(self):
        """Clean up temporary files and close project"""
        print("🧹 Cleaning up...")
        
        # Save and close project
        if self.project_manager and self.project:
            self.project.SaveProject()
            self.project_manager.CloseProject(self.project)
        
        print("✅ Cleanup complete")

def main(video_id: int):
    """Main workflow with automatic DaVinci Resolve lifecycle management"""
    print(f"\n{'='*60}")
    print(f"🎬 VIDEO EDITING WORKFLOW - Video ID: {video_id}")
    print(f"{'='*60}\n")
    
    resolve_was_running = False
    
    try:
        # Get video info from dashboard API
        print(f"📡 Fetching video info from dashboard...")
        response = requests.get(f"{DASHBOARD_API}/api/social-media/videos")
        if response.status_code != 200:
            raise Exception(f"Failed to fetch videos: {response.status_code}")
        
        videos = response.json().get('videos', [])
        video = next((v for v in videos if v['id'] == video_id), None)
        
        if not video:
            raise Exception(f"Video ID {video_id} not found")
        
        print(f"✅ Video found: {video['original_filename']}")
        print(f"   Instructions: {video.get('editing_instructions', 'None')}")
        
        # Check if DaVinci Resolve is running
        print(f"\n🔍 Checking if DaVinci Resolve is running...")
        resolve_was_running = is_resolve_running()
        
        if resolve_was_running:
            print("✅ DaVinci Resolve is already running")
        else:
            print("❌ DaVinci Resolve is not running")
            if not start_resolve():
                raise Exception("Failed to start DaVinci Resolve")
        
        # Initialize editor
        editor = VideoEditor(video_id, DASHBOARD_API)
        
        # Connect to DaVinci Resolve
        print(f"\n🔗 Connecting to DaVinci Resolve API...")
        if not editor.connect_to_resolve():
            raise Exception("Could not connect to DaVinci Resolve")
        
        # Download video
        video_path = editor.download_video(video['file_path'])
        
        # Create project
        editor.create_project(Path(video['original_filename']).stem)
        
        # Import media
        media_items = editor.import_media(video_path)
        
        # Create timeline
        editor.create_timeline(media_items)
        
        # Parse instructions
        tasks = editor.parse_editing_instructions(video.get('editing_instructions', ''))
        
        # Apply edits
        editor.apply_basic_edits(tasks)
        
        # Render video
        output_format = 'shorts' if tasks.get('export_shorts') else 'youtube'
        output_path = editor.render_video(output_format)
        
        # Upload edited video
        editor.upload_edited_video(output_path)
        
        # Cleanup
        editor.cleanup()
        
        print(f"\n{'='*60}")
        print(f"✅ VIDEO EDITING COMPLETE - Video ID: {video_id}")
        print(f"{'='*60}\n")
        
        # Stop DaVinci Resolve if we started it
        if not resolve_was_running:
            print(f"🛑 Stopping DaVinci Resolve (we started it for this job)...")
            stop_resolve()
        else:
            print(f"ℹ️  Leaving DaVinci Resolve running (it was already running)")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        
        # Stop DaVinci Resolve if we started it (even on failure)
        if not resolve_was_running and is_resolve_running():
            print(f"\n🛑 Stopping DaVinci Resolve (cleaning up after error)...")
            stop_resolve()
        
        return 1

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 video-editing-workflow.py <video_id>")
        sys.exit(1)
    
    video_id = int(sys.argv[1])
    sys.exit(main(video_id))
