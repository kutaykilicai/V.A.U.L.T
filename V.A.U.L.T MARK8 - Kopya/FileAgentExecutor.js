// VAULT MK8 - File Agent Logic with Real File Operations
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const context = $input.all()[0].json;
const { originalCommand, parameters, detectedLanguage } = context;

// File operation mappings with actual implementations
const fileOperations = {
  // Turkish
  'oluştur': 'create',
  'sil': 'delete', 
  'kopyala': 'copy',
  'taşı': 'move',
  'yaz': 'write',
  'oku': 'read',
  'kaydet': 'save',
  'dosya': 'file',
  'klasör': 'directory',
  
  // English
  'create': 'create',
  'delete': 'delete',
  'copy': 'copy', 
  'move': 'move',
  'write': 'write',
  'read': 'read',
  'save': 'save',
  'file': 'file',
  'folder': 'directory',
  'directory': 'directory'
};

// Parse file command with enhanced logic
function parseFileCommand(cmd) {
  const words = cmd.toLowerCase().split(/\s+/);
  const operation = words.find(word => Object.keys(fileOperations).includes(word));
  const mappedOp = fileOperations[operation] || 'read';
  
  // Extract file path/name with better pattern matching
  const filename = parameters.filename || 
    words.find(word => word.includes('.')) ||
    words.find(word => word.includes('\\') || word.includes('/')) ||
    words.slice(-1)[0]; // Last word as fallback
  
  // Extract content for write operations
  let content = null;
  if (mappedOp === 'write' && operation) {
    const operationIndex = words.indexOf(operation);
    const filenameIndex = words.findIndex(word => word === filename);
    const startIndex = Math.max(operationIndex + 1, filenameIndex + 1);
    content = words.slice(startIndex).join(' ');
  }
  
  return {
    operation: mappedOp,
    target: filename,
    source: operation === 'copy' || operation === 'move' ? words[words.indexOf(operation) + 1] : null,
    destination: operation === 'copy' || operation === 'move' ? words[words.indexOf(operation) + 2] : null,
    content: content
  };
}

// File safety validation with comprehensive checks
function validateFileSafety(fileCommand) {
  const safeExtensions = ['.txt', '.json', '.csv', '.md', '.log', '.xml', '.yaml', '.yml', '.js', '.html', '.css'];
  const dangerousOperations = ['delete', 'move'];
  const systemPaths = ['c:\\windows', 'c:\\system32', '/system', '/bin', '/usr/bin'];
  
  let safety = {
    isSafe: true,
    riskLevel: 'low',
    warnings: []
  };
  
  // Check file extension
  if (fileCommand.target) {
    const ext = path.extname(fileCommand.target.toLowerCase());
    if (ext && !safeExtensions.includes(ext)) {
      safety.warnings.push(`Potentially unsafe file extension: ${ext}`);
      safety.riskLevel = 'medium';
    }
  }
  
  // Check for system path operations
  if (fileCommand.target) {
    const targetPath = fileCommand.target.toLowerCase();
    const isSystemPath = systemPaths.some(syspath => targetPath.includes(syspath));
    if (isSystemPath) {
      safety.isSafe = false;
      safety.riskLevel = 'critical';
      safety.warnings.push('System path detected - operation blocked');
    }
  }
  
  // Check for dangerous operations
  if (dangerousOperations.includes(fileCommand.operation)) {
    if (!fileCommand.target || !fileCommand.target.includes('.')) {
      safety.isSafe = false;
      safety.riskLevel = 'high';
      safety.warnings.push('Destructive operation without proper file specification');
    } else {
      safety.warnings.push('Destructive operation - backup recommended');
    }
  }
  
  return safety;
}

