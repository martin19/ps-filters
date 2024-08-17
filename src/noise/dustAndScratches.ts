import {filterEachChannelPremultiplied} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";
import {medianHuang} from "../median/median-huang";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorNoiseDustAndScratches:FilterDescriptor = {
    id : "noiseDustAndScratches",
    name : "Dust & Scratches",
    filter1 : filterNoiseDustAndScratches1,
    filter4 : filterEachChannelPremultiplied(filterNoiseDustAndScratches1),
    parameters : {
        radius: {name: "radius", type: "int", min: 1, max: 500, default: 10},
        threshold: {name: "threshold", type: "int", min: 0, max: 255, default: 10}
    }
}

export interface FilterNoiseDustAndScratchesOptions {
    radius : number,
    threshold : number
}

export async function filterNoiseDustAndScratches1(input:FilterInput, output:FilterOutput, options:FilterNoiseDustAndScratchesOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    medianHuang(i8, o8, w, h, options.radius);
    applyThreshold(i8, o8, w, h, options.threshold);
}

function applyThreshold(input:U8Array, output:U8Array, w:number, h:number, threshold:number) {
    for(let i = 0; i < input.length; i++) {
        if(Math.abs(input[i]-output[i]) < threshold) output[i] = input[i];
    }
}