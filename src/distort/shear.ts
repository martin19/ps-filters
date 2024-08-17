import {
    filterEachChannelPremultiplied,
    getPixelBilinearRepeat,
    getPixelBilinearWrap,
    setPixel
} from "../utils/utils-filter";
import {CubicSpline} from "../utils/CubicSpline";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorDistortShear:FilterDescriptor = {
    id : "distortShear",
    name : "Shear",
    filter1 : filterDistortShear1,
    filter4 : filterEachChannelPremultiplied(filterDistortShear1),
    parameters : {
        points: {name: "points", type: "point[]", default: [{x: 0.5, y: 0}, {x: 0.5, y: 1}]},
        mode: {name: "mode", type: "enum", values: ["wrap", "repeat"], default: "wrap"}
    }
}

export interface FilterDistortShearOptions {
    points : { x : number, y : number}[],
    mode : "warp"|"repeat",
}

async function filterDistortShear1(input: FilterInput, output: FilterOutput, options: FilterDistortShearOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    const cx = w / 2;
    const cy = h / 2;
    const hrez = 1.0 / h;

    const xs = options.points.map(value => (value.x));
    const ys = options.points.map(value => (value.y));

    const ks: number[] = [];
    CubicSpline.getNaturalKs(ys, xs, ks);

    for (let y = 0; y < h; y++) {
        const ofs = (CubicSpline.evalSpline(hrez * y, ys, xs, ks) * w) - cx;
        for (let x = 0; x < w; x++) {

            let val;
            if (options.mode === "repeat") {
                val = getPixelBilinearRepeat(i8, w, h, x - ofs, y, 0);
            } else {
                val = getPixelBilinearWrap(i8, w, h, x - ofs, y, 0);
            }

            setPixel(o8, w, h, x, y, val);
        }
    }
}
