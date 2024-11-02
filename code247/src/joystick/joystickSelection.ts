import { TextEditor, workspace, Selection } from "vscode";
import { Code247Panel } from "../panel/core";

export function startSelection(
  code247panel: Code247Panel,
  editor: TextEditor,
  x: number,
  y: number,
) {
  const joystickCenterRange = workspace
    .getConfiguration("code247")
    .get<number>("joystickCenterRange", 10);
  if (Math.abs(x) < joystickCenterRange && Math.abs(y) < joystickCenterRange) {
    return;
  }
  if (Code247Panel.cursorMoveSetinterval) {
    clearInterval(Code247Panel.cursorMoveSetinterval);
  }

  const joystickCursorSpeed = workspace
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
    var newSelection = new Selection(
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

export function endSelection() {
  if (Code247Panel.cursorMoveSetinterval) {
    clearInterval(Code247Panel.cursorMoveSetinterval);
  }
}
