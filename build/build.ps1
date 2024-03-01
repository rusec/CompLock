$SALT=$(node -e 'const crypto = require(\"crypto\"); console.log(crypto.randomBytes(256).toString(\"hex\"));')
$SALT_2=$(node -e 'const crypto = require(\"crypto\"); console.log(crypto.randomBytes(256).toString(\"hex\"));')
node ./build/prebuild.js $SALT $SALT_2
try {
    Remove-Item -r .\dist
}
catch {
    Write-Output "Path might not exist"
}
tsc  
try {
    pkg --out-path releases/latest/x64 -t 'node16-linux-x64,node16-win-x64,node16-macos-x64' -C Gzip -c ./package.json ./dist/src/Tortilla.js
    Write-Output 'Finished x64'
    pkg --out-path releases/latest/latest -t 'node16-linux,node16-win,node16-macos' -C Gzip -c ./package.json ./dist/src/Tortilla.js
    Write-Output 'Finished latest'
    # pkg --out-path releases/latest/arm -t 'node16-linux-arm64,node16-macos-arm64' ./dist/src/Tortilla.js
    Write-Output 'UNABLE TO CREATE ARM Binaries PLEASE RUN pkg --out-path releases/latest/arm -t "node16-linux-arm64,node16-macos-arm64" -C Gzip ./dist/Tortilla.js'
}
catch {
    <#Do this if a terminating exception happens#>
}

node ./build/postbuild.js $SALT $SALT_2
Write-Output 'Binaries are located in releases'