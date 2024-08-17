precision highp float;
uniform vec4 u_rDst;
uniform sampler2D u_texSrc;
uniform sampler2D u_texGrd;
uniform float u_strength;
uniform float u_sigmax;
uniform float u_sigmay;
uniform int u_channelIndex;
varying vec2 uv;

const float PI = 3.14159265359;

vec2 texSize = vec2(u_rDst.z, u_rDst.w);
vec2 PIX = vec2(1.0/u_rDst.z, 1.0/u_rDst.w);

float gauss2d(vec2 xy, float theta, float sigma1, float sigma2) {
    float cc = cos(theta);
    float ss = sin(theta);
    float sss = sin(2.0*theta);

    float a = ((cc*cc) / (2.0*sigma1*sigma1)) + ((ss*ss) / (2.0*sigma2*sigma2));
    float b = -(sss / (4.0*sigma1*sigma1)) + (sss / (4.0*sigma2*sigma2));
    float c = ((ss*ss) / (2.0*sigma1*sigma1)) + ((cc*cc) / (2.0*sigma2*sigma2));

    float A = 1.0;
    float g = A*exp(-(a*xy.x*xy.x + 2.0*b*xy.x*xy.y + c*xy.y*xy.y));
    return g;
}

//computes rotated gaussian
float applyGaussRot3x3(vec2 xy, float theta, float sigmax, float sigmay) {
    float g1 = gauss2d(vec2(-1.0,-1.0), theta, sigmax, sigmay);
    float g2 = gauss2d(vec2( 0.0,-1.0), theta, sigmax, sigmay);
    float g3 = gauss2d(vec2(+1.0,-1.0), theta, sigmax, sigmay);
    float g4 = gauss2d(vec2(-1.0, 0.0), theta, sigmax, sigmay);
    float g5 = gauss2d(vec2( 0.0, 0.0), theta, sigmax, sigmay);
    float g6 = gauss2d(vec2(+1.0, 0.0), theta, sigmax, sigmay);
    float g7 = gauss2d(vec2(-1.0,+1.0), theta, sigmax, sigmay);
    float g8 = gauss2d(vec2( 0.0,+1.0), theta, sigmax, sigmay);
    float g9 = gauss2d(vec2(+1.0,+1.0), theta, sigmax, sigmay);

    float v1 = texture2D(u_texSrc, xy + vec2(-PIX.x,-PIX.y)).r;
    float v2 = texture2D(u_texSrc, xy + vec2(   0.0,-PIX.y)).r;
    float v3 = texture2D(u_texSrc, xy + vec2(+PIX.x,-PIX.y)).r;
    float v4 = texture2D(u_texSrc, xy + vec2(-PIX.x,   0.0)).r;
    float v5 = texture2D(u_texSrc, xy + vec2(   0.0,   0.0)).r;
    float v6 = texture2D(u_texSrc, xy + vec2(+PIX.x,   0.0)).r;
    float v7 = texture2D(u_texSrc, xy + vec2(-PIX.x,+PIX.y)).r;
    float v8 = texture2D(u_texSrc, xy + vec2(   0.0,+PIX.y)).r;
    float v9 = texture2D(u_texSrc, xy + vec2(+PIX.x,+PIX.y)).r;

    return (g1*v1 + g2*v2 + g3*v3 + g4*v4 + g5*v5 + g6*v6 + g7*v7 + g8*v8+ g9*v9) / (g1+g2+g3+g4+g5+g6+g7+g8+g9);
}

/*
float applySmoothingN8(vec2 xy, float theta) {
    float res;

    float v1 = texture2D(u_texSrc, xy + vec2(-PIX.x,-PIX.y)).r;
    float v2 = texture2D(u_texSrc, xy + vec2(   0.0,-PIX.y)).r;
    float v3 = texture2D(u_texSrc, xy + vec2(+PIX.x,-PIX.y)).r;
    float v4 = texture2D(u_texSrc, xy + vec2(-PIX.x,   0.0)).r;
    float v5 = texture2D(u_texSrc, xy + vec2(   0.0,   0.0)).r;
    float v6 = texture2D(u_texSrc, xy + vec2(+PIX.x,   0.0)).r;
    float v7 = texture2D(u_texSrc, xy + vec2(-PIX.x,+PIX.y)).r;
    float v8 = texture2D(u_texSrc, xy + vec2(   0.0,+PIX.y)).r;
    float v9 = texture2D(u_texSrc, xy + vec2(+PIX.x,+PIX.y)).r;

    if(theta >= 0.0 && theta < (1.0/8.0) || (theta > (7.0/8.0) && theta <= 1.0)) {
        //vertical
        res = (v4+2.0*v5+v6)/4.0;
    } else if(theta >= 1.0/8.0 && theta < 3.0/8.0) {
        //diagonal1
        res = (v3+2.0*v5+v7)/4.0;
    } else if(theta <= 7.0/8.0 && theta > 5.0/8.0) {
        //diagonal2
        res = (v1+2.0*v5+v9)/4.0;
    } else {
        //horizontal
        res = (v2+2.0*v5+v8)/4.0;
    }
    return res;
}
*/

void main( void ) {
    float M = texture2D(u_texGrd, uv).r;
    float theta = (texture2D(u_texGrd, uv).g * PI) - (PI/2.0);
    float res = applyGaussRot3x3(uv, theta, u_sigmax, u_sigmay);
    //float res = applySmoothingN8(uv, texture2D(u_texGrd, uv).g);
    gl_FragColor = vec4(res, res, res, 1.0);
}