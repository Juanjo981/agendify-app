$ErrorActionPreference = 'Stop'

$defaultApiBase = 'http://localhost:8080/api'
$apiBase = Read-Host "API base [$defaultApiBase]"
if ([string]::IsNullOrWhiteSpace($apiBase)) {
    $apiBase = $defaultApiBase
}

$testUser = Read-Host 'Usuario tecnico de QA'
$securePassword = Read-Host 'Contrasena' -AsSecureString
$passwordPointer = [IntPtr]::Zero
$exitCode = 1
$environmentNames = @(
    'AGENDIFY_API_BASE',
    'AGENDIFY_TEST_USER',
    'AGENDIFY_TEST_PASSWORD',
    'AGENDIFY_REQUIRE_AUTH_TEST'
)
$previousEnvironment = @{}
foreach ($name in $environmentNames) {
    $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

try {
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $env:AGENDIFY_API_BASE = $apiBase
    $env:AGENDIFY_TEST_USER = $testUser
    $env:AGENDIFY_TEST_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $env:AGENDIFY_REQUIRE_AUTH_TEST = 'true'

    npm run test:contracts
    $exitCode = $LASTEXITCODE
}
finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }

    foreach ($name in $environmentNames) {
        [Environment]::SetEnvironmentVariable($name, $previousEnvironment[$name], 'Process')
    }

    $securePassword.Dispose()
}

exit $exitCode
