import {filterEachChannelPremultiplied} from "../utils/utils-filter";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {bilateralHuang} from "../bilateral/bilateral-huang";

export const filterDescriptorBlurSurface:FilterDescriptor = {
    id : "blurSurface",
    name : "Surface Blur",
    filter1 : filterBlurSurface1,
    filter4 : filterEachChannelPremultiplied(filterBlurSurface1),
    parameters : {
        radius: {name: "radius", type: "int", min: 1, max: 100, default: 1},
        threshold: {name: "threshold", type: "int", min: 0, max: 255, default: 10}
    }
}

export interface FilterBlurSurfaceOptions {
    radius : number;
    threshold : number;
}

async function filterBlurSurface1(input:FilterInput, output:FilterOutput, options:FilterBlurSurfaceOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;
    bilateralHuang(i8, o8, w, h, options.radius, options.threshold);
}
