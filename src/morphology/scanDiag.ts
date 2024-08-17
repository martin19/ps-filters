/**
 * Diagonal scan
 * @param w - width of image
 * @param h - height of image
 * @param sx - start position x (0 = left, 1 = right)
 * @param sy - start position y (0 = top, 1 = bottom)
 * @param dir - direction of scan (+1 x->y, -1 y->x)
 * @param cb - callback for each coordinate
 */
export function scanDiag(w : number, h : number, sx:0|1, sy:0|1, dir:1|-1, cb:(x:number,y:number,i:number)=>void) {
    function not(val:number) {
        return val === 1 ? 0 : 1;
    }

    const lim00 = dir === 1 ? sx * (w-1) : sy * (h-1);
    const lim01 = dir === 1 ? not(sx) * (w-1) : not(sy) * (h-1);
    const i0 = lim01 > lim00 ? +1 : -1;
    const lim0Hi = Math.max(lim00, lim01);
    const lim0Lo = Math.min(lim00, lim01);

    const lim10 = dir === 1 ? sy * (h-1) : sx * (w-1);
    const lim11 = dir === 1 ? not(sy) * (h-1) : not(sx) * (w-1);
    const i1 = lim11 > lim10 ? +1 : -1;
    const lim1Hi = Math.max(lim10, lim11);
    const lim1Lo = Math.min(lim10, lim11);

    const d0 = -i0;
    const d1 = +i1;

    let diagIndex = 0;
    //first triangle
    for(let i = lim00; i >= lim0Lo && i <= lim0Hi; i += i0) {
        for(let j0 = i, j1 = lim10; j0 >= 0 && j1 >= 0 && j0 <= lim0Hi && j1 <= lim1Hi; j0+=d0, j1+=d1) {
            const x = dir === 1 ? j0 : j1;
            const y = dir === 1 ? j1 : j0;
            cb(x,y,diagIndex);
        }
        diagIndex++;
    }

    //second triangle
    for(let i = lim10; i >= lim1Lo && i <= lim1Hi; i += i1) {
        for(let j0 = i+d1, j1 = lim01; j0 >= 0 && j1 >= 0 && j0 <= lim1Hi && j1 <= lim0Hi; j0+=d1, j1+=d0) {
            const x = dir === 1 ? j1 : j0;
            const y = dir === 1 ? j0 : j1;
            cb(x,y,diagIndex);
        }
        diagIndex++;
    }
}


// export function scanDiagonally1(w : number, h : number) {
//     let i, j;
//
//     // left arrows
//     for(let i = 0; i < h; i++) {
//         for(let y = i, x = 0; y >= 0 && x < w; x++, y--) {
//             console.log(`[${x}][${y}]`)
//         }
//     }
//
//     // bottom arrows
//     for(let i = 0; i < w; i++) {
//         for(let x = i+1, y = h-1; y >= 0 && x < w; x++, y--) {
//             console.log(`[${x}][${y}]`)
//         }
//     }
// }
