import {filterEachChannelPremultiplied, getPixelBilinearRepeat, lerp, setPixel} from "../utils/utils-filter";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {Vector2} from "../../../Utils/Vector2";

export const filterDescriptorDistortSpherize:FilterDescriptor = {
    id : "distortSpherize",
    name : "Spherize",
    filter1 : filterDistortSpherize1,
    filter4 : filterEachChannelPremultiplied(filterDistortSpherize1),
    parameters : {
        amount: {name: "amount", type: "int", min: -100, max: 100, default: 50},
        mode: {name: "mode", type: "enum", values: ["normal", "horizontal", "vertical"], default: "normal"}
    }
}

export interface FilterDistortSpherizeOptions {
    amount : number;
    mode : "normal"|"horizontal"|"vertical";
}

const gridSizeX = 1;
const gridSizeY = 1;
let gridH = 32;
let gridW = 32;
let grid = [];
let distGrid = [];

async function filterDistortSpherize1(input:FilterInput, output:FilterOutput, options:FilterDistortSpherizeOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    const a = -Math.abs(options.amount / 100);
    const cx = 0.5;
    const cy = 0.5;
    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            let val = 0;
            const dphi = Math.PI;
            if(options.mode === "horizontal") {
                if(options.amount >= 0) {
                    const phi = Math.PI-dphi*(x/w);
                    const xx = Math.cos(phi)*0.5+cx;
                    val = getPixelBilinearRepeat(i8, w, h,lerp(xx, x/w, a)*w, y, 1);
                } else {
                    const phi = Math.acos(((x/w)-cx)/0.5);
                    const xx = (phi-Math.PI)/-dphi;
                    val = getPixelBilinearRepeat(i8, w, h, lerp(xx, x/w, a)*w, y, 1);
                }
            } else if(options.mode === "vertical") {
                if(options.amount >= 0) {
                    const phi = Math.PI-dphi*(y/h);
                    const yy = Math.cos(phi)*0.5+cy;
                    val = getPixelBilinearRepeat(i8, w, h, x, lerp(yy, y/h, a)*h, 1);
                } else {
                    const phi = Math.acos(((y/h)-cy)/0.5);
                    const yy = (phi-Math.PI)/-dphi;
                    val = getPixelBilinearRepeat(i8, w, h, x,lerp(yy, y/h, a)*h, 1);
                }
            } else if(options.mode === "normal") {
                const p = new Vector2((x/w)-cx, (y/h)-cy);
                const p0 = p.multiplyScalar(1/p.getLength()).multiplyScalar(0.5);
                const l = p.subtract(p0).getLength();
                const step = p.subtract(p0).normalize();
                if(p.getLength() > 0 && p.getLength() < 0.5) {
                    // val = getPixelBilinear(input, w, h, xx.x + cx, xx.y + cy);
                    if(options.amount >= 0) {
                        const phi1 = Math.PI-dphi*l;
                        const xx1 = p0.add(step.multiplyScalar(Math.cos(phi1)*0.5 + cx));
                        val = getPixelBilinearRepeat(i8, w, h,
                            lerp((xx1.x+cx), x/w, a)*w,
                            lerp((xx1.y+cy), y/h, a)*h,
                          1
                        );
                    } else {
                        const phi2 = Math.acos((l-cx)/0.5);
                        const xx2 = p0.add(step.multiplyScalar((phi2-Math.PI)/-dphi));
                        val = getPixelBilinearRepeat(i8, w, h,
                            lerp((xx2.x+cx), x/w, a)*w,
                            lerp((xx2.y+cy), y/h, a)*h,
                          1
                        );
                    }

                } else {
                    val = getPixelBilinearRepeat(i8, w, h, x, y, 1);
                }
            }
            setPixel(o8, w, h, x, y, val);
        }
    }
}