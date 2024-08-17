import {fbm, randomizePerlin, sourceOver} from "../utils/perlin";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {clamp, joinRGBA, premultiplyAlphaPacked, splitRGBA, unmultiplyAlphaPacked} from "../utils/utils-filter";

export const filterDescriptorRenderDifferenceClouds:FilterDescriptor = {
    id : "renderDifferenceClouds",
    name : "Difference Clouds",
    filter1 : filterRenderDifferenceClouds1,
    filter4 : filterRenderDifferenceClouds4,
    // alpha : "straight"
}

const step = 150;
const z = 0;
const octaves = 8;
const offset = 0.5;
const scale = 0.5;

export interface FilterRenderDifferenceCloudsOptions {
    foregroundColor : number[];
    backgroundColor : number[];
}

async function filterRenderDifferenceClouds1(input:FilterInput, output:FilterOutput) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    filterRenderDifferenceCloudsCore1(i8, o8, w, h,{
        foregroundColor : input.foregroundColor ?? [255, 255, 255],
        backgroundColor : input.backgroundColor ?? [  0,   0,   0]
    });
}


async function filterRenderDifferenceClouds4(input:FilterInput, output:FilterOutput) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    let {a:aI, b:bI, g:gI, r:rI} = splitRGBA(i8);
    const rO = new Uint8Array(w*h);
    const gO = new Uint8Array(w*h);
    const bO = new Uint8Array(w*h);
    const aO = new Uint8Array(w*h);

    filterRenderDifferenceCloudsCore4([rI, gI, bI, aI], [rO, gO, bO, aO], w, h, {
        foregroundColor : input.foregroundColor ?? [255, 255, 255],
        backgroundColor : input.backgroundColor ?? [  0,   0,   0]
    });

    joinRGBA(o8, rO, gO, bO, aO);
}

function filterRenderDifferenceCloudsCore1(input:U8Array, output:U8Array, w:number, h:number, options:FilterRenderDifferenceCloudsOptions) {
    randomizePerlin();

    output.fill(0);

    const stepx = step;
    const stepy = step;
    let ofs = 0;
    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            const val = scale * fbm(x/stepx,y/stepy, z, octaves) + offset;
            output[ofs] = Math.abs(val*255 - input[ofs]);
            ofs++;
        }
    }
}

function filterRenderDifferenceCloudsCore4(input:U8Array[], output:U8Array[], w:number, h:number, options:FilterRenderDifferenceCloudsOptions) {
    const i0 = input[0];
    const i1 = input[1];
    const i2 = input[2];
    const i3 = input[3];
    const o0 = output[0];
    const o1 = output[1];
    const o2 = output[2];
    const o3 = output[3];

    const fg = [options.foregroundColor[0],options.foregroundColor[1],options.foregroundColor[2]];
    const bg = [options.backgroundColor[0],options.backgroundColor[1],options.backgroundColor[2]];
    randomizePerlin();

    for (let i = 0; i < w*h; i++) {
        o0[i] = bg[0];
        o1[i] = bg[1];
        o2[i] = bg[2];
        o3[i] = 255;
    }

    const stepx = step;
    const stepy = step;
    let ofs = 0;
    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            const val = scale * fbm(x/stepx,y/stepy, z, octaves) + offset;
            o0[ofs] = clamp(Math.abs(sourceOver(fg[0], o0[ofs], val)-i0[ofs]), 0, 255);
            o1[ofs] = clamp(Math.abs(sourceOver(fg[1], o1[ofs], val)-i1[ofs]), 0, 255);
            o2[ofs] = clamp(Math.abs(sourceOver(fg[2], o2[ofs], val)-i2[ofs]), 0, 255);
            o3[ofs] = i3[ofs];
            ofs++;
        }
    }
}