import { Code247Panel } from "../panel/core";
import { Position, Range, TextEditor, window, workspace, env } from "vscode";
import { WebviewMessage } from "../types/types";

export function joystickMenu(
  code247Panel: Code247Panel,
  message: WebviewMessage,
  editor: TextEditor | undefined,
) {
  switch (message.data.status) {
    case "start":
      if (Code247Panel.joystickLastStartedAt) {
        const now = new Date();
        const diff =
          now.getTime() - Code247Panel.joystickLastStartedAt.getTime();
        let joystickDoubleTapInterval = workspace
          .getConfiguration("code247")
          .get<number>("joystickDoubleTapInterval", 1000);
        if (diff < joystickDoubleTapInterval) {
          Code247Panel.isDoubleTap = true;
        } else {
          Code247Panel.isDoubleTap = false;
        }
      }
      if (editor) {
        showRadialMenu(
          code247Panel,
          editor,
          message.data.position.x,
          message.data.position.y,
        );
      }
      Code247Panel.joystickLastStartedAt = new Date();
      break;
    case "update":
      if (editor) {
        updateRadialMenu(
          code247Panel,
          editor,
          message.data.position.x,
          message.data.position.y,
        );
      }
      break;
    case "end":
      handleShortcutSelection(code247Panel, editor, message.data.position);
      break;
  }
}

/**
 * 360度の円周をdivisionsで分割したときに、angleがどのメニューを選択しているかを返す
 * @param angle 角度
 * @param divisions 分割数
 */
function getSelectedMenu(angle: number, divisions: number): number {
  const sliceAngle = 360 / divisions;
  // 0度が右方向なので、90度を加算している
  const normalizedAngle = (angle + 360 + 90) % 360;
  return Math.floor(normalizedAngle / sliceAngle);
}

/**
 * 16進数のカラーコードをRGBAに変換する
 * @param hex 16進数のカラーコード
 * @param alpha 透明度
 * @returns RGBAのカラーコード
 */
function hexToRgba(hex: string, alpha: number = 1): string {
  hex = hex.replace(/^#/, "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 選択されたメニューに選択色を適用したconic-gradientに記載するCSS文字列を生成する
 * @param selectedMenu 選択されたメニュー
 * @param divisions 分割数
 * @param focusColor 選択色
 * @param backgroundColor 背景色
 */
function generateQuadrantGradient(
  selectedMenu: number,
  divisions: number,
  focusColor: string,
  backgroundColor: string,
) {
  const quadrantColors = Array.from({ length: divisions }, (_, i) =>
    i === selectedMenu ? focusColor : backgroundColor,
  );

  const cssConicGradient = Array.from({ length: divisions }, (_, i) => {
    const startAngle = (i * 360) / divisions;
    const endAngle = ((i + 1) * 360) / divisions;
    return `${quadrantColors[i]} ${startAngle}deg ${endAngle}deg`;
  });

  return cssConicGradient.join(",");
}

function showRadialMenu(
  code247Panel: Code247Panel,
  editor: TextEditor,
  x: number,
  y: number,
) {
  const config = workspace.getConfiguration("code247");
  // primary
  const primaryColorHex = config.get<string>(
    "radialMenuPrimaryColor",
    "#73D144",
  );
  const primaryColor = hexToRgba(primaryColorHex, 0.3);
  // secondary
  const secondaryColorHex = config.get<string>(
    "radialMenuSecondaryColor",
    "#FFD348",
  );
  const secondaryColor = hexToRgba(secondaryColorHex, 0.3);
  // background
  const backgroundColorHex = config.get<string>(
    "radialMenuBackgroundColor",
    "#FFFFFF",
  );
  const backgroundColor = hexToRgba(backgroundColorHex, 0.1);

  const focusColor = Code247Panel.isDoubleTap ? secondaryColor : primaryColor;
  const divisions = 8;

  const angle = Math.atan2(y, x) * (180 / Math.PI);

  let selectedMenu = getSelectedMenu(angle, divisions);

  const cssString = `
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: conic-gradient(
    ${generateQuadrantGradient(
      selectedMenu,
      divisions,
      focusColor,
      backgroundColor,
    )}
  );
  `;

  code247Panel.radialMenuDecoration.push(
    window.createTextEditorDecorationType({
      before: {
        contentText: "",
        textDecoration: `none; ${cssString}`,
      },
      isWholeLine: false,
    }),
  );

  const position = new Position(0, 0);
  editor.setDecorations(
    code247Panel.radialMenuDecoration[
      code247Panel.radialMenuDecoration.length - 1
    ],
    [{ range: new Range(position, position) }],
  );
}

function updateRadialMenu(
  code247Panel: Code247Panel,
  editor: TextEditor,
  x: number,
  y: number,
) {
  showRadialMenu(code247Panel, editor, x, y);
  hideRadialMenu(code247Panel);
}

function hideRadialMenu(code247Panel: Code247Panel) {
  if (code247Panel.radialMenuDecoration.length === 0) {
    return;
  }
  const decorator = code247Panel.radialMenuDecoration.shift();
  decorator?.dispose();
}

function handleShortcutSelection(
  code247Panel: Code247Panel,
  editor: TextEditor | undefined,
  position: { x: number; y: number },
) {
  const angle = Math.atan2(position.y, position.x) * (180 / Math.PI);
  const selectedMenu = getSelectedMenu(angle, 8);

  const selectedShortcut = code247Panel.shortcuts[selectedMenu];
  if (selectedShortcut) {
    executeCommand(selectedShortcut.command, editor);
  }

  hideRadialMenu(code247Panel);
}

function executeCommand(command: string, editor: TextEditor | undefined) {
  switch (command) {
    case "code247.runTests":
      window.showInformationMessage("テストを実行します");
      break;
    case "code247.openDebugger":
      window.showInformationMessage("デバッガを開きます");
      break;
    case "code247.openTerminal":
      window.showInformationMessage("ターミナルを開きます");
      break;
    case "code247.copy":
      if (editor) {
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        env.clipboard.writeText(text);
        window.showInformationMessage("コピーしました");
      }

      break;
    case "code247.paste":
      if (editor) {
        env.clipboard.readText().then((text) => {
          editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, text);
          });
          window.showInformationMessage("ペーストしました");
        });
      }
      break;
  }
}
