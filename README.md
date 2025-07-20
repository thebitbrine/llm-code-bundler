# LLM Code Bundler

<div align="center">
  <img src="images/logo.png" alt="LLM Code Bundler Logo" width="128" height="128">
  <h3>Smart code bundling for efficient LLM analysis</h3>
</div>

## ✨ Features

### 🎯 **Intelligent Workflow for LLM Analysis**
- **📁 Generate Project Trees** → Get a clear overview of your entire codebase
- **🤖 LLM-Guided Selection** → Let AI choose which files to analyze  
- **📦 Selective Bundling** → Bundle only the files your LLM requested
- **⚡ Full Project Bundling** → Bundle all eligible files at once

### 🚀 **Key Capabilities**
- Smart directory tree generation with file sizes and LLM instructions
- Selective file bundling based on LLM recommendations
- Advanced file filtering with configurable patterns and size limits
- Support for all major programming languages with syntax highlighting
- Clean, LLM-friendly markdown output format
- Streamlined webview interface for quick partial bundling

## 🔄 Recommended Workflow

This extension is designed around an efficient **3-step workflow**:

### **1. 📁 Generate Project Tree**
```
Ctrl+Shift+P → "LLM: Generate Project Tree"
```
Creates `llm_tree.md` with:
- Visual directory structure with file sizes
- Built-in instructions for LLMs
- Formatted guidelines for file selection

### **2. 🤖 Get LLM Analysis**
- Share `llm_tree.md` with your LLM
- LLM analyzes structure and selects important files
- Copy the LLM's file list response

### **3. 📦 Generate Partial Bundle**
- Open **LLM Code Bundler** panel in Explorer sidebar
- Paste the LLM's file list
- Click "Generate Partial Bundle"
- Share `llm_partial_bundle.md` with LLM for focused analysis

## 📋 Commands

| Command | Description | Output File |
|---------|-------------|-------------|
| `LLM: Generate Project Tree` | Create directory overview for LLM analysis | `llm_tree.md` |
| `LLM: Bundle Code to Markdown` | Bundle all eligible files | `llm_bundle.md` |

## 🎛️ Quick Access

### **Explorer Sidebar Panel**
The **LLM Code Bundler** panel provides:
- Simple interface for partial bundling
- Clear workflow instructions
- Paste area for LLM file lists
- One-click bundle generation

### **Context Menus**
Right-click any folder in Explorer for quick access to both commands.

## ⚙️ Configuration

Configure the extension via VS Code settings (`Ctrl+,` → search "llm-code-bundler"):

| Setting | Default | Description |
|---------|---------|-------------|
| `maxFileSize` | 100 KB | Maximum file size to include |
| `excludePatterns` | See below | Patterns to exclude (supports wildcards) |
| `includeHiddenFiles` | false | Include files/folders starting with '.' |
| `maxDepth` | 10 | Maximum directory depth for tree generation |

## 🚫 Default Exclude Patterns
```
node_modules/**
.git/**
dist/**
build/**
*.min.*
*.bundle.*
*.log
*.lock
.env*
```

## 📂 Output Files

- **`llm_tree.md`** - Project structure with LLM instructions
- **`llm_bundle.md`** - Complete code bundle (all files)
- **`llm_partial_bundle.md`** - Selective bundle (LLM-chosen files)

## 🎯 Usage Examples

### **Basic Full Bundle**
1. `Ctrl+Shift+P` → "LLM: Bundle Code to Markdown"
2. Share `llm_bundle.md` with your LLM

### **Smart Selective Workflow** ⭐
1. `Ctrl+Shift+P` → "LLM: Generate Project Tree"
2. Share `llm_tree.md` with LLM: *"Analyze this project structure and list the key files you'd like to see"*
3. Copy LLM's response (file paths)
4. Open **LLM Code Bundler** panel in Explorer
5. Paste file list and click "Generate Partial Bundle"
6. Share `llm_partial_bundle.md` for focused analysis

### **Context Menu Shortcuts**
- Right-click folder → "LLM: Generate Project Tree"
- Right-click folder → "LLM: Bundle Code to Markdown"

## 🏗️ Supported File Types

JavaScript, TypeScript, Python, Java, C++, C#, PHP, HTML, CSS, JSON, YAML, XML, Markdown, and more.

## 🔧 Advanced Features

- **Wildcard Pattern Matching**: Use `**` for deep directory exclusion
- **File Size Filtering**: Automatically skip oversized files
- **Hidden File Control**: Toggle inclusion of dotfiles
- **Depth Limiting**: Control directory traversal depth
- **Error Handling**: Graceful handling of missing or inaccessible files
- **Keyboard Shortcuts**: `Ctrl+Enter` in webview to generate bundles

## 💡 Why This Workflow?

Traditional code analysis tools dump everything at once, overwhelming LLMs and wasting tokens. This extension:

✅ **Reduces noise** - Only relevant files get analyzed  
✅ **Saves tokens** - Smaller, focused bundles  
✅ **Improves accuracy** - LLMs can focus on what matters  
✅ **Speeds up analysis** - Less context switching  
✅ **Enhances collaboration** - Clear, structured workflow  

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

[MIT](LICENSE)

## 👨‍💻 Author

[TheBitBrine](https://github.com/thebitbrine)