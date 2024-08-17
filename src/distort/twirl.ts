import {filterEachChannelPremultiplied, getPixelBilinearRepeat, lerp, setPixel} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";

export const filterDescriptorDistortTwirl:FilterDescriptor = {
    id : "distortTwirl",
    name : "Twirl",
    filter1 : filterDistortTwirl1,
    filter4 : filterEachChannelPremultiplied(filterDistortTwirl1),
    parameters : {
        angle: {name: "angle", type: "int", min: -999, max: 999, default: 50},
    }
}

export interface FilterDistortTwirlOptions {
    angle : number;
}

async function filterDistortTwirl1(input:FilterInput, output:FilterOutput, options:FilterDistortTwirlOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    const angleRad = (options.angle/180)*Math.PI;
    const cx = w/2;
    const cy = h/2;

    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            let p = fnInv(x, y, w, h, cx, cy, angleRad);
            const val = getPixelBilinearRepeat(i8, w, h, p[0], p[1], 1);
            setPixel(o8, w, h, x, y, val);
        }
    }
}

function fnInv(x:number, y:number, w:number, h:number, cx:number, cy:number, angleRad:number) {
    let s1, s2;

    let radius = Math.min(cx, cy), dx, dy;
    if(w>h) {
        s1 = h/w;
        s2 = 1;
        dx = (x - cx) * s1;
        dy = (y - cy);
    } else {
        s1 = 1
        s2 = w/h;
        dx = (x - cx);
        dy = (y - cy) * s2;
    }

    const radius2 = radius*radius;
    let distance = dx * dx + dy * dy;
    if(distance > radius2) {
        return [x, y];
    } else {
        distance = Math.sqrt(distance);
        // let a = Math.atan2(dy, dx) + lerp(0, -angleRad, (radius-distance)/radius) * (radius - distance) / radius;
        let a = Math.atan2(dy, dx) + lerp(-angleRad, 0, (radius-distance)/radius) * (radius - distance) / radius;
        const xn = cx + (distance * Math.cos(a))*(1/s1);
        const yn = cy + (distance * Math.sin(a))*(1/s2);
        return [xn, yn];
    }
}