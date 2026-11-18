// fontkit ships no types. Only what the certificate uses to measure text.
declare module "fontkit" {
  interface Font {
    unitsPerEm: number;
    layout(text: string): { advanceWidth: number };
  }
  export function openSync(path: string): Font;
}
