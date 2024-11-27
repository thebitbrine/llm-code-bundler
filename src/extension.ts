import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface BundlerConfig {
    maxFileSize: number;
    excludePatterns: string[];
}

class CodeBundler {
    private config: BundlerConfig;

    constructor(private workspaceFolder: string) {
        const config = vscode.workspace.getConfiguration('llm-code-bundler');
        this.config = {
            maxFileSize: config.get('maxFileSize', 100),
            excludePatterns: config.get('excludePatterns', [])
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
                return regex.test(path.basename(filePath));
            }
            return relativePath.includes(pattern);
        });
    }

    async generateMarkdown(): Promise<string> {
        const files = await vscode.workspace.findFiles('**/*.{js,ts,py,java,cpp,h,c,cs,php,html,css,jsx,tsx}');
        let markdown = '# Code Bundle for LLM Analysis\n\n';
        
        for (const file of files) {
            if (await this.shouldIncludeFile(file)) {
                try {
                    const content = await fs.promises.readFile(file.fsPath, 'utf8');
                    const relativePath = path.relative(this.workspaceFolder, file.fsPath);
                    const extension = path.extname(file.fsPath).substring(1);
                    
                    markdown += `## ${relativePath}\n\`\`\`${extension}\n${content}\n\`\`\`\n\n`;
                } catch (error) {
                    console.error(`Error reading ${file.fsPath}:`, error);
                }
            }
        }
        
        return markdown;
    }

    async bundle(): Promise<void> {
        try {
            const markdown = await this.generateMarkdown();
            const outputFile = path.join(this.workspaceFolder, 'llm_bundle.md');
            
            await fs.promises.writeFile(outputFile, markdown, 'utf8');
            
            const doc = await vscode.workspace.openTextDocument(outputFile);
            await vscode.window.showTextDocument(doc);
            
            vscode.window.showInformationMessage('Code bundle created successfully');
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('llm-code-bundler.bundle', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('Please open a workspace first');
            return;
        }

        const bundler = new CodeBundler(workspaceFolder);
        await bundler.bundle();
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}