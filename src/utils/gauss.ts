import {U8Array} from "./Types";

export function gaussBlur(scl:U8Array|Float32Array, tcl:U8Array|Float32Array, w:number, h:number, r:number) {
    const bxs = boxesForGauss(r, 3);
    boxBlur(scl, tcl, w, h, (bxs[0]-1)/2);
    boxBlur(tcl, scl, w, h, (bxs[1]-1)/2);
    boxBlur(scl, tcl, w, h, (bxs[2]-1)/2);
}

export function boxBlur(scl:U8Array|Float32Array, tcl:U8Array|Float32Array, w:number, h:number, r:number) {
    for(let i=0; i<scl.length; i++) tcl[i] = scl[i];
    boxBlurX(tcl, scl, w, h, r);
    boxBlurY(scl, tcl, w, h, r);
}

export function boxBlurIvanX(scl:U8Array, tcl:U8Array, w:number, h:number, r:number) {
    let iarr = 1 / (r+r+1);
    for(let i = 0; i < h; i++) {
        let ti = i*w, li = ti, ri = ti+r;
        let fv = scl[ti], lv = scl[ti+w-1], val = (r+1)*fv;
        for(let j =   0; j < r;    j++) val += scl[ti+j];
        for(let j =   0; j <=r;    j++) { val += scl[ri++] - fv       ; tcl[ti++] = Math.round(val*iarr); }
        for(let j = r+1; j < w-r;  j++) { val += scl[ri++] - scl[li++]; tcl[ti++] = Math.round(val*iarr); }
        for(let j = w-r; j < w;    j++) { val += lv        - scl[li++]; tcl[ti++] = Math.round(val*iarr); }
    }
}

export function boxBlurIvanY(scl:U8Array, tcl:U8Array, w:number, h:number, r:number) {
    let iarr = 1 / (r+r+1);
    for(let i = 0; i < w; i++) {
        let ti = i, li = ti, ri = ti+r*w;
        let fv = scl[ti], lv = scl[ti+w*(h-1)], val = (r+1)*fv;
        for(let j = 0; j < r;     j++) val += scl[ti+j*w];
        for(let j = 0; j <=r;     j++) { val += scl[ri] - fv     ; tcl[ti] = Math.round(val*iarr); ri+=w; ti+=w; }
        for(let j = r+1; j < h-r; j++) { val += scl[ri] - scl[li]; tcl[ti] = Math.round(val*iarr); li+=w; ri+=w; ti+=w; }
        for(let j = h-r; j < h;   j++) { val += lv      - scl[li]; tcl[ti] = Math.round(val*iarr); li+=w; ti+=w; }
    }
}

//horizontal box blur
export function boxBlurX(src:U8Array|Float32Array, dst:U8Array|Float32Array, w:number, h:number, r:number) {
    if(r === 0) {
        for(let i = 0; i < src.length; i++) dst[i] = src[i];
        return;
    }
    let iarr = 1 / (r + r + 1);
    for(let y = 0; y < h; y++) {
        const f = src[y*w];
        const l = src[y*w + (w-1)];
        let val = 0;

        for(let x = -r-1; x < r; x++) {
            if(x < 0) val += f;
            else if(x < w) val += src[x+y*w];
            else val += l;
        }

        for(let x = 0; x < w; x++) {
            let ofs1 = x-r-1;
            let ofs2 = x+r;
            if(ofs1 < 0) val -= f;
            else val -= src[ofs1 + (y*w)];
            if(ofs2 < w) val += src[ofs2 + (y*w)];
            else val += l;
            dst[x+y*w] = val*iarr;
        }
    }
}

//vertical box blur
export function boxBlurY(src:U8Array|Float32Array, dst:U8Array|Float32Array, w:number, h:number, r:number) {
    if(r === 0) {
        for(let i = 0; i < src.length; i++) dst[i] = src[i];
        return;
    }
    const s = r+r+1;
    let iarr = 1 / s;
    for(let x = 0; x < w; x++) {
        const f = src[x];
        const l = src[x+w*(h-1)];
        let val = 0;

        for(let y = -r-1; y < r; y++) {
            if(y < 0) val += f;
            else if(y < h) val += src[x+y*w];
            else val += l;
        }

        for(let y = 0; y < h; y++) {
            let ofs1 = y-r-1;
            let ofs2 = y+r;
            if(ofs1 < 0) val -= f;
            else val -= src[x+ofs1*w];
            if(ofs2 < h) val += src[x+ofs2*w];
            else val += l;
            dst[x+y*w] = val*iarr;
        }
    }
}

