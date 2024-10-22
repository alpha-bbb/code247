import * as vscode from "vscode";
import * as path from 'path';
import * as fs from 'fs';

/**
 * 拡張機能が有効になったときに呼ばれる (最初に立ち上がったときとか)
 */
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("code247.start", () => {
      Code247Panel.createOrShow(context.extensionUri);
    }),
  );

  // 実行コマンド
  let runCommand = vscode.commands.registerCommand('code247.runCommand', () => {
    vscode.window.showInformationMessage('プログラムを実行します！');
    const terminal = vscode.window.createTerminal('Run Program');
    terminal.show();
    terminal.sendText('node ${file}'); // ここでプログラムの実行コマンドを変更できます
  });

  // デバッグコマンド
  let debugCommand = vscode.commands.registerCommand('code247.debugCommand', () => {
    vscode.window.showInformationMessage('デバッグを開始します！');
    const debugConfig: vscode.DebugConfiguration = {
      type: 'node',
      request: 'launch',
      name: 'Launch Program',
      program: '${file}'
    };

    vscode.debug.startDebugging(undefined, debugConfig).then(success => {
      if (success) {
        vscode.window.showInformationMessage('デバッグが正常に開始されました');
      } else {
        vscode.window.showErrorMessage('デバッグの開始に失敗しました');
      }
    });
  });

  // テストコマンド
  let runTestCommand = vscode.commands.registerCommand('code247.runTestCommand', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('ファイルが開かれていません');
      return;
    }

    const filePath = editor.document.uri.fsPath;
    const fileExtension = path.extname(filePath);

    let testCommand: string | null = getTestCommandByExtension(fileExtension);

    if (!testCommand) {
      testCommand = detectProjectTestFramework(filePath);
    }

    if (testCommand) {
      runTerminalCommand(testCommand);
    } else {
      vscode.window.showErrorMessage('サポートされていない言語です');
    }
  });

  addStatusBarItem(context, 'code247.runCommand', '$(play) 実行', 100);
  addStatusBarItem(context, 'code247.debugCommand', '$(bug) デバッグ', 101);
  addStatusBarItem(context, 'code247.runTestCommand', '$(beaker) テスト', 102);

  context.subscriptions.push(runCommand);
  context.subscriptions.push(debugCommand);
  context.subscriptions.push(runTestCommand);
}

class Code247Panel {
  public static currentPanel: Code247Panel | undefined;
  public static readonly viewType = "windowMode";
  public static readonly title = "code247";
  public static joystickLastStartedAt: Date | null = null;
  public static isDoubleTap: boolean = false;

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private radialMenuDecoration: vscode.TextEditorDecorationType[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (Code247Panel.currentPanel) {
      Code247Panel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      Code247Panel.viewType,
      Code247Panel.title,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
      },
    );

