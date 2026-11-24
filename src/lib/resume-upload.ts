export const MAX_RESUME_UPLOAD_BYTES = 4 * 1024 * 1024;
export const RESUME_UPLOAD_LIMIT_MESSAGE = 'Use a PDF that is 4 MB or smaller.';

export function isResumePdf(file: Pick<File, 'name' | 'type'>): boolean {
    return file.type === 'application/pdf' ||
        ((!file.type || file.type === 'application/octet-stream') && /\.pdf$/i.test(file.name));
}
