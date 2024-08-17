import {filterEachChannelPremultiplied, getPixel} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {bilateralSeparable} from "../bilateral/bilateral";

export const filterDescriptorBlurSmart:FilterDescriptor = {
    id : "blurSmart",
    name : "Smart Blur",
    filter1 : filterBlurSmart1,
    filter4 : filterEachChannelPremultiplied(filterBlurSmart1),
    parameters : {
        radius: { name: "radius", type: "int", min: 1, max: 100, default: 10},
        threshold: { name: "threshold", type: "int", min: 1, max: 255, default: 100},
        mode: { name: "mode", type: "enum", values: ["normal", "edge", "edgeOverlay"], default: "normal"}
    }
}

export interface FilterBlurSmartOptions {
    radius : number;
    threshold : number;
    mode : "normal"|"edge"|"edgeOverlay",
    testIterations : number;
    testEdgeThreshold : number;
}

async function filterBlurSmart1(input:FilterInput, output:FilterOutput, options:FilterBlurSmartOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    bilateralSeparable(i8, o8, w, h, {
        radius : options.radius,
        threshold : options.threshold,
        iterations : 1,
        edgeThreshold : 50,
        mode : options.mode
    });
}

function median(values:number[]){
    if(values.length ===0) throw new Error("No inputs");

    values.sort(function(a,b){
        return a-b;
    });

    var half = Math.floor(values.length / 2);

    if (values.length % 2)
        return values[half];

    return (values[half - 1] + values[half]) / 2.0;
}

function meanf(values:number[]) {
    let m = 0;
    let count = 0;
    for(let i = 0; i < values.length; i++) {
        m += values[i];
    }
    m /= values.length;
    return m;
}



function computeBlur(w:number, h:number, img:U8Array, I:U8Array, RMSE:U8Array, blurRadius:number, thi:number) {
    const B = new Uint8Array(w*h);
    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            const rmse = getPixel(RMSE, w, h, x, y);

            let val;
            if(rmse < thi) {
                let r = Math.ceil((((thi - rmse)/thi)) * blurRadius);
                let x0 = Math.max(x - r, 0);
                let x1 = Math.min(x + r, w-1);
                let y0 = Math.max(y - r, 0);
                let y1 = Math.min(y + r, h-1);

                let A = getPixel(I, w, h, x0, y0);
                let B = getPixel(I, w, h, x1, y0);
                let C = getPixel(I, w, h, x0, y1);
                let D = getPixel(I, w, h, x1, y1);

                val = Math.floor((D+A-(B+C))/((x1-x0)*(y1-y0)));
            } else {
                val = getPixel(img, w, h, x, y);
            }

            B[y*w+x] = val;
        }
    }
    return B;
}

function computeRMSE(w:number, h:number, img:U8Array, I:U8Array, radius:number) {
    const RMSE = new Uint8Array(w*h);
    const r = radius;

    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            let x0 = Math.max(x - r, 0);
            let x1 = Math.min(x + r, w-1);
            let y0 = Math.max(y - r, 0);
            let y1 = Math.min(y + r, h-1);

            let A = getPixel(I, w, h, x0, y0);
            let B = getPixel(I, w, h, x1, y0);
            let C = getPixel(I, w, h, x0, y1);
            let D = getPixel(I, w, h, x1, y1);

            const mean = Math.floor((D+A-(B+C))/((x1-x0)*(y1-y0)));
            const val = getPixel(img, w, h, x, y);
            const rmse = Math.floor(Math.sqrt((mean - val)*(mean - val)));
            RMSE[y*w+x] = rmse;
        }
    }
    return RMSE;
}

function computeSat(w:number, h:number, img:U8Array) {
    const I = new Uint32Array(w*h);
    //compute integral image
    for(let y = 0; y < h; y++) {
        let yOfsPrev = y > 0 ? (y-1)*w : undefined;
        let yOfs = (y*w);
        let rowSum = 0;
        for(let x = 0; x < w; x++) {
            rowSum += img[yOfs+x];
            let val = rowSum;
            if(y > 0) val += yOfsPrev !== undefined ? I[yOfsPrev+x] : 0;
            I[yOfs+x] = val;
        }
    }
    return I;
}
