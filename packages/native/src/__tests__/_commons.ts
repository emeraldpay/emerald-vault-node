const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');


var seq = 0;

export function tempPath(prefix: string) {
    const ts = new Date().getTime() - 1576037200000;
    seq++;
    return `./testdata/tmp-${prefix}-${ts}-${seq}`;
}

export function copy(base: string) {
    const ts = new Date().getTime() - 1576037200000;
    seq++;
    const copy = `./testdata/tmp-${base}-${ts}-${seq}`;
    fse.copySync(`./testdata/${base}`, copy);
    return copy;
}