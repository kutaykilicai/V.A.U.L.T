# 🚀 VAULT MK8 - Quick Setup & Fix Guide

## 📋 Current Status Check

The project appears to have the following issues:
1. **n8n backend is not running** (most critical)
2. **Workflow may not be imported/active**
3. **Possible JavaScript conflicts**

## 🔧 Step-by-Step Fix

### Step 1: Start n8n Backend
I've already started n8n for you by running `n8n-start.bat`. Wait about 15 seconds for it to fully initialize.

### Step 2: Verify n8n is Running
1. Open your browser
2. Go to: `http://localhost:5678`
3. You should see the n8n interface

### Step 3: Import and Activate Workflow
1. In n8n, click **Workflows** → **Import from File**
2. Select: `VAULT MK8 - Advanced Multi-Agent Command.json`
3. **IMPORTANT**: Click the toggle switch to **ACTIVATE** the workflow
4. You should see a green "Active" status

### Step 4: Test the Connection
1. Open `test_connection.html` in your browser
2. Click "Test Connection"
3. You should see a green success message

### Step 5: Use the Main Interface
1. Open `vault_mk8_frontend.html` in your browser
2. The status indicator should show "Connected"
3. Try a simple command like "hello" or "merhaba"

## 🔍 Troubleshooting

### If n8n won't start:
```powershell
# Check if port 5678 is in use
netstat -ano | findstr :5678

# If it's in use, kill the process or change the port in n8n-start.bat
```

### If workflow won't import:
1. Make sure you're using the correct file: `VAULT MK8 - Advanced Multi-Agent Command.json`
2. Check that the file isn't corrupted
3. Try the simple test workflow instead: `Simple Test Workflow.json`

### If connection fails:
1. Check Windows Firewall - allow Node.js
2. Verify the webhook URL matches: `http://localhost:5678/webhook/vault-mk8-command`
3. Make sure the workflow is ACTIVE (green toggle)

### If commands don't work:
1. Open browser console (F12)
2. Look for red error messages
3. Check n8n execution logs in the n8n interface

## 🎯 Quick Test Commands

Once everything is running, try these commands:

**Turkish:**
- `merhaba` - Test chitchat
- `yaz merhaba dünya` - Test AI agent
- `google ara javascript` - Test browser agent

**English:**
- `hello` - Test chitchat
- `write hello world` - Test AI agent
- `search google for javascript` - Test browser agent

## 📊 Success Indicators

You know it's working when:
- ✅ n8n interface is accessible at http://localhost:5678
- ✅ Workflow shows as "Active" in n8n
- ✅ Frontend shows "Connected" status
- ✅ Commands receive responses within 5-10 seconds
- ✅ Agent cards animate when processing

## 🆘 Emergency Reset

If nothing works:

1. Close all browser tabs
2. Stop n8n (Ctrl+C in the command window)
3. Clear browser cache and localStorage:
   ```javascript
   localStorage.clear()
   ```
4. Restart n8n with `n8n-start.bat`
5. Re-import and activate the workflow
6. Try again

## 📞 Need More Help?

Check these files for detailed information:
- `JSON_ERROR_TROUBLESHOOTING.md` - For JSON parsing errors
- `README.md` - For complete documentation
- `N8N_SETUP_GUIDE.md` - For detailed n8n setup

---

**Note**: The Gemini API key in the batch file is included for testing. For production use, please use your own API key.
