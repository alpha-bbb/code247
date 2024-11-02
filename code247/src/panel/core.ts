import {
  WebviewPanel,
  Disposable,
  TextEditorDecorationType,
  Uri,
  window,
  ViewColumn,
  Position,
} from "vscode";
import { setWebviewJoystick } from "../webview";
import { message } from "../message";
import { WebviewMessage } from "../types/types";

export class Code247Panel {
  public static currentPanel: Code247Panel | undefined;

  public static readonly viewType = "windowMode";
  public static readonly title = "code247";
  public static joystickLastStartedAt: Date | null = null;
  public static isDoubleTap: boolean = false;
  public static joystickLastCursorMove: Date | null = null;
  public static cursorMoveSetinterval: NodeJS.Timeout | null = null;
  public static cursorPosition = new Position(0, 0);

  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];
  public radialMenuDecoration: TextEditorDecorationType[] = [];

  /**
   * 1度も開いたことがない場合は新しく作成し、開いている場合は表示する
   */
  public static createOrShow(extensionUri: Uri) {
    const column = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : undefined;

    if (Code247Panel.currentPanel) {
      Code247Panel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = window.createWebviewPanel(
      Code247Panel.viewType,
      Code247Panel.title,
      column || ViewColumn.One,
      {
        enableScripts: true,
      },
    );

    Code247Panel.currentPanel = new Code247Panel(panel, extensionUri);
  }

  public constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;
    setWebviewJoystick(this._panel.webview, extensionUri);
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (data: WebviewMessage) => {
        message(this, data);
      },
      null,
      this._disposables,
    );
  }

  /**
   * パネルを破棄する
   */
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
