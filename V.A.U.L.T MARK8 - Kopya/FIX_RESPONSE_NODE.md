# 🔧 How to Fix the Response Node in n8n

## The Problem
Your workflow is not returning valid JSON, causing the "unexpected end of JSON input" error.

## Quick Fix for the Response Node

### 1. Find the Final Response Node
Look for a node named "Respond to Webhook" or "Final Response Processor" at the end of your workflow.

### 2. Configure it Properly

Click on the node and set these parameters:

**Basic Settings:**
- **Respond With**: `JSON`
- **Response Code**: `200`

**Response Body:**
Use this exact expression:
```javascript
={{
  JSON.stringify({
    "success": true,
    "agent": $item(0).$node["Agent Router"].json.agent || "unknown",
    "command": $item(0).$node["Webhook"].json.command,
    "language": $item(0).$node["Intelligent Command Analyzer"].json.language || "unknown",
    "confidence": $item(0).$node["Intelligent Command Analyzer"].json.confidence || 0,
    "status": "completed",
    "response": {
      "type": "agent_response",
      "message": $json.message || $json.response || "Command processed successfully",
      "data": $json.data || {}
    },
    "context": {
      "sessionId": $item(0).$node["Webhook"].json.sessionId,
      "userId": $item(0).$node["Webhook"].json.userId
    }
  })
}}
```

**Response Headers:**
Add these headers:
- `Access-Control-Allow-Origin`: `*`
- `Access-Control-Allow-Methods`: `POST, GET, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type, X-VAULT-Version`
- `Content-Type`: `application/json`

### 3. Handle CORS Preflight

Add an IF node before the main logic to handle OPTIONS requests:
- **Condition**: `{{ $json.method === 'OPTIONS' }}`
- **True branch**: Connect to a Respond node that returns empty body with CORS headers
- **False branch**: Continue with normal workflow

## Alternative: Use the Simple Test Workflow

If the main workflow is too complex to fix quickly:

1. Import `VAULT_MK8_Simple_Test.json`
2. Activate it
3. Test to confirm n8n and frontend are working
4. Then debug the main workflow step by step

## Testing Your Fix

1. Save the workflow
2. Make sure it's **ACTIVE** (green toggle)
3. Click "Execute Workflow" to test manually
4. Check the output - it should be valid JSON
5. Try the connection test again

## Common Mistakes to Avoid

❌ Don't use `console.log()` in Code nodes - it breaks JSON output
❌ Don't forget to stringify the JSON object
❌ Don't have multiple response nodes
❌ Don't forget to set CORS headers
✅ Always test the workflow manually first
✅ Check the execution log for errors
