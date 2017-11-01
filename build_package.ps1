# Script creates a new package for the upload to
# the Google Web Store.
#
# Manifest-Version of Chrome Extension defines the package version!
# 
$source = $PSScriptRoot + "\code"
$manifest = $source + "\manifest.json"
$manifest = Get-Content -Raw -Path $manifest | ConvertFrom-Json
$version = $manifest.version

$targetPkgName = "IptChromeExtension_v" + $version + ".zip"
$destination = $PSScriptRoot + "\package\" + $targetPkgName

if(Test-path $destination) {
  $confirmation = Read-Host "Package $targetPkgName already exsists. Overwrite? [y/n]"

  if($confirmation -eq 'y') {
    Remove-item $destination
  } else {
    echo "Abort! No Package created."
    exit
  }
}

Add-Type -assembly "system.io.compression.filesystem"
[io.compression.zipfile]::CreateFromDirectory($Source, $destination)
echo "Package $targetPkgName successful created."
