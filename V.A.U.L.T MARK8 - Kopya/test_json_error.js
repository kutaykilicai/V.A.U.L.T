// JSON Error Diagnostic Tool
// This script will help identify where JSON parsing is failing

console.log('🔧 JSON Error Testing Tool');
console.log('=========================\n');

// Test 1: Check if it's a runtime issue with your script.js
console.log('1. Testing script.js functionality...');

try {
    // Simulate a fetch response test
    const testPayload = {
        command: "test command",
        userId: "test_user",
        sessionId: "test_session"
    };
    
    console.log('✅ Test payload creation works:', JSON.stringify(testPayload));
    
    // Test JSON.parse with common problematic responses
    const testResponses = [
        '{"success": true, "message": "test"}',  // Valid JSON
        '[{"success": true}]',                    // Array response
        '{"success": true, "data": {"nested": "value"}}', // Nested JSON
        '',                                       // Empty response
        'null',                                   // Null response
        'undefined',                              // Invalid response
        '{"success": true, "message": "test",}'   // Trailing comma error
    ];
    
    console.log('\n2. Testing various response formats...');
    
    testResponses.forEach((response, index) => {
        console.log(`\nTest ${index + 1}: ${response.substring(0, 50)}${response.length > 50 ? '...' : ''}`);
        
        try {
            if (!response || response.trim() === '') {
                console.log('   ⚠️  Empty response detected');
                return;
            }
            
            if (response === 'undefined') {
                console.log('   ❌ Invalid response: undefined');
                return;
            }
            
            const parsed = JSON.parse(response);
            console.log('   ✅ Parsed successfully:', typeof parsed, Array.isArray(parsed) ? '[Array]' : '[Object]');
            
        } catch (error) {
            console.log(`   ❌ Parse error: ${error.message}`);
        }
    });
    
} catch (error) {
    console.log(`❌ Script error: ${error.message}`);
}

console.log('\n3. Testing n8n webhook simulation...');

// Simulate what your n8n workflow might return
const simulatedN8nResponses = [
    // Standard successful response
    {
        success: true,
        executionId: 'exec_123',
        agent: 'ai',
        command: 'test command',
        response: {
            type: 'ai_generation',
            message: 'Test response',
            data: 'Generated content'
        }
    },
    
    // Array response (common in n8n)
    [{
        success: true,
        agent: 'chitchat',
        response: {
            message: 'Hello! How can I help you?'
        }
    }],
    
    // Error response
    {
        success: false,
        error: 'Test error message'
    }
];

simulatedN8nResponses.forEach((response, index) => {
    console.log(`\nSimulated n8n response ${index + 1}:`);
    
    try {
        const jsonString = JSON.stringify(response);
        console.log('   ✅ Serialization works');
        
        const parsed = JSON.parse(jsonString);
        console.log('   ✅ Parse works');
        
        // Test your handleBackendResponse logic
        if (Array.isArray(parsed)) {
            console.log('   📊 Array detected - would use parsed[0]');
        } else {
            console.log('   📊 Object detected - would use directly');
        }
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
});

console.log('\n4. Common JSON Error Scenarios:');
console.log('================================');

const commonErrors = {
    'Trailing comma': '{"success": true, "data": "test",}',
    'Unescaped quotes': '{"message": "He said "hello""}',
    'Single quotes': "{'success': true}",
    'Undefined values': '{"success": true, "data": undefined}',
    'Functions': '{"success": true, "callback": function() {}}',
    'Comments': '{"success": true, /* comment */ "data": "test"}',
    'Missing quotes': '{success: true, data: "test"}'
};

Object.entries(commonErrors).forEach(([errorType, jsonString]) => {
    console.log(`\n${errorType}:`);
    console.log(`   Input: ${jsonString}`);
    
    try {
        JSON.parse(jsonString);
        console.log('   ✅ Actually valid (unexpected!)');
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
});

console.log('\n🏁 JSON Error Testing Complete!');
console.log('\nIf you\'re still seeing JSON errors:');
console.log('1. Check browser console for the exact error');
console.log('2. Check n8n logs for the response being sent');
console.log('3. Add more detailed logging to script.js around line 46-61');
console.log('4. Check if the webhook URL is returning HTML instead of JSON');
