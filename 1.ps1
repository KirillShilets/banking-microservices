<#
  collect-project.ps1
  Собирает исходники проекта в один текстовый файл для отправки.

  Запуск (из корня проекта):
    powershell -ExecutionPolicy Bypass -File .\collect-project.ps1 -IncludeTestReports
#>

param(
    [string]$OutputFile = "project-dump.txt",
    [int]$MaxFileSizeKB = 200,          # файлы больше этого размера пропускаются
    [switch]$IncludeTestReports         # добавить XML-отчёты упавших тестов из build/test-results
)

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
$root = $root.TrimEnd('\', '/')

# Папки, которые исключаются на любом уровне вложенности
$globalExcludeDirs = @(
    'build', 'out', 'bin', 'target', 'node_modules',
    '.git', '.gradle', '.gradle-work', '.idea', '.postman', '.vscode'
)

# Папки, которые исключаются только в корне проекта
# (META-INF в корне не нужен, а в src/main/resources/META-INF может лежать нужная конфигурация)
$rootExcludeDirs = @(
    'frontend', 'gradle', 'keycloak', 'postman', 'META-INF'
)

# Какие файлы включать
$includeExtensions = @(
    '.java', '.xml', '.gradle', '.kts', '.yml', '.yaml', '.properties',
    '.sql', '.imports', '.factories', '.toml', '.md'
)
$includeNames = @(
    'Dockerfile', '.dockerignore', '.gitignore', '.env.example'
)

# Файлы, которые никогда не включаются (секреты, служебные)
$excludeNames = @(
    '.env', 'gradlew', 'gradlew.bat', $OutputFile, 'collect-project.ps1'
)

function Test-IncludeFile([System.IO.FileInfo]$file) {
    if ($excludeNames -contains $file.Name) { return $false }
    if ($file.Length -gt ($MaxFileSizeKB * 1KB)) {
        Write-Host "Пропущен (слишком большой): $($file.FullName)" -ForegroundColor Yellow
        return $false
    }
    if ($includeNames -contains $file.Name) { return $true }
    if ($file.Name -like 'Dockerfile*') { return $true }
    return ($includeExtensions -contains $file.Extension.ToLower())
}

function Get-ProjectFiles([string]$dir, [bool]$isRoot) {
    foreach ($item in Get-ChildItem -LiteralPath $dir -Force) {
        if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { continue }

        if ($item.PSIsContainer) {
            if ($globalExcludeDirs -contains $item.Name) { continue }
            if ($isRoot -and ($rootExcludeDirs -contains $item.Name)) { continue }
            Get-ProjectFiles $item.FullName $false
        }
        else {
            if (Test-IncludeFile $item) { $item }
        }
    }
}

function Get-RelativePath([string]$fullName) {
    return $fullName.Substring($root.Length).TrimStart('\', '/').Replace('\', '/')
}

Write-Host "Сканирую проект: $root" -ForegroundColor Cyan
$files = @(Get-ProjectFiles $root $true | Sort-Object FullName)

$outPath = Join-Path $root $OutputFile
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$writer = New-Object System.IO.StreamWriter($outPath, $false, $utf8NoBom)

try {
    # Оглавление
    $writer.WriteLine("PROJECT DUMP")
    $writer.WriteLine("Root: $root")
    $writer.WriteLine("Files: $($files.Count)")
    $writer.WriteLine()
    $writer.WriteLine("=== FILE LIST ===")
    foreach ($f in $files) { $writer.WriteLine((Get-RelativePath $f.FullName)) }
    $writer.WriteLine()

    # Содержимое
    foreach ($f in $files) {
        $rel = Get-RelativePath $f.FullName
        $writer.WriteLine("FILE: $rel")
        try {
            $writer.WriteLine([System.IO.File]::ReadAllText($f.FullName))
        }
        catch {
            $writer.WriteLine("[ОШИБКА ЧТЕНИЯ: $($_.Exception.Message)]")
        }
        $writer.WriteLine()
    }

    # Отчёты тестов (по желанию)
    if ($IncludeTestReports) {
        $reports = @(Get-ChildItem -Path $root -Recurse -Force -Filter 'TEST-*.xml' -ErrorAction SilentlyContinue |
                     Where-Object { $_.FullName -match '[\\/]build[\\/]test-results[\\/]' })

        $writer.WriteLine("#" * 80)
        $writer.WriteLine("TEST REPORTS (build/test-results)")
        $writer.WriteLine("#" * 80)

        foreach ($r in $reports) {
            $text = [System.IO.File]::ReadAllText($r.FullName)

            # Только отчёты, где есть падения
            if ($text -notmatch '<failure|<error') { continue }

            $limit = 60000
            if ($text.Length -gt $limit) {
                $text = $text.Substring(0, $limit) + "`n[... обрезано ...]"
            }

            $writer.WriteLine("TEST REPORT: $(Get-RelativePath $r.FullName)")
            $writer.WriteLine($text)
            $writer.WriteLine()
        }
    }
}
finally {
    $writer.Close()
}

$sizeKB = [math]::Round((Get-Item $outPath).Length / 1KB, 1)
Write-Host "Готово: $outPath" -ForegroundColor Green
Write-Host "Файлов: $($files.Count), размер: $sizeKB KB" -ForegroundColor Green