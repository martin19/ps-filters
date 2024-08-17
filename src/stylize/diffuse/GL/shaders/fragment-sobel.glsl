precision highp float;
uniform vec4 u_rDst;
uniform sampler2D u_texSrc;
uniform float u_strength;
uniform int u_channelIndex;
varying vec2 uv;

const float PI = 3.14159265359;

vec2 texSize = vec2(u_rDst.z, u_rDst.w);
vec2 PIX = vec2(1.0/u_rDst.z, 1.0/u_rDst.w);


vec4 sobelX(vec2 xy) {
    vec4 v1 = texture2D(u_texSrc, xy-vec2(PIX.x, 0.0)) * -1.0;
    vec4 v2 = texture2D(u_texSrc, xy-vec2(PIX.x, 0.0)) * -2.0;
    vec4 v3 = texture2D(u_texSrc, xy-vec2(PIX.x, 0.0)) * -1.0;
    vec4 v4 = texture2D(u_texSrc, xy+vec2(PIX.x, 0.0)) * +1.0;
    vec4 v5 = texture2D(u_texSrc, xy+vec2(PIX.x, 0.0)) * +2.0;
    vec4 v6 = texture2D(u_texSrc, xy+vec2(PIX.x, 0.0)) * +1.0;
    return (v1+v2+v3+v4+v5+v6)/vec4(9);
}

vec4 sobelY(vec2 xy) {
    vec4 v1 = texture2D(u_texSrc, xy-vec2(0.0, PIX.y)) * -1.0;
    vec4 v2 = texture2D(u_texSrc, xy-vec2(0.0, PIX.y)) * -2.0;
    vec4 v3 = texture2D(u_texSrc, xy-vec2(0.0, PIX.y)) * -1.0;
    vec4 v4 = texture2D(u_texSrc, xy+vec2(0.0, PIX.y)) * +1.0;
    vec4 v5 = texture2D(u_texSrc, xy+vec2(0.0, PIX.y)) * +2.0;
    vec4 v6 = texture2D(u_texSrc, xy+vec2(0.0, PIX.y)) * +1.0;
    return (v1+v2+v3+v4+v5+v6)/vec4(9);
}

float atan2(vec2 dir) {
    float angle = asin(dir.x) > 0.0 ? acos(dir.y) : -acos(dir.y);
    return angle;
}

void main( void ) {
    //TODO: only red channel now.
    float sx = sobelX(uv).r;
    float sy = sobelY(uv).r;
    //compute gradient magnitude and direction
    float M = sqrt(sx*sx+sy*sy);
    float D = (atan(sy/sx) + (PI/2.0))/PI;
    gl_FragColor = vec4(M,D,sx,sy);
}