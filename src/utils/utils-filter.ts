import {U8Array} from "./Types";
import {FilterFn, FilterInput, FilterOptions, FilterOutput, FilterPadding} from "../../FilterRegistry/FilterRegistry";

//TODO: this lerp implementation is non intuitive for caller, fix it and all references.
export function lerp(a:number, b:number, t:number) {
    return a * t + b * (1.0-t);
}

export function clamp(x:number, lowerlimit:number, upperlimit:number) {
    if (x < lowerlimit)
        x = lowerlimit;
    if (x > upperlimit)
        x = upperlimit;
    return x;
}

export function putPixel(canvas:HTMLCanvasElement, x:number, y:number, color:string) {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = color;
    ctx.fillRect(x,y,1,1);
}

export function getPixel(img:U8Array|Uint32Array|Float32Array, w:number, h:number, x:number, y:number) {
    if(x < 0 || x >= w || y < 0 || y >= h) return 0;
    return img[y*w+x];
}

export function getPixel4(img:U8Array|Uint32Array|Float32Array, w:number, h:number, x:number, y:number) {
    if(x < 0 || x >= w || y < 0 || y >= h) return [0,0,0,0];
    const ofs = (y*w+x)*4;
    return [img[ofs], img[ofs+1], img[ofs+2], img[ofs+3]];
}

export function setPixel(img:U8Array|Uint32Array|Float32Array, w:number, h:number, x:number, y:number, val:number) {
    if(x < 0 || x >= w || y < 0 || y >= h) return;
    img[y*w+x] = val;
}

export function getPixelBilinear(img:U8Array, w:number, h:number, x:number, y:number) {
    let xbase = Math.floor(x);
    let ybase = Math.floor(y);
    let xFraction = x - xbase;
    let yFraction = y - ybase;
    let offset = ybase * w + xbase;
    let lowerLeft  = img[offset];
    let lowerRight = img[offset + 1];
    let upperRight = img[offset + w + 1];
    let upperLeft  = img[offset + w];
    let upperAverage = upperLeft + xFraction * (upperRight - upperLeft);
    let lowerAverage = lowerLeft + xFraction * (lowerRight - lowerLeft);
    return lowerAverage + yFraction * (upperAverage - lowerAverage);
}

export function getPixelRepeat(img:U8Array|Uint32Array|Float32Array, w:number, h:number, x:number, y:number, border:number) {
    const bo = border;
    let l = bo;
    let r = w-1-bo;
    let t = bo;
    let b = h-1-bo;
    if(x < l) {
        if     (y < t) return getPixel(img, w, h, l,t);
        else if(y < b) return getPixel(img, w, h, l,y)
        else           return getPixel(img, w, h, l,b);
    } else if(x < r) {
        if     (y < t) return getPixel(img, w, h, x,t);
        else if(y < b) return getPixel(img, w, h, x, y);
        else           return getPixel(img, w, h, x,b);
    } else {
        if     (y < t) return getPixel(img, w, h, r,t);
        else if(y < b) return getPixel(img, w, h, r,y)
        else           return getPixel(img, w, h, r,b);
    }
}

export function getPixelWrap(img:U8Array, w:number, h:number, x:number, y:number, border?:number) {
    const bo = border ?? 0;
    const l = bo;
    const r = w-bo;
    const t = bo;
    const b = h-bo;

    const xx = (x < l) ? r - (l - x) :
      (x > r) ? l + (x - r) : x;
    const yy = (y < t) ? b - (t - y) :
      (y > b) ? t + (y - b) : y;

    return getPixel(img, w, h, xx, yy);
}

export function getPixelBilinearRepeat(img:U8Array, w:number, h:number, x:number, y:number, border:number) {
    const bo = border;
    const l = bo;
    const r = w-bo;
    const t = bo;
    const b = h-bo;
    const xbase = Math.floor(x);
    const ybase = Math.floor(y);

    if(xbase < l) {
      if     (ybase < t) return getPixel(img, w, h, l,t);
      else if(ybase < b) return getPixel(img, w, h, l,ybase)
      else               return getPixel(img, w, h, l,b);
    } else if(xbase < r) {
      if     (ybase < t) return getPixel(img, w, h, xbase,t);
      else if(ybase < b) return getPixelBilinear(img, w, h, x, y);
      else               return getPixel(img, w, h, xbase,b);
    } else {
      if     (ybase < t) return getPixel(img, w, h, r,t);
      else if(ybase < b) return getPixel(img, w, h, r,ybase)
      else               return getPixel(img, w, h, r,b);
    }
}

