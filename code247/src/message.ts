import { window } from "vscode";
import { joystick } from "./joystick/joystick";
import { Code247Panel } from "./panel/core";
import { WebviewMessage } from "./types/types";

export function message(code247Panel: Code247Panel, data: WebviewMessage) {
  const editor = window.activeTextEditor;
  switch (data.command) {
    case "joystick":
      joystick(code247Panel, data, editor);
      break;
  }
}
