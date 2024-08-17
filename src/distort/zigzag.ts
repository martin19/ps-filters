import {filterEachChannelPremultiplied, getPixelBilinearRepeat, setPixel} from "../utils/utils-filter";
import {FilterDescriptor, FilterInput, FilterOptions, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {Vector2} from "../../../Utils/Vector2";

export const filterDescriptorDistortZigZag:FilterDescriptor = {
    id : "distortZigZag",
    name : "ZigZag",
    filter1 : filterDistortZigZag1,
    filter4 : filterEachChannelPremultiplied(filterDistortZigZag1),
    parameters : {
        amount: {name: "amount", type: "int", min: -100, max: 100, default: 0},
        ridgeCount: {name: "ridgeCount", type: "int", min: 0, max: 20, default: 2},
        type: {
            name: "type",
            type: "enum",
            values: ["pondRipples", "aroundCenter", "outFromCenter"],
            default: "pondRipples"
        },
    }
}

export interface FilterDistortZigZagOptions extends FilterOptions {
    amount : number,
    ridgeCount : number,
    type : "pondRipples"|"aroundCenter"|"outFromCenter"
}

function outFromCenter(x:number, ridges:number) {
    const hull = Math.max(0, x+0.5);
    const waves = ((-Math.cos(x*2*Math.PI*ridges*2) + 1) * 0.5);
    return hull * waves;
}

export async function filterDistortZigZag1(input:FilterInput, output:FilterOutput, options:FilterDistortZigZagOptions) {
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
            const yy = outFromCenter(-l, options.ridgeCount);
            let xx = new Vector2(0,0);
            if(options.type === "outFromCenter") {
                xx = p.add(p.normalize().multiplyScalar(yy * (-0.093*options.amount/10)));
                if(xx.isNaN()) xx = new Vector2(0,0);
            } else if(options.type === "pondRipples") {
                if(p.x < -p.y) {
                    xx = p.add(new Vector2(-1,-1).normalize().multiplyScalar(yy * (-0.5245*options.amount/10)));
                } else {
                    xx = p.add(new Vector2(-1,-1).normalize().multiplyScalar(yy * (-0.5245*options.amount/10)));
                }
            } else if(options.type === "aroundCenter") {
                xx = p.rotateVector(yy*2*Math.PI*(options.amount/100))
            }
            let val;

            if(l < 0.5) {
                val = getPixelBilinearRepeat(i8, w, h,(xx.x + 0.5) * w,(xx.y + 0.5) * h, 1);
            } else {
                val = getPixelBilinearRepeat(i8, w, h, x, y, 1);
            }
            setPixel(o8, w, h, x, y, val);
        }
    }
}