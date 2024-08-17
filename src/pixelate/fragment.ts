import {filterEachChannelPremultiplied, getPixelRepeat} from "../utils/utils-filter";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorPixelateFragment:FilterDescriptor = {
    id : "pixelateFragment",
    name : "Fragment",
    filter1 : filterPixelateFragment1,
    filter4 : filterEachChannelPremultiplied(filterPixelateFragment1)
}

export const filterPixelateFragmentOptions = {};

async function filterPixelateFragment1(input:FilterInput, output:FilterOutput) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    let ofs = 0;
    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            let v1 = getPixelRepeat(i8, w, h, x - 4, y - 4, 0);
            let v2 = getPixelRepeat(i8, w, h, x - 4, y + 4, 0);
            let v3 = getPixelRepeat(i8, w, h, x + 4, y - 4, 0);
            let v4 = getPixelRepeat(i8, w, h, x + 4, y + 4, 0);
            o8[ofs++] = Math.floor((v1 + v2 + v3 + v4)/4);
        }
    }
}