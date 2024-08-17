precision highp float;
uniform vec4 u_rDst;
uniform sampler2D u_texSrc;
uniform int u_channelIndex;
uniform float u_sigma;
varying vec2 uv;

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

vec4 gauss(vec2 xy) {

    float g1 = gauss2d(vec2(-1.0, -1.0), 0.0, u_sigma, u_sigma);
    float g2 = gauss2d(vec2( 0.0, -1.0), 0.0, u_sigma, u_sigma);
    float g3 = gauss2d(vec2(+1.0, -1.0), 0.0, u_sigma, u_sigma);
    float g4 = gauss2d(vec2(-1.0,  0.0), 0.0, u_sigma, u_sigma);
    float g5 = gauss2d(vec2( 0.0,  0.0), 0.0, u_sigma, u_sigma);
    float g6 = gauss2d(vec2(+1.0,  0.0), 0.0, u_sigma, u_sigma);
    float g7 = gauss2d(vec2(-1.0, +1.0), 0.0, u_sigma, u_sigma);
    float g8 = gauss2d(vec2( 0.0, +1.0), 0.0, u_sigma, u_sigma);
    float g9 = gauss2d(vec2(+1.0, +1.0), 0.0, u_sigma, u_sigma);

    vec4 v1 = texture2D(u_texSrc, xy+vec2(-PIX.x, -PIX.y)) * g1;
    vec4 v2 = texture2D(u_texSrc, xy+vec2(   0.0, -PIX.y)) * g2;
    vec4 v3 = texture2D(u_texSrc, xy+vec2(+PIX.x, -PIX.y)) * g3;
    vec4 v4 = texture2D(u_texSrc, xy+vec2(-PIX.x,    0.0)) * g4;
    vec4 v5 = texture2D(u_texSrc, xy+vec2(   0.0,    0.0)) * g5;
    vec4 v6 = texture2D(u_texSrc, xy+vec2(+PIX.x,    0.0)) * g6;
    vec4 v7 = texture2D(u_texSrc, xy+vec2(-PIX.x, +PIX.y)) * g7;
    vec4 v8 = texture2D(u_texSrc, xy+vec2(   0.0, +PIX.y)) * g8;
    vec4 v9 = texture2D(u_texSrc, xy+vec2(+PIX.x, +PIX.y)) * g9;
    return (v1+v2+v3+v4+v5+v6+v7+v8+v9)*vec4(1.0/(g1+g2+g3+g4+g5+g6+g7+g8+g9));
}

void main( void ) {
    vec4 val = gauss(uv);
    vec4 res = texture2D(u_texSrc, uv);
    if(u_channelIndex == 0) {
        res[0] = val[0];
    } else if(u_channelIndex == 1) {
        res[1] = val[1];
    } else if(u_channelIndex == 2) {
        res[2] = val[2];
    } else if(u_channelIndex == 3) {
        res[3] = val[3];
    }
    gl_FragColor = val;
}