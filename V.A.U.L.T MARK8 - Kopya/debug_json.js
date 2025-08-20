const fs = require('fs');
const path = require('path');

console.log('🔍 JSON Diagnostic Tool - VAULT MK8');
console.log('==================================\n');

// Get all JSON files in current directory
const jsonFiles = fs.readdirSync('.').filter(file => file.endsWith('.json'));

console.log(`Found ${jsonFiles.length} JSON files:\n`);

jsonFiles.forEach(file => {
    console.log(`📄 Checking: ${file}`);
    
    try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for common issues
        console.log(`   Size: ${content.length} characters`);
        
        // Check for BOM
        if (content.charCodeAt(0) === 0xFEFF) {
            console.log('   ⚠️  WARNING: File contains BOM (Byte Order Mark)');
        }
        
        // Check for invisible characters at start/end
        if (content !== content.trim()) {
            console.log('   ⚠️  WARNING: File has leading/trailing whitespace');
        }
        
        // Try to parse JSON
        const parsed = JSON.parse(content);
        console.log(`   ✅ Valid JSON (${Object.keys(parsed).length} root properties)`);
        
        // Check for specific structures
        if (parsed.nodes) {
            console.log(`   📊 Contains ${parsed.nodes.length} nodes`);
        }
        if (parsed.connections) {
            console.log(`   🔗 Contains connection definitions`);
        }
        
    } catch (error) {
        console.log(`   ❌ JSON ERROR: ${error.message}`);
        
        // Try to find the problematic line
        const lines = fs.readFileSync(file, 'utf8').split('\n');
        const match = error.message.match(/position (\d+)/);
        if (match) {
            const position = parseInt(match[1]);
            const content = fs.readFileSync(file, 'utf8');
            const lineNumber = content.substring(0, position).split('\n').length;
            console.log(`   📍 Error around line ${lineNumber}`);
            console.log(`   📝 Line content: ${lines[lineNumber - 1]?.trim()}`);
        }
    }
    
    console.log('');
});

// Also check if there are any temporary or backup files
console.log('🔍 Checking for temporary/backup files...');
const allFiles = fs.readdirSync('.');
const tempFiles = allFiles.filter(file => 
    file.includes('~') || 
    file.includes('.tmp') || 
    file.includes('.bak') || 
    file.includes('.backup')
);

if (tempFiles.length > 0) {
    console.log('Found temporary files:');
    tempFiles.forEach(file => console.log(`   - ${file}`));
} else {
    console.log('No temporary files found.');
}

console.log('\n🏁 Diagnostic complete!');

// VAULT MK8 - JSON Debug Helper
// Bu dosyayı frontend'e ekleyerek JSON error'larını debug edebilirsiniz

// JSON Response Debugger
function debugJsonResponse(responseText) {
    console.group('🔍 JSON Debug Analysis');
    console.log('Raw response length:', responseText.length);
    console.log('Raw response preview:', responseText.substring(0, 200));
    
    // Check for common issues
    const issues = [];
    
    if (!responseText || responseText.trim() === '') {
        issues.push('❌ Empty response');
    }
    
    if (responseText.trim().startsWith('<')) {
        issues.push('❌ HTML response (not JSON)');
    }
    
    const trimmed = responseText.trim();
    if (trimmed.startsWith('{') && !trimmed.endsWith('}')) {
        issues.push('❌ Incomplete JSON object');
    }
    
    if (trimmed.startsWith('[') && !trimmed.endsWith(']')) {
        issues.push('❌ Incomplete JSON array');
    }
    
    // Try to find JSON syntax errors
    try {
        JSON.parse(responseText);
        console.log('✅ Valid JSON format');
    } catch (parseError) {
        issues.push(`❌ JSON Parse Error: ${parseError.message}`);
        
        // Show problem area
        const match = parseError.message.match(/position (\d+)/);
        if (match) {
            const position = parseInt(match[1]);
            const start = Math.max(0, position - 30);
            const end = Math.min(responseText.length, position + 30);
            const problemArea = responseText.substring(start, end);
            console.log('🎯 Problem area:', problemArea);
            console.log('📍 Error position:', position);
        }
    }
    
    if (issues.length > 0) {
        console.log('🚨 Issues found:');
        issues.forEach(issue => console.log(issue));
    } else {
        console.log('✅ No obvious issues detected');
    }
    
    console.groupEnd();
    return issues;
}

// Test n8n connection with detailed logging
async function testN8nConnection(url) {
    console.group('🧪 N8N Connection Test');
    console.log('Testing URL:', url);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-VAULT-Version': 'MK8-Debug'
            },
            body: JSON.stringify({
                command: 'test connection',
                userId: 'debug-user',
                sessionId: Date.now().toString()
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers));
        
        const responseText = await response.text();
        console.log('Response text length:', responseText.length);
        
        // Debug the response
        const issues = debugJsonResponse(responseText);
        
        if (issues.length === 0) {
            try {
                const parsed = JSON.parse(responseText);
                console.log('✅ Successfully parsed JSON:', parsed);
                return { success: true, data: parsed };
            } catch (parseError) {
                console.error('❌ JSON parse failed:', parseError.message);
                return { success: false, error: parseError.message };
            }
        } else {
            return { success: false, error: 'Response has issues', issues };
        }
        
    } catch (error) {
        console.error('❌ Network error:', error.message);
        return { success: false, error: error.message };
    } finally {
        console.groupEnd();
    }
}

// Quick test function
function quickTest() {
    const url = localStorage.getItem('vault_mk8_endpoint') || 'http://localhost:5678/webhook/vault-mk8-command';
    testN8nConnection(url).then(result => {
        if (result.success) {
            console.log('🎉 Connection test successful!');
        } else {
            console.error('💥 Connection test failed:', result.error);
        }
    });
}

// Export for use in browser console
window.VaultDebug = {
    debugJsonResponse,
    testN8nConnection,
    quickTest
};

console.log('🔧 VAULT MK8 Debug Helper loaded!');
console.log('Usage:');
console.log('  VaultDebug.quickTest() - Test current endpoint');
console.log('  VaultDebug.testN8nConnection(url) - Test specific URL');
console.log('  VaultDebug.debugJsonResponse(text) - Debug JSON response');
