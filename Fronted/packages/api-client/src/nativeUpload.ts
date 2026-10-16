export type NativeUploader = (input: {
    url: string;
    headers: Record<string, string>;
    fileUri: string;
}) => Promise<{ status: number; body: string }>;

export type NativeFileSize = (uri: string) => Promise<number>;

let nativeUploader: NativeUploader | null = null;
let nativeFileSize: NativeFileSize | null = null;

export function registerNativeUploader(
    upload: NativeUploader,
    fileSize?: NativeFileSize,
): void {
    nativeUploader = upload;
    nativeFileSize = fileSize || null;
}

export function getNativeUploader(): NativeUploader | null {
    return nativeUploader;
}

export function getNativeFileSize(): NativeFileSize | null {
    return nativeFileSize;
}
