# Dump Neon (or any remote Postgres) to prod.dump
# Usage:
#   $env:PROD_DATABASE_URL = "postgresql://..."
#   .\scripts\dump-neon.ps1

param(
  [string]$OutFile = "prod.dump"
)

if (-not $env:PROD_DATABASE_URL) {
  Write-Error "Set PROD_DATABASE_URL first, e.g.: `$env:PROD_DATABASE_URL = 'postgresql://...'"
  exit 1
}

$url = $env:PROD_DATABASE_URL.Trim().TrimEnd('?', '&')
if ($url -notmatch "sslmode=") {
  if ($url -match "\?") { $url = "$url&sslmode=require" }
  else { $url = "$url?sslmode=require" }
}

Write-Host "Dumping to $OutFile ..."
& pg_dump "--dbname=$url" --format=custom --no-owner --no-acl --verbose --file $OutFile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done: $OutFile"
