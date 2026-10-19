declare module "mammoth" {
  export interface ConvertToHtmlOptions {
    arrayBuffer?: ArrayBuffer;
    buffer?: Buffer;
    path?: string;
    styleMap?: string | string[];
    includeDefaultStyleMap?: boolean;
    includeEmbeddedStyleMap?: boolean;
  }

  export interface ConvertResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer } | { buffer: Buffer } | { path: string },
    options?: ConvertToHtmlOptions
  ): Promise<ConvertResult>;

  export function extractRawText(
    input: { arrayBuffer: ArrayBuffer } | { buffer: Buffer } | { path: string }
  ): Promise<ConvertResult>;
}
