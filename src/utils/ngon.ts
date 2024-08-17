import {lerp} from "./utils-filter";

export function createNgon(n:number, angleDeg:number, radius:number, curvature:number):number[][] {
  const angle = (angleDeg/180)*Math.PI;
  const r = radius;
  //generate n-gon with r
  const X = [];
  let a = angle;
  const da = 2*Math.PI / n;
  for(let c = 0; c < n; c++) {
    const x1 = Math.cos(a) * r;
    const y1 = Math.sin(a) * r;
    const x2 = Math.cos(a + da) * r;
    const y2 = Math.sin(a + da) * r;
    const d = radius;
    for(let i = 0; i <= d; i++) {
      const xl = x1 + (x2-x1)*(i/d);
      const yl = y1 + (y2-y1)*(i/d);
      const len = Math.sqrt(xl*xl+yl*yl);
      const xc = xl * r/len;
      const yc = yl * r/len;
      const x = lerp(xl, xc, 1.0 - curvature);
      const y = lerp(yl, yc, 1.0 - curvature);
      X.push([x,y]);
    }
    a += da;
  }
  return X;
}