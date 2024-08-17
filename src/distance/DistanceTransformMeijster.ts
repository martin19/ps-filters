import {U8Array} from "../utils/Types";

const jmax = Math.max;
const jmin = Math.min;

function fEuclidean(x_i:number, gi:number) {
  return Math.sqrt((x_i*x_i)+gi*gi);
  // return (x_i*x_i)+gi*gi; //vinnie is missing sqrt
}

function sepEuclidean(i:number, u:number, gi:number, gu:number, inf:number) {
  return (u*u - i*i + gu*gu - gi*gi) / (2*(u-i));
}

function fManhattan(x_i:number, gi:number) {
  return Math.abs(x_i) + gi;
}

function sepManhattan(i:number, u:number, gi:number, gu:number, inf:number) {
    const u_i = u - i;
    if (gu >= gi + u_i)
      return inf;
    else if (gi > gu + u_i)
      return -inf;
    else
      return (gu - gi + u + i) / 2;
}

function fChess(x_i:number, gi:number) {
  return jmax (Math.abs(x_i), gi);
}

function sepChess(i:number, u:number, gi:number, gu:number, inf:number) {
  if (gi <= gu)
    return jmax (i+gu, (i+u)/2);
  else
    return jmin (u-gi, (i+u)/2);
}

interface Metric {
  f: (x_i: number, gi: number) => number;
  sep: (i: number, u: number, gi: number, gu: number, inf: number) => number;
}

export function distanceTransformMetric(value:"euclidean"|"manhattan"|"chess"):Metric {
  switch(value) {
    case "euclidean": return { f : fEuclidean, sep : sepEuclidean };
    case "manhattan": return { f : fManhattan, sep : sepManhattan };
    case "chess": return { f : fChess, sep : sepChess };
  }
}

export function distanceTransformMeijster(input:U8Array, output:Int32Array, m:number, n:number, options? : { metric?: Metric, threshold?: number}) {
  const threshold = options?.threshold ?? 0;
  const metric = options?.metric ?? distanceTransformMetric("manhattan");

  const g = new Int32Array(m*n);

  const inf = m + n;

  // phase 1
  {
    for (let x = 0; x < m; ++x) {
      g[x] = (input[x] > 0) ? 0 : inf;

      // scan 1
      for (let y = 1; y < n; ++y) {
        const ym = y*m;
        g [x+ym] = input[ym+x] > threshold ? 0 : 1 + g[x+ym-m];
      }

      // scan 2
      for (let y = n-2; y >=0; --y) {
        const ym = y*m;
        if (g [x+ym+m] < g [x+ym])
          g [x+ym] = 1 + g[x+ym+m];
      }
    }
  }

  // phase 2
  {
    const s = new Int32Array(jmax (m, n));
    const t = new Int32Array(jmax (m, n));

    for (let y = 0; y < n; ++y) {
      let q = 0;
      s[0] = 0;
      t[0] = 0;

      const ym = y*m;

      // scan 3
      for (let u = 1; u < m; ++u) {
        while (q >= 0 && metric.f (t[q]-s[q], g[s[q]+ym]) > metric.f (t[q]-u, g[u+ym]))
          q--;

        if (q < 0) {
          q = 0;
          s [0] = u;
        } else {
          const w = 1 + metric.sep (s[q], u, g[s[q]+ym], g[u+ym], inf);
          if (w < m) {
            ++q;
            s[q] = u;
            t[q] = w;
          }
        }
      }

      // scan 4
      for(let u = m-1; u >= 0; --u) {
        const d = metric.f (u-s[q], g[s[q]+ym]);
        output[y*m+u] = d;
        if (u == t[q])
          --q;
      }
    }
  }
}

function floor_fixed8 (x:number) {
  return Math.floor(x / 256) * 256;
  // return x & (~0xff);
  // return Math.floor(x);
  // return Math.floor(x/256);
  // return x;
}

export function distanceTransformMeijsterAA(input:U8Array, output:Int32Array, m:number, n:number, metric:Metric) {
  const scale = 256;

  const g = new Float64Array(m*n);

  const inf = scale * (m + n);

  // phase 1
  {
    for(let x = 0; x < m; ++x) {
      let a;

      a = input[x];

      if (a == 0)
        g [x] = inf;
      else if (a == 255)
        g [x] = 0;
      else
        g [x] = 255-a;
      // if (a == 0)
      //   g [x] = 0;
      // else if (a == 255)
      //   g [x] = inf;
      // else
      //   g [x] = a;

      // scan 1
      for (let y = 1; y < n; ++y) {
        const idx = x+y*m;

        a = input[idx];
        if (a == 0)
          g [idx] = scale + g[idx-m];
        else if (a == 255)
          g [idx] = 0;
        else
          g [idx] = 255-a;
      }

      // scan 2
      for (let y = n-2; y >=0; --y) {
        const idx = x+y*m;
        const d = scale + g[idx+m];
        if (g [idx] > d)
          g [idx] = d;
      }
    }
  }

  // for(let i = 0; i < g.length; i++) {
  //   output[i] = g[i];
  // }
  // return;

  // phase 2
  {
    const s = new Int32Array(jmax (m, n));
    const t = new Float64Array(jmax (m, n)); // scaled <-- this is int64 array in vinnie's code

    for (let y = 0; y < n; ++y) {
      let q = 0;
      s [0] = 0;
      t [0] = 0;

      const ym = y*m;

      // scan 3
      for (let u = 1; u < m; ++u) {
        while (q >= 0 && metric.f (floor_fixed8(t[q]) - scale*s[q], g[s[q]+ym]) >
        metric.f (floor_fixed8(t[q]) - scale*u, g[u+ym])) {
          q--;
        }

        if (q < 0) {
          q = 0;
          s [0] = u;
        } else {
          const w = scale + metric.sep (scale*s[q], scale*u, g[s[q]+ym], g[u+ym], inf);

          if (w < scale * m) {
            ++q;
            s[q] = u;
            t[q] = w;
          }
        }
      }

      // scan 4
      for (let u = m-1; u >= 0; --u) {
        const d = metric.f (scale*(u-s[q]), g[s[q]+ym]);
        output[y*m+u] = d;
        if (u == Math.floor(t[q]/scale)) //had to put a math floor here, not sure if this is correct
          --q;
      }
    }
  }
}