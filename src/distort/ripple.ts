import {filterEachChannelPremultiplied, getPixelBilinearRepeat, setPixel} from "../utils/utils-filter";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {Vector2} from "../../../Utils/Vector2";

export const filterDescriptorDistortRipple:FilterDescriptor = {
    id : "distortRipple",
    name : "Ripple",
    filter1 : filterDistortRipple1,
    filter4 : filterEachChannelPremultiplied(filterDistortRipple1),
    parameters : {
        amount: {name: "amount", type: "int", min: -999, max: 9999, default: 200},
        size: {name: "size", type: "enum", values: ["small", "medium", "large"], default: "large"}
    }
}

export interface FilterDistortRippleOptions {
    amount : number;
    size : "small"|"medium"|"large";
}

async function filterDistortRipple1(input:FilterInput, output:FilterOutput, options:FilterDistortRippleOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    const cx = w/2;
    const cy = h/2;

    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            let p = fnInv(x, y, w, h, options);
            const val = getPixelBilinearRepeat(i8, w, h, p[0], p[1], 1);
            setPixel(o8, w, h, x, y, val);
        }
    }
}

function fnInv(x:number, y:number, w:number, h:number, options:FilterDistortRippleOptions) {
    const amount = options.amount;

    //medium
    let lambda:number[] = [];
    let amp:number[] = [];

    //large
    if(options.size === "small") {
      lambda = [5];
      amp = [5];
    } else if(options.size === "medium") {
      lambda = [10];
      amp = [10];
    } else if(options.size === "large") {
      lambda = [25];
      amp = [25];
    }

    let xOut = x;
    let yOut = y;
    for(let i = 0; i < lambda.length; i++) {
        //vertical displacement
        yOut += (amount/1000.0) * amp[i] * Math.sin((x/lambda[i])*Math.PI*2);
        // // //horizontal displacement
        xOut += (amount/1000.0) * amp[i] * Math.sin((y/lambda[i])*Math.PI*2);
        //diagonal displacement
        const p = new Vector2(x,y).project(new Vector2(1,1));
        const d = new Vector2(x,y).getDistance(p);
        yOut += (amount/1000.0) * amp[i] * Math.sin((d/lambda[i])*Math.PI*2) * Math.sin(Math.PI/4);
        xOut += (amount/1000.0) * amp[i] * Math.sin((d/lambda[i])*Math.PI*2) * Math.cos(Math.PI/4);
        //diagonal displacement
        const p2 = new Vector2(x,y).project(new Vector2(-1,-1));
        const d2 = new Vector2(x,y).getDistance(p2);
        yOut += (amount/1000.0) * amp[i] * Math.sin((d2/lambda[i])*Math.PI*2) * Math.sin(Math.PI/4);
        xOut += (amount/1000.0) * amp[i] * Math.sin((d2/lambda[i])*Math.PI*2) * Math.cos(Math.PI/4);
    }
    return [xOut, yOut];
}