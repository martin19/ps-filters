import {
    filterEachChannelPremultiplied,
    getPixelBilinear,
    getPixelBilinearRepeat,
    setPixel
} from "../utils/utils-filter";
import {boxBlur1Dwrap} from "../utils/gauss";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

const steps = 1000;

export const filterDescriptorBlurRadial:FilterDescriptor = {
    id : "blurRadial",
    name : "Radial Blur",
    filter1 : filterBlurRadial1,
    filter4 : filterEachChannelPremultiplied(filterBlurRadial1),
    getPadding : filterBlurRadialGetPadding,
    parameters : {
        amount: {name: "amount", type: "int", min: 0, max: 100, default: 10},
        type: {name: "type", type: "enum", values: ["spin", "zoom"], default: "spin"},
    }
}


export interface FilterBlurRadialOptions {
    amount : number;
    type : "spin"|"zoom"
}

async function filterBlurRadial1(input:FilterInput, output:FilterOutput, options:FilterBlurRadialOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    if(options.type === "spin") {
        radialBlurCore(i8, o8, w, h, options);
    } else if(options.type === "zoom") {
        zoomBlurCore(i8, o8, w, h, options);
    }
}

function radialBlurCore(input:U8Array, output:U8Array, w:number, h:number, options:FilterBlurRadialOptions) {
    const wp = steps*4;
    const hp = Math.max(w,h);
    const polar = new Uint8Array(wp*hp);

    //create polar image
    for(let r = 0; r < hp; r++) {
        const circle = readCircle(input, w, h, r);
        const blurred = new Uint8Array(circle.length);
        boxBlur1Dwrap(circle, blurred, circle.length, options.amount*5);
        let dst = polar.subarray(wp*r, wp*r+wp);
        dst.set(blurred);
    }

    const cx = Math.floor(w/2);
    const cy = Math.floor(h/2);
    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {

            const xp = ((Math.atan2(-(y-cy),-(x-cx))+Math.PI)/(2*Math.PI))*wp;
            const yp = Math.sqrt((x-cx)*(x-cx) + (y-cy)*(y-cy));
            let val = getPixelBilinear(polar, wp, hp, xp, yp);

            setPixel(output, w, h, x, y, val);
        }
    }
}

function readCircle(img:U8Array, w:number, h:number, r:number) {
    // const steps = Math.ceil((Math.PI/2)*r)*2;
    const cx = Math.floor(w/2);
    const cy = Math.floor(h/2);

    const q1 = new Uint8Array(steps);
    const q2 = new Uint8Array(steps);
    const q3 = new Uint8Array(steps);
    const q4 = new Uint8Array(steps);

    let deltaPhi = (Math.PI/2)/steps;
    let phi = 0;
    for(let i = 0; i < steps; i++) {
        let y = Math.sin(phi)*r;
        let x = Math.cos(phi)*r;

        q1[i] = getPixelBilinearRepeat(img, w, h ,cx+x, cy+y, 1); /*   I. Quadrant */
        q2[i] = getPixelBilinearRepeat(img, w, h ,cx-y, cy+x, 1); /*  II. Quadrant */
        q3[i] = getPixelBilinearRepeat(img, w, h ,cx-x, cy-y, 1); /* III. Quadrant */
        q4[i] = getPixelBilinearRepeat(img, w, h ,cx+y, cy-x, 1); /*  IV. Quadrant */

        phi += deltaPhi;
    }

    const result = new Uint8Array(steps*4);
    let r1 = result.subarray(0, steps);
    let r2 = result.subarray(steps, steps*2);
    let r3 = result.subarray(steps*2, steps*3);
    let r4 = result.subarray(steps*3, steps*4);
    r1.set(q1);
    r2.set(q2);
    r3.set(q3);
    r4.set(q4);

    return result;
}

const q = 0.15;

function zoomBlurCore(input:U8Array, output:U8Array, w:number, h:number, options:FilterBlurRadialOptions) {
    const cx = w/2;
    const cy = h/2;
    const maxSizeLength = Math.max(w, h);
    const r = Math.sqrt(cx*cx+cy*cy);
    const dr = r / Math.max(w, h);
    const da = (1 / (2*Math.PI*r*q));
    const wp = Math.ceil(r); //width of polar image (radius)
    const hp = Math.ceil(Math.PI*2 / da); //height of polar image (angular)
    const polar = new Uint8Array(wp*hp);

    // console.log(`polar img resolution (radius/angle) = (${wp}/${hp})`)

    let alpha = 0;
    for(let i = 0; i < hp; i++) {
        let x = Math.cos(alpha) * r;
        let y = Math.sin(alpha) * r;
        let line = getLine(input, w, h, cx, cy, cx + x, cy + y, wp);
        let dst = polar.subarray(wp*i, wp*i+wp);

        let sum = 0;
        const cumsum = new Uint32Array(wp);
        for(let j = 0; j < wp; j++) {
            sum += line[j];
            cumsum[j] = sum;
        }

        const blurred = new Uint8Array(wp);
        for(let j = 0; j < wp; j++) {
            let r = (options.amount/100)*0.5*j;
            //TODO: interpolate cumsum
            let il = Math.max(0, j-Math.floor(r/2));
            let ih = Math.min(wp-1, j+Math.floor(r/2));
            let value = line[j];
            let count = (ih-il);
            if(count !== 0) value = (cumsum[ih] - cumsum[il])/count;
            blurred[j] = Math.floor(value);
        }

        dst.set(blurred);
        alpha += da;
    }


    // display(polar, wp, hp, 1);

    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            const xp = Math.sqrt((x-cx)*(x-cx) + (y-cy)*(y-cy))*(wp/r);
            const yp = ((Math.atan2(-(y-cy),-(x-cx))+Math.PI)/(2*Math.PI))*(hp-1);

            let val = getPixelBilinearRepeat(polar, wp, hp, xp, yp, 1);
            setPixel(output, w, h, x, y, val);
        }
    }
}

function getLine(img:U8Array, w:number, h:number, x0:number, y0:number, x1:number, y1:number, steps:number) {
    const line = new Uint8Array(steps);
    const dx = (x1 - x0)/steps;
    const dy = (y1 - y0)/steps;
    let x = x0;
    let y = y0;
    for(let i = 0; i < steps; i++) {
        line[i] = getPixelBilinearRepeat(img, w, h, x, y, 2);
        x += dx;
        y += dy;
    }
    return line;
}

function filterBlurRadialGetPadding(w:number, h:number, options:FilterBlurRadialOptions) {
    if(options.type == "spin") {
        const d = Math.sqrt(w*w+h*h);
        const left = Math.ceil(d/2 - w/2);
        const right = left;
        const top = Math.ceil(d/2 - h/2);
        const bottom = top;
        return { left, top, right, bottom };
    } else if(options.type === "zoom") {
        const a = Math.ceil((options.amount/100)*0.5*Math.max(w, h));
        return { left : a, top : a, right: a, bottom : a };
    }

    return null;
}