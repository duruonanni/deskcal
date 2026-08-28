# Ensures cargo + MSVC (link.exe) are on PATH, then runs the Tauri CLI.
# Cursor terminals opened before rustup install otherwise fail with:
#   failed to run 'cargo metadata' ... program not found

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
$cargoExe = Join-Path $cargoBin "cargo.exe"
if (-not (Test-Path $cargoExe)) {
    Write-Error "cargo.exe not found at $cargoExe. Install Rust from https://rustup.rs then open a new terminal."
}

$env:Path = $cargoBin + ";" + $env:Path

$pf86 = ${env:ProgramFiles(x86)}
$vcvars = Join-Path $pf86 "Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if (-not (Test-Path $vcvars)) {
    $vcvars = Join-Path $pf86 "Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
}
if (Test-Path $vcvars) {
    $cmdLine = '"{0}" >nul & set' -f $vcvars
    cmd.exe /c $cmdLine | ForEach-Object {
        if ($_ -match "^(.*?)=(.*)$") {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
        }
    }
}

$tauriCmd = Join-Path $repoRoot "node_modules\.bin\tauri.cmd"
if (-not (Test-Path $tauriCmd)) {
    Write-Error "Tauri CLI not found. Run npm install in the repo root."
}

$tauriArgs = @($args)
if ($tauriArgs.Count -eq 0) {
    $tauriArgs = @("dev")
}

& $tauriCmd @tauriArgs
exit $LASTEXITCODE
