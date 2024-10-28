import { Webview, Uri, workspace } from "vscode";

/**
 * webviewにjoystick.htmlを表示する
 * @param webview vscode.Webview
 * @param extensionUri vscode.Uri
 * @returns void
 */
export async function setWebviewJoystick(webview: Webview, extensionUri: Uri) {
  const htmlUri = Uri.joinPath(
    extensionUri,
    "src",
    "webview",
    "joystick",
    "index.html",
  );
  const scriptUri = webview.asWebviewUri(
    Uri.joinPath(extensionUri, "out", "webview", "joystick", "main.js"),
  );
  const styleUri = webview.asWebviewUri(
    Uri.joinPath(extensionUri, "src", "webview", "joystick", "style.css"),
  );

  const data = await workspace.fs.readFile(htmlUri);
  const htmlContent = new TextDecoder("utf-8").decode(data);

  const replacedHtmlContent = htmlContent
    .replace("{{scriptUri}}", scriptUri.toString())
    .replace("{{styleUri}}", styleUri.toString());

  webview.html = replacedHtmlContent;
}
