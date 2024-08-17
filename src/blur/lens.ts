import {clamp, getPixel, getPixelRepeat, joinRGBA, lerp, setPixel, splitRGBA} from "../utils/utils-filter";
import {scanFill} from "../utils/scanlinefill";
import {U8Array} from "../utils/Types";
import {FilterDescriptor, FilterInput, FilterOutput} from "../../FilterRegistry/FilterRegistry";
import {getNoise} from "../noise/add";
import {mulberry32} from "../utils/random";
import {rgb2lab} from "../../../Utils/Colr";
import {gaussBlur} from "../utils/gauss";
import {sat} from "../utils/sat";
import {createNgon} from "../utils/ngon";
import {UPNG} from "../../../extern/UPNG";

export const filterDescriptorBlurLens:FilterDescriptor = {
    id : "blurLens",
    name : "Lens Blur",
    filter1 : filterBlurLens1,
    filter4 : filterBlurLens4,
    parameters : {
        depthMapSource : { name : "depthMapSource", type : "enum", values:["none","transparency", "layerMask"], default: "none"},
        blurFocalDistance : { name : "blurFocalDistance", type : "int", min:0, max:255, default: 0 },
        depthMapInvert : { name : "depthMapInvert", type : "boolean", default: false},
        irisShape : { name : "irisShape", type : "enum", values:["3","4","5","6","7","8","9"], default : "3"},
        irisBladeCurvature : { name : "irisBladeCurvature", type : "int", min:0, max:100, default : 1},
        irisRotation : { name : "irisRotation", type : "int", min:0, max:360, default : 0},
        irisRadius : { name : "irisRadius", type : "int", min: 0, max:100, default : 12},
        specularBrightness : { name : "specularBrightness", type : "int", min:0, max:100, default:100},
        specularThreshold : { name : "specularThreshold", type : "int", min:0, max:255, default:128},
        noiseType : { name : "noiseType", type : "enum", values : ["uniform","gaussian"], default : "uniform"},
        noiseAmount : { name : "noiseAmount", type : "int", min:0, max:100, default : 0},
        noiseMonochromatic : { name : "noiseMonochromatic", type : "boolean", default : false }
    }
}

export interface FilterBlurLensOptions {
    irisShape : string;
    irisBladeCurvature : number;
    irisRotation : number;
    irisRadius : number;
    specularBrightness : number;
    specularThreshold : number;
    noiseType : "uniform"|"gaussian";
    noiseAmount : number;
    noiseMonochromatic : boolean;
    depthMapSource : "transparency"|"layerMask";
    blurFocalDistance : number;
    depthMapInvert : boolean;
}

type RLEMask = { mask : Uint32Array, weight : number, wm : number, hm : number };

const bfactors =[
  [[176,0],[773,773],[192,192],[86,86],[114,263],[137,278],[176,431],[227,553],[235,541],[255,624],[263,639],[271,647],[278,678],[286,663],[298,718],[306,733],[314,741],[322,773],[325,788],[310,761],[318,773],[322,773],[325,796],[333,812],[341,824],[341,824],[341,824],[341,824],[341,824],[341,824],[341,824]],
  [[0,0],[773,773],[192,192],[86,86],[145,263],[204,278],[263,431],[341,553],[361,541],[380,624],[396,639],[408,647],[420,678],[427,663],[443,718],[459,733],[471,741],[482,773],[494,788],[471,761],[482,773],[490,773],[494,796],[506,812],[522,824],[522,824],[522,824],[522,824],[522,824],[522,824],[522,824]],
  [[0,0],[773,773],[192,192],[86,86],[204,263],[255,278],[337,431],[420,553],[447,541],[471,624],[494,639],[502,647],[510,678],[518,663],[545,718],[565,733],[573,741],[592,773],[608,788],[573,761],[588,773],[600,773],[604,796],[616,812],[624,824],[624,824],[624,824],[624,824],[624,824],[624,824],[624,824]],
  [[0,0],[773,773],[192,192],[86,86],[247,263],[263,278],[373,431],[459,553],[490,541],[506,624],[533,639],[553,647],[565,678],[580,663],[592,718],[612,733],[627,741],[651,773],[651,788],[624,761],[639,773],[655,773],[655,796],[667,812],[690,824],[690,824],[690,824],[690,824],[690,824],[690,824],[690,824]],
  [[0,0],[773,773],[192,192],[86,86],[251,263],[267,278],[384,431],[490,553],[502,541],[545,624],[565,639],[580,647],[592,678],[600,663],[624,718],[647,733],[659,741],[682,773],[686,788],[659,761],[675,773],[682,773],[698,796],[710,812],[725,824],[725,824],[725,824],[725,824],[725,824],[725,824],[725,824]],
  [[0,0],[773,773],[192,192],[86,86],[251,263],[278,278],[396,431],[502,553],[514,541],[565,624],[584,639],[596,647],[616,678],[620,663],[647,718],[667,733],[682,741],[698,773],[714,788],[682,761],[698,773],[706,773],[722,796],[729,812],[749,824],[749,824],[749,824],[749,824],[749,824],[749,824],[749,824]]
];
let rleMasks:RLEMask[] = [];

