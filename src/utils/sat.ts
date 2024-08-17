import {U8Array} from "./Types";

export function sat(input:U8Array, w:number, h:number) {
    const sat = new Uint32Array(w*h);
    sat[0] = input[0];
    for(let x = 1; x < w; x++) sat[x] = sat[x-1] + input[x];
    for(let y = 1; y < h; y+=w) sat[y] = sat[y-w] + input[y];
    for(let y = 1; y < h; y++) {
        let offset = y*w;
        let rowSum = input[offset++];
        for(let x = 1; x < w; x++) {
            sat[offset] = sat[offset-w] + rowSum;
            rowSum += input[++offset];
        }
    }
    return sat;
}
