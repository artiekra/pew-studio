export type GameToNative =
  | { type: "error"; message: string }
  | { type: "console_log"; level: string; message: string }
  | { type: "fetch"; requestId: string; url: string; options?: any };

export type NativeToGame =
  | {
      type: "fetch_response";
      requestId: string;
      body: string;
      isBase64: boolean;
      status: number;
      headers: Record<string, string>;
    };