export async function filterBlurLens1(input:FilterInput, output:FilterOutput, options:FilterBlurLensOptions) {
    throw new Error("not implemented");

    // const i8 = new Uint8Array(input.img);
    // const depthMap = new Uint8Array(input.mask);
    // const o8 = new Uint8Array(output.img);
    // const w = input.w;
    // const h = input.h;
    //
    // const len = w*h;
    // const hl = computeHighlightsImage1(i8, w, h, options);
    //
    // //compute masks for all radii
    // rleMasks = [];
    // for(let i = 0; i <= radiusSteps; i++) {
    //     const ngon = renderNgon(parseInt(options.irisShape), (i/radiusSteps)*radius, options.irisRotation, options.irisBladeCurvature/100);
    //     const ngonRle = computeRle(ngon.data);
    //     const maskWeight = computeMaskWeight(ngonRle);
    //     rleMasks.push({ mask : ngonRle, weight : maskWeight, wm : ngon.w, hm : ngon.h });
    // }
    //
    // const hlBlurred = new Uint8Array(len);
    // blurShape1(hl, hlBlurred, depthMap, w, h, rleMasks, options.blurFocalDistance);

    // const brightness = (options.specularBrightness / 100);
    // blurShape1(input, output, w, h, scans, options.irisRadius);
    // for(let j = 0; j < len; j++) {
    //     output[j] = clamp(output[j] + hlBlurred[j] * brightness, 0, 255);
    // }
    //
    // const seed = Math.random()*Number.MAX_SAFE_INTEGER;
    // const rand = mulberry32(seed);
    // for(let i = 0; i < len; i++) {
    //     const noise = getNoise(rand, { percent : options.noiseAmount, type : options.noiseType, monochromatic : true });
    //     output[i] = clamp(output[i] + noise, 0, 255);
    // }
}

const radiusSteps = 64;

