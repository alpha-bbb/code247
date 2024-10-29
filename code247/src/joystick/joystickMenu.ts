import { Code247Panel } from "../panel/core";
import { Position, Range, TextEditor, window, workspace } from "vscode";
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
      hideRadialMenu(code247Panel);
      break;
  }
}

function showRadialMenu(
  code247Panel: Code247Panel,
  editor: TextEditor,
  x: number,
  y: number,
) {
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