export function getPixelBilinearWrap(img:U8Array, w:number, h:number, x:number, y:number, border?:number) {
    const bo = border ?? 0;
    const l = bo;
    const r = w-bo;
    const t = bo;
    const b = h-bo;

    const xx = (x < l) ? r - (l - x) :
               (x > r) ? l + (x - r) : x;
    const yy = (y < t) ? b - (t - y) :
               (y > b) ? t + (y - b) : y;

    return getPixelBilinear(img, w, h, xx, yy);
}

export function display(img:U8Array, w:number, h:number, channelCount:number) {
    let canvas = document.createElement("canvas");
    canvas.style.border = "1px solid red";
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const imageData = ctx.getImageData(0,0,w, h);
    const d = imageData.data;
    for(let i = 0; i < img.length; i++) {
        d[i*4] = img[i];
        d[i*4+1] = img[i];
        d[i*4+2] = img[i];
        d[i*4+3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    document.body.appendChild(canvas);
}

export function splitRGBA(rgba:U8Array) {
    const len = rgba.length >> 2;
    const r = new Uint8Array(len);
    const g = new Uint8Array(len);
    const b = new Uint8Array(len);
    const a = new Uint8Array(len);

    for(let i = 0, ofs = 0; i < len; i++, ofs+=4) {
        r[i] = rgba[ofs];
        g[i] = rgba[ofs+1];
        b[i] = rgba[ofs+2];
        a[i] = rgba[ofs+3];
    }
    return {r,g,b,a};
}

export function splitRGBASharedArrayBuffer(rgba:U8Array) {
    const len = rgba.length / 4;
    const r = new Uint8Array(new SharedArrayBuffer(len));
    const g = new Uint8Array(new SharedArrayBuffer(len));
    const b = new Uint8Array(new SharedArrayBuffer(len));
    const a = new Uint8Array(new SharedArrayBuffer(len));
    for(let i = 0; i < len; i++) {
        const ofs = i << 2;
        r[i] = rgba[ofs];
        g[i] = rgba[ofs+1];
        b[i] = rgba[ofs+2];
        a[i] = rgba[ofs+3];
    }
    return {r,g,b,a};
}

export function joinRGBA(rgba:U8Array, r:U8Array, g:U8Array, b:U8Array, a:U8Array) {
    const len = rgba.length / 4;
    for(let i = 0; i < len; i++) {
        const ofs = i << 2;
        rgba[ofs] = r[i];
        rgba[ofs+1] = g[i];
        rgba[ofs+2] = b[i];
        // rgba[ofs+3] = a !== undefined ? a[i] : 255;
        rgba[ofs+3] = a[i];
    }
}

export function loadImageData(src:string):Promise<ImageData> {
    const img = document.createElement("img");
    return new Promise(resolve => {
        img.onload = function() {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0,0,w,h);
            resolve(imageData);
        }
        img.src = src;
    });
}

export function computeSobel(img:U8Array, w:number, h:number) {
    let dx = new Uint8Array(w*h);
    let dy = new Uint8Array(w*h);
    let M = new Uint8Array(w*h);
    let D = new Float32Array(w*h);

    const getPixel = (x:number,y:number) => {
        return getPixelRepeat(img, w, h, x, y, 1);
    }

    for(let y = 1; y < h-1; y++) {
        for(let x = 1; x < w-1; x++) {
            dx[y*w+x] = Math.floor(Math.abs(
                1*getPixel(x-1, y-1) + -1*getPixel(x+1, y-1) +
                2*getPixel(x-1, y)      + -2*getPixel(x+1, y)      +
                1*getPixel(x-1, y+1) + -1*getPixel(x+1, y+1))/8);
        }
    }

    for(let x = 0; x < w; x++) {
        for(let y = 0; y < h-1; y++) {
            dy[y*w+x] = Math.floor(Math.abs(
                1*getPixel(x-1, y-1) + 2*getPixel(x, y-1) +1*getPixel(x+1, y-1) +
                -1*getPixel(x-1, y+1) - 2*getPixel(x, y+1) -1*getPixel(x+1, y+1))/8);
        }
    }

    for(let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const ofs = y*w+x;
            const dx_ = dx[ofs];
            const dy_ = dy[ofs];
            M[ofs] = Math.floor(Math.sqrt(dx_ * dx_ + dy_ * dy_));
            D[ofs] = Math.atan2(dy_, dx_); //-PI..PI
        }
    }
    return {M, D};
}