async function filterBlurLens4(input:FilterInput, output:FilterOutput, options:FilterBlurLensOptions) {
    const i8 = new Uint8Array(input.img);
    const o8 = new Uint8Array(output.img);
    const o32 = new Uint8Array(output.img);
    const depthMap = input.mask ? new Uint8Array(input.mask) : new Uint8Array(input.w*input.h);
    if(!input.mask) depthMap.fill(128);
    const w = input.w;
    const h = input.h;
    const len = w*h;

    let radius = options.irisRadius * 0.63;
    radius = Math.floor(clamp(radius, 0, Math.max(w, h) * 0.05));
    const brightness = options.specularBrightness;
    const blurFocalDistance = options.blurFocalDistance;

    //compute highlights
    const hl = computeHighlightsImage4Packed(i8.buffer, w, h, options);

    //compute masks for all radii
    rleMasks = [];
    for(let i = 0; i <= radiusSteps; i++) {
        const ngon = renderNgon(parseInt(options.irisShape), (i/radiusSteps)*radius, options.irisRotation, options.irisBladeCurvature/100);
        const ngonRle = computeRle(ngon.data);
        const maskWeight = computeMaskWeight(ngonRle);
        rleMasks.push({ mask : ngonRle, weight : maskWeight, wm : ngon.w, hm : ngon.h });
    }

    const hlBlurred = new Uint8Array(w * h);
    blurShape1(hl, hlBlurred, depthMap, w, h, rleMasks, blurFocalDistance);

    //compute shape-blurred image
    let {a:aI, b:bI, g:gI, r:rI} = splitRGBA(i8);
    const rO = new Uint8Array(w*h);
    const gO = new Uint8Array(w*h);
    const bO = new Uint8Array(w*h);
    blurShape1(rI, rO, depthMap, w, h, rleMasks, blurFocalDistance);
    blurShape1(gI, gO, depthMap, w, h, rleMasks, blurFocalDistance);
    blurShape1(bI, bO, depthMap, w, h, rleMasks, blurFocalDistance);
    joinRGBA(new Uint8Array(o8), rO, gO, bO, aI);


    //apply (blurred) highlights image

    const rr = options.irisRadius > 30 ? 30 : options.irisRadius;
    const tt = options.irisBladeCurvature/100;
    const aa = bfactors[parseInt(options.irisShape)-3][Math.floor(rr)][0];
    const bb = bfactors[parseInt(options.irisShape)-3][Math.floor(rr)][1];
    //TODO: make lerp go from first param to second param
    let k = (lerp(bb, aa, tt)/100);

    //const k = 2.4120;
    for(let j = 0; j < len; j++) {
        let kk;
        {
            const rr = (options.irisRadius > 30 ? 30 : options.irisRadius);
            const tt = options.irisBladeCurvature/100;
            const aa = bfactors[parseInt(options.irisShape)-3][Math.floor(rr)][0];
            const bb = bfactors[parseInt(options.irisShape)-3][Math.floor(rr)][1];
            //TODO: make lerp go from first param to second param
            let k = (lerp(bb, aa, tt)/100);

            const depth = depthMap[j];
            const a = blurFocalDistance > 128 ? 0 : 255;
            const f1 = lerp(0, 1, 1.0 - (Math.abs(depth-blurFocalDistance)/Math.max(Math.abs(a-blurFocalDistance),128)));

            kk = k * f1 * 0.5;
        }

        let rO = o32[j] & 255;
        let gO = o32[j] >> 8 & 255;
        let bO = o32[j] >> 16 & 255;
        let aO = o32[j] >> 24 & 255;
        rO = clamp(rO + hlBlurred[j] * (brightness/100) * kk, 0, 255);
        gO = clamp(gO + hlBlurred[j] * (brightness/100) * kk, 0, 255);
        bO = clamp(bO + hlBlurred[j] * (brightness/100) * kk, 0, 255);
        o32[j] = rO | gO << 8 | bO << 16 | aO << 24;
    }

    if (options.noiseMonochromatic) {
        const seed = Math.random()*Number.MAX_SAFE_INTEGER;;
        const rand = mulberry32(seed);
        for(let j = 0; j < len; j++) {
            const noise = getNoise(rand, { percent : options.noiseAmount, type : options.noiseType, monochromatic : true });
            let rI = o32[j] & 255;
            let gI = o32[j] >> 8 & 255;
            let bI = o32[j] >> 16 & 255;
            let aI = o32[j] >> 24 & 255;
            let rO = clamp(rI + noise, 0, 255);
            let gO = clamp(gI + noise, 0, 255);
            let bO = clamp(bI + noise, 0, 255);
            let aO = aI;
            o32[j] = rO | gO << 8 | bO << 16 | aO << 24;
        }
    } else {
        const seed = Math.random()*Number.MAX_SAFE_INTEGER;
        const rand = mulberry32(seed);
        for(let i = 0; i < 3; i++) {
            for(let j = 0; j < len; j++) {
                const noise = getNoise(rand, { percent : options.noiseAmount, type : options.noiseType, monochromatic : true });
                let cI = o32[j] >> (i*8) & 255;
                let cO = clamp(cI + noise, 0, 255);
                o32[j] = (o32[j] & ~(0xFF << (i*8))) | (cO << (i*8));
            }
        }
    }
}

function computeHighlightsImage1(input:U8Array, w:number, h:number, options:FilterBlurLensOptions) {
    const threshold = options.specularThreshold;
    const len = w*h;
    const hl = new Uint8Array(len);
    for(let i=0; i < len; i++) {
        let value = input[i];
        hl[i] = value > threshold ? value : 0;
    }
    return hl;
}

function computeHighlightsImage4Packed(input:ArrayBuffer, w:number, h:number, options:FilterBlurLensOptions) {
    const i32 = new Uint32Array(input);
    const threshold = options.specularThreshold;
    const hl = new Uint8Array(w*h);
    for(let i=0; i < i32.length; i++) {
        let r = i32[i] & 255;
        let g = i32[i] >> 8 & 255;
        let b = i32[i] >> 16 & 255;
        let a = i32[i] >> 24 & 255;
        const value = (0.2126 * r + 0.7152 * g + 0.0722 * b);
        hl[i] = value > threshold ? 255 : 0;
    }
    return hl;
}

export function renderNgon(n:number, r:number, angle:number, curvature:number):{ w : number, h : number, data : Uint8Array } {
    const X = createNgon(n, angle, r, curvature);
    const w = Math.ceil(r)*2+1;
    const h = Math.ceil(r)*2+1;
    const data = renderPolygon(X, w, h, r);
    return { w, h, data };
}

