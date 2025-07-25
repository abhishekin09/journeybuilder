# 🧪 AI-Powered API Journey Builder - Testing Checklist

## ✅ Installation Verification

### 1. Extension Installation
- [ ] Extension installed from VSIX file
- [ ] Extension appears in Extensions list
- [ ] No installation errors

### 2. API Key Configuration
- [ ] OpenAI API key configured in settings
- [ ] Key: `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`
- [ ] No API key error messages

## 🚀 Functionality Testing

### 3. Basic Function Analysis
**Target:** `processUserRegistration` in `test-ai-function.js`

- [ ] Right-click menu shows "🚀 Generate AI-Powered Journey"
- [ ] Command palette shows "Generate AI-Powered Journey"
- [ ] Progress notification appears: "🤖 AI Analyzing..."
- [ ] Analysis completes without errors

### 4. Expected Analysis Results
- [ ] New Markdown document opens
- [ ] Document title includes function name
- [ ] Mermaid diagram appears
- [ ] UPSTREAM section shows 2 callers:
  - [ ] `handleRegistrationRequest`
  - [ ] `registerUserFromAdmin`
- [ ] DOWNSTREAM section shows 8+ functions:
  - [ ] `validateUserData` 🟢 LOW
  - [ ] `findUserByEmail` 🟡 MEDIUM
  - [ ] `hashPassword` 🟢 LOW
  - [ ] `createUser` 🟡 MEDIUM
  - [ ] And others...

### 5. Navigation Testing
- [ ] Click "[Go to function]" links
- [ ] VS Code navigates to correct file and line
- [ ] Cursor positioned at function definition
- [ ] Navigation works for multiple functions

### 6. Advanced Features
- [ ] API endpoints detected: `/api/register`, `/api/admin/users`
- [ ] Database interactions shown: `findOne`, `insertOne`
- [ ] Cache interactions: Redis operations
- [ ] Complexity ratings displayed with emojis
- [ ] Line numbers accurate

## 🐛 Troubleshooting

### Common Issues:
1. **"OpenAI API key not configured"**
   - Check VS Code settings for API key
   - Restart VS Code after configuration

2. **"Function not found"**
   - Ensure cursor is on function name
   - Try selecting the function name
   - Check file is JavaScript/TypeScript

3. **Analysis times out**
   - Check internet connection
   - Verify OpenAI API key is valid
   - Try with a simpler function

4. **No clickable links**
   - Links should be in format: `[Go to function](command:...)`
   - Try clicking different links in analysis

### Test Results:
- **Total Tests:** ___/20
- **Passed:** ___
- **Failed:** ___
- **Issues Found:** ___

## 📝 Notes:
_Add any observations or issues here..._ 