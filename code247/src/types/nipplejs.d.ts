import * as NippleJS from "./nipplejs";

declare global {
  const nipplejs: typeof NippleJS & {
    create: (options: any) => any;
  };
}

export {};
