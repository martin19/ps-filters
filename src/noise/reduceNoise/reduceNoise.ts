import {sat} from "../../utils/sat";
import {U8Array} from "../../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../../FilterRegistry/FilterRegistry";
import {conv2, filterEachChannelPremultiplied, joinRGBA, lerp, splitRGBA} from "../../utils/utils-filter";

export const filterDescriptorNoiseReduceNoise:FilterDescriptor = {
    id : "noiseReduceNoise",
    name : "Reduce Noise...",
    filter1 : filterNoiseReduceNoise1,
    filter4 : filterEachChannelPremultiplied(filterNoiseReduceNoise1),
    parameters : {
        amount: {name: "amount", type: "int", min: 0, max: 10, default: 5},
        preserveDetails: {name: "preserveDetails", type: "int", min: 0, max: 100, default: 0},
        // { name:"reduceColorNoise", type:"int", min:0, max:100, default : 0},
        sharpenDetails: {name: "sharpenDetails", type: "int", min: 0, max: 100, default: 0},
        removeJpegArtifacts: {name: "removeJpegArtifacts", type: "boolean", default: false},
        // { name:"redAmount", type:"int", min:0, max:100, default : 60},
        // { name:"redPreserveDetails", type:"int", min:0, max:100, default : 60},
        // { name:"greenAmount", type:"int", min:0, max:100, default : 0},
        // { name:"greenPreserveDetails", type:"int", min:0, max:100, default :60},
        // { name:"blueAmount", type:"int", min:0, max:100, default : 0},
        // { name:"bluePreserveDetails", type:"int", min:0, max:100, default : 60}
    }
}

export interface FilterNoiseReduceNoiseOptions {
    amount : number,
    preserveDetails : number,
    // reduceColorNoise : number,
    sharpenDetails : number,
    // removeJpegArtifacts : number,
    // redAmount : number,
    // redPreserveDetails: number,
    // greenAmount : number,
    // greenPreserveDetails: number,
    // blueAmount : number,
    // bluePreserveDetails: number
}

export async function filterNoiseReduceNoise1(input:FilterInput, output:FilterOutput, options:FilterNoiseReduceNoiseOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    reduceNoiseNlm(i8, o8, w, h, options);
}

function reduceNoiseNlm(input:U8Array, output:U8Array, w:number, h:number, options:FilterNoiseReduceNoiseOptions) {
    //basic
    const d = options.preserveDetails/100;
    const r = 11; //research neighborhood
    const f = [1,3][Math.floor(options.amount/20)]; //filter neighborhood
    // const f = 1;
    const sigma = 0.1+options.amount*2.0;
    const hh = 0.4*sigma;
    const len = w*h;
    const rh = Math.floor(r/2);

    const S = sat(input, w, h);

    //precompute mean_pf
    const mean = new Uint8Array(len);
    let ofs = 0;
    for(let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            //compute mean of f-neighborhood of p
            let pto = Math.max(0, y-f);
            let pbo = Math.min(h-1, y+f);
            let ple = Math.max(0, x-f);
            let pri = Math.min(w-1, x+f);
            const pn = (pri - ple)*(pbo - pto);
            mean[ofs] = (S[pto*w+ple] + S[pbo*w+pri] - S[pto*w+pri] - S[pbo*w+ple])/pn;
            ofs++;
        }
    }

    const lut = new Float32Array(1000);
    for(let i = 0; i < 1000; i++) {
        lut[i] = Math.exp(-Math.max(0, i-2*(sigma**2))/(hh**2));
    }

    let ofs1 = 0;
    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            let wsum = 0;
            let vsum = 0;

            const mean_pf = mean[ofs1];

            let to = Math.max(0, Math.min(h, y-rh));
            let bo = Math.max(0, Math.min(h, y+rh));
            let le = Math.max(0, Math.min(w, x-rh));
            let ri = Math.max(0, Math.min(w, x+rh));

            //scan neighborhood around p
            for(let yy = to; yy < bo; yy++) {
                for(let xx = le; xx < ri; xx++) {
                    const ofs2 = yy*w+xx;
                    const uq = input[ofs2];
                    const mean_qf = mean[ofs2];

                    //compute weight wpq - this differs from paper.
                    const d2 = (mean_pf - mean_qf)*(mean_pf - mean_qf);

                    // const wpq = Math.exp(-Math.max(0, d2-2*(sigma**2))/(hh**2));
                    const wpq = lut[Math.max(0,Math.min(Math.floor(d2),999))];

                    wsum += wpq;
                    vsum += wpq * uq;
                }
            }
            const val = (1/wsum) * vsum;
            output[ofs1] = lerp(input[ofs1], val, d);
            ofs1++;
        }
    }

    if(options.sharpenDetails !== 0) {
        const sd = options.sharpenDetails/100;
        const tmp = new Uint8Array(len);
        const tmp2 = new Uint8Array(len);
        tmp.set(output);
        const mask = [0, -0.2500, 0, -0.2500, 2.0000, -0.2500, 0, -0.2500, 0];
        conv2(tmp, tmp2, w, h, mask, 3, 3, { clamp : true });
        conv2(tmp2, tmp, w, h, mask, 3, 3, { clamp : true });
        conv2(tmp, tmp2, w, h, mask, 3, 3, { clamp : true });
        for(let i = 0; i < len; i++) {
            output[i] = lerp(output[i], tmp2[i], 1.0-sd);
        }
    }
}