// Execute file operations with real implementation
async function executeFileOperation() {
  try {
    const fileCommand = parseFileCommand(originalCommand);
    const safety = validateFileSafety(fileCommand);
    
    // Block unsafe operations
    if (!safety.isSafe) {
      const result = {
        ...context,
        agentType: 'file',
        status: 'blocked',
        execution: {
          command: fileCommand,
          estimatedTime: 'N/A',
          requirements: ['file_system_access'],
          safety: `BLOCKED - ${safety.riskLevel.toUpperCase()} risk detected`
        },
        response: {
          type: 'security_block',
          message: detectedLanguage === 'turkish'
            ? `Güvenlik nedeniyle engellendi: ${originalCommand}`
            : `Blocked for security: ${originalCommand}`,
          data: fileCommand,
          warnings: safety.warnings,
          error: 'File operation blocked by security policy'
        }
      };
      
      console.log('VAULT MK8 - File Agent Blocked:', fileCommand.operation);
      return [result];
    }
    
    let operationResult;
    
    // Execute the file operation
    try {
      switch (fileCommand.operation) {
        case 'create':
        case 'write':
          const content = fileCommand.content || 'File created by VAULT MK8';
          const filePath = path.resolve(fileCommand.target || 'vault_mk8_file.txt');
          await fs.writeFile(filePath, content, 'utf8');
          operationResult = {
            success: true,
            message: `File created/written: ${filePath}`,
            data: { path: filePath, size: content.length, content: content.substring(0, 100) + '...' }
          };
          break;
          
        case 'read':
          const readPath = path.resolve(fileCommand.target || '.');
          const stats = await fs.stat(readPath);
          
          if (stats.isDirectory()) {
            const files = await fs.readdir(readPath);
            operationResult = {
              success: true,
              message: `Directory contents: ${readPath}`,
              data: { path: readPath, type: 'directory', files: files.slice(0, 20) }
            };
          } else {
            const fileContent = await fs.readFile(readPath, 'utf8');
            operationResult = {
              success: true,
              message: `File read: ${readPath}`,
              data: { 
                path: readPath, 
                type: 'file', 
                size: stats.size,
                content: fileContent.length > 500 ? fileContent.substring(0, 500) + '...' : fileContent
              }
            };
          }
          break;
          
        case 'delete':
          const deletePath = path.resolve(fileCommand.target);
          const deleteStats = await fs.stat(deletePath);
          
          if (deleteStats.isDirectory()) {
            await fs.rmdir(deletePath);
            operationResult = {
              success: true,
              message: `Directory deleted: ${deletePath}`,
              data: { path: deletePath, type: 'directory' }
            };
          } else {
            await fs.unlink(deletePath);
            operationResult = {
              success: true,
              message: `File deleted: ${deletePath}`,
              data: { path: deletePath, type: 'file' }
            };
          }
          break;
          
        case 'copy':
          if (!fileCommand.source || !fileCommand.destination) {
            throw new Error('Copy operation requires source and destination');
          }
          const sourcePath = path.resolve(fileCommand.source);
          const destPath = path.resolve(fileCommand.destination);
          
          await fs.copyFile(sourcePath, destPath);
          operationResult = {
            success: true,
            message: `File copied: ${sourcePath} → ${destPath}`,
            data: { source: sourcePath, destination: destPath }
          };
          break;
          
        default:
          throw new Error(`Unsupported operation: ${fileCommand.operation}`);
      }
    } catch (error) {
      operationResult = {
        success: false,
        message: `File operation failed: ${error.message}`,
        error: error.message
      };
    }
    
    const result = {
      ...context,
      agentType: 'file',
      status: operationResult.success ? 'completed' : 'error',
      execution: {
        command: fileCommand,
        estimatedTime: '1-3 seconds',
        requirements: ['file_system_access'],
        safety: 'security_validated',
        warnings: safety.warnings
      },
      response: {
        type: 'file_operation',
        message: detectedLanguage === 'turkish'
          ? operationResult.message.replace(/File|Directory/g, match => 
              match === 'File' ? 'Dosya' : 'Klasör')
          : operationResult.message,
        data: {
          operation: fileCommand.operation,
          target: fileCommand.target,
          success: operationResult.success,
          result: operationResult.data || null
        },
        error: operationResult.success ? null : operationResult.error
      }
    };
    
    console.log('VAULT MK8 - File Agent Execution:', fileCommand.operation, operationResult.success ? 'SUCCESS' : 'ERROR');
    return [result];
    
  } catch (error) {
    const result = {
      ...context,
      agentType: 'file',
      status: 'error',
      response: {
        type: 'error',
        message: detectedLanguage === 'turkish'
          ? `Dosya işlemi hatası: ${error.message}`
          : `File operation error: ${error.message}`,
        error: error.message
      }
    };
    
    console.error('VAULT MK8 - File Agent Error:', error);
    return [result];
  }
}

// Execute the file operation
return await executeFileOperation();
