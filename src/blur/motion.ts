import {filterEachChannelPremultiplied, getPixelBilinearRepeat} from "../utils/utils-filter";
import {boxBlurX} from "../utils/gauss";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

const steps = 1000;

export const filterDescriptorBlurMotion:FilterDescriptor = {
    id : "blurMotion",
    name : "Motion Blur",
    filter1 : filterBlurMotion1,
    filter4 : filterEachChannelPremultiplied(filterBlurMotion1),
    getPadding : filterBlurMotionGetPadding,
    parameters : {
        distance: { name: "distance", type: "int", min: 0, max: 1000, default: 10},
        angle: { name: "angle", type: "float", min: -360, max: 360, default: 0},
    }
}

export interface FilterBlurMotionOptions {
    distance : number;
    angle : number;
}

async function filterBlurMotion1(input:FilterInput, output:FilterOutput, options:FilterBlurMotionOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    const alpha = (options.angle/180)*Math.PI;
    const radius = Math.round(options.distance/2);
    const sina = Math.sin(+alpha);
    const cosa = Math.cos(+alpha);
    const sinb = Math.sin(-alpha);
    const cosb = Math.cos(-alpha);
    const wh = w/2;
    const hh = h/2;

    const x0 = +cosa * (-wh) - sina * (-hh);
    const y0 = +sina * (-wh) + cosa * (-hh);
    const x1 = +cosa * (+wh) - sina * (-hh);
    const y1 = +sina * (+wh) + cosa * (-hh);
    const x2 = +cosa * (+wh) - sina * (+hh);
    const y2 = +sina * (+wh) + cosa * (+hh);
    const x3 = +cosa * (-wh) - sina * (+hh);
    const y3 = +sina * (-wh) + cosa * (+hh);
    const w2 = Math.abs(Math.ceil(Math.max(x0,x1,x2,x3) - Math.min(x0,x1,x2,x3)));
    const h2 = Math.abs(Math.ceil(Math.max(y0,y1,y2,y3) - Math.min(y0,y1,y2,y3)));
    const w2h = w2/2;
    const h2h = h2/2;


    const Ir = new Uint8Array(w2*h2);
    const Br = new Uint8Array(w2*h2);


    for(let y = 0; y < h2; y++) {
        for(let x = 0; x < w2; x++) {
            const xs = +cosb * (x - w2h) - sinb * (y - h2h);
            const ys = +sinb * (x - w2h) + cosb * (y - h2h);
            const val = getPixelBilinearRepeat(i8, w, h, xs+(wh), ys+(hh), 1);
            Ir[y*w2+x] = val;
        }
    }

    boxBlurX(Ir, Br, w2, h2, radius);

    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            const xd = +cosa * (x - wh) - sina * (y - hh);
            const yd = +sina * (x - wh) + cosa * (y - hh);
            const val = getPixelBilinearRepeat(Br, w2, h2, xd+(w2h), yd+(h2h), 1);
            o8[y*w+x] = val;
        }
    }
}

function filterBlurMotionGetPadding(w:number, h:number, options:FilterBlurMotionOptions) {
    const alpha = (options.angle/180)*Math.PI;
    const radius = Math.round(options.distance/2);
    const sina = Math.sin(+alpha);
    const cosa = Math.cos(+alpha);

    const left = Math.abs(Math.ceil(radius * cosa));
    const right = left;
    const top = Math.abs(Math.ceil(radius * sina));
    const bottom = top;

    return { left, top, right, bottom };
}
