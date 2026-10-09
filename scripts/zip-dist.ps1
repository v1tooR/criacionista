# Empacota dist/ em um zip pronto para o wix.com/headless/drop.
#
#   powershell -ExecutionPolicy Bypass -File scripts\zip-dist.ps1
#
# Por que não Compress-Archive: no Windows PowerShell 5.1 ele grava os caminhos
# internos com barra invertida ("assets\site.css"). A especificação do ZIP pede
# barra normal, e quem extrai conforme a especificação acaba com um arquivo
# chamado literalmente "assets\site.css" na raiz — o site sobe sem CSS. O
# ZipFile::CreateFromDirectory do .NET Framework tem o mesmo defeito, então as
# entradas são escritas uma a uma, com o nome montado à mão.

$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
$origem = Join-Path $raiz 'dist'
$destino = Join-Path $raiz 'clube-criacionista-preview.zip'

if (-not (Test-Path $origem)) { throw "dist/ não existe. Rode: node scripts/build-dist.js --limpo" }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (Test-Path $destino) { Remove-Item -LiteralPath $destino -Force }

$barraWin = [char]92   # \
$barraZip = [char]47   # /

$zip = [System.IO.Compression.ZipFile]::Open($destino, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  $corte = $origem.Length + 1
  foreach ($f in Get-ChildItem -LiteralPath $origem -Recurse -File) {
    $nome = $f.FullName.Substring($corte).Replace($barraWin, $barraZip)
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip, $f.FullName, $nome, [System.IO.Compression.CompressionLevel]::Optimal)
  }
} finally {
  $zip.Dispose()
}

# confere o que acabou de ser escrito, em vez de confiar
$a = [System.IO.Compression.ZipFile]::OpenRead($destino)
try {
  $tortas = @($a.Entries | Where-Object { $_.FullName.Contains($barraWin) })
  $temIndex = @($a.Entries | Where-Object { $_.FullName -eq 'index.html' }).Count -eq 1
  $exemplo = @($a.Entries | Where-Object { $_.Name -eq 'site.css' })[0].FullName

  "entradas:            " + $a.Entries.Count
  "caminho de exemplo:  " + $exemplo
  "com barra invertida: " + $tortas.Count
  "index.html na raiz:  " + $temIndex
  "tamanho:             " + ('{0:N2} MB' -f ((Get-Item $destino).Length / 1MB))

  if ($tortas.Count -gt 0) { throw 'ainda há caminhos com barra invertida' }
  if (-not $temIndex) { throw 'falta index.html na raiz do zip' }
  ''
  'pronto: ' + $destino
} finally {
  $a.Dispose()
}
