#requires -Version 7.2
$ErrorActionPreference='Stop'
$prepared=Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'prepared.json') | ConvertFrom-Json
$nodeExecutable='C:/Program Files/nodejs/node.exe'
& $nodeExecutable (Join-Path $PSScriptRoot 'preflight.mjs')
if($LASTEXITCODE -ne 0){throw '006 preflight failed; key window not opened.'}
Add-Type -AssemblyName PresentationFramework
$window=New-Object Windows.Window
$window.Title='Vulture document-meaning-payment-006 — approved server-only key input'
$window.Width=690;$window.Height=290;$window.WindowStartupLocation='CenterScreen'
$panel=New-Object Windows.Controls.StackPanel;$panel.Margin=20
$text=New-Object Windows.Controls.TextBlock
$text.Text='Nebius Token Factory key only, not Qloo. One approved DOC1/DOC2 request: 2,048 total output tokens, 45 seconds. No model request starts from this window. The key stays only in this new server process; never send it in chat.'
$text.TextWrapping='Wrap';$panel.Children.Add($text)|Out-Null
$password=New-Object Windows.Controls.PasswordBox;$password.Margin='0,16,0,12';$panel.Children.Add($password)|Out-Null
$status=New-Object Windows.Controls.TextBlock;$status.Text='Waiting — no key saved, no model request.';$status.TextWrapping='Wrap';$panel.Children.Add($status)|Out-Null
$button=New-Object Windows.Controls.Button;$button.Content='006 시험 서버에만 키 등록 · 실제 요청 대기';$button.Margin='0,12,0,0';$panel.Children.Add($button)|Out-Null
$button.Add_Click({
 $value=$password.Password
 if($value -notmatch '^[\x21-\x7e]{16,8192}$' -or $value -match '["'']' -or $value -match '^Bearer\b' -or $value -match '^hack_'){$status.Text='FAIL — key format/provider. No spaces, quotes, line breaks or Bearer prefix. Use Nebius, not Qloo.';return}
 $button.IsEnabled=$false
 try{
  $info=New-Object System.Diagnostics.ProcessStartInfo
  $info.FileName=$nodeExecutable;$info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.WorkingDirectory=$prepared.runtimeRoot
  $info.Environment.Clear()
  foreach($name in @('SystemRoot','WINDIR','TEMP','TMP','PATH')){$standard=[Environment]::GetEnvironmentVariable($name);if($standard){$info.Environment[$name]=$standard}}
  $info.Environment['NEBIUS_API_KEY']=$value
  foreach($arg in @($prepared.runtimeEntry,'--approved-live',('--approval='+$prepared.approvalFile),('--trial-state='+$prepared.stateDir))){$info.ArgumentList.Add($arg)}
  $child=[System.Diagnostics.Process]::Start($info)
  $password.Clear();$password.IsEnabled=$false;$value=$null;$info.Environment.Remove('NEBIUS_API_KEY')|Out-Null
  $ready=$false
  for($attempt=0;$attempt -lt 24;$attempt++){
   if($child.HasExited){break}
   try{$check=Invoke-RestMethod -Uri 'http://127.0.0.1:4211/api/document/status' -TimeoutSec 1;if($check.trialId -eq 'document-meaning-payment-006' -and $check.requestProfile -eq 'phrase-006' -and $check.liveReady -eq $true -and $check.approvedRequestSha256 -eq $prepared.requestSha256){$ready=$true;break}}catch{}
   Start-Sleep -Milliseconds 250
  }
  if($ready){
   $record=[ordered]@{trialId='document-meaning-payment-006';pid=$child.Id;port=4211;entry=$prepared.runtimeEntry;runtimeRoot=$prepared.runtimeRoot;keyPresent=$true;liveReady=$true;modelRequestStarted=$false;createdAt=[DateTime]::UtcNow.ToString('o')}
   [IO.File]::WriteAllText((Join-Path $PSScriptRoot 'key-server-ready.json'),($record|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
   $status.Text='PASS — 006 dedicated server ready; no model request yet. Tell Codex PASS only.'
  }elseif($child.HasExited){$status.Text='FAIL — 006 server exited. Do not re-register or retry; ask Codex to inspect.'}
  else{$status.Text='UNKNOWN — readiness unconfirmed. Do not register again or repeat the trial.'}
 }catch{$password.Clear();$value=$null;$status.Text='FAIL — dedicated process launch; no key value recorded. Do not repeat the trial.'}
})
$window.Content=$panel;$window.Add_Closed({$password.Clear()});$null=$window.ShowDialog()
