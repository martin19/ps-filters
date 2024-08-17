import {U8Array} from "../utils/Types";
import {getPixelRepeat} from "../utils/utils-filter";

export function bilateralCtmf(input:U8Array, output:U8Array , w:number, h:number, radius:number, threshold:number) {
    const pixelsInWindow = (radius+radius+1)**2;
    const r = Math.floor(radius);

    const kHist = new Uint32Array(256);
    const cHist = new Uint32Array(w*256);


    const th = ((radius+radius+1)**2)/2;
    let currentValue = 0;


    function updateCurrentValue(x:number, y:number) {
        const val = input[y*w+x];
        let sumVals = 0;
        let sumWeights = 0;
        const valLo = Math.max(0, val-threshold);
        const valHi = Math.min(255, val+threshold);
        for(let i = valLo; i <= valHi; i++) {
            sumVals += kHist[i]*i;
            sumWeights += kHist[i];
        }
        currentValue = sumVals/sumWeights;
    }

    //initialize column histograms
    function initColumnHists(yy:number) {
        cHist.fill(0);
        for(let x = 0; x < w; x++) {
            for(let y = -r+yy; y < r+yy+1; y++) {
                const val = getPixelRepeat(input, w, h, x, y, 0);
                cHist[(x<<8) + val]++;
            }
        }
    }

    function updateColumnHists(y:number) {
        let ofsRemove;
        let ofsAdd;

        if(y-r < 0) ofsRemove = 0;
        else ofsRemove = w*(y-r);
        if(y+r+1 >= h) ofsAdd = w*(h-1);
        else ofsAdd = w*(y+r+1);
        for(let x = 0; x < w; x++) {
            const remove = input[ofsRemove++];
            const add = input[ofsAdd++];
            cHist[(x<<8)+remove]--;
            cHist[(x<<8)+add]++;
        }
    }

    function initKernelHist() {
        kHist.fill(0);
        for(let x = 0; x < r; x++) {
            for(let i = 0; i < 256; i++) {
                kHist[i] += cHist[i];
            }
        }
        for(let x = 0; x <= r; x++) {
            let ofs = x*256;
            for(let i = 0; i < 256; i++) {
                kHist[i] += cHist[ofs++];
            }
        }
    }

    function updateKernelHist(x:number, y:number) {
        const leftBorder = x - r < 0;
        const rightBorder = x + r + 1 >= w;

        let offset = leftBorder ? 0 : 256 * (x - r);
        let offset2 = rightBorder ? 256 * (w - 1) : 256*(x + r + 1);

        if(leftBorder) {
            for(let i = 0; i < 256; i++) kHist[i] -= cHist[i];
        } else {
            for(let i = 0; i < 256; i++) kHist[i] -= cHist[(x - r)*256+i];
        }

        if(rightBorder) {
            for(let i = 0; i < 256; i++) kHist[i] += cHist[(w-1)*256+i];
        } else {
            for(let i = 0; i < 256; i++) kHist[i] += cHist[(x + r + 1)*256+i];
        }
    }

    initColumnHists(0);
    let ofs = 0;
    for(let y = 0; y < h; y++) {
        initKernelHist(/*y*/);
        for(let x = 0; x < w; x++) {
            updateCurrentValue(x, y);
            output[ofs++] = currentValue;
            updateKernelHist(x, y);
        }
        updateColumnHists(y);

    }
}