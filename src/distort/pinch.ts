import {filterEachChannelPremultiplied, getPixelBilinear, setPixel} from "../utils/utils-filter";
import {CubicSpline} from "../utils/CubicSpline";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {Vector2} from "../../../Utils/Vector2";

export const filterDescriptorDistortPinch:FilterDescriptor = {
    id : "distortPinch",
    name : "Pinch",
    filter1 : filterDistortPinch1,
    filter4 : filterEachChannelPremultiplied(filterDistortPinch1),
    parameters : {
        amount: {name: "amount", type: "int", min: -100, max: 100, default: 50},
    }
}

export interface FilterDistortPinchOptions {
    amount : number;
}

async function filterDistortPinch1(input:FilterInput, output:FilterOutput, options:FilterDistortPinchOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    const cx = 0;
    const cy = 0;
    for(let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {

            //mapping
            const p = new Vector2(x/w - 0.5, y/h -0.5);
            const l = p.getLength();
            const yy = spline(l);
            const xx = p.multiplyScalar(1.0 + yy * (0.33*options.amount/100));
            let val;

            if(l < 0.5) {
                val = getPixelBilinear(i8, w, h,(xx.x + 0.5) * w,(xx.y + 0.5) * h);
            } else {
                val = getPixelBilinear(i8, w, h, x, y);
            }
            setPixel(o8, w, h, x, y, val);
        }
    }
}

function gauss(x:number, sigma:number) {
    const y = Math.exp((-0.5*x*x)/(sigma*sigma));
    return y;
}

const xs = [-0.5000,-0.4844,-0.4688,-0.4531,-0.4375,-0.4219,-0.4062,-0.3906,-0.3750,-0.3594,-0.3438,-0.3281,-0.3125,-0.2969,-0.2812,-0.2656,-0.2500,-0.2344,
    -0.2188,-0.2031,-0.1875,-0.1719,-0.1562,-0.1406,-0.1250,-0.1094,-0.0938,-0.0781,-0.0625,-0.0469,-0.0312,-0.0156,0,0.0156,0.0312,0.0469,0.0625,
    0.0781,0.0938,0.1094,0.1250,0.1406,0.1562,0.1719,0.1875,0.2031,0.2188,0.2344,0.2500,0.2656,0.2812,0.2969,0.3125,0.3281,0.3438,0.3594,0.3750,0.3906,
    0.4062,0.4219,0.4375,0.4531,0.4688,0.4844,0.5000];
const ys = [0, 0.0012, 0.0099, 0.0319, 0.0774, 0.1478, 0.2377, 0.3391, 0.4481, 0.5610, 0.6757, 0.7904, 0.9042, 1.0153, 1.1237, 1.2281, 1.3290, 1.4250,
    1.5161, 1.6018, 1.6822, 1.7563, 1.8247, 1.8868, 1.9418, 1.9906, 2.0318, 2.0672, 2.0951, 2.1163, 2.1308, 2.1386, 2.1384, 2.1386, 2.1308, 2.1163,
    2.0951, 2.0672, 2.0318, 1.9906, 1.9418, 1.8868, 1.8247, 1.7563, 1.6822, 1.6018, 1.5161, 1.4250, 1.3290, 1.2281, 1.1237, 1.0153, 0.9042, 0.7904,
    0.6757, 0.5610, 0.4481, 0.3391, 0.2377, 0.1478, 0.0774, 0.0319, 0.0099, 0.0012, 0];

const ks:number[] = [];
CubicSpline.getNaturalKs(xs, ys, ks);

function spline(x:number) {
    return CubicSpline.evalSpline(x, xs, ys, ks);
}