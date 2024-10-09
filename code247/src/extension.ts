import * as vscode from "vscode";

/**
 * 拡張機能が有効になったときに呼ばれる (最初に立ち上がったときとか)
 */
export function activate(context: vscode.ExtensionContext) {
  /**
   * https://code.visualstudio.com/api/references/vscode-api#ExtensionContext
   * subscriptions
   * 拡張機能が無効になったときに破棄される配列
   * 基本的にはここにDisposableを返すAPIをpushして関数を呼び出していく
   */
  context.subscriptions.push(
    /**
     * https://code.visualstudio.com/api/extension-guides/command#registering-a-command
     * registerCommand
     * コマンドの名前は package.jsonや keybindings.json とか executeCommand から呼び出して使う
     * @param command コマンドの名前
     * @param callback コマンドが実行されたときに呼ばれる関数
     */
    vscode.commands.registerCommand("code247.start", () => {
      /**
       * https://code.visualstudio.com/api/references/vscode-api#ExtensionContext
       * extensionUri
       * 拡張機能のあるディレクトリのURI
       * このURIを使って、拡張機能の画像とかのPATHを指定する
       */
      Code247Panel.createOrShow(context.extensionUri);
    }),
  );
}

class Code247Panel {
  public static currentPanel: Code247Panel | undefined;

  public static readonly viewType = "windowMode";
  public static readonly title = "code247";

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private radialMenuDecoration: vscode.TextEditorDecorationType | null = null;

  /**
   * 1度も開いたことがない場合は新しく作成し、開いている場合は表示する
   */
  public static createOrShow(extensionUri: vscode.Uri) {
    /**
     * https://code.visualstudio.com/api/references/vscode-api#window
     * activeTextEditor
     * 現在アクティブなエディタを取得する
     * フォーカスがあるエディタか、フォーカスがない場合は最後にフォーカスがあったエディタを取得する
     * ない場合は undefined を返す
     */
    const column = vscode.window.activeTextEditor
      ? /**
         * https://code.visualstudio.com/api/references/vscode-api#ViewColumn
         * ViewColumn
         * ウィンドウ内のエディタの位置
         */
        vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (Code247Panel.currentPanel) {
      /**
       * https://code.visualstudio.com/api/references/vscode-api#WebviewPanel
       * reveal
       * パネルを指定した位置に表示する
       * @param viewColumn パネルの表示位置
       */
      Code247Panel.currentPanel._panel.reveal(column);
      return;
    }

    /**
     * https://code.visualstudio.com/api/references/vscode-api#window.createWebviewPanel
     * createWebviewPanel
     * webviewパネルを作成して表示する
     * @param viewType パネルの識別子
     * @param title パネルのタイトル
     * @param showOptions パネルの表示位置
     * @param options パネルのオプション
     */
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
    /**
     * https://code.visualstudio.com/api/references/vscode-api#Webview
     * webview.html
     * パネルのwebview
     * ここにHTMLを入れることで表示することができる
     */
    this._setWebviewContent(this._panel.webview, extensionUri);

    /**
     * https://code.visualstudio.com/api/references/vscode-api#WebviewPanel
     * onDidDispose
     * ユーザーがパネルが閉じたときに呼ばれる
     * @param callback パネルが閉じたときに呼ばれる関数
     */
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    /**
     * https://code.visualstudio.com/api/references/vscode-api#Webview
     * onDidReceiveMessage
     * @param callback messageを受け取ったときに呼ばれる関数
     */
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
        vscode.window.showInformationMessage("joystickStart", message.data);
        if (editor) {
          this.showRadialMenu(
            editor,
            message.data.position.x,
            message.data.position.y,
          );
        }
        break;
      case "update":
        vscode.window.showInformationMessage("joystickUpdate", message.data);
        if (editor) {
          this.updateRadialMenu(
            editor,
            message.data.position.x,
            message.data.position.y,
          );
        }
        break;
      case "end":
        vscode.window.showInformationMessage("joystickEnd", message.data);
        if (editor) {
          this.hideRadialMenu(editor);
        }
        break;
    }
  }

  private showRadialMenu(editor: vscode.TextEditor, x: number, y: number) {
    const rgbaGreen = "rgba(115, 209, 68, 0.3)";
    const rgbaBlank = "rgba(255, 255, 255, 0.1)";

    const angle = Math.atan2(y, x) * (180 / Math.PI);

    // 45度区切り
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
      selectedMenu === 0 ? rgbaGreen : rgbaBlank,
      selectedMenu === 1 ? rgbaGreen : rgbaBlank,
      selectedMenu === 2 ? rgbaGreen : rgbaBlank,
      selectedMenu === 3 ? rgbaGreen : rgbaBlank,
      selectedMenu === 4 ? rgbaGreen : rgbaBlank,
      selectedMenu === 5 ? rgbaGreen : rgbaBlank,
      selectedMenu === 6 ? rgbaGreen : rgbaBlank,
      selectedMenu === 7 ? rgbaGreen : rgbaBlank,
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

    this.radialMenuDecoration = vscode.window.createTextEditorDecorationType({
      before: {
        contentText: "",
        textDecoration: `none; ${cssString}`,
      },
      isWholeLine: false,
    });

    const position = new vscode.Position(0, 0);
    editor.setDecorations(this.radialMenuDecoration, [
      { range: new vscode.Range(position, position) },
    ]);
  }

  private updateRadialMenu(editor: vscode.TextEditor, x: number, y: number) {
    this.hideRadialMenu(editor);
    this.showRadialMenu(editor, x, y);
  }

  private hideRadialMenu(editor: vscode.TextEditor) {
    if (this.radialMenuDecoration === null) {
      return;
    }
    editor.setDecorations(this.radialMenuDecoration, []);
    this.radialMenuDecoration = null;
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
