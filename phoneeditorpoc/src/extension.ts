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
    vscode.commands.registerCommand("phoneeditorpoc.start", () => {
      /**
       * https://code.visualstudio.com/api/references/vscode-api#ExtensionContext
       * extensionUri
       * 拡張機能のあるディレクトリのURI
       * このURIを使って、拡張機能の画像とかのPATHを指定する
       */
      PhoneEditorPoCPanel.createOrShow(context.extensionUri);
    }),
  );
}

class PhoneEditorPoCPanel {
  public static currentPanel: PhoneEditorPoCPanel | undefined;

  public static readonly viewType = "windowMode";
  public static readonly title = "phoneeditorpoc";

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

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

    if (PhoneEditorPoCPanel.currentPanel) {
      /**
       * https://code.visualstudio.com/api/references/vscode-api#WebviewPanel
       * reveal
       * パネルを指定した位置に表示する
       * @param viewColumn パネルの表示位置
       */
      PhoneEditorPoCPanel.currentPanel._panel.reveal(column);
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
      PhoneEditorPoCPanel.viewType,
      PhoneEditorPoCPanel.title,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
      },
    );

    PhoneEditorPoCPanel.currentPanel = new PhoneEditorPoCPanel(
      panel,
      extensionUri,
    );
  }

  public constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    /**
     * https://code.visualstudio.com/api/references/vscode-api#Webview
     * webview.html
     * パネルのwebview
     * ここにHTMLを入れることで表示することができる
     */
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

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
     * @param callback パネルが閉じたときに呼ばれる関数
     */
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.message) {
          case "windowSplit":
            /**
             * 新規ファイルを生成して表示する
             */
            vscode.workspace
              .openTextDocument({ content: "", language: "plaintext" })
              .then((document) => {
                vscode.window.showTextDocument(
                  document,
                  vscode.ViewColumn.Beside,
                );
              });
            /**
             * informationMessageを表示する
             */
            vscode.window.showInformationMessage("windowSplit");
            break;
        }
      },
      null,
      this._disposables,
    );
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AAAAAAAAA</title>
  <script>
    const vscode = acquireVsCodeApi();
  </script>
</head>
<body>
  <h1 id="lines-of-code-counter">Hello World</h1>
  <button onclick="vscode.postMessage({ message: 'windowSplit'})">Window Split</button>
</body>
</html>
      `;
  }

  public dispose() {
    PhoneEditorPoCPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