function renderPolygon(X:number[][], w:number, h:number, radius:number):Uint8Array {
    const len = w*h;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const cx = w/2;
    const cy = h/2;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillRect(0,0,w,h);
    ctx.moveTo(X[0][0] + cx, X[0][1] + cy);
    for(let i = 0; i < X.length; i++) {
        ctx.lineTo(X[i][0] + cx, X[i][1] + cy);
    }
    ctx.lineTo(X[0][0] + cx, X[0][1] + cy);
    ctx.closePath();
    ctx.fillStyle = "rgb(255,255,255)";
    ctx.fill();
    const imageData = ctx.getImageData(0, 0, w, h);
    const i32 = imageData.data;
    const o8 = new Uint8Array(len);

    //threshold
    let ofs = 0;
    for(let i = 0; i < len*4; i+=4) {
        const r = i32[i    ];
        const g = i32[i + 1];
        const b = i32[i + 2];
        //const val = (r+g+b)/3 > 128 ? 255 : 0;
        const val = (r+g+b)/3;
        o8[ofs++] = val;
    }
    return o8;
}

function computeRle(input:Uint8Array):Uint32Array {
    const spans = new Uint32Array(input.length);
    let ofs = 0;
    let valOld = input[0];
    let count = 1;
    for(let i = 1; i < input.length; i++) {
        const valNew = input[i];
        if(valOld !== valNew) {
            spans[ofs++] = valOld;
            spans[ofs++] = count;
            valOld = valNew;
            count = 1;
        } else {
            count++;
        }
    }
    spans[ofs++] = valOld;
    spans[ofs++] = count;
    return new Uint32Array(spans.slice(0,ofs));
}

export function computeMaskWeight(mask:Uint32Array) {
    const lenm = mask.length;
    let total = 0;
    for(let i = 0; i < lenm; i+=2) {
        total += (mask[i]/255)*mask[i+1];
    }
    return total;
}

function blurShape1(input:U8Array, output:U8Array, depthMap:U8Array, w:number, h:number, rleMasks : RLEMask[], blurFocalDistance:number) {

    const rxMax = Math.floor(rleMasks[rleMasks.length - 1].wm/2);
    const ryMax = Math.floor(rleMasks[rleMasks.length - 1].hm/2);

    //create padded image
    const wp = w+rxMax+rxMax+1;
    const hp = h+ryMax+ryMax;
    const padded = new Uint8Array(wp*hp);
    for(let y = 0; y < hp; y++) {
        for(let x = 0; x < wp; x++) {
            const value = getPixelRepeat(input, w, h, x-rxMax, y-ryMax, 0);
            setPixel(padded, wp, hp, x, y, value);
        }
    }

    //create horizontal sat
    const sat = new Uint32Array(wp*hp);
    let offset = 0;
    for(let y = 0; y < hp; y++) {
        let sum = 0;
        for (let x = 0; x < wp; x++) {
            sat[offset] = sum;
            sum += padded[offset];
            offset++;
        }
    }

    //blur with rle coded shape
    for(let y = ryMax; y < h+ryMax; y++) {
        for(let x = rxMax; x < w+rxMax; x++) {

            const depth = depthMap[(y-ryMax)*w + (x-rxMax)];
            let maskIndex;
            const a = blurFocalDistance > 128 ? 0 : 255
            maskIndex = Math.round(lerp(0, 1, 1.0 - (Math.abs(depth-blurFocalDistance)/Math.max(Math.abs(a-blurFocalDistance),128))) * (rleMasks.length-1));
            if(maskIndex == 0) {
                setPixel(output, w, h, x - rxMax, y - ryMax, input[(y-ryMax)*w + x-rxMax]);
                continue;
            }
            const mask = rleMasks[maskIndex].mask;
            const maskWeight = rleMasks[maskIndex].weight;
            const wm = rleMasks[maskIndex].wm;
            const wh = rleMasks[maskIndex].hm;
            const rx = Math.floor(wm/2);
            const ry = Math.floor(wh/2);

            let weightSum = 0;
            let sum = 0;
            let yy = y - ry;
            let xx = x - rx;
            for(let i = 0; i < mask.length; i+=2) {
                const val = mask[i    ]
                let   rep = mask[i + 1];

                //sum up
                while(xx+rep > x-rx+wm) {
                    if(val != 0) sum += (sat[yy*wp + x - rx + wm] - sat[yy*wp + xx])*val;
                    weightSum += ((x-rx+wm)-xx)*val;
                    rep -= ((x-rx+wm)-xx);
                    xx = x-rx;
                    yy++;
                }
                if(rep > 0) {
                    weightSum += rep*val;
                    if(val != 0) sum += (sat[yy*wp + xx+rep] - sat[yy*wp + xx])*val;
                    xx += rep;
                }
            }

            if(Math.floor(sum/weightSum) > 255) debugger;
            setPixel(output, w, h, x - rxMax, y - ryMax, Math.floor(sum/weightSum));
            //setPixel(output, w, h, x - rxMax, y - ryMax, clamp(Math.floor(sum/weightSum), 0, 255));
        }
    }
}