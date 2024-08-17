precision highp float;
uniform vec4 u_rDst;
uniform sampler2D u_texSrc;
uniform sampler2D u_texGrd;
varying vec2 uv;

uniform float u_sharpness;
uniform float u_anisotropy;

vec2 texSize = vec2(u_rDst.z, u_rDst.w);
vec2 PIX = vec2(1.0/u_rDst.z, 1.0/u_rDst.w);


vec4 computeStructureTensor(vec2 xy) {
    float XX = 0.0;
    float YY = 0.0;
    float XY = 0.0;

    float sx = 0.0;
    float sy = 0.0;

    float NB = 0.0;
    for(int y = -15; y <= 15; y++) {
        for(int x = -15; x <= 15; x++) {
            sx = texture2D(u_texGrd, xy+vec2(float(x),float(y))*PIX)[2];
            sy = texture2D(u_texGrd, xy+vec2(float(x),float(y))*PIX)[3];
            XX = XX + sx*sx;
            YY = YY + sy*sy;
            XY = XY + sx*sy;
            NB++;
        }
    }

    float a = XX / NB;
    float b = XY / NB;
    float c = b;
    float d = YY / NB;

    float e = a + d;
    float f = sqrt(max(e*e - 4.0*(a*d - b*c), 0.0));
    float l1 = 0.5*(e - f);
    float l2 = 0.5*(e + f);
    float n = sqrt((l2-a)*(l2-a) + b*b);

    vec2 u;
    vec2 v;

    if(n > 0.0) {
        u.x = b / n;
        u.y = (l2 - a)/n;
    } else {
        u.x = 1.0;
        u.y = 0.0;
    }
    v.x = -u.y;
    v.y = u.x;

    if(l1 < l2) {
        float tmp;
        tmp = l2;
        l1 = l2;
        l2 = tmp;
        tmp = v.x;
        v.x = u.x;
        u.x = tmp;
        tmp = v.y;
        v.y = u.y;
        u.y = tmp;
    }

    u = normalize(u);
    v = normalize(v);

    //compute diffusion tensor
    if(l1 <= 0.0) l1 = 0.0;
    if(l2 <= 0.0) l2 = 0.0;

    float power1 = max(u_sharpness, 1e-5);
    float power2 = power1/(1e-7 + 1.0 - u_anisotropy);

    float n1 = pow(1.0 + l1 + l2, -power1);
    float n2 = pow(1.0 + l1 + l2, -power2);

    float d0 = n1*u.x*u.x + n2*v.x*v.x;
    float d1 = n1*u.x*u.y + n2*v.x*v.y;
    float d2 = n1*u.y*u.y + n2*v.y*v.y;

    return vec4(d0,d1,d2,1.0);
}

void main( void ) {
    gl_FragColor = computeStructureTensor(uv);
}