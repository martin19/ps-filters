import {U8Array} from "../utils/Types";
import {getPixelRepeat} from "../utils/utils-filter";

export function medianHuang(input:U8Array, output:U8Array, w:number, h:number, radius:number) {
    const pixelsInWindow = (radius+radius+1)**2;
    const r = Math.floor(radius);
    const kHist = new Uint16Array(256);
    const th = ((radius+radius+1)**2)/2;
    let mdn = 0;
    let ltMedian = 0;

    function updateMedian() {
        if(ltMedian > th) {
            do {
                mdn--;
                ltMedian -= kHist[mdn];
            } while(ltMedian-(kHist[mdn]) > th)
        } else {
            while(ltMedian+(kHist[mdn]) <= th) {
                ltMedian += kHist[mdn];
                mdn++;
            }
        }
    }

    function updateKernelHist(x:number, y:number) {
        let yRemove = Math.max(y - r, 0);
        let yAdd = Math.min(y + r + 1, h - 1);

        if(x-r < 0) {
            const valRemove = input[yRemove*w];
            const valAdd = input[yAdd*w];
            const cnt = -(x - r);
            if(valRemove < mdn) ltMedian-=cnt;
            if(valAdd < mdn) ltMedian+=cnt;
            kHist[valRemove]-=cnt;
            kHist[valAdd]+=cnt;
        }

        if(x+r > w) {
            const valRemove = input[yRemove*w+(w-1)];
            const valAdd = input[yAdd*w+(w-1)];
            const cnt = x + r - w;
            if(valRemove < mdn) ltMedian-=cnt;
            if(valAdd < mdn) ltMedian+=cnt;
            kHist[valRemove]-=cnt;
            kHist[valAdd]+=cnt;
        }

        const xStart = Math.max(0, x-r);
        const xEnd = Math.min(w-1, x+r);
        let ofsRemove = yRemove*w + xStart;
        let ofsAdd = yAdd*w + xStart;
        for(let i = xStart; i <= xEnd; i++) {
            const valRemove = input[ofsRemove++];
            const valAdd = input[ofsAdd++];
            if(valRemove < mdn) ltMedian--;
            if(valAdd < mdn) ltMedian++;
            kHist[valRemove]--;
            kHist[valAdd]++;
        }
    }

    function initKernelHist(x:number, y:number) {
        kHist.fill(0);
        for(let j = y - r; j < y + r + 1; j++) {
            for(let i = x - r; i < x + r + 1; i++) {
                const val = getPixelRepeat(input, w, h, i, j, 0);
                kHist[val]++;
            }
        }
    }

    let ofs = 0;
    for(let x = 0; x < w; x++) {
        ofs = x;
        mdn = 0;
        ltMedian = 0;
        initKernelHist(x, 0);
        for(let y = 0; y < h; y++) {
            updateMedian();
            output[ofs] = mdn;
            ofs += w;
            updateKernelHist(x, y);
        }
    }
}