import {
    computeSobel,
    getPixelRepeat,
    joinRGBA,
    lerp,
    premultiplyAlphaPacked,
    setPixel,
    splitRGBA,
    unmultiplyAlphaPacked
} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorNoiseDespeckle:FilterDescriptor = {
    id : "noiseDespeckle",
    name : "Despeckle",
    filter1 : filterNoiseDespeckle1,
    filter4 : filterNoiseDespeckle4
}


async function filterNoiseDespeckle1(input:FilterInput, output:FilterOutput) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    let mag = computeSobel(i8, w, h).M;
    //normalize magnitude
    let magMin = Number.MAX_VALUE;
    let magMax = Number.MIN_VALUE;
    for(let i = 0; i < w*h; i++) {
        magMin = Math.min(magMin, mag[i]);
        magMax = Math.max(magMax, mag[i]);
    }

    const g1 = new Float32Array(w*h);
    const g2 = new Float32Array(w*h);
    for(let y = 0; y < h; y++) filter1x(i8, g1, w, h, y, [0.25, 0.5, 0.25]);
    for(let x = 0; x < w; x++) filter1y(g1, g2, w, h, x, [0.25, 0.5, 0.25]);
    for(let j = 0; j < w*h; j++) {
        const magNorm = mag[j]/magMax;
        const g = g2[j];
        const o = i8[j];
        const v = lerp(o, g, magNorm);
        o8[j] = Math.min(255, Math.max(0, Math.round(v)));
    }
}


async function filterNoiseDespeckle4(input:FilterInput, output:FilterOutput) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    premultiplyAlphaPacked(i8.buffer);
    let {a:aIn, b:bIn, g:gIn, r:rIn} = splitRGBA(i8);
    let rOut = new Uint8Array(w*h);
    let gOut = new Uint8Array(w*h);
    let bOut = new Uint8Array(w*h);
    let aOut = new Uint8Array(w*h);
    const cIn = [rIn, gIn, bIn, aIn];
    const cOut = [rOut, gOut, bOut, aOut];

    const gray = new Uint8Array(w*h);
    //compute grayscale image
    for(let i = 0; i < w*h; i++) {
        gray[i] = Math.min(255, Math.max(0, Math.round((cIn[0][i] + cIn[1][i] + cIn[2][i])/3)));
    }
    let mag = computeSobel(gray, w, h).M;
    //normalize magnitude
    let magMin = Number.MAX_VALUE;
    let magMax = Number.MIN_VALUE;
    for(let i = 0; i < w*h; i++) {
        magMin = Math.min(magMin, mag[i]);
        magMax = Math.max(magMax, mag[i]);
    }

    const g1 = new Float32Array(w*h);
    const g2 = new Float32Array(w*h);
    for(let i = 0; i < 3; i++) {
        for(let y = 0; y < h; y++) filter1x(cIn[i], g1, w, h, y, [0.25, 0.5, 0.25]);
        for(let x = 0; x < w; x++) filter1y(g1, g2, w, h, x, [0.25, 0.5, 0.25]);
        for(let j = 0; j < w*h; j++) {
            const magNorm = mag[j]/magMax;
            const g = g2[j];
            const o = cIn[i][j];
            const v = lerp(o, g, magNorm);
            cOut[i][j] = Math.min(255, Math.max(0, Math.round(v)));
        }
    }

    cOut[3].set(cIn[3]);
    joinRGBA(o8, rOut, gOut, bOut, aOut);
    unmultiplyAlphaPacked(o8.buffer);
}

function filter1x(input:U8Array|Float32Array, output:U8Array|Float32Array, w:number, h:number, y:number, mask:number[]) {
    if(mask.length % 2 !== 1) throw new Error("mask size must be odd");
    const s = mask.length;
    const s2 = Math.floor(s/2);
    //main part
    for(let i = 0; i < w; i++) {
        let val = 0;
        let i_m = 0;
        for(let j = i - s2; j <= i+s2; j++) {
            val += getPixelRepeat(input, w, h, j, y, 1) * mask[i_m++];
        }
        setPixel(output, w, h, i, y, val);
    }
}

function filter1y(input:U8Array|Float32Array, output:U8Array|Float32Array, w:number, h:number, x:number, mask:number[]) {
    if(mask.length % 2 !== 1) throw new Error("mask size must be odd");
    const s = mask.length;
    const s2 = Math.floor(s/2);
    //main part
    for(let i = 0; i < h; i++) {
        let val = 0;
        let i_m = 0;
        for(let j = i - s2; j <= i+s2; j++) {
            val += getPixelRepeat(input, w, h, x, j, 1) * mask[i_m++];
        }
        setPixel(output, w, h, x, i, val);
    }
}