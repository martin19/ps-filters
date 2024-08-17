import {U8Array} from "./Types";

let p = new Uint32Array(512);

export function randomizePerlin() {
  const permutation = new Uint8Array(256);
  for(let i = 0; i < 256; i++) permutation[i] = i;
  const shuffled = shuffle(permutation);
  for (let i=0; i < 256 ; i++) p[256+i] = p[i] = shuffled[i];
}

export function shuffle(array:U8Array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

function lerp(t:number, a:number, b:number) {
  return a + t * (b - a);
}

function fade(t:number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function grad(hash:number, x:number, y:number, z:number) {
  const h = hash & 15;
  const u = h<8 ? x : y,
    v = h<4 ? y : h==12||h==14 ? x : z;
  return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v);
}

export function perlinNoise(x:number, y:number, z:number) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x = x - Math.floor(x);
  y = y - Math.floor(y);
  z = z - Math.floor(z);
  let u = fade(x);
  let v = fade(y);
  let w = fade(z);
  let A = p[X  ]+Y;
  let AA = p[A]+Z;
  let AB = p[A+1]+Z;
  let B = p[X+1]+Y;
  let BA = p[B]+Z;
  let BB = p[B+1]+Z;
  return lerp(w, lerp(v, lerp(u, grad(p[AA  ], x  , y  , z   ),
    grad(p[BA  ], x-1, y  , z   )),
    lerp(u, grad(p[AB  ], x  , y-1, z   ),
      grad(p[BB  ], x-1, y-1, z   ))),
    lerp(v, lerp(u, grad(p[AA+1], x  , y  , z-1 ),
      grad(p[BA+1], x-1, y  , z-1 )),
      lerp(u, grad(p[AB+1], x  , y-1, z-1 ),
        grad(p[BB+1], x-1, y-1, z-1 ))));
}

//fractal brownian motion
export function fbm(x:number, y:number, z:number, octaves:number) {
  let noiseSum = 0.0;
  let freq = 1.0;
  let amp = 1.0;

  for(let i = 0; i < octaves; i++) {
    noiseSum += perlinNoise(
      (x*freq),
      (y*freq),
      (z*freq)) * amp;
    amp *= 0.5;
    freq *= 2.0;
  }

  return noiseSum;
}

export function sourceOver(a:number, b:number, alpha:number) {
  return alpha * a + (1-alpha) * b;
}