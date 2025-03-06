import { encode } from "html-entities";

export function encodeEntities(text: string): string {
    return encode(text, { mode: 'nonAsciiPrintable', level: 'xml' });
}