export function gaussBlurPacked(scl:ArrayBuffer, tcl:ArrayBuffer, w:number, h:number, r:number) {
    const bxs = boxesForGauss(r, 3);
    boxBlurPacked(scl, tcl, w, h, (bxs[0]-1)/2);
    boxBlurPacked(tcl, scl, w, h, (bxs[1]-1)/2);
    boxBlurPacked(scl, tcl, w, h, (bxs[2]-1)/2);
}

export function boxBlurPacked(scl:ArrayBuffer, tcl:ArrayBuffer, w:number, h:number, r:number) {
    new Uint8Array(tcl).set(new Uint8Array(scl));
    boxBlurXPacked(tcl, scl, w, h, r);
    boxBlurYPacked(scl, tcl, w, h, r);
}

//horizontal box blur
export function boxBlurXPacked(src:ArrayBuffer, dst:ArrayBuffer, w:number, h:number, r:number) {
    const len = w*h;
    const len4 = w*h << 2;
    const i32 = new Uint32Array(src);
    const o8 = new Uint8Array(dst);

    if(r === 0) {
        o8.set(new Uint8Array(src));
        return;
    }

    const iarr = 1 / (r + r + 1);
    for(let y = 0; y < h; y++) {
        const f = i32[y*w];
        const l = i32[y*w + (w-1)];

        const fA = f >>> 24;
        const fR = (f >>> 0  & 255);
        const fG = (f >>> 8  & 255);
        const fB = (f >>> 16 & 255);

        const lA = l >>> 24;
        const lR = (l >>> 0  & 255);
        const lG = (l >>> 8  & 255);
        const lB = (l >>> 16 & 255);

        let valR = 0;
        let valG = 0;
        let valB = 0;
        let valA = 0;

        for(let x = -r-1; x < r; x++) {
            if(x < 0) {
                valR += fR;
                valG += fG;
                valB += fB;
                valA += fA;
            }
            else if(x < w) {
                const val = i32[x+y*w];
                valR += (val >>> 0 & 255);
                valG += (val >>> 8 & 255);
                valB += (val >>> 16 & 255);
                valA += (val >>> 24);
            } else {
                valR += lR;
                valG += lG;
                valB += lB;
                valA += lA;
            }
        }

        for(let x = 0; x < w; x++) {
            let ofs1 = x-r-1;
            let ofs2 = x+r;
            if(ofs1 < 0) {
                valR -= fR;
                valG -= fG;
                valB -= fB;
                valA -= fA;
            } else {
                const val = i32[ofs1 + (y*w)];
                valR -= (val >>> 0 & 255);
                valG -= (val >>> 8 & 255);
                valB -= (val >>> 16 & 255);
                valA -= (val >>> 24);
            }
            if(ofs2 < w) {
                const val = i32[ofs2 + (y*w)];
                valR += (val >>> 0 & 255);
                valG += (val >>> 8 & 255);
                valB += (val >>> 16 & 255);
                valA += (val >>> 24);
            } else {
                valR += lR;
                valG += lG;
                valB += lB;
                valA += lA;
            }
            const ofsDst = (x+y*w) << 2;
            o8[ofsDst    ] = valR*iarr;
            o8[ofsDst + 1] = valG*iarr;
            o8[ofsDst + 2] = valB*iarr;
            o8[ofsDst + 3] = valA*iarr;
        }
    }
}

