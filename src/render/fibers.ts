import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {sourceOver} from "../utils/perlin";
import {joinRGBA, premultiplyAlphaPacked, splitRGBA, unmultiplyAlphaPacked} from "../utils/utils-filter";

export const filterDescriptorRenderFibers:FilterDescriptor = {
    id : "renderFibers",
    name : "Fibers",
    filter1 : filterRenderFibers1,
    filter4 : filterRenderFibers4,
    parameters : {
        variance: {name: "variance", type: "int", min: 1, max: 64, default: 1},
        strength: {name: "strength", type: "int", min: 1, max: 64, default: 1},
    }
    //alpha : "straight"
}

export interface FilterRenderFibersOptions {
    variance : number;
    strength : number;
    foregroundColor : number[];
    backgroundColor : number[];
}

async function filterRenderFibers4(input:FilterInput, output:FilterOutput, options:FilterRenderFibersOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    let {a:aI, b:bI, g:gI, r:rI} = splitRGBA(i8);
    const rO = new Uint8Array(w*h);
    const gO = new Uint8Array(w*h);
    const bO = new Uint8Array(w*h);
    const aO = new Uint8Array(w*h);

    filterRenderFibersCore([rI, gI, bI, aI], [rO, gO, bO, aO], w, h, {...options, ...{
            foregroundColor : input.foregroundColor ?? [255, 255, 255],
            backgroundColor : input.backgroundColor ?? [  0,   0,   0]
        }
    });

    joinRGBA(o8, rO, gO, bO, aO);
}

async function filterRenderFibers1(input:FilterInput, output:FilterOutput, options:FilterRenderFibersOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    filterRenderFibersCore([i8], [o8], w, h, {...options, ...{
            foregroundColor : input.foregroundColor ?? [255, 255, 255],
            backgroundColor : input.backgroundColor ?? [  0,   0,   0]
        }
    });
}

function clamp(a:number) {
    return ~~Math.min(255, Math.max(0, a));
}

function filterRenderFibersCore(input:U8Array[], output:U8Array[], w:number, h:number, options:FilterRenderFibersOptions) {
    const outputG = new Uint8Array(w*h);
    const variance = options.variance;
    const strength = options.strength;
    const len = w*h;

    const fg = [options.foregroundColor[0], options.foregroundColor[1], options.foregroundColor[2]]
    const bg = [options.backgroundColor[0], options.backgroundColor[1], options.backgroundColor[2]];

    const magicNumber = 3 << 13;
    const magicAngle = Math.PI / 2.43;
    const magicAngle256 = magicAngle/256;
    const unitAngle = Math.PI*2 / 256;

    function magic() {
        const r1 = Math.random() * 256;
        const r2 = Math.random() * 256;
        return variance * ~~(Math.tan(magicAngle - r1 * magicAngle256) * 325 * Math.cos(r2 * unitAngle) * 256) + magicNumber >> 16;
    }

    const a = Math.random()*255;
    const d = (strength + 2) / 2;

    let ofs = 0;
    for(let y = 0; y < h; y++) {
        let P = clamp(magic() + a);
        for(let x = 0; x < w; x++) {
            P = clamp(magic() + P);
            outputG[ofs++] = P;
        }
    }

    ofs = 0;
    let ofsNext = w;
    for(let y = 1;y < h; y++) {
        let P = clamp(magic() + outputG[ofs++])
        outputG[ofsNext++] = P;
        for(let x = 1; x < w; x++) {
            let xx = ofs+1;
            if(x + 1 == w) xx--;
            let val = (d + P + outputG[xx] + outputG[ofs] * strength) / (strength + 2);
            P = clamp(magic() + val);
            outputG[ofsNext++] = P;
            ofs++;
        }
    }

    for(let c = 0; c < input.length; c++) {
        const cI = input[c];
        const cO = output[c];
        if(c === 3) {
            for(let i = 0; i < len; i++) cO[i] = cI[i];
        } else {
            for(let i = 0; i < len; i++) {
                cO[i] = sourceOver(fg[c], bg[c], (outputG[i]/255));
            }
        }
    }
}