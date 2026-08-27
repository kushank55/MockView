/**
 * Extract plain text from a PDF buffer.
 *
 * pdf2json hangs on some real-world resumes (Type3 fonts, form Link fields) —
 * it throws `this.toUnicode.indexOf is not a function` as an unhandled
 * rejection and never fires dataReady / dataError, so the request never
 * returns. unpdf (pdf.js) is used instead, with a hard timeout so the UI
 * can never sit on "Parsing..." forever.
 */

const PARSE_TIMEOUT_MS = 20_000;

export async function extractPdfText(buffer: Buffer): Promise<string> {
    const { extractText, getDocumentProxy } = await import('unpdf');

    const parse = (async () => {
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        const { text } = await extractText(pdf, { mergePages: true });
        const joined = Array.isArray(text) ? text.join('\n') : String(text ?? '');
        return joined.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').trim();
    })();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
            () => reject(new Error('PDF parsing timed out. Try a text-based PDF.')),
            PARSE_TIMEOUT_MS
        );
    });

    try {
        return await Promise.race([parse, timeout]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}
