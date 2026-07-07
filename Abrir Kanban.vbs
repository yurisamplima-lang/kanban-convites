Dim oShell, scriptDir
Set oShell = CreateObject("WScript.Shell")
scriptDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))

' Inicia servidor Node oculto (sem janela)
oShell.Run """D:\node.exe"" """ & scriptDir & "serve.js""", 0, False

' Aguarda servidor iniciar
WScript.Sleep 1500

' Abre browser
oShell.Run "http://localhost:3000"
