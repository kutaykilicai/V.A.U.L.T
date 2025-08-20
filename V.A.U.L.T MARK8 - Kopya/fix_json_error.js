// Quick Fix for "Unexpected end of JSON input" Error
// Replace this in your script.js around line 54-62

// Original problematic code:
// result = JSON.parse(responseText);

// NEW FIXED CODE:
async function parseResponseSafely(response) {
    try {
        // Get response text
        const responseText = await response.text();
        console.log('📄 Raw response:', responseText);
        console.log('📏 Response length:', responseText.length);
        
        // Check if response is empty
        if (!responseText || responseText.trim() === '') {
            console.error('🚨 Empty response detected');
            return {
                success: false,
                error: 'n8n workflow returned empty response',
                suggestion: 'Check if your workflow is active and properly configured'
            };
        }
        
        // Check if response is complete JSON
        const trimmed = responseText.trim();
        if ((trimmed.startsWith('{') && !trimmed.endsWith('}')) || 
            (trimmed.startsWith('[') && !trimmed.endsWith(']'))) {
            console.error('🚨 Incomplete JSON detected');
            console.error('Starts with:', trimmed.substring(0, 50));
            console.error('Ends with:', trimmed.substring(Math.max(0, trimmed.length - 50)));
            
            return {
                success: false,
                error: 'Incomplete JSON response from n8n',
                suggestion: 'Check n8n logs and workflow execution'
            };
        }
        
        // Try to parse JSON
        const parsed = JSON.parse(responseText);
        console.log('✅ JSON parsed successfully:', typeof parsed);
        
        return parsed;
        
    } catch (jsonError) {
        console.error('❌ JSON Parse Error:', jsonError.message);
        
        return {
            success: false,
            error: `JSON parsing failed: ${jsonError.message}`,
            suggestion: 'Check n8n workflow response format'
        };
    }
}

// Updated executeMk8Command function snippet:
// Replace your current try block with this:

/*
try {
    console.log('🚀 Sending request:', payload);
    console.log('📡 Webhook URL:', n8nWebhookUrl);
    
    const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-VAULT-Version': 'MK8'
        },
        body: JSON.stringify(payload)
    });

    console.log('📨 Response status:', response.status);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
    }
    
    // Use the safe parser instead of direct JSON.parse
    const result = await parseResponseSafely(response);
    
    // Handle the result
    if (result.success === false && result.error) {
        // This is our custom error response
        addMessageToInterface(`🔧 ${result.error}\n💡 ${result.suggestion}`, 'error');
        return;
    }
    
    // Normal processing
    if (Array.isArray(result)) {
        handleBackendResponse(result[0]);
    } else {
        handleBackendResponse(result);
    }

} catch (error) {
    // ... rest of error handling
}
*/

console.log('🔧 Safe JSON parser loaded. Copy the code above to fix your script.js');