//vertical box blur
export function boxBlurYPacked(src:ArrayBuffer, dst:ArrayBuffer, w:number, h:number, r:number) {
    const len = w*h;
    const len4 = w*h << 2;
    const i32 = new Uint32Array(src);
    const o8 = new Uint8Array(dst);

    if(r === 0) {
        o8.set(new Uint8Array(src));
        return;
    }

    const iarr = 1 / (r + r + 1);
    for(let x = 0; x < w; x++) {
        const f = i32[x];
        const l = i32[x+w*(h-1)];

        const fA = f >>> 24;
        const fR = (f >>> 0  & 255);
        const fG = (f >>> 8  & 255);
        const fB = (f >>> 16 & 255);

        const lA = l >>> 24;
        const lR = (l >>> 0 & 255);
        const lG = (l >>> 8 & 255);
        const lB = (l >>> 16 & 255);

        let valR = 0;
        let valG = 0;
        let valB = 0;
        let valA = 0;

        for(let y = -r-1; y < r; y++) {
            if(y < 0) {
                valR += fR;
                valG += fG;
                valB += fB;
                valA += fA;
            } else if(y < h) {
                const val = i32[x+y*w];
                valR += (val >>> 0 & 255);
                valG += (val >>> 8 & 255);
                valB += (val >>> 16 & 255);
                valA += (val >>> 24);
            } else {
                valR += lR;
                valG += lG;
                valB += lB;
                valA += lA;
            }
        }

        for(let y = 0; y < h; y++) {
            let ofs1 = y-r-1;
            let ofs2 = y+r;
            if(ofs1 < 0) {
                valR -= fR;
                valG -= fG;
                valB -= fB;
                valA -= fA;
            } else {
                const val = i32[x+ofs1*w];
                valR -= (val >>> 0 & 255);
                valG -= (val >>> 8 & 255);
                valB -= (val >>> 16 & 255);
                valA -= (val >>> 24);
            }
            if(ofs2 < h) {
                const val = i32[x+ofs2*w];
                valR += (val >>> 0 & 255);
                valG += (val >>> 8 & 255);
                valB += (val >>> 16 & 255);
                valA += (val >>> 24);
            } else {
                valR += lR;
                valG += lG;
                valB += lB;
                valA += lA;
            }
            const ofsDst = (x+y*w) << 2;
            o8[ofsDst    ] = valR*iarr;
            o8[ofsDst + 1] = valG*iarr;
            o8[ofsDst + 2] = valB*iarr;
            o8[ofsDst + 3] = valA*iarr;
        }
    }
}

export function boxesForGauss(sigma:number, n:number) {
    let wIdeal = Math.sqrt((12*sigma*sigma/n)+1);
    let wl = Math.floor(wIdeal);
    if(wl%2==0) wl--;
    let wu = wl+2;
    let mIdeal = (12*sigma*sigma - n*wl*wl - 4*n*wl - 3*n)/(-4*wl - 4);
    let m = Math.round(mIdeal);
    //var sigmaActual = Math.sqrt((m*wl*wl) + (n-m)*wu*wu - n)/12 );
    let sizes = [];
    for(let i = 0; i < n; i++) sizes.push(i<m?wl:wu);
    return sizes;
}


export function boxBlur1D(scl:U8Array, tcl:U8Array, w:number, r:number) {
    let iarr = 1 / (r+r+1);
    let ti = 0, li = ti, ri = ti+r;
    let fv = scl[ti], lv = scl[ti+w-1], val = (r+1)*fv;
    for(let j =   0; j < r;    j++) val += scl[ti+j];
    for(let j =   0; j <=r;    j++) { val += scl[ri++] - fv       ; tcl[ti++] = Math.round(val*iarr); }
    for(let j = r+1; j < w-r;  j++) { val += scl[ri++] - scl[li++]; tcl[ti++] = Math.round(val*iarr); }
    for(let j = w-r; j < w;    j++) { val += lv        - scl[li++]; tcl[ti++] = Math.round(val*iarr); }
}

export function boxBlur1Dwrap(scl:U8Array, tcl:U8Array, w:number, r:number) {
    let iarr = 1 / (r+r+1);
    let ti = 0, li = 0, ri = 0;
    let val = 0;
    li = w-r-1;
    for(let j =   0; j <= r;    j++) val += scl[li+j];
    li = 0;
    for(let j =   0; j < r;    j++) val += scl[li+j];

    li = w-r-1; ri = r;
    for(let j =   0; j <= r;    j++) { val += scl[ri++] - scl[li++]; tcl[ti++] = Math.round(val*iarr); }
    li = 0;
    for(let j = r+1; j < w-r;  j++) { val += scl[ri++] - scl[li++]; tcl[ti++] = Math.round(val*iarr); }
    ri = 0;
    for(let j = w-r; j < w;    j++) { val += scl[ri++] - scl[li++]; tcl[ti++] = Math.round(val*iarr); }
}