export function conv2(input:U8Array|Float32Array, output:U8Array|Float32Array, w:number, h:number, mask:U8Array|Float32Array|number[], mw:number, mh:number, options?: { scale? : number, offset? : number, clamp? : boolean}) {
    const mh2 = Math.floor(mh/2);
    const mw2 = Math.floor(mw/2);
    const scale = options?.scale ?? 1.0;
    const offset = options?.offset ?? 0.0;
    const clamp = options?.clamp ?? false;

    const borders = [
        [0, 0, mw2,mh2],        //tl
        [mw2, 0, w-mw2,mh2],    //t
        [w-mw2, 0, w, mh2],     //tr
        [0, mh2, mw2, h-mh2],   //l
        [w-mw2, mh2, w, h-mh2], //r
        [0, h-mh2, mw2, h],     //bl
        [mw2, h-mh2, w-mw2, h], //b
        [w-mw2, h-mh2, w, h]    //br
    ]

    for(let i = 0; i < borders.length; i++) {
        const le = Math.max(0, Math.min(w, borders[i][0]));
        const to = Math.max(0, Math.min(h, borders[i][1]));
        const ri = Math.max(0, Math.min(w, borders[i][2]));
        const bo = Math.max(0, Math.min(h, borders[i][3]));
        for(let y = to; y < bo; y++) {
            for(let x = le; x < ri; x++) {
                let sum = 0;
                let im = 0;
                for(let yy = y - mh2; yy <= y + mh2; yy++) {
                    for(let xx = x - mw2; xx <= x + mw2; xx++) {
                        sum += getPixelRepeat(input, w, h, xx, yy, 0) * mask[im++];
                    }
                }

                let val = sum * scale + offset;
                if(clamp) val = Math.max(0, Math.min(255,Math.floor(val)));
                output[y*w+x] = val;
            }
        }
    }

    const le = Math.max(0, Math.min(w, mw2));
    const to = Math.max(0, Math.min(h, mh2));
    const ri = Math.max(0, Math.min(w, w-mw2));
    const bo = Math.max(0, Math.min(h, h-mh2));
    for(let y = to; y < bo; y++) {
        for (let x = le; x < ri; x++) {
            let sum = 0;
            let im = 0;
            for(let yy = y - mh2; yy <= y + mh2; yy++) {
                for(let xx = x - mw2; xx <= x + mw2; xx++) {
                    sum += input[yy*w+xx] * mask[im++];
                }
            }

            let val = sum * scale + offset;
            if(clamp) val = Math.max(0, Math.min(255,Math.floor(val)));
            output[y*w+x] = val;
        }
    }
}

