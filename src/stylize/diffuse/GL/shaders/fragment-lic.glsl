precision highp float;
uniform vec4 u_rDst;
uniform sampler2D u_texSrc;
uniform sampler2D u_texStuctureTensor;
varying vec2 uv;

uniform float u_amplitude;
uniform float u_da;
uniform float u_dl;
uniform float u_gaussPrec;

const float PI = 3.14159265359;
const int len = 30;

vec2 texSize = vec2(u_rDst.z, u_rDst.w);
vec2 PIX = vec2(1.0/u_rDst.z, 1.0/u_rDst.w);

float computeLIC(vec2 xy) {
    float namplitude = u_amplitude;
    float sqrt2amplitude = sqrt(2.0*namplitude);
    float O[12];

    for(int j = 0; j < 12; j++) {
        float theta = float(j)*30.0;
        float thetar = float(theta) * PI/180.0;
        float vx = cos(thetar);
        float vy = sin(thetar);

        vec4 d = texture2D(u_texStuctureTensor, xy);
        float u = d[0] * vx + d[1] * vy;
        float v = d[1] * vx + d[2] * vy;
        float n = max(1e-5, sqrt(u*u+v*v));
        float fsigma = n*sqrt2amplitude;
        float fsigma2 = 2.0*fsigma*fsigma;
        float length = u_gaussPrec*fsigma;

        O[j] = 0.0;
        float S = 0.0;
        float X = xy.x;
        float Y = xy.y;
        float l = 0.0;
        for(int i = 0; i<200; i++) {
            if(l < length) {
                float cx = X+0.5*PIX.x;
                float cy = Y+0.5*PIX.y;

                vec4 d = texture2D(u_texStuctureTensor, vec2(cx, cy));
                float u = d[0] * vx + d[1] * vy;
                float v = d[1] * vx + d[2] * vy;
                float dln = u_dl/n;
                float w0 = u*dln;
                float w1 = v*dln;
                float w2 = n;


                float coef = exp(-l * l / fsigma2);
//                float coef = 1.0;
                float I = texture2D(u_texSrc, vec2(cx, cy)).r;
                O[j] = O[j] + I * coef;

                X += w0*PIX.x;
                Y += w1*PIX.y;
                l += u_dl;
                S += coef;
            }
        }
        if(S > 0.0) {
            O[j] = min(1.0, max(0.0, O[j]/S));
        }
    }

    float R = 0.0;
    for(int i = 0; i < 12; i++) {
        R = R + O[i];
    }
    R = R/12.0;
    return R;
}

void main( void ) {
    float res = computeLIC(uv);
    gl_FragColor = vec4(res, res, res, 1.0);
}