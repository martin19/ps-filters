import {
    filterEachChannelPremultiplied,
    getPixelBilinearRepeat,
    getPixelBilinearWrap,
    joinRGBA,
    setPixel,
    splitRGBA
} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorDistortWave:FilterDescriptor = {
    id : "distortWave",
    name : "Wave",
    filter1 : filterDistortWave1,
    filter4 : filterEachChannelPremultiplied(filterDistortWave1),
    parameters : {
        waveType: {name: "waveType", type: "enum", values: ["sine", "triangle", "square"], default: "sine"},
        generatorCount: {name: "generatorCount", type: "int", min: 1, max: 999, default: 5},
        waveLengthMin: {name: "waveLengthMin", type: "int", min: 1, max: 999, default: 10},
        waveLengthMax: {name: "waveLengthMax", type: "int", min: 1, max: 999, default: 120},
        amplitudeMin: {name: "amplitudeMin", type: "int", min: 1, max: 999, default: 5},
        amplitudeMax: {name: "amplitudeMax", type: "int", min: 1, max: 999, default: 35},
        scaleHoriz: {name: "scaleHoriz", type: "int", min: 1, max: 100, default: 100},
        scaleVert: {name: "scaleVert", type: "int", min: 1, max: 100, default: 100},
        mode: {name: "mode", type: "enum", values: ["repeat", "wrapAround"], default: "repeat"},
        randomSeed: {name: "randomSeed", type: "int", min: 1, max: 65536, default: 1}
    }
}

export interface FilterDistortWaveOptions {
    waveType: "sine" | "triangle" | "square",
    generatorCount: number,
    waveLengthMin: number,
    waveLengthMax: number,
    amplitudeMin: number,
    amplitudeMax: number,
    scaleHoriz: number,
    scaleVert: number,
    mode: "repeat" | "wrapAround",
    randomSeed: number
}

function mulberry32(a:number) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

async function filterDistortWave1(input:FilterInput, output:FilterOutput, options:FilterDistortWaveOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    let n = options.generatorCount;
    let aMin = options.amplitudeMin;
    let aMax = options.amplitudeMax;
    let wMin = options.waveLengthMin;
    let wMax = options.waveLengthMax;
    let scaleH = options.scaleHoriz / 100;
    let scaleV = options.scaleVert / 100;
    const rand = mulberry32(options.randomSeed);

    const aPxX = [];
    const aPxY = [];
    const wPxX = [];
    const wPxY = [];
    const phasePxX = [];
    const phasePxY = [];
    for(let i = 0; i < n; i++) {
        aPxX.push((aMin + (aMax-aMin)*rand()) * 0.78);
        aPxY.push((aMin + (aMax-aMin)*rand()) * 0.78);
        wPxX.push(wMin + (wMax-wMin)*rand());
        wPxY.push(wMin + (wMax-wMin)*rand());
        phasePxX.push(wPxX[i]*rand());
        phasePxY.push(wPxY[i]*rand());
    }

    const xx = new Float32Array(h);
    xx.fill(0);
    const yy = new Float32Array(w);
    yy.fill(0);

    let getPixel;
    if(options.mode === "repeat") {
        getPixel = getPixelBilinearRepeat;
    } else {
        getPixel = getPixelBilinearWrap;
    }

    if(options.waveType === "sine") {
        for(let y = 0; y < h; y++) {
            for(let i = 0; i < n; i++) {
                xx[y] = xx[y] + aPxX[i] * Math.sin((y + phasePxX[i]) * Math.PI * (1 / wPxX[i])) * scaleH;
            }
        }
        for(let x = 0; x < w; x++) {
            for(let i = 0; i < n; i++) {
                yy[x] = yy[x] + aPxY[i] * Math.sin((x + phasePxY[i])  * Math.PI * (1/wPxY[i])) * scaleV;
            }
        }
    } else if(options.waveType === "square") {
        for(let y = 0; y < h; y++) {
            for(let i = 0; i < n; i++) {
                const b = y * (1/wPxX[i]) - Math.floor(y * (1/wPxX[i]));
                xx[y] = xx[y] + (b > 0.5 ? aPxX[i] : -aPxX[i]) * scaleH;
            }
        }
        for(let x = 0; x < w; x++) {
            for(let i = 0; i < n; i++) {
                const b = x * (1/wPxY[i]) - Math.floor(x * (1/wPxY[i]));
                yy[x] = yy[x] + (b > 0.5 ? aPxY[i] : -aPxY[i]) * scaleV;
            }
        }
    } else if(options.waveType === "triangle") {
        for(let y = 0; y < h; y++) {
            for(let i = 0; i < n; i++) {
                const wPx = wPxX[i]*0.5;
                const cond = Math.floor(y/wPx) % 2;
                const b = y/wPx-Math.floor(y/wPx);
                const v = (+aPxX[i]*0.5) - b*aPxX[i];
                xx[y] = xx[y] + (cond === 0 ? v : -v) * scaleH;
            }
        }
        for(let x = 0; x < w; x++) {
            for(let i = 0; i < n; i++) {
                const wPx = wPxY[i]*0.5;
                const cond = Math.floor(x/wPx) % 2;
                const b = x/wPx-Math.floor(x/wPx);
                const v = (+aPxY[i]*0.5) - b*aPxY[i];
                yy[x] = yy[x] + (cond === 0 ? v : -v) * scaleV;
            }
        }
    }


    const cx = 0;
    const cy = 0;
    for(let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let val = getPixel(i8, w, h,x + xx[y], y + yy[x],1);
            setPixel(o8, w, h, x, y, val);
        }
    }
}