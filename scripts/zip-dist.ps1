# Empacota uma pasta de build em um zip pronto para o wix.com/headless/drop.
#
#   powershell -ExecutionPolicy Bypass -File scripts\zip-dist.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\zip-dist.ps1 -Origem dist
#
# O padrão é site/dist — a build do Astro, que é quem traz os posts do blog ao
# vivo. A dist/ da raiz sai do protótipo e tem os cards fixos; serve para
# mostrar o layout sem depender do Wix, não para publicar.
#
# Por que não Compress-Archive: no Windows PowerShell 5.1 ele grava os caminhos
# internos com barra invertida ("assets\site.css"). A especificação do ZIP pede
# barra normal, e quem extrai conforme a especificação acaba com um arquivo
# chamado literalmente "assets\site.css" na raiz — o site sobe sem CSS. O
# ZipFile::CreateFromDirectory do .NET Framework tem o mesmo defeito, então as
# entradas são escritas uma a uma, com o nome montado à mão.

param(
  [string]$Origem = 'site/dist/client'
)

$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
$origem = Join-Path $raiz $Origem
$destino = Join-Path $raiz 'clube-criacionista-preview.zip'

if (-not (Test-Path $origem)) { throw "$Origem não existe. Rode a build antes." }
if (-not (Test-Path (Join-Path $origem 'index.html'))) { throw "$Origem não tem index.html na raiz" }

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

  # limites do Wix Headless: 3 MB por arquivo, 20 MB no total
  $grandes = @($a.Entries | Where-Object { $_.Length -gt 3MB })
  $somaCrua = ($a.Entries | Measure-Object -Property Length -Sum).Sum

  "origem:              " + $Origem
  "entradas:            " + $a.Entries.Count
  "caminho de exemplo:  " + $exemplo
  "com barra invertida: " + $tortas.Count
  "index.html na raiz:  " + $temIndex
  "zip:                 " + ('{0:N2} MB' -f ((Get-Item $destino).Length / 1MB))
  "descompactado:       " + ('{0:N2} MB de 20 MB' -f ($somaCrua / 1MB))
  "acima de 3 MB:       " + $grandes.Count

  if ($tortas.Count -gt 0) { throw 'ainda há caminhos com barra invertida' }
  if (-not $temIndex) { throw 'falta index.html na raiz do zip' }
  if ($grandes.Count -gt 0) { throw 'arquivo acima do limite de 3 MB: ' + $grandes[0].FullName }
  if ($somaCrua -gt 20MB) { throw 'passou do limite de 20 MB' }
  ''
  'pronto: ' + $destino
} finally {
  $a.Dispose()
}
