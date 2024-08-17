import {filterEachChannelPremultiplied} from "../utils/utils-filter";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorPixelateMosaic:FilterDescriptor = {
    id : "pixelateMosaic",
    name : "Mosaic",
    filter1 : filterPixelateMosaic1,
    filter4 : filterEachChannelPremultiplied(filterPixelateMosaic1),
    parameters : {
        cellSize: {name: "cellSize", type: "int", min: 2, max: 200, default: 8}
    }
}

export interface FilterPixelateMosaicOptions {
    cellSize : number;
}

async function filterPixelateMosaic1(input:FilterInput, output:FilterOutput, options:FilterPixelateMosaicOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    for(let y = 0; y < h; y += options.cellSize) {
        for(let x = 0; x < w; x += options.cellSize) {
            let mean = 0;
            const le = x;
            const ri = Math.min(w-1, x+options.cellSize);
            const to = y;
            const bo = Math.min(h-1, y+options.cellSize);
            for(let yy = to; yy <= bo; yy++) {
                for(let xx = le; xx <= ri; xx++) {
                    mean += i8[yy*w+xx];
                }
            }
            mean /= (ri-le+1)*(bo-to+1);
            for(let yy = to; yy <= bo; yy++) {
                for(let xx = le; xx <= ri; xx++) {
                    o8[yy*w+xx] = Math.floor(mean);
                }
            }
        }
    }
}