export function conv2Packed(input:ArrayBuffer, output:ArrayBuffer, w:number, h:number, mask:U8Array|Float32Array|number[],
                            mw:number, mh:number, options?: { scale? : number, offset? : number, clamp? : boolean}) {

    const i32 = new Uint32Array(input);
    const o8 = new Uint8Array(output);

    const mh2 = Math.floor(mh/2);
    const mw2 = Math.floor(mw/2);
    const scale = options?.scale ?? 1.0;
    const offset = options?.offset ?? 0.0;
    const clamp = options?.clamp ?? false;

    const borders = [
        [0, 0, mw2,mh2],        //tl
        [mw2, 0, w-mw2,mh2],    //t
        [w-mw2, 0, w, mh2],     //tr
        [0, mh2, mw2, h-mh2],   //l
        [w-mw2, mh2, w, h-mh2], //r
        [0, h-mh2, mw2, h],     //bl
        [mw2, h-mh2, w-mw2, h], //b
        [w-mw2, h-mh2, w, h]    //br
    ]

    for(let i = 0; i < borders.length; i++) {
        const le = Math.max(0, Math.min(w, borders[i][0]));
        const to = Math.max(0, Math.min(h, borders[i][1]));
        const ri = Math.max(0, Math.min(w, borders[i][2]));
        const bo = Math.max(0, Math.min(h, borders[i][3]));
        for(let y = to; y < bo; y++) {
            for(let x = le; x < ri; x++) {
                let rsum = 0;
                let gsum = 0;
                let bsum = 0;
                let asum = 0;
                let im = 0;
                for(let yy = y - mh2; yy <= y + mh2; yy++) {
                    for(let xx = x - mw2; xx <= x + mw2; xx++) {
                        const weight = mask[im++];
                        let val32 = getPixelRepeat(i32, w, h, xx, yy, 0);
                        if(val32 >> 24 === 0) val32 = getPixelRepeat(i32, w, h, x, y, 0);
                        rsum += (val32 & 255) * weight;
                        gsum += (val32 >>> 8  & 255) * weight;
                        bsum += (val32 >>> 16 & 255) * weight;
                        asum += (val32 >>> 24 & 255) * weight;
                    }
                }

                let rval = rsum * scale + offset;
                let gval = gsum * scale + offset;
                let bval = bsum * scale + offset;
                let aval = asum * scale + offset;
                if(clamp) {
                    rval = Math.max(0, Math.min(255, Math.floor(rval)));
                    gval = Math.max(0, Math.min(255, Math.floor(gval)));
                    bval = Math.max(0, Math.min(255, Math.floor(bval)));
                    aval = Math.max(0, Math.min(255, Math.floor(aval)));
                }
                const idx = y*w+x << 2;
                o8[idx] = rval;
                o8[idx + 1] = gval;
                o8[idx + 2] = bval;
                o8[idx + 3] = aval;
            }
        }
    }

    const le = Math.max(0, Math.min(w, mw2));
    const to = Math.max(0, Math.min(h, mh2));
    const ri = Math.max(0, Math.min(w, w-mw2));
    const bo = Math.max(0, Math.min(h, h-mh2));
    for(let y = to; y < bo; y++) {
        for (let x = le; x < ri; x++) {
            let rsum = 0;
            let gsum = 0;
            let bsum = 0;
            let asum = 0;
            let im = 0;
            for(let yy = y - mh2; yy <= y + mh2; yy++) {
                for(let xx = x - mw2; xx <= x + mw2; xx++) {
                    const weight = mask[im++];
                    let val32 = i32[yy*w+xx];
                    if(val32 >> 24 === 0) val32 = i32[y*w+x];
                    rsum += (val32 & 255) * weight;
                    gsum += (val32 >>> 8  & 255) * weight;
                    bsum += (val32 >>> 16 & 255) * weight;
                    asum += (val32 >>> 24 & 255) * weight;
                }
            }

            let rval = rsum * scale + offset;
            let gval = gsum * scale + offset;
            let bval = bsum * scale + offset;
            let aval = asum * scale + offset;
            if(clamp) {
                rval = Math.max(0, Math.min(255, Math.floor(rval)));
                gval = Math.max(0, Math.min(255, Math.floor(gval)));
                bval = Math.max(0, Math.min(255, Math.floor(bval)));
                aval = Math.max(0, Math.min(255, Math.floor(aval)));
            }
            const idx = y*w+x << 2;
            o8[idx] = rval;
            o8[idx + 1] = gval;
            o8[idx + 2] = bval;
            o8[idx + 3] = aval;
        }
    }
}

export function minmax(input:U8Array) {
    let min = +Number.MAX_VALUE;
    let max = -Number.MAX_VALUE;
    for(let i = 0; i < input.length; i++) {
        if(input[i]<min) min = input[i];
        if(input[i]>max) max = input[i];
    }
    return [min, max];
}

export function premultiplyAlpha(r:U8Array, g:U8Array, b:U8Array, a:U8Array) {
    const len = r.length;
    for(let i = 0; i < len; i++) {
        r[i] = r[i]*(a[i]/255);
        g[i] = g[i]*(a[i]/255);
        b[i] = b[i]*(a[i]/255);
    }
}

export function unmultiplyAlpha(r:U8Array, g:U8Array, b:U8Array, a:U8Array) {
    const len = r.length;
    for(let i = 0; i < len; i++) {
        r[i] = clamp(r[i]/(a[i]/255 + 0.0001), 0, 255);
        g[i] = clamp(g[i]/(a[i]/255 + 0.0001), 0, 255);
        b[i] = clamp(b[i]/(a[i]/255 + 0.0001), 0, 255);
    }
}

export function premultiplyAlphaPacked(buffer:ArrayBuffer) {
    const i8 = new Uint8Array(buffer);
    const len = i8.length >>> 2;
    for(let i = 0; i < i8.length; i+=4) {
        const alpha = i8[i+3];
        if(alpha === 255) continue;
        i8[i  ] = i8[i  ] * (alpha/255);
        i8[i+1] = i8[i+1] * (alpha/255);
        i8[i+2] = i8[i+2] * (alpha/255);
    }
}

export function unmultiplyAlphaPacked(buffer:ArrayBuffer) {
    const i8 = new Uint8Array(buffer);
    const len = i8.length >>> 2;
    for(let i = 0; i < i8.length; i+=4) {
        const alpha = i8[i+3];
        if(alpha === 0 || alpha === 255) continue;
        const k = 255 / alpha;
        i8[i    ] = i8[i    ] * k;
        i8[i + 1] = i8[i + 1] * k;
        i8[i + 2] = i8[i + 2] * k;
    }
}

