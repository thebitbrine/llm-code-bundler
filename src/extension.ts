import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface BundlerConfig {
    maxFileSize: number;
    excludePatterns: string[];
    includeHiddenFiles: boolean;
    maxDepth: number;
}

interface TreeNode {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: TreeNode[];
    size?: number;
}

class CodeBundler {
    private config!: BundlerConfig;

    constructor(private workspaceFolder: string) {
        this.loadConfig();
    }

    private loadConfig() {
        const config = vscode.workspace.getConfiguration('llm-code-bundler');
        this.config = {
            maxFileSize: config.get('maxFileSize', 100),
            excludePatterns: config.get('excludePatterns', ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.min.*', '*.bundle.*']),
            includeHiddenFiles: config.get('includeHiddenFiles', false),
            maxDepth: config.get('maxDepth', 10)
        };
    }

    private async shouldIncludeFile(file: vscode.Uri): Promise<boolean> {
        const filePath = file.fsPath;
        const stats = await fs.promises.stat(filePath);
        
        // Check file size (convert KB to bytes)
        if (stats.size > this.config.maxFileSize * 1024) {
            return false;
        }

        // Check exclude patterns
        const relativePath = path.relative(this.workspaceFolder, filePath);
        return !this.config.excludePatterns.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                return regex.test(relativePath) || regex.test(path.basename(filePath));
            }
            return relativePath.includes(pattern.replace('/**', ''));
        });
    }

    private async shouldIncludeDirectory(dirPath: string): Promise<boolean> {
        const relativePath = path.relative(this.workspaceFolder, dirPath);
        const baseName = path.basename(dirPath);
        
        // Check if hidden files should be included
        if (!this.config.includeHiddenFiles && baseName.startsWith('.')) {
            return false;
        }

        return !this.config.excludePatterns.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                return regex.test(relativePath) || regex.test(baseName);
            }
            return relativePath.includes(pattern.replace('/**', ''));
        });
    }

    private async buildDirectoryTree(dirPath: string, depth: number = 0): Promise<TreeNode[]> {
        if (depth > this.config.maxDepth) {
            return [];
        }

        const items: TreeNode[] = [];
        
        try {
            const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory()) {
                    if (await this.shouldIncludeDirectory(fullPath)) {
                        const children = await this.buildDirectoryTree(fullPath, depth + 1);
                        items.push({
                            name: entry.name,
                            path: path.relative(this.workspaceFolder, fullPath),
                            isDirectory: true,
                            children
                        });
                    }
                } else {
                    const fileUri = vscode.Uri.file(fullPath);
                    if (await this.shouldIncludeFile(fileUri)) {
                        const stats = await fs.promises.stat(fullPath);
                        items.push({
                            name: entry.name,
                            path: path.relative(this.workspaceFolder, fullPath),
                            isDirectory: false,
                            size: stats.size
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`Error reading directory ${dirPath}:`, error);
        }

        return items.sort((a, b) => {
            // Directories first, then files
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    private renderTree(nodes: TreeNode[], prefix: string = ''): string {
        let result = '';
        
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const isLast = i === nodes.length - 1;
            const currentPrefix = prefix + (isLast ? '└── ' : '├── ');
            const nextPrefix = prefix + (isLast ? '    ' : '│   ');
            
            if (node.isDirectory) {
                result += `${currentPrefix}📁 **${node.name}/**\n`;
                if (node.children && node.children.length > 0) {
                    result += this.renderTree(node.children, nextPrefix);
                }
            } else {
                const sizeKB = node.size ? (node.size / 1024).toFixed(1) : '0';
                result += `${currentPrefix}📄 \`${node.name}\` (${sizeKB}KB)\n`;
            }
        }
        
        return result;
    }

    async generateTreeMarkdown(): Promise<string> {
        const tree = await this.buildDirectoryTree(this.workspaceFolder);
        const timestamp = new Date().toISOString();
        
        let markdown = `# Project Directory Tree\n\n`;
        markdown += `**Generated:** ${timestamp}\n`;
        markdown += `**Workspace:** ${path.basename(this.workspaceFolder)}\n\n`;
        
        markdown += `## 📁 Directory Structure\n\n`;
        markdown += this.renderTree(tree);
        
        markdown += `\n---\n\n`;
        markdown += `## 🤖 Instructions for LLM\n\n`;
        markdown += `Please analyze this directory structure and provide a list of files you would like to examine for code analysis, debugging, or review.\n\n`;
        markdown += `**Format your response as a simple list:**\n`;
        markdown += `\`\`\`\n`;
        markdown += `src/main.ts\n`;
        markdown += `src/utils/helper.js\n`;
        markdown += `package.json\n`;
        markdown += `README.md\n`;
        markdown += `\`\`\`\n\n`;
        markdown += `**Guidelines:**\n`;
        markdown += `- Include the relative file paths exactly as shown above\n`;
        markdown += `- Focus on the most important files for understanding the codebase\n`;
        markdown += `- Consider configuration files, main entry points, and core logic\n`;
        markdown += `- You can request up to 20-30 files for optimal analysis\n`;
        
        return markdown;
    }

    async generateMarkdown(specificFiles?: string[]): Promise<string> {
        let files: vscode.Uri[];
        
        if (specificFiles && specificFiles.length > 0) {
            // Generate bundle for specific files
            files = specificFiles
                .filter(filePath => filePath.trim())
                .map(filePath => vscode.Uri.file(path.join(this.workspaceFolder, filePath.trim())));
        } else {
            // Generate bundle for all files
            files = await vscode.workspace.findFiles('**/*.{js,ts,py,java,cpp,h,c,cs,php,html,css,jsx,tsx,json,md,yml,yaml,xml}');
        }
        
        let markdown = '# Code Bundle for LLM Analysis\n\n';
        markdown += `**Generated:** ${new Date().toISOString()}\n`;
        markdown += `**Files included:** ${specificFiles ? specificFiles.length : 'All eligible files'}\n\n`;
        
        for (const file of files) {
            try {
                // Check if file exists and should be included
                if (!fs.existsSync(file.fsPath)) {
                    continue;
                }
                
                if (!specificFiles && !(await this.shouldIncludeFile(file))) {
                    continue;
                }
                
                const content = await fs.promises.readFile(file.fsPath, 'utf8');
                const relativePath = path.relative(this.workspaceFolder, file.fsPath);
                const extension = path.extname(file.fsPath).substring(1) || 'text';
                
                markdown += `## 📄 ${relativePath}\n\`\`\`${extension}\n${content}\n\`\`\`\n\n`;
            } catch (error) {
                console.error(`Error reading ${file.fsPath}:`, error);
                markdown += `## ❌ ${path.relative(this.workspaceFolder, file.fsPath)}\n*Error reading file: ${error}*\n\n`;
            }
        }
        
        return markdown;
    }

    async generateTree(): Promise<void> {
        try {
            const markdown = await this.generateTreeMarkdown();
            const outputFile = path.join(this.workspaceFolder, 'llm_tree.md');
            
            await fs.promises.writeFile(outputFile, markdown, 'utf8');
            
            const doc = await vscode.workspace.openTextDocument(outputFile);
            await vscode.window.showTextDocument(doc);
            
            vscode.window.showInformationMessage('Project tree generated successfully');
        } catch (error) {
            vscode.window.showErrorMessage(`Error generating tree: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async bundle(specificFiles?: string[]): Promise<void> {
        try {
            const markdown = await this.generateMarkdown(specificFiles);
            const outputFile = path.join(this.workspaceFolder, specificFiles ? 'llm_partial_bundle.md' : 'llm_bundle.md');
            
            await fs.promises.writeFile(outputFile, markdown, 'utf8');
            
            const doc = await vscode.workspace.openTextDocument(outputFile);
            await vscode.window.showTextDocument(doc);
            
            const fileCount = specificFiles ? specificFiles.length : 'all eligible';
            vscode.window.showInformationMessage(`Code bundle created successfully (${fileCount} files)`);
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

class BundlerWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'llm-code-bundler.webview';

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview();

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'generatePartialBundle':
                    this.handlePartialBundle(data.files);
                    break;
            }
        });
    }

    private async handlePartialBundle(filesText: string) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('Please open a workspace first');
            return;
        }

        const files = filesText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#') && !line.startsWith('//'));

        if (files.length === 0) {
            vscode.window.showErrorMessage('Please provide at least one file path');
            return;
        }

        const bundler = new CodeBundler(workspaceFolder);
        await bundler.bundle(files);
    }

    private _getHtmlForWebview() {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LLM Code Bundler</title>
            <style>
                body { 
                    font-family: var(--vscode-font-family); 
                    padding: 16px; 
                    color: var(--vscode-foreground);
                    background: var(--vscode-editor-background);
                }
                h2 { 
                    margin-bottom: 12px; 
                    color: var(--vscode-textLink-foreground);
                }
                .description {
                    font-size: 0.9em;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 12px;
                    line-height: 1.4;
                }
                textarea { 
                    height: 180px; 
                    width: 90%;
                    margin: 8px 0; 
                    padding: 12px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    font-family: var(--vscode-editor-font-family);
                    font-size: 13px;
                    border-radius: 4px;
                    resize: vertical;
                }
                button { 
                    background: var(--vscode-button-background); 
                    color: var(--vscode-button-foreground); 
                    border: none; 
                    padding: 10px 20px; 
                    margin: 8px 0; 
                    cursor: pointer;
                    border-radius: 4px;
                    font-weight: 500;
                    width: 100%;
                    transition: background-color 0.2s;
                }
                button:hover { 
                    background: var(--vscode-button-hoverBackground); 
                }
                .workflow-steps {
                    background: var(--vscode-textBlockQuote-background);
                    border-left: 3px solid var(--vscode-textLink-foreground);
                    padding: 12px;
                    margin: 16px 0;
                    border-radius: 0 4px 4px 0;
                }
                .workflow-steps ol {
                    margin: 0;
                    padding-left: 20px;
                }
                .workflow-steps li {
                    margin-bottom: 4px;
                    line-height: 1.4;
                }
                .tip {
                    background: var(--vscode-editorWidget-background);
                    border: 1px solid var(--vscode-editorWidget-border);
                    padding: 8px;
                    margin: 12px 0;
                    border-radius: 4px;
                    font-size: 0.85em;
                }
            </style>
        </head>
        <body>
            <h2>LLM Code Bundler</h2>
            <textarea id="fileList" placeholder="Paste file paths here (one per line):

config/database.php
src/main.ts
src/utils/helper.js
package.json
README.md

# Comments and empty lines are ignored"></textarea>
            
            <button onclick="generatePartialBundle()">📦 Generate Partial Bundle</button>

            <div class="tip">
                <strong>💡 Tip:</strong> You can also use the full bundle command (<code>LLM: Bundle Code to Markdown</code>) to include all eligible files at once.
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function generatePartialBundle() {
                    const files = document.getElementById('fileList').value;
                    
                    if (!files.trim()) {
                        return;
                    }
                    
                    vscode.postMessage({
                        type: 'generatePartialBundle',
                        files: files
                    });
                }

                // Allow Ctrl+Enter to trigger bundle generation
                document.getElementById('fileList').addEventListener('keydown', function(e) {
                    if (e.ctrlKey && e.key === 'Enter') {
                        generatePartialBundle();
                    }
                });
            </script>
        </body>
        </html>`;
    }
}

export function activate(context: vscode.ExtensionContext) {
    // Register webview provider
    const provider = new BundlerWebviewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(BundlerWebviewProvider.viewType, provider)
    );

    // Register commands
    let bundleCommand = vscode.commands.registerCommand('llm-code-bundler.bundle', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('Please open a workspace first');
            return;
        }

        const bundler = new CodeBundler(workspaceFolder);
        await bundler.bundle();
    });

    let treeCommand = vscode.commands.registerCommand('llm-code-bundler.generateTree', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('Please open a workspace first');
            return;
        }

        const bundler = new CodeBundler(workspaceFolder);
        await bundler.generateTree();
    });

    context.subscriptions.push(bundleCommand, treeCommand);
}

export function deactivate() {}