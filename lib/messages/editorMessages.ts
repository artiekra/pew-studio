export type EditorToNative = {
  type: "change";
  content: string;
};

export type NativeToEditor =
  | { type: "set_content"; content: string }
  | { type: "set_theme"; theme: string }
  | { type: "set_language"; language: string };
