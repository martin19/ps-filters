import {
    filterEachChannelPremultiplied,
    getPixelBilinearRepeat,
    joinRGBA,
    setPixel,
    splitRGBA
} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorDistortPolar:FilterDescriptor = {
    id : "distortPolar",
    name : "Polar Coordinates",
    filter1 : filterDistortPolar1,
    filter4 : filterEachChannelPremultiplied(filterDistortPolar1),
    parameters : {
        mode: {name: "mode", type: "enum", values: ["toPolar", "toRect"], default: "toPolar"},
    }
}

export interface FilterDistortPolarOptions {
    mode : "toPolar"|"toRect";
}

async function filterDistortPolar1(input:FilterInput, output:FilterOutput, options:FilterDistortPolarOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    const cx = w/2;
    const cy = h/2;
    const fn = options.mode === "toPolar" ? fnRectangularToPolar : fnPolarToRectangular;

    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            let p = fn(x, y, w, h, cx, cy);
            const val = getPixelBilinearRepeat(i8, w, h, p[0], p[1], 1);
            setPixel(o8, w, h, x, y, val);
        }
    }
}

function fnRectangularToPolar(x:number, y:number, w:number, h:number, cx:number, cy:number) {
    const xIn = (x-cx)*(h/w)+cx;
    const yIn = y;
    let [r, phi] = toPolar(xIn, yIn, w, h, cx, cy);
    let xout = w - (phi / (2*Math.PI))*w;
    let yout = 2*r;
    return [xout, yout];
}

function fnPolarToRectangular(x:number, y:number, w:number, h:number, cx:number, cy:number) {
    let phi = ((x - w)*Math.PI*2)/w;
    let r = 0.5*y;
    let [xout, yout] = toCartesian(r, phi-Math.PI/2, w, h, cx, cy)
    return [cx-(xout-cx), yout];
}

function toPolar(x:number, y:number, w:number, h:number, cx:number, cy:number) {
    let phi = Math.atan2((y-cy),(x-cx)) + Math.PI/2;
    if(phi < 0) phi += 2*Math.PI;
    const r = Math.sqrt((x-cx)*(x-cx) + (y-cy)*(y-cy));
    return [r, phi];
}

function toCartesian(r:number, phi:number, w:number, h:number, cx:number, cy:number) {
    const x = r * Math.cos(phi) + cx;
    const y = r * Math.sin(phi) + cy;
    return [x,y];
}