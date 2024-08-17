import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {joinRGBA, premultiplyAlphaPacked, splitRGBA, unmultiplyAlphaPacked} from "../utils/utils-filter";

export const filterDescriptorPixelateCrystallize:FilterDescriptor = {
    id : "pixelateCrystallize",
    name : "Crystallize",
    filter4 : filterPixelateCrystallize4,
    filter1 : filterPixelateCrystallize1,
    parameters : {
        cellSize: {name: "cellSize", type: "int", min: 3, max: 300, default: 3}
    }
}

export const filterPixelateCrystallizeDefaults = {
    "cellSize" : 3
}

export const filterPixelateCrystallizeOptions = {
    "cellSize" : [3,300,1]
}

export interface FilterPixelateCrystallizeOptions {
    cellSize : number
}

async function filterPixelateCrystallize1(input:FilterInput, output:FilterOutput, options:FilterPixelateCrystallizeOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    filterPixelateCrystallizeCore([i8], [o8], w, h, options.cellSize);
}

async function filterPixelateCrystallize4(input:FilterInput, output:FilterOutput, options:FilterPixelateCrystallizeOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const w = input.w;
    const h = input.h;

    premultiplyAlphaPacked(i8.buffer);
    const rgba = splitRGBA(i8);
    const rO = new Uint8Array(w*h);
    const gO = new Uint8Array(w*h);
    const bO = new Uint8Array(w*h);
    const aO = new Uint8Array(w*h);
    filterPixelateCrystallizeCore([rgba.r, rgba.g, rgba.b, rgba.a], [rO, gO, bO, aO], w, h, options.cellSize);
    joinRGBA(o8, rO, gO, bO, aO);
    unmultiplyAlphaPacked(o8.buffer);
}



function getN8Centers(cells:number[][][],y:number,x:number,cellCountX:number,cellCountY:number) {
    const centers = [];
    if(y < cellCountY-1) {
        if(x < cellCountX-1) centers.push(cells[y+1][x+1]);
        centers.push(cells[y+1][x]);
        if(x > 0) centers.push(cells[y+1][x-1]);
    }

    if(x < cellCountX-1) centers.push(cells[y][x+1]);
    centers.push(cells[y][x]);
    if(x > 0) centers.push(cells[y][x-1]);

    if(y > 0) {
        if(x < cellCountX-1) centers.push(cells[y-1][x+1]);
        centers.push(cells[y-1][x]);
        if(x > 0) centers.push(cells[y-1][x-1]);
    }
    return centers;
}

function clamp(x:number, min:number, max:number) {
    return Math.max(min, Math.min(max, x));
}

function filterPixelateCrystallizeCore(input:U8Array[], output:U8Array[], w:number, h:number, cellSize:number) {
    const i0 = input[0];
    const i1 = input[1];
    const i2 = input[2];
    const i3 = input[3];
    const o0 = output[0];
    const o1 = output[1];
    const o2 = output[2];
    const o3 = output[3];

    const channels = input.length;
    const cellCount = (w/cellSize)*(h/cellSize);
    const cellCountX = w/cellSize;
    const cellCountY = h/cellSize;

    const cells = [];
    for(let y = 0; y < h; y+=cellSize) {
        const row = [];
        for(let x = 0; x < w; x+=cellSize) {
            row.push([Math.floor(x + Math.random()*cellSize), y + Math.floor(Math.random()*cellSize)]);
        }
        cells.push(row);
    }

    let celly = 0;
    let cellx = 0;
    let oldCelly = -1;
    let oldCellx = -1;
    let centers = null;
    for(let y = 0; y < h; y++) {
        celly = Math.floor(y/cellSize);
        for(let x = 0; x < w; x++) {
            let dMin1 = Number.MAX_VALUE;
            let dMin2 = Number.MAX_VALUE;
            let cMin1 = [0,0];
            let cMin2 = [0,0];

            cellx = Math.floor(x/cellSize);
            if(cellx !== oldCellx || celly !== oldCelly) {
                centers = getN8Centers(cells, celly, cellx, cellCountX, cellCountY);
                oldCellx = cellx;
                oldCelly = celly;
            }

            if(!centers) return;
            for(let i = 0; i < centers.length; i++) {
                const c = centers[i] ?? 0;
                const d = (c[0]-x)*(c[0]-x)+(c[1]-y)*(c[1]-y);
                if(d < dMin1) {
                    dMin2 = dMin1;
                    cMin2 = cMin1;
                    dMin1 = d;
                    cMin1 = c;
                } else if(d < dMin2) {
                    dMin2 = d;
                    cMin2 = c;
                }
            }

            let d1 = Math.sqrt((x-cMin1[0])**2+(y-cMin1[1])**2);
            let d2 = Math.sqrt((x-cMin2[0])**2+(y-cMin2[1])**2);

            if(channels === 4) {
                let ofsOut = (y*w+x);
                if((d2-d1) < 1.0) {
                    let ofsIn1 = (clamp(cMin1[1],0,h-1)*w+clamp(cMin1[0],0,w-1));
                    let ofsIn2 = (clamp(cMin2[1],0, h-1)*w+clamp(cMin2[0],0,w-1));
                    const wg = d2-d1;
                    const wg2 = 1.0-wg;
                    const in10 = i0[ofsIn1];
                    const in11 = i1[ofsIn1];
                    const in12 = i2[ofsIn1];
                    const in13 = i3[ofsIn1];
                    o0[ofsOut] = Math.floor(wg * in10 + wg2 * (in10 + i0[ofsIn2])/2);
                    o1[ofsOut] = Math.floor(wg * in11 + wg2 * (in11 + i1[ofsIn2])/2);
                    o2[ofsOut] = Math.floor(wg * in12 + wg2 * (in12 + i2[ofsIn2])/2);
                    o3[ofsOut] = Math.floor(wg * in13 + wg2 * (in13 + i3[ofsIn2])/2);
                } else {
                    let ofsIn1 = (clamp(cMin1[1],0,h-1)*w+clamp(cMin1[0],0,w-1));
                    o0[ofsOut] = i0[ofsIn1];
                    o1[ofsOut] = i1[ofsIn1];
                    o2[ofsOut] = i2[ofsIn1];
                    o3[ofsOut] = i3[ofsIn1];
                }
            } else {
                let ofsOut = (y*w+x);
                if((d2-d1) < 1.0) {
                    let ofsIn1 = (clamp(cMin1[1],0,h-1)*w+clamp(cMin1[0],0,w-1));
                    let ofsIn2 = (clamp(cMin2[1],0, h-1)*w+clamp(cMin2[0],0,w-1));
                    const wg = d2-d1;
                    const wg2 = 1.0-wg;
                    const in10 = i0[ofsIn1];
                    o0[ofsOut] = Math.floor(wg * in10 + wg2 * (in10 + i0[ofsIn2])/2);
                } else {
                    let ofsIn1 = (clamp(cMin1[1],0,h-1)*w+clamp(cMin1[0],0,w-1));
                    o0[ofsOut] = i0[ofsIn1];
                }
            }
        }
    }
}