#!/bin/bash
set -e

echo '🎬 DaVinci Resolve Installation Script'
echo '========================================='

# Check if zip file exists
if [ ! -f ~/resolve-setup/DaVinci_Resolve*.zip ]; then
    echo '❌ Error: DaVinci Resolve .zip file not found in ~/resolve-setup/'
    echo 'Please upload the installer first!'
    exit 1
fi

cd ~/resolve-setup

# Extract installer
echo '📦 Extracting installer...'
unzip -q DaVinci_Resolve*.zip

# Find the .run installer
INSTALLER=$(find . -name '*.run' | head -1)
if [ -z "$INSTALLER" ]; then
    echo '❌ Error: .run installer not found after extraction'
    exit 1
fi

echo "✅ Found installer: $INSTALLER"

# Make installer executable
chmod +x "$INSTALLER"

# Run installer (requires sudo)
echo '🚀 Installing DaVinci Resolve...'
echo 'This may take 5-10 minutes...'
sudo "$INSTALLER" -i -y

# Check installation
if [ ! -d /opt/resolve ]; then
    echo '❌ Error: Installation failed - /opt/resolve not found'
    exit 1
fi

echo '✅ DaVinci Resolve installed successfully!'

# Set up Python API environment
echo '🐍 Setting up Python API environment...'

# Create environment script
cat > ~/.resolve_env << 'EOF'
export RESOLVE_SCRIPT_API="/opt/resolve/Developer/Scripting"
export RESOLVE_SCRIPT_LIB="/opt/resolve/libs/Fusion/fusionscript.so"
export PYTHONPATH="$PYTHONPATH:$RESOLVE_SCRIPT_API/Modules/"
EOF

# Add to bashrc
if ! grep -q 'resolve_env' ~/.bashrc; then
    echo 'source ~/.resolve_env' >> ~/.bashrc
fi

# Source for current session
source ~/.resolve_env

echo '✅ Environment variables configured'

# Install Python packages
echo '📦 Installing Python packages for Resolve API...'
pip3 install --user DaVinciResolveScript python-daemon requests

echo ''
echo '🎉 Installation Complete!'
echo ''
echo 'DaVinci Resolve is installed at: /opt/resolve'
echo 'API Scripts location: /opt/resolve/Developer/Scripting'
echo ''
echo 'To use the API, run: source ~/.resolve_env'
echo 'Or logout and login again for environment to load automatically'
