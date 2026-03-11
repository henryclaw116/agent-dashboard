#!/usr/bin/env python3
"""
DaVinci Resolve API Test Script
Run this after DaVinci Resolve is installed to verify API access
"""

import sys
import os

# Load environment variables
RESOLVE_SCRIPT_API = os.getenv('RESOLVE_SCRIPT_API', '/opt/resolve/Developer/Scripting')
RESOLVE_SCRIPT_LIB = os.getenv('RESOLVE_SCRIPT_LIB', '/opt/resolve/libs/Fusion/fusionscript.so')

# Add to Python path
sys.path.append(f"{RESOLVE_SCRIPT_API}/Modules/")

try:
    import DaVinciResolveScript as dvr
    print("✅ DaVinci Resolve Python module imported successfully")
except ImportError as e:
    print(f"❌ Failed to import DaVinciResolveScript: {e}")
    print("\nTroubleshooting:")
    print(f"  - Verify DaVinci Resolve is installed at: /opt/resolve/")
    print(f"  - Check RESOLVE_SCRIPT_API: {RESOLVE_SCRIPT_API}")
    print(f"  - Check RESOLVE_SCRIPT_LIB: {RESOLVE_SCRIPT_LIB}")
    print(f"  - Source environment: source ~/.resolve_env")
    sys.exit(1)

def test_resolve_connection():
    """Test connection to DaVinci Resolve"""
    print("\n🔌 Testing connection to DaVinci Resolve...")
    
    try:
        resolve = dvr.scriptapp("Resolve")
        if not resolve:
            print("❌ Could not connect to DaVinci Resolve")
            print("   Make sure DaVinci Resolve is running!")
            return False
        
        print("✅ Connected to DaVinci Resolve")
        
        # Get version info
        version = resolve.GetVersionString()
        print(f"   Version: {version}")
        
        # Get project manager
        pm = resolve.GetProjectManager()
        if pm:
            print("✅ Project Manager accessible")
            
            # Get current project (if any)
            project = pm.GetCurrentProject()
            if project:
                print(f"   Current Project: {project.GetName()}")
            else:
                print("   No project currently loaded")
        
        # Get media storage
        ms = resolve.GetMediaStorage()
        if ms:
            print("✅ Media Storage accessible")
            volumes = ms.GetMountedVolumeList()
            print(f"   Mounted volumes: {len(volumes)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing Resolve connection: {e}")
        return False

def create_test_project():
    """Create a test project to verify write access"""
    print("\n📝 Creating test project...")
    
    try:
        resolve = dvr.scriptapp("Resolve")
        pm = resolve.GetProjectManager()
        
        # Create test project
        test_project_name = "API_Test_Project"
        project = pm.CreateProject(test_project_name)
        
        if project:
            print(f"✅ Created test project: {test_project_name}")
            print(f"   Project ID: {project.GetUniqueId()}")
            
            # Create a test timeline
            media_pool = project.GetMediaPool()
            timeline = media_pool.CreateEmptyTimeline("Test Timeline")
            
            if timeline:
                print(f"✅ Created test timeline")
                print(f"   Timeline name: {timeline.GetName()}")
                print(f"   Timeline ID: {timeline.GetUniqueId()}")
            
            return True
        else:
            print("❌ Failed to create test project")
            return False
            
    except Exception as e:
        print(f"❌ Error creating test project: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("DaVinci Resolve API Test")
    print("=" * 60)
    
    # Test connection
    if test_resolve_connection():
        print("\n✅ All API tests passed!")
        print("\n🎬 DaVinci Resolve API is ready for automation")
        
        # Optional: Create test project
        response = input("\nCreate a test project? (y/n): ")
        if response.lower() == 'y':
            create_test_project()
    else:
        print("\n❌ API tests failed")
        print("   Make sure DaVinci Resolve is running before testing the API")
        sys.exit(1)
    
    print("\n" + "=" * 60)
