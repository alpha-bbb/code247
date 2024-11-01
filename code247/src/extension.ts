import { commands, ExtensionContext } from "vscode";
import { Code247Panel } from "./panel/core";

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand("code247.start", () => {
      Code247Panel.createOrShow(context.extensionUri);
    }),
  );
}
