// Joystickの位置データ型
export interface Position {
  x: number;
  y: number;
}

// Joystickの状態データ型
export interface JoystickData {
  mode: "menu";
  status: "start" | "update" | "end";
  position: Position;
}

// Webviewに送信するメッセージ型
export interface WebviewMessage {
  command: "joystick";
  data: JoystickData;
}

// ショートカットオプションの型
export interface ShortcutsOption {
  command: string;
  icon: string;
  label: string;
}
