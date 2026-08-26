$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$jdkCandidates = @(
	'C:\Program Files\Java\jdk-24',
	'C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot'
)
$jdk = $jdkCandidates | Where-Object { Test-Path -LiteralPath (Join-Path $_ 'bin\java.exe') } | Select-Object -First 1
if (-not $jdk) { throw 'Firestore emulator tests require JDK 11 or newer.' }

$env:JAVA_HOME = $jdk
$env:Path = (Join-Path $jdk 'bin') + ';' + $env:Path
$env:FIREBASE_EMULATORS_PATH = Join-Path $workspace '.firebase-emulators'
$env:XDG_CONFIG_HOME = Join-Path $workspace '.firebase-config'
$env:CI = 'true'

Push-Location $workspace
try {
	& npx.cmd firebase emulators:exec --project demo-vazhi --only firestore 'npx.cmd tsx tests/firestore.rules.test.js'
	if ($LASTEXITCODE -ne 0) { throw "Firestore rules tests failed with exit code $LASTEXITCODE." }
} finally {
	Pop-Location
}
