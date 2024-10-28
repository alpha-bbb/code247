import { TextEditor } from "vscode";
import { joystickMenu } from "../joystick/joystickMenu";
import { Code247Panel } from "../panel/core";
import { WebviewMessage } from "../types/types";

export function joystick(
  code247Panel: Code247Panel,
  message: WebviewMessage,
  editor: TextEditor | undefined,
) {
  switch (message.data.mode) {
    case "menu":
      joystickMenu(code247Panel, message, editor);
      break;
  }
}
