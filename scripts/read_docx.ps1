Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-DocxText($filePath, $outputPath) {
    if (Test-Path $filePath) {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($filePath)
        $entry = $zip.GetEntry('word/document.xml')
        if ($entry) {
            $stream = $entry.Open()
            $reader = New-Object System.IO.StreamReader($stream)
            $xml = $reader.ReadToEnd()
            $stream.Close()
            # Replace paragraph tags with newlines
            $xml = $xml -replace '</w:p>', "`n"
            $text = [regex]::Replace($xml, '<[^>]+>', '')
            [System.IO.File]::WriteAllText($outputPath, $text, [System.Text.Encoding]::UTF8)
            Write-Host "Extracted $filePath to $outputPath"
        }
        $zip.Dispose()
    } else {
        Write-Host "File not found: $filePath"
    }
}

Read-DocxText "prom surat.docx" "scripts/prom_surat_extracted.txt"
Read-DocxText "prompt sistem managemet surat.docx" "scripts/prompt_sistem_management_extracted.txt"

$zip = [System.IO.Compression.ZipFile]::OpenRead("prom surat.docx")
New-Item -ItemType Directory -Force -Path "scripts/media" | Out-Null
foreach ($e in $zip.Entries) {
    if ($e.FullName.StartsWith("word/media/")) {
        $fileName = [System.IO.Path]::GetFileName($e.FullName)
        $dest = Join-Path "scripts/media" $fileName
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, $dest, $true)
        Write-Host "Extracted media: $dest"
    }
}
$zip.Dispose()
