import { replaceAll } from "./util";

const commands = {
    password: {
        darwin: {
            step_1: (user: string, oldPass: string, pass: string) => `dscl . -passwd /Users/${user} ${oldPass} ${pass}`,
        },
        freebsd: {
            step_1: (bcrypt_pass: string, user: string) => `chpass -p '${bcrypt_pass + ""}' ${user}`,
            step_2: (bcrypt_pass: string, user: string) => `usermod -p '${bcrypt_pass + ""}' ${user}`,
        },
        linux: {
            step_1: (ch_pass_string: string) => `echo '${ch_pass_string}' | sudo chpasswd -e`,
            step_2: (ch_pass_string: string) => `echo '${ch_pass_string}' | chpasswd -e`,
            step_3: (sudo_pass: string, ch_pass_string: string) => `echo -e '${sudo_pass}\n${ch_pass_string}' | sudo -S chpasswd -e`,
            shadow: {
                cat_shadow_file: "cat /etc/shadow",
                copy_shadow_file: "cp /etc/shadow /etc/shadow.copy",
                revert_shadow_file: "cp /etc/shadow.copy /etc/shadow",
                del_shadow_copy_file: "rm /etc/shadow.copy",
            },
        },
        sunos: {
            step_1: (username: string, ch_pass_string: string) => `sudo sed -i 's/\\(${username}:\\)[^:]\+/\\1${ch_pass_string}/' /etc/shadow`,
        },
    },
    // the first escape for for node the second is for the target.
    ssh: {
        eject: {
            windows_cmd: (ssh_key: string) =>
                `echo ${ssh_key} >> %ALLUSERSPROFILE%\\ssh\\administrators_authorized_keys ; icacls.exe %ALLUSERSPROFILE%\\ssh\\administrators_authorized_keys /inheritance:r /grant "Administrators:F" /grant "SYSTEM:F"`,
            windows: (ssh_key: string) =>
                `powershell.exe "Add-Content -Force -Path $env:ALLUSERSPROFILE\\ssh\\administrators_authorized_keys -Value '${ssh_key}';icacls.exe \\"$env:ALLUSERSPROFILE\\ssh\\administrators_authorized_keys\\" /inheritance:r /grant \\"Administrators:F\\" /grant \\"SYSTEM:F\\""`,
            linux: (ssh_key: string) => `mkdir -p ~/.ssh && echo "${ssh_key}" | cat >> ~/.ssh/authorized_keys`,
            sunos: (ssh_key: string) => `mkdir -p $HOME/.ssh && echo "${ssh_key}" | cat >> $HOME/.ssh/authorized_keys`,
            home: {
                windows_cmd: (ssh_key: string) => `(mkdir "%USERPROFILE%\\.ssh" 2> NUL) & echo ${ssh_key} >> %USERPROFILE%\\.ssh\\authorized_keys`,
                windows: (ssh_key: string) => `powershell.exe "Add-Content -Force -Path $env:USERPROFILE\\.ssh\\authorized_keys -Value '${ssh_key}'`,
            },
        },
        remove: {
            windows_cmd: (ssh_key: string) =>
                `findstr /v "${ssh_key}" %ProgramData%\\ssh\\administrators_authorized_keys > %ProgramData%\\ssh\\administrators_authorized_keys.tmp && move /y %ProgramData%\\ssh\\administrators_authorized_keys.tmp %ProgramData%\\ssh\\administrators_authorized_keys`,
            windows: (ssh_key: string) =>
                `powershell.exe -command \"$keyToRemove = \\"${ssh_key}\\";$authorizedKeysPath = Join-Path $env:ProgramData \\"ssh\\administrators_authorized_keys\\"; $authorizedKeysContent = Get-Content -Path $authorizedKeysPath; $authorizedKeysContent = $authorizedKeysContent -notmatch [regex]::Escape($keyToRemove); $authorizedKeysContent | Set-Content -Path $authorizedKeysPath; icacls.exe $authorizedKeysPath /inheritance:r /grant \\"Administrators:F\\" /grantclear \\"SYSTEM:F\\"; Write-Host \\"SSH key removal complete.\\"\"`,
            linux: (ssh_key: string) => `ssh_key="${replaceAll(ssh_key, "/", "\\/")}" && sed -i "s/$ssh_key//g" ~/.ssh/authorized_keys`,
            sunos: (ssh_key: string) => `ssh_key="${replaceAll(ssh_key, "/", "\\/")}" && perl -ne '/$ssh_key/g' $HOME/.ssh/authorized_keys`,
            freebsd: (ssh_key: string) => `setenv ssh_key "${replaceAll(ssh_key, "/", "\\/")}" && sed -i "" "s/$ssh_key//g" ~/.ssh/authorized_keys`,
        },

        echo: {
            windows_cmd: "type %ProgramData%\\ssh\\administrators_authorized_keys",
            windows: `powershell.exe "cat \\"$env:ProgramData\\ssh\\administrators_authorized_keys\\""`,
            linux: "cat ~/.ssh/authorized_keys",
            sunos: "cat $HOME/.ssh/authorized_keys",
        },
    },
    windows_util: {
        shell_type: "(dir 2>&1 *`|echo CMD);&<# rem #>echo PowerShell",
        openSSH: {
            cmd: "if exist %ProgramData%\\ssh (echo Exist)",
            ps: `if (Test-Path -path "$env:ALLUSERSPROFILE\\ssh") { Write-Host "Exist"}`,
        },
    },
    detect: {
        windows: 'systeminfo | findstr /B /C:"OS Name" /B /C:"OS Version"',
        linux: "uname -a",
    },
    hostname: "hostname",
    users: {
        current: {
            windows: "query user",
            linux: "who -a --ips --lookup -H",
            sunos: "who -a",
            freebsd: "who -HumT",
        },
        windows: `wmic.exe useraccount get name,sid,disabled,domain,fullname,status,passwordexpires,passwordrequired,description`,
        linux: `cat /etc/passwd | awk -F: '{print $1 " ID:" $3 " GID:" $4 " dir:" $6 "  Comment:" $5}'`,
        darwin: 'dscl . list /Users | grep -v "^_"',
        parsing: {
            linux: `cat /etc/passwd | awk -F: '{print $1 " " $3 " " $4 " " $6 " " $5}'`,
            windows: `wmic useraccount get name,sid,domain,description,Caption /format:csv`,
        },
    },
    network: {
        ports: {
            linux: {
                step_1: `netstat -tuan | grep "LISTEN"|awk '/^tcp/ {print "TCP", $4} /^udp/ {print "UDP", $4}'`,
                step_2: `ss -tuan | grep "LISTEN" | awk '/^tcp/ {print "TCP", $5} /^udp/ {print "UDP", $5}'`,
            },
            freebsd: `netstat -an | grep "LISTEN"|awk '/^tcp/ {print "TCP", $4} /^udp/ {print "UDP", $4}'`,
            windows: `powershell.exe "Get-NetTCPConnection | Where-Object { $_.State -eq 'Listen' } | ForEach-Object {$($_.LocalPort)}"`,
        },
        windows: `powershell.exe "Get-NetTCPConnection | Where-Object { $_.State -eq 'Established' }"`,
        linux: {
            step_1: `netstat -an | grep "ESTABLISHED"`,
            step_2: `ss -tan | grep ESTAB`,
        },
    },
    processes: {
        installed: {
            windows: {
                step_1: `powershell.exe "Get-ItemProperty HKLM:/Software/Microsoft/Windows/CurrentVersion/Uninstall/*, HKLM:/Software/Wow6432Node/Microsoft/Windows/CurrentVersion/Uninstall/*, HKCU:/Software/Microsoft/Windows/CurrentVersion/Uninstall/* |Select-Object DisplayName, Publisher, InstallDate | Format-Table -AutoSize"`,
                step_2: `powershell.exe "Get-ItemProperty HKLM:/Software/Microsoft/Windows/CurrentVersion/Uninstall/*, HKLM:/Software/Wow6432Node/Microsoft/Windows/CurrentVersion/Uninstall/* |Select-Object DisplayName, Publisher, InstallDate | Format-Table -AutoSize"`,
            },
            linux: {
                step_1: `for x in $(ls -1t /var/log/dpkg.log*); do zcat -f $x |tac |grep -e " install " -e " upgrade "; done |awk -F ":a" '{print $1}'`,
                step_2: `rpm -qa --qf '%{INSTALLTIME} %{NAME}\n' | sort -n`,
            },
            freebsd: {
                step_1: `pkg info`,
                step_2: "pkg_info",
            },
            sunos: "pkginfo",
        },
        windows: "powershell.exe Get-Process",
        linux: "ps -aux --forest",
        freebsd: "ps aux",
        sunos: "ps -Ajd",
    },
    failedLogins: {
        linux: `grep "Failed password" /var/log/auth.log`,
        sunos: `grep "Failed password" /var/log/authlog`,
        windows: `powershell.exe "Get-WinEvent -FilterHashTable @{LogName='Security'; ID=4625} | Format-Table TimeCreated, Message -AutoSize"`,
        darwin: `log show --predicate 'eventMessage contains "failed"'`,
    },
    variables: {
        linux: `printenv`,
        windows: "set",
        freebsd: "env",
        sunos: "env",
    },
    AD: {
        check: `powershell.exe -Command "& {Get-ADDefaultDomainPasswordPolicy}"`,
        domain: `systeminfo | findstr /B "Domain"`,
    },
    os_info: {
        windows: "systeminfo.exe /FO csv",
        linux: "uname -osnpr | awk '{print $2, $1, $3, $4}'",
        linux_name: "uname -v",
    },
};

export { commands };
