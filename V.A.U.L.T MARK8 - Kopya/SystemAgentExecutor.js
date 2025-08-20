// VAULT MK8 - System Agent Logic with Real Command Execution
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const context = $input.all()[0].json;
const { originalCommand, parameters, detectedLanguage } = context;

// System command mappings with Windows PowerShell support
const systemCommands = {
  // Turkish commands
  'kapat': (process) => ({ action: 'kill', target: process, cmd: `Stop-Process -Name "${process}" -Force` }),
  'aç': (app) => ({ action: 'start', target: app, cmd: `Start-Process "${app}"` }),
  'çalıştır': (cmd) => ({ action: 'execute', command: cmd, cmd: cmd }),
  'listele': (type) => {
    const listCommands = {
      'processes': 'Get-Process | Select-Object Name, Id, CPU | Format-Table',
      'files': 'Get-ChildItem | Format-Table',
      'services': 'Get-Service | Format-Table'
    };
    return { action: 'list', type: type || 'processes', cmd: listCommands[type] || listCommands.processes };
  },
  'durdur': (service) => ({ action: 'stop', target: service, cmd: `Stop-Service -Name "${service}"` }),
  
  // English commands
  'kill': (process) => ({ action: 'kill', target: process, cmd: `Stop-Process -Name "${process}" -Force` }),
  'start': (app) => ({ action: 'start', target: app, cmd: `Start-Process "${app}"` }),
  'run': (cmd) => ({ action: 'execute', command: cmd, cmd: cmd }),
  'execute': (cmd) => ({ action: 'execute', command: cmd, cmd: cmd }),
  'list': (type) => {
    const listCommands = {
      'processes': 'Get-Process | Select-Object Name, Id, CPU | Format-Table',
      'files': 'Get-ChildItem | Format-Table',
      'services': 'Get-Service | Format-Table'
    };
    return { action: 'list', type: type || 'processes', cmd: listCommands[type] || listCommands.processes };
  },
  'stop': (service) => ({ action: 'stop', target: service, cmd: `Stop-Service -Name "${service}"` })
};

// Parse system command with better logic
function parseSystemCommand(cmd) {
  const words = cmd.toLowerCase().split(/\s+/);
  const action = words.find(word => Object.keys(systemCommands).includes(word));
  
  if (!action) {
    // If no specific action found, treat as direct PowerShell command
    return {
      action: 'execute',
      command: cmd,
      cmd: cmd,
      warning: detectedLanguage === 'turkish' 
        ? 'Doğrudan komut çalıştırılıyor - dikkatli kullanın'
        : 'Direct command execution - use with caution'
    };
  }
  
  // Extract target/parameter for the command
  const actionIndex = words.indexOf(action);
  const target = parameters.process || words.slice(actionIndex + 1).join(' ') || 'default';
  
  return systemCommands[action](target);
}

// Security validation with expanded dangerous commands list
function validateCommandSecurity(cmdObj) {
  const dangerousCommands = [
    'rm -rf', 'del /f', 'format', 'shutdown', 'reboot', 'restart',
    'Remove-Item -Recurse -Force', 'Format-Volume', 'Restart-Computer',
    'Stop-Computer', 'Clear-Disk', 'Remove-Computer', 'Reset-ComputerMachinePassword'
  ];
  
  const isDangerous = dangerousCommands.some(dangerous => 
    cmdObj.cmd.toLowerCase().includes(dangerous.toLowerCase())
  );
  
  // Additional checks for system-critical operations
  const systemCritical = [
    'system32', 'boot', 'registry', 'format c:', 'del c:\\',
    'Remove-Item C:\\', 'System32', 'Windows\\System32'
  ];
  
  const isSystemCritical = systemCritical.some(critical =>
    cmdObj.cmd.toLowerCase().includes(critical.toLowerCase())
  );
  
  return {
    isDangerous: isDangerous || isSystemCritical,
    riskLevel: isSystemCritical ? 'critical' : isDangerous ? 'high' : 'low'
  };
}

// Execute system command with proper error handling
async function executeSystemCommand() {
  try {
    const systemExecution = parseSystemCommand(originalCommand);
    const securityCheck = validateCommandSecurity(systemExecution);
    
    // Block dangerous commands
    if (securityCheck.isDangerous) {
      const result = {
        ...context,
        agentType: 'system',
        status: 'blocked',
        execution: {
          command: systemExecution,
          estimatedTime: 'N/A',
          requirements: ['system_permissions'],
          safety: `BLOCKED - ${securityCheck.riskLevel.toUpperCase()} risk command detected`
        },
        response: {
          type: 'security_block',
          message: detectedLanguage === 'turkish'
            ? `Güvenlik nedeniyle engellendi: ${originalCommand}. Risk seviyesi: ${securityCheck.riskLevel}`
            : `Blocked for security: ${originalCommand}. Risk level: ${securityCheck.riskLevel}`,
          data: systemExecution,
          error: 'Command blocked by security policy'
        }
      };
      
      console.log('VAULT MK8 - System Agent Blocked:', systemExecution.action);
      return [result];
    }
    
    // Execute safe commands
    let executionResult;
    try {
      const { stdout, stderr } = await execAsync(systemExecution.cmd, { 
        shell: 'powershell.exe',
        timeout: 30000 // 30 second timeout
      });
      
      executionResult = {
        success: true,
        output: stdout || 'Command executed successfully',
        error: stderr || null,
        exitCode: 0
      };
    } catch (error) {
      executionResult = {
        success: false,
        output: null,
        error: error.message,
        exitCode: error.code || 1
      };
    }
    
    const result = {
      ...context,
      agentType: 'system',
      status: executionResult.success ? 'completed' : 'error',
      execution: {
        command: systemExecution,
        estimatedTime: '1-5 seconds',
        requirements: ['system_permissions'],
        safety: 'security_validated',
        platform: 'windows'
      },
      response: {
        type: 'system_command',
        message: detectedLanguage === 'turkish'
          ? executionResult.success 
            ? `Sistem komutu başarıyla çalıştırıldı: ${systemExecution.action}`
            : `Sistem komutu hatası: ${executionResult.error}`
          : executionResult.success
            ? `System command executed successfully: ${systemExecution.action}`
            : `System command error: ${executionResult.error}`,
        data: {
          command: systemExecution.cmd,
          action: systemExecution.action,
          target: systemExecution.target,
          output: executionResult.output,
          success: executionResult.success,
          exitCode: executionResult.exitCode
        },
        error: executionResult.success ? null : executionResult.error
      }
    };
    
    console.log('VAULT MK8 - System Agent Execution:', systemExecution.action, executionResult.success ? 'SUCCESS' : 'ERROR');
    return [result];
    
  } catch (error) {
    const result = {
      ...context,
      agentType: 'system',
      status: 'error',
      response: {
        type: 'error',
        message: detectedLanguage === 'turkish'
          ? `Sistem hatası: ${error.message}`
          : `System error: ${error.message}`,
        error: error.message
      }
    };
    
    console.error('VAULT MK8 - System Agent Error:', error);
    return [result];
  }
}

// Execute the system command
return await executeSystemCommand();
