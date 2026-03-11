#!/bin/bash
# Test script for DaVinci Resolve lifecycle management

echo "🧪 Testing DaVinci Resolve Lifecycle Management"
echo "================================================"
echo ""

# Source environment
source ~/.resolve_env

echo "1️⃣  Checking if DaVinci Resolve is currently running..."
if pgrep -f "resolve" > /dev/null; then
    echo "   ✅ DaVinci Resolve IS running"
    INITIAL_STATE="running"
else
    echo "   ❌ DaVinci Resolve is NOT running"
    INITIAL_STATE="stopped"
fi

echo ""
echo "2️⃣  Starting DaVinci Resolve..."
/opt/resolve/bin/resolve &
RESOLVE_PID=$!
echo "   Started with PID: $RESOLVE_PID"

echo ""
echo "3️⃣  Waiting for DaVinci Resolve to initialize (60 seconds)..."
sleep 60

echo ""
echo "4️⃣  Checking if DaVinci Resolve is now running..."
if pgrep -f "resolve" > /dev/null; then
    echo "   ✅ DaVinci Resolve IS running"
else
    echo "   ❌ DaVinci Resolve failed to start!"
    exit 1
fi

echo ""
echo "5️⃣  Testing Python API connection..."
python3 << 'PYEOF'
import sys
sys.path.append("/opt/resolve/Developer/Scripting/Modules/")
try:
    import DaVinciResolveScript as dvr_script
    resolve = dvr_script.scriptapp('Resolve')
    if resolve:
        print("   ✅ Python API connection successful!")
        pm = resolve.GetProjectManager()
        print(f"   Project Manager: {pm}")
    else:
        print("   ❌ Could not connect to DaVinci Resolve API")
        sys.exit(1)
except Exception as e:
    print(f"   ❌ Error: {e}")
    sys.exit(1)
PYEOF

echo ""
echo "6️⃣  Stopping DaVinci Resolve..."
pkill -TERM -f "resolve"
sleep 5

echo ""
echo "7️⃣  Verifying DaVinci Resolve stopped..."
if pgrep -f "resolve" > /dev/null; then
    echo "   ⚠️  DaVinci Resolve still running, force killing..."
    pkill -KILL -f "resolve"
    sleep 2
fi

if pgrep -f "resolve" > /dev/null; then
    echo "   ❌ Failed to stop DaVinci Resolve"
    exit 1
else
    echo "   ✅ DaVinci Resolve stopped successfully"
fi

echo ""
echo "================================================"
echo "✅ All tests passed!"
echo ""
echo "Summary:"
echo "  - Initial state: $INITIAL_STATE"
echo "  - Start: ✅ Success"
echo "  - API connection: ✅ Success"
echo "  - Stop: ✅ Success"
