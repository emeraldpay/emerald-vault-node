var seq = 0;

export function tempPath(prefix: string) {
    const ts = new Date().getTime() - 1576037200000;
    seq++;
    return `./testdata/tmp-${prefix}-${ts}-${seq}`;
}