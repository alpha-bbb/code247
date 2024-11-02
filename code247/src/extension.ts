import { commands, ExtensionContext } from "vscode";
import { Code247Panel } from "./panel/core";

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand("code247.start", () => {
      Code247Panel.createOrShow(context.extensionUri);
    }),
  );
}

class Code247Panel {
  public static currentPanel: Code247Panel | undefined;

  public static readonly viewType = "windowMode";
  public static readonly title = "code247";
  public static joystickLastStartedAt: Date | null = null;
  public static joystickLastCursorMove: Date | null = null;
  public static isDoubleTap: boolean = false;
  public static cursorMoveSetinterval: NodeJS.Timeout | null = null;
  public static cursorPosition = new vscode.Position(0, 0);

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private radialMenuDecoration: vscode.TextEditorDecorationType[] = [];

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
          this.startSelection(
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
        this.endSelection();
        break;
    }
  }

  private showRadialMenu(editor: vscode.TextEditor, x: number, y: number) {
    const rgbaGreen = "rgba(115, 209, 68, 0.3)";
    const rgbaOrange = "rgba(255, 211, 72, 0.3)";
    const rgbaFront = Code247Panel.isDoubleTap ? rgbaOrange : rgbaGreen;
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

  private startSelection(editor: vscode.TextEditor, x: number, y: number) {
    const joystickCenterRange = vscode.workspace
      .getConfiguration("code247")
      .get<number>("joystickCenterRange", 10);
    if (
      Math.abs(x) < joystickCenterRange &&
      Math.abs(y) < joystickCenterRange
    ) {
      return;
    }
    if (Code247Panel.cursorMoveSetinterval) {
      clearInterval(Code247Panel.cursorMoveSetinterval);
    }

    const joystickCursorSpeed = vscode.workspace
      .getConfiguration("code247")
      .get<number>("joystickCursorSpeed", 50);

    const moveCursor = () => {
      const now = new Date();
      if (
        Code247Panel.joystickLastCursorMove &&
        now.getTime() - Code247Panel.joystickLastCursorMove.getTime() <
          1000 / joystickCursorSpeed
      ) {
        return;
      }
      const cursorPosition = editor?.selection.active;
      if (!cursorPosition) {
        return;
      }

      if (!Code247Panel.isDoubleTap) {
        Code247Panel.cursorPosition = cursorPosition;
      }

      const newY = cursorPosition.line + Math.sign(y);
      const newLine =
        newY < 0
          ? 0
          : newY >= editor.document.lineCount
            ? editor.document.lineCount - 1
            : newY;
      const lineText = editor.document.lineAt(newLine).text;
      const maxCharacter = lineText.length;
      const newX = cursorPosition.character + Math.sign(x);
      const newCharacter =
        newX < 0 ? 0 : newX > maxCharacter ? maxCharacter : newX;
      var newPosition = cursorPosition.with(newLine, newCharacter);
      var newSelection = new vscode.Selection(
        Code247Panel.isDoubleTap ? Code247Panel.cursorPosition : newPosition,
        newPosition,
      );
      editor.selection = newSelection;

      Code247Panel.joystickLastCursorMove = new Date();
    };
    moveCursor();
    Code247Panel.cursorMoveSetinterval = setInterval(
      moveCursor,
      1000 / joystickCursorSpeed,
    );
  }

  private endSelection() {
    if (Code247Panel.cursorMoveSetinterval) {
      clearInterval(Code247Panel.cursorMoveSetinterval);
    }
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
