import { Position } from "../../types/types";

document.addEventListener("DOMContentLoaded", () => {
  const vscode = acquireVsCodeApi();
  const joystickContainer = document.getElementById("joystick-container");
  if (!joystickContainer) {
    return;
  }
  let manager;
  let startPosition: Position = { x: 0, y: 0 };
  let movePosition: Position = { x: 0, y: 0 };

  manager = nipplejs.create({
    zone: joystickContainer,
    mode: "dynamic",
    color: "blue",
    catchDistance: 150,
  });

  manager.on("start", (evt: any, data: any) => {
    startPosition = { x: data.position.x, y: data.position.y };
    // const message: WebviewMessage = {
    //   command: "joystick",
    //   data: {
    //     mode: "menu",
    //     status: "start",
    //     position: startPosition,
    //   },
    // };
    // vscode.postMessage(message);
    vscode.postMessage({
      command: "joystick",
      data: { mode: "menu", status: "start", position: startPosition },
    });
  });

  manager.on("move", (evt: any, data: any) => {
    const relativeX = data.position.x - startPosition.x;
    const relativeY = data.position.y - startPosition.y;
    movePosition = { x: relativeX, y: relativeY };
    // const message: WebviewMessage = {
    //   command: "joystick",
    //   data: {
    //     mode: "menu",
    //     status: "update",
    //     position: movePosition,
    //   },
    // };
    // vscode.postMessage(message);
    vscode.postMessage({
      command: "joystick",
      data: { mode: "menu", status: "update", position: movePosition },
    });
  });

  manager.on("end", (evt: any, data: any) => {
    // const message: WebviewMessage = {
    //   command: "joystick",
    //   data: {
    //     mode: "menu",
    //     status: "end",
    //     position: movePosition,
    //   },
    // };
    // vscode.postMessage(message);
    vscode.postMessage({
      command: "joystick",
      data: { mode: "menu", status: "end", position: movePosition },
    });
  });
});