export function filterEachChannelPremultiplied(fn:FilterFn) {
    return async (input:FilterInput, output:FilterOutput, options?:FilterOptions) => {
        const i8 = new Uint8Array(input.img);
        const o8 = new Uint8Array(output.img);
        const w = input.w;
        const h = input.h;
        const len = w * h;
        premultiplyAlphaPacked(i8.buffer);
        let rgba = splitRGBA(i8);
        const r8 = new Uint8Array(len);
        const g8 = new Uint8Array(len);
        const b8 = new Uint8Array(len);
        const a8 = new Uint8Array(len);
        fn({ img : rgba.r.buffer, mask : input.mask, w, h }, { img : r8.buffer }, options);
        fn({ img : rgba.g.buffer, mask : input.mask, w, h }, { img : g8.buffer }, options);
        fn({ img : rgba.b.buffer, mask : input.mask, w, h }, { img : b8.buffer }, options);
        fn({ img : rgba.a.buffer, mask : input.mask, w, h }, { img : a8.buffer }, options);
        joinRGBA(o8, r8, g8, b8, a8);
        unmultiplyAlphaPacked(o8.buffer);
    }
}

export function filterEachChannelKeepAlpha(fn:FilterFn) {
    return async (input:FilterInput, output:FilterOutput, options?:FilterOptions) => {
        const i8 = new Uint8Array(input.img);
        const o8 = new Uint8Array(output.img);
        const w = input.w;
        const h = input.h;
        const len = w * h;
        let rgba = splitRGBA(i8);
        const r8 = new Uint8Array(len);
        const g8 = new Uint8Array(len);
        const b8 = new Uint8Array(len);
        fn({ img : rgba.r.buffer, mask : input.mask, w, h }, { img : r8.buffer }, options);
        fn({ img : rgba.g.buffer, mask : input.mask, w, h }, { img : g8.buffer }, options);
        fn({ img : rgba.b.buffer, mask : input.mask, w, h }, { img : b8.buffer }, options);
        joinRGBA(o8, r8, g8, b8, rgba.a);
    }
}


export function filterAddPadding1(i8:Uint8Array, w : number, h : number, filterPadding:FilterPadding):Uint8Array {
    const wNew = w + filterPadding.left + filterPadding.right;
    const hNew = h + filterPadding.top + filterPadding.bottom;
    const o8 = new Uint8Array(wNew*hNew);
    o8.fill(0);

    let ofsIn = 0;
    let ofsOut = filterPadding.top * wNew + filterPadding.left;

    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            o8[ofsOut] = i8[ofsIn];
            ofsIn++;
            ofsOut++;
        }
        ofsOut += filterPadding.right + filterPadding.left;
    }

    return o8;
}

export function filterAddPadding4(i32:Uint32Array, w : number, h : number, filterPadding:FilterPadding):Uint32Array {
    const wNew = w + filterPadding.left + filterPadding.right;
    const hNew = h + filterPadding.top + filterPadding.bottom;
    const o32 = new Uint32Array(wNew*hNew);
    o32.fill(0);

    let ofsIn = 0;
    let ofsOut = filterPadding.top * wNew + filterPadding.left;

    for(let y = 0; y < h; y++) {
        for(let x = 0; x < w; x++) {
            o32[ofsOut] = i32[ofsIn];
            ofsIn++;
            ofsOut++;
        }
        ofsOut += filterPadding.right + filterPadding.left;
    }

    return o32;
}

export function filterWeightedAverage1(a8:Uint8Array, b8:Uint8Array, w8:Uint8Array, c8:Uint8Array) {
    const len = a8.length;
    for(let i = 0; i < len; i++) {
        const rA = a8[i];
        const rB = b8[i];
        const m = w8[i]/255;
        c8[i] = rA * m + rB * (1 - m);
    }
}

export function filterWeightedAverage4(a32:Uint32Array, b32:Uint32Array, w8:Uint8Array, c32:Uint32Array) {
    const len = a32.length;
    for(let i = 0; i < len; i++) {
        const rA = a32[i] & 255;
        const gA = a32[i] >>> 8 & 255;
        const bA = a32[i] >>> 16 & 255;
        const aA = a32[i] >>> 24 & 255;

        const rB = b32[i] & 255;
        const gB = b32[i] >>> 8 & 255;
        const bB = b32[i] >>> 16 & 255;
        const aB = b32[i] >>> 24 & 255;

        const m = w8[i]/255;

        const rC = rA * m + rB * (1 - m);
        const gC = gA * m + gB * (1 - m);
        const bC = bA * m + bB * (1 - m);
        const aC = aA * m + aB * (1 - m);

        c32[i] = rC << 0 | gC << 8 | bC << 16 | aC << 24;
    }
}

