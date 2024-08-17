import {filterEachChannelPremultiplied, joinRGBA, splitRGBA} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorPixelateFacet:FilterDescriptor = {
    id : "pixelateFacet",
    name : "Facet",
    filter1 : filterPixelateFacet1,
    filter4 : filterEachChannelPremultiplied(filterPixelateFacet1)
}

export const filterPixelateFacetOptions = {};

async function filterPixelateFacet1(input:FilterInput, output:FilterOutput) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    let d = 3;
    let r = Math.floor(d/2);

    let tmp1 = new Float32Array(w*h);
    let tmp2 = new Float32Array(w*h);

    //step 1: compute variance
    for(let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let to = Math.max(0, Math.min(h - 1, y - r));
            let bo = Math.max(0, Math.min(h - 1, y + r));
            let le = Math.max(0, Math.min(w - 1, x - r));
            let ri = Math.max(0, Math.min(w - 1, x + r));
            let values = [];
            let n = 0;

            for(let yy = to; yy <= bo; yy++) {
                for(let xx = le; xx <= ri; xx++) {
                    values.push(i8[yy*w+xx]);
                    n++;
                }
            }

            let cVal = i8[y*w+x];

            let mean = 0;
            for(let i = 0; i < values.length; i++) {
                mean += values[i];
            }
            mean /= values.length;

            tmp2[y*w+x] = mean;

            let _var = 0;
            for(let i = 0; i < values.length; i++) {
                _var += (values[i]-mean)*(values[i]-mean);
            }
            _var /= values.length;

            tmp1[y*w+x] = _var;
        }
    }

    //find best region (minimum variance)
    for(let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let to = Math.max(0, Math.min(h - 1, y - r));
            let bo = Math.max(0, Math.min(h - 1, y + r));
            let le = Math.max(0, Math.min(w - 1, x - r));
            let ri = Math.max(0, Math.min(w - 1, x + r));
            let stds = [];
            let means = [];

            for(let yy = to; yy <= bo; yy++) {
                for(let xx = le; xx <= ri; xx++) {
                    stds.push(tmp1[yy*w+xx]);
                    means.push(tmp2[yy*w+xx]);
                }
            }

            let minVal = Number.MAX_VALUE;
            let minInd = 0;
            for(let i = 0; i < stds.length; i++) {
                if(stds[i] < minVal) {
                    minVal = stds[i];
                    minInd = i;
                }
            }

            o8[y*w+x] = means[minInd];
        }
    }
}