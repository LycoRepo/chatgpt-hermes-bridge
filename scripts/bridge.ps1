param([ValidateSet('install','configure','start','stop','doctor','test')][string]$Action='doctor')
$ErrorActionPreference='Stop'
$bridgeRoot=Split-Path -Parent $PSScriptRoot
$bridgeNpm=Get-Command npm.cmd -ErrorAction Stop
$bridgeScript=if($Action -eq 'install') {'setup'} else {$Action}
Push-Location -LiteralPath $bridgeRoot
try { & $bridgeNpm.Source run $bridgeScript; $bridgeExitCode=$LASTEXITCODE }
finally { Pop-Location }
exit $bridgeExitCode
