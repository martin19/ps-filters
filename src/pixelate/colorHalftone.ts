import {joinRGBA, splitRGBA} from "../utils/utils-filter";
import {sat} from "../utils/sat";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorPixelateColorHalftone:FilterDescriptor = {
    id : "pixelateColorHalftone",
    name : "Color Halftone",
    filter1 : filterPixelateColorHalftone1,
    filter4 : filterPixelateColorHalftone4,
    parameters : {
        radius: {name: "radius", type: "int", min: 1, max: 127, default: 8},
        angle1: {name: "angle1", type: "int", min: -360, max: 360, default: 108},
        angle2: {name: "angle2", type: "int", min: -360, max: 360, default: 162},
        angle3: {name: "angle3", type: "int", min: -360, max: 360, default: 90},
        angle4: {name: "angle4", type: "int", min: -360, max: 360, default: 45}
    }
}

export interface FilterPixelateColorHalftoneOptions {
    radius : number,
    angle1 : number,
    angle2 : number,
    angle3 : number,
    angle4 : number
}

async function filterPixelateColorHalftone4(input:FilterInput, output:FilterOutput, options:FilterPixelateColorHalftoneOptions) {
    const w = input.w;
    const h = input.h;

    let {a:aI, b:bI, g:gI, r:rI} = splitRGBA(new Uint8Array(input.img));
    const rO = new Uint8Array(w*h);
    const gO = new Uint8Array(w*h);
    const bO = new Uint8Array(w*h);
    const aO = new Uint8Array(w*h);

    colorHalftoneCore(rI, rO, w, h, options.angle1, options.radius);
    colorHalftoneCore(gI, gO, w, h, options.angle2, options.radius);
    colorHalftoneCore(bI, bO, w, h, options.angle3, options.radius);

    aO.set(aI);

    joinRGBA(new Uint8Array(output.img), rO, gO, bO, aO);
}

async function filterPixelateColorHalftone1(input:FilterInput, output:FilterOutput, options:FilterPixelateColorHalftoneOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    colorHalftoneCore(i8, o8, w, h, options.angle1, options.radius);
}

//compute rotated grid lines of outer circle of image and trace them in equal distance

function colorHalftoneCore(input:U8Array, output:U8Array, w:number, h:number, angle:number, radius:number) {
    const diag = Math.sqrt(w**2+h**2);
    const diag2 = diag/2;
    const d = radius*2;
    const r = d/2;
    const w2 = w/2;
    const h2 = h/2;
    //compute sat
    const S = sat(input, w, h);
    angle = -(angle/180)*Math.PI;
    const ps = r * 1.5;
    const ps2 = ps/2;

    //for each grid point, compute mean pixel intensity
    output.fill(255);
    for(let y = -diag2; y < diag2; y+=ps) {
        for(let x = -diag2; x < diag2; x+=ps) {
            const cx =  Math.cos(angle) * (x + ps2) + Math.sin(angle) * (y + ps2) + w2;
            const cy = -Math.sin(angle) * (x + ps2) + Math.cos(angle) * (y + ps2) + h2;

            //TODO:sat seems to have a off by one (last column is broken)
            //compute mean of f-neighborhood of p
            let to = Math.min(h-1, Math.max(0, Math.round(cy-r)));
            let bo = Math.min(h-1, Math.max(0, Math.round(cy+r)));
            let le = Math.min(w-1, Math.max(0, Math.round(cx-r)));
            let ri = Math.min(w-1, Math.max(0, Math.round(cx+r)));

            const n = (ri - le)*(bo - to);

            if(n === 0) continue;

            const mean = (S[to*w+le] + S[bo*w+ri] - S[to*w+ri] - S[bo*w+le])/n;
            // const mean = 128;
            const rr = Math.min(r, Math.max(0, r - r*(mean/255.0)));
            //draw circle with radius proportional to mean pixel intensity.
            drawCircle(output, w, h, cx, cy, rr);
        }
    }
}

function blend(a:number, b:number) {
    const ai = a;
    const bi = b;
    return Math.max(0.0, Math.min(255.0, b-a));
}

function drawCircle(output:U8Array, w:number, h:number, cx:number, cy:number, rr:number) {
    const le = Math.min(w-1, Math.max(0, Math.ceil(cx - rr)));
    const ri = Math.min(w-1, Math.max(0, Math.ceil(cx + rr)));
    const to = Math.min(h-1, Math.max(0, Math.ceil(cy - rr)));
    const bo = Math.min(h-1, Math.max(0, Math.ceil(cy + rr)));
    for(let y = to; y < bo; y++) {
        for(let x = le; x < ri; x++) {
            const dist = Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy));
            const a = Math.min(1.0, Math.max(0.0, rr-dist))*255.0;
            const b = output[y*w+x];
            output[y*w+x] = blend(a, b);
        }
    }
}