    Code247Panel.currentPanel = new Code247Panel(panel, extensionUri);
  }

  public constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._setWebviewContent(this._panel.webview, extensionUri);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message) => {
        const editor = vscode.window.activeTextEditor;
        switch (message.command) {
          case "joystick":
            this.joystick(message, editor);
            break;
        }
      },
      null,
      this._disposables,
    );
  }

  private async _setWebviewContent(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
  ) {
    const htmlContent = await this._getHtmlForWebview(webview, extensionUri);
    webview.html = htmlContent;
  }

  private async _getHtmlForWebview(
    webview: vscode.Webview,
    extensionPath: vscode.Uri,
  ) {
    const htmlPath = vscode.Uri.joinPath(
      extensionPath,
      "html",
      "joystick.html",
    );

    const data = await vscode.workspace.fs.readFile(htmlPath);
    const htmlContent = new TextDecoder("utf-8").decode(data);

    return htmlContent;
  }

  private joystick(message: any, editor: vscode.TextEditor | undefined) {
    switch (message.data.mode) {
      case "menu":
        this.joystickMenu(message, editor);
        break;
    }
  }

  private joystickMenu(message: any, editor: vscode.TextEditor | undefined) {
    switch (message.data.status) {
      case "start":
        if (Code247Panel.joystickLastStartedAt) {
          const now = new Date();
          const diff =
            now.getTime() - Code247Panel.joystickLastStartedAt.getTime();
          let joystickDoubleTapInterval = vscode.workspace
            .getConfiguration("code247")
            .get<number>("joystickDoubleTapInterval", 1000);
          if (diff < joystickDoubleTapInterval) {
            Code247Panel.isDoubleTap = true;
          } else {
            Code247Panel.isDoubleTap = false;
          }
        }
        if (editor) {
          this.showRadialMenu(
            editor,
            message.data.position.x,
            message.data.position.y,
          );
        }
        Code247Panel.joystickLastStartedAt = new Date();
        break;
      case "update":
        if (editor) {
          this.updateRadialMenu(
            editor,
            message.data.position.x,
            message.data.position.y,
          );
        }
        break;
      case "end":
        if (editor) {
          this.hideRadialMenu(editor);
        }
        break;
    }
  }

  private showRadialMenu(editor: vscode.TextEditor, x: number, y: number) {
    const rgbaGreen = "rgba(115, 209, 68, 0.3)";
    const rgbaOrange = "rgba(255, 211, 72, 0.3)";
    const rgbaFront = Code247Panel.isDoubleTap ? rgbaOrange : rgbaGreen;
    const rgbaBlank = "rgba(255, 255, 255, 0.1)";

    const angle = Math.atan2(y, x) * (180 / Math.PI);

    let selectedMenu = 0;
    if (angle >= -90 && angle < -45) {
      selectedMenu = 0;
    } else if (angle >= -45 && angle < 0) {
      selectedMenu = 1;
    } else if (angle >= 0 && angle < 45) {
      selectedMenu = 2;
    } else if (angle >= 45 && angle < 90) {
      selectedMenu = 3;
    } else if (angle >= 90 && angle < 135) {
      selectedMenu = 4;
    } else if (angle >= 135 && angle <= 180) {
      selectedMenu = 5;
    } else if (angle >= -180 && angle < -135) {
      selectedMenu = 6;
    } else if (angle >= -135 && angle < -90) {
      selectedMenu = 7;
    }

    const quadrantColors = [
      selectedMenu === 0 ? rgbaFront : rgbaBlank,
      selectedMenu === 1 ? rgbaFront : rgbaBlank,
      selectedMenu === 2 ? rgbaFront : rgbaBlank,
      selectedMenu === 3 ? rgbaFront : rgbaBlank,
      selectedMenu === 4 ? rgbaFront : rgbaBlank,
      selectedMenu === 5 ? rgbaFront : rgbaBlank,
      selectedMenu === 6 ? rgbaFront : rgbaBlank,
      selectedMenu === 7 ? rgbaFront : rgbaBlank,
    ];

    const cssString = `
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: conic-gradient(
    ${quadrantColors[0]} 0deg 45deg,
    ${quadrantColors[1]} 45deg 90deg,
    ${quadrantColors[2]} 90deg 135deg,
    ${quadrantColors[3]} 135deg 180deg,
    ${quadrantColors[4]} 180deg 225deg,
    ${quadrantColors[5]} 225deg 270deg,
    ${quadrantColors[6]} 270deg 315deg,
    ${quadrantColors[7]} 315deg 360deg
  );
  `;

    this.radialMenuDecoration.push(
      vscode.window.createTextEditorDecorationType({
        before: {
          contentText: "",
          textDecoration: `none; ${cssString}`,
        },
        isWholeLine: false,
      }),
    );

    const position = new vscode.Position(0, 0);
    editor.setDecorations(
      this.radialMenuDecoration[this.radialMenuDecoration.length - 1],
      [{ range: new vscode.Range(position, position) }],
    );
  }

  private updateRadialMenu(editor: vscode.TextEditor, x: number, y: number) {
    this.showRadialMenu(editor, x, y);
    this.hideRadialMenu(editor);
  }

  private hideRadialMenu(editor: vscode.TextEditor) {
    if (this.radialMenuDecoration.length === 0) {
      return;
    }
    const decorator = this.radialMenuDecoration.shift();
    decorator?.dispose();
  }

  public dispose() {
    Code247Panel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}

// ステータスバーにアイテムを追加する関数
function addStatusBarItem(context: vscode.ExtensionContext, command: string, text: string, priority: number) {
  let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, priority);
  statusBarItem.command = command;
  statusBarItem.text = text;
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

// ファイルの拡張子に基づいてテストコマンドを返す
function getTestCommandByExtension(extension: string): string | null {
  switch (extension) {
    case '.js':
    case '.ts':
      return 'npm test';  // JavaScript/TypeScript
    case '.py':
      return 'pytest';    // Python
    case '.go':
      return 'go test';   // Go
    case '.java':
      return 'mvn test';  // Java
    default:
      return null;
  }
}

// プロジェクトファイルを検出してテストフレームワークを決定
function detectProjectTestFramework(filePath: string): string | null {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return null;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;

  if (fs.existsSync(path.join(workspacePath, 'package.json'))) {
    return 'npm test'; // Node.js
  }

  if (fs.existsSync(path.join(workspacePath, 'pytest.ini'))) {
    return 'pytest';   // Python
  }

  if (fs.existsSync(path.join(workspacePath, 'go.mod'))) {
    return 'go test';  // Go
  }

  if (fs.existsSync(path.join(workspacePath, 'pom.xml'))) {
    return 'mvn test'; // Java
  }

  return null;
}

// ターミナルでコマンドを実行
function runTerminalCommand(command: string) {
  const terminal = vscode.window.createTerminal('Test Runner');
  terminal.show();
  terminal.sendText(command);
}

export function deactivate() {}