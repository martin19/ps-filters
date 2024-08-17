import {
    premultiplyAlphaPacked,
    splitRGBA,
    splitRGBASharedArrayBuffer,
    unmultiplyAlphaPacked
} from "../utils/utils-filter";
import {joinRGBA} from "../utils/utils-filter";
import {boxesForGauss, gaussBlur, gaussBlurPacked} from "../utils/gauss";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput, FilterPadding} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorBlurGauss:FilterDescriptor = {
    id : "blurGauss",
    name : "Gaussian Blur",
    filter1 : filterBlurGauss1,
    filter4 : filterBlurGauss4,
    getPadding : filterBlurGaussRequestPadding,
    parameters : {
        radius : { name : "radius", type : "float", min : 0, max : 1000, default : 10 }
    }
}

interface FilterBlurGaussOptions {
    radius : number;
}

export async function filterBlurGauss1(input:FilterInput, output:FilterOutput, options:FilterBlurGaussOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    gaussBlur(i8, o8, w, h, options.radius);
}

async function filterBlurGauss4(input:FilterInput, output:FilterOutput, options:FilterBlurGaussOptions) {
    const i32 = new Uint8Array(input.img);
    const o32 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    premultiplyAlphaPacked(i32.buffer);
    gaussBlurPacked(i32.buffer, o32.buffer, w, h, options.radius);
    unmultiplyAlphaPacked(o32.buffer);
}

function filterBlurGaussRequestPadding(w:number, h:number, options:FilterBlurGaussOptions):FilterPadding {
    const bxs = boxesForGauss(options.radius, 3);
    const a = (bxs[0]-1)/2 + (bxs[1]-1)/2 + (bxs[2]-1)/2;
    return { left : a, top : a, right : a, bottom : a };
}