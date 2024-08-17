import {premultiplyAlphaPacked, unmultiplyAlphaPacked} from "../utils/utils-filter";
import {boxBlur, boxBlurPacked, boxesForGauss} from "../utils/gauss";
import {FilterDescriptor, FilterInput, FilterOutput, FilterPadding} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorBlurBox:FilterDescriptor = {
    id : "blurBox",
    name : "Box Blur",
    filter1 : filterBlurBox1,
    filter4 : filterBlurBox4,
    getPadding : filterBlurBoxGetPadding,
    parameters : {
        radius : { name : "radius", type : "int", min : 0, max : 1000, default : 10 }
    }
}

export interface FilterBlurBoxOptions {
   radius : number;
}

async function filterBlurBox1(input:FilterInput, output:FilterOutput, options:FilterBlurBoxOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    boxBlur(i8, o8, w, h, options.radius);
}

async function filterBlurBox4(input:FilterInput, output:FilterOutput, options:FilterBlurBoxOptions) {
    const i32 = new Uint8Array(input.img);
    const o32 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    premultiplyAlphaPacked(i32.buffer);
    boxBlurPacked(i32.buffer, o32.buffer, w, h, options.radius);
    unmultiplyAlphaPacked(o32.buffer);
}

function filterBlurBoxGetPadding(w:number, h : number, options:FilterBlurBoxOptions):FilterPadding {
    const r = options.radius;
    return { left : r, top : r, right : r, bottom : r };
}