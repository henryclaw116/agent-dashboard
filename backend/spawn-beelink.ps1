param(
    [Parameter(Mandatory=$true)]
    [string]$Task,
    
    [Parameter(Mandatory=$false)]
    [string]$Label = ""
)

# SSH to Beelink and create a simple task marker file
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$taskFile = "task-$timestamp.txt"

$sshCommand = "echo '$Task' > ~/openclaw-tasks/$taskFile"

ssh -i "$env:USERPROFILE\.ssh\id_beelink" tony@192.168.0.91 "mkdir -p ~/openclaw-tasks && $sshCommand"

if ($LASTEXITCODE -eq 0) {
    Write-Output "Sub-agent spawned on Beelink: $taskFile"
} else {
    Write-Error "Failed to spawn on Beelink"
    exit 1
}
