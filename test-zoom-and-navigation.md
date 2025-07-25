# 🔍 Test Guide: Zoom & Navigation Features

## ✅ **FIXED ISSUES:**
1. **📊 Mermaid Diagram Zoom Controls** - Now with +/- buttons and reset
2. **🔗 Navigation Button Fix** - "Go to Function" buttons now work properly

---

## 🎯 **Testing Instructions:**

### **Step 1: Install Updated Extension**
```bash
# The updated extension is now packaged:
✅ api-journey-builder-0.0.1.vsix (55.13 KB)
```

### **Step 2: Test Zoom Functionality**

1. **Open VS Code** and press `F5` to start Extension Development Host
2. **Open** `ui-demo-functions.js` 
3. **Right-click** on `processEcommerceOrder` function
4. **Select** "Generate API Journey"
5. **Look for the diagram section** with zoom controls:

```
📊 Execution Flow Diagram
┌─────────────────────────────────────┐
│  [+] [-] [⌂]  ← ZOOM CONTROLS       │
│                                     │
│  [Mermaid Diagram Here]             │
│                                     │
└─────────────────────────────────────┘
```

**Test the zoom controls:**
- **Click [+]** - Diagram should zoom IN (scale up)
- **Click [-]** - Diagram should zoom OUT (scale down)  
- **Click [⌂]** - Diagram should RESET to original size
- **Zoom Range:** 0.5x to 3.0x in 0.2x increments

### **Step 3: Test Navigation Buttons**

1. **In the same analysis result**, scroll to **Downstream Analysis** section
2. **Look for function cards** with blue "🔗 Go to Function" buttons
3. **Click any "Go to Function" button**

**Expected behavior:**
- ✅ **File should open** in VS Code editor
- ✅ **Cursor should jump** to the exact line number
- ✅ **Function should be highlighted** in the editor

### **Step 4: Debug Logging Verification**

**Open Developer Console** (`Cmd+Shift+P` → "Developer: Toggle Developer Tools" → Console):

**When clicking zoom buttons, you should see:**
```
🔍 Zoom level changed: 1.2
🔍 Zoom level changed: 1.4
🔍 Reset zoom to: 1.0
```

**When clicking navigation buttons, you should see:**
```
🔍 DEBUG: Navigate function called
   📂 filePath: /Users/.../ui-demo-functions.js (type: string)
   📍 lineNumber: 42 (type: number)
📤 Sending navigation message: {command: "navigate", filePath: "...", lineNumber: 42}
📨 Webview message received: {command: "navigate", ...}
🔗 Attempting to navigate to: /Users/.../ui-demo-functions.js:42
🧭 Navigation command called with: filePath="...", lineNumber=42
📁 Opening document: /Users/.../ui-demo-functions.js
📄 Document opened, showing in editor...
🎯 Navigating to line 42
✅ Navigation completed successfully
```

---

## 🎨 **New UI Features Added:**

### **📊 Zoom Controls:**
- **[+] Button** - Zoom in (max 3.0x)
- **[-] Button** - Zoom out (min 0.5x)  
- **[⌂] Button** - Reset to 1.0x
- **Smooth transitions** with CSS animations
- **Hover effects** on zoom buttons

### **🔗 Enhanced Navigation:**
- **Better error handling** with alerts for debugging
- **Proper file path escaping** for special characters
- **Comprehensive logging** at every step
- **Input validation** for file paths and line numbers
- **Async/await pattern** for better promise handling

### **🎯 Visual Improvements:**
- **Zoom controls positioned** in top-right of diagram
- **Circular zoom buttons** with hover effects
- **Better spacing** and professional styling
- **Responsive container** that handles overflow properly

---

## ❌ **If Issues Persist:**

### **Navigation Not Working:**
1. Check browser console for error messages
2. Verify file paths are absolute (not relative)
3. Ensure files exist in workspace
4. Check if VS Code has proper file permissions

### **Zoom Not Working:**
1. Verify Mermaid diagram is rendered
2. Check if JavaScript is enabled in webview
3. Look for CSS transform errors in console

### **Getting Debug Info:**
- All interactions now log to console
- Use browser DevTools to see detailed execution flow
- Alert boxes will show navigation errors if they occur

---

## 🚀 **Test Functions for Different Scenarios:**

**Test these functions in `ui-demo-functions.js`:**

1. **`processEcommerceOrder`** - Complex flow with many dependencies
2. **`authenticateUser`** - Security-focused with caching  
3. **`generateAnalyticsDashboard`** - Data-heavy with AI insights

Each will generate different diagram complexity and navigation scenarios!

---

## ✅ **Success Criteria:**

- ✅ Zoom controls are visible and functional
- ✅ Mermaid diagram scales smoothly  
- ✅ Navigation buttons open correct files
- ✅ Cursor jumps to exact line numbers
- ✅ Console shows detailed debug information
- ✅ Error handling works with user-friendly messages

**🎉 Both zoom and navigation features should now work perfectly!** 