import {joinRGBA, premultiplyAlphaPacked, splitRGBA, unmultiplyAlphaPacked} from "../utils/utils-filter";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {mulberry32} from "../utils/random";

export const filterDescriptorNoiseAdd:FilterDescriptor = {
    id : "noiseAdd",
    name : "Add Noise",
    filter1 : filterNoiseAdd1,
    filter4 : filterNoiseAdd4,
    parameters : {
      percent :  { name:"percent", type:"float", min:0.1, max:400, default : 1},
      type :  { name:"type", type:"enum", values:["uniform","gaussian"], default:"uniform"},
      monochromatic :  { name:"monochromatic", type:"boolean", default:false}
    }
}

export interface FilterNoiseAddOptions {
    percent : number,
    type : "uniform"|"gaussian",
    monochromatic: boolean
}

async function filterNoiseAdd1(input:FilterInput, output:FilterOutput, options:FilterNoiseAddOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    addNoise1(i8, o8, w, h, { percent : options.percent, type : options.type, seed : Math.random() });
}

async function filterNoiseAdd4(input:FilterInput, output:FilterOutput, options:FilterNoiseAddOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    premultiplyAlphaPacked(i8.buffer);
    let {a:aIn, b:bIn, g:gIn, r:rIn} = splitRGBA(i8);
    let rOut = new Uint8Array(w*h);
    let gOut = new Uint8Array(w*h);
    let bOut = new Uint8Array(w*h);
    let aOut = new Uint8Array(w*h);
    const cIn = [rIn, gIn, bIn, aIn];
    const cOut = [rOut, gOut, bOut, aOut];

    const len = w * h;
    if (options.monochromatic) {
        const seed = Math.random()*Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < 3; i++) {
            cOut[i].set(cIn[i]);
            addNoise1(cOut[i], cOut[i], w, h, {percent: options.percent, type: options.type, seed});
        }
    } else {
        for (let i = 0; i < 3; i++) {
            const seed = Math.random()*Number.MAX_SAFE_INTEGER;
            cOut[i].set(cIn[i]);
            addNoise1(cOut[i], cOut[i], w, h, {percent: options.percent, type: options.type, seed});
        }
    }

    cOut[3].set(cIn[3]);
    joinRGBA(o8, rOut, gOut, bOut, aOut);
    unmultiplyAlphaPacked(o8.buffer);
}

function gauss(x:number, sigma:number) {
    const y = Math.exp((-0.5*x*x)/(sigma*sigma));
    return y;
}

/**
 * box-muller transform
 * @param rand
 * @param mu
 * @param sigma
 * @return {*}
 */
function gaussianNoise(rand:()=>number, mu:number, sigma:number) {
    let u1, u2;
    do {
        u1 = rand();
        u2 = rand();
    } while (u1 <= 0.00001);
    const magnitude = sigma * Math.sqrt(-2.0 * Math.log(u1));
    const z0 = magnitude * Math.cos(2.0 * Math.PI * u2) + mu;
    // const z1 = magnitude * Math.sin(2.0 * Math.PI * u2) + mu;
    return z0;
}


export function getNoise(rand:()=>number, options:FilterNoiseAddOptions) {
    const amount = options.percent / 100;
    if(options.type === "uniform") {
        return 255 * amount * ((rand()-0.5)*2.0);
    } else if(options.type === "gaussian") {
        return gaussianNoise(rand,0, options.percent*3);
    }
    return 0;
}

function addNoise1(input:U8Array, output:U8Array, w:number, h:number, options:{ percent : number, type : "gaussian"|"uniform", seed:number }) {
    const rand = mulberry32(options.seed);
    const len = w*h;
    let ofs = 0;
    for(let i = 0; i < len; i++) {
        const noise = getNoise(rand, { percent : options.percent, type : options.type, monochromatic : true });
        const value = input[i];
        output[i] = Math.max(0, Math.min(255, value + noise));
    }
}