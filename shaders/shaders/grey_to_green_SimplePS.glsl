#version 330

uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D texture0;

out vec4 outColor;

void main()
{
    vec2 uv = gl_FragCoord.xy/uResolution;
    vec4 sample =  texture(texture0, uv);
	float grey = 0.21 * sample.r + 0.71 * sample.g + 0.07 * sample.b;
	
    outColor = vec4(0, grey, 0, 1);
}