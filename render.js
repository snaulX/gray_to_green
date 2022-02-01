const vsSource = `
attribute vec2 inPos;

void main() 
{
    gl_Position = vec4(inPos, 0.0, 1.0);
}`;
const fsSource = `
precision mediump float;

uniform vec2 uResolution;
uniform sampler2D uTexture;

void main()
{
    vec2 uv = gl_FragCoord.xy/uResolution;
    vec4 sample =  texture2D(uTexture, uv);
    gl_FragColor = sample;
	float grey = 0.21 * sample.r + 0.71 * sample.g + 0.07 * sample.b;
	
    gl_FragColor = vec4(0, grey, 0, 1);
}`;

var canvas, gl, vp_size, prog, bufObj = {};
var texture;

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

function loadTexture(url) {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        width, height, border, srcFormat, srcType,
        pixel);
    
    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
            srcFormat, srcType, image);

        // WebGL1 has different requirements for power of 2 images
        // vs non power of 2 images so check if the image is a
        // power of 2 in both dimensions.
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // No, it's not a power of 2. Turn off mips and set
            // wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        render();
    };
    image.src = url;
}

function loadShader(progDraw, source, shaderType) {
    let shaderObj = gl.createShader(shaderType);
    gl.shaderSource(shaderObj, source);
    gl.compileShader(shaderObj);
    let status = gl.getShaderParameter(shaderObj, gl.COMPILE_STATUS);
    if (!status) alert(gl.getShaderInfoLog(shaderObj));
    gl.attachShader(progDraw, shaderObj);
    gl.linkProgram(progDraw);
}

function loadImage() {
    let image = document.getElementById("image-file").files[0];
    try {
        loadTexture(URL.createObjectURL(image));
    } catch (e) {
        alert("You didn't upload the file");
        return;
    }
}

function initScene() {
    canvas = document.getElementById("ogl-canvas");
    gl = canvas.getContext("webgl",
        {
            antialias: false,
            depth: false
        });
    if (!gl)
        return;

    progDraw = gl.createProgram();
    loadShader(progDraw, vsSource, gl.VERTEX_SHADER);
    loadShader(progDraw, fsSource, gl.FRAGMENT_SHADER);
    let status = gl.getProgramParameter(progDraw, gl.LINK_STATUS);
    if (!status) alert(gl.getProgramInfoLog(progDraw));
    progDraw.inPos = gl.getAttribLocation(progDraw, "inPos");
    progDraw.uTexture = gl.getUniformLocation(progDraw, "uTexture");
    progDraw.uResolution = gl.getUniformLocation(progDraw, "uResolution");
    gl.useProgram(progDraw);

    const pos = [-1, -1, 1, -1, 1, 1, -1, 1];
    const inx = [0, 1, 2, 0, 2, 3];
    bufObj.pos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufObj.pos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
    bufObj.inx = gl.createBuffer();
    bufObj.inx.len = inx.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufObj.inx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(inx), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(progDraw.inPos);
    gl.vertexAttribPointer(progDraw.inPos, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    render();
}

function render() {
    const resolution = document.getElementById("resolution").value;
    canvas.width = canvas.height = resolution;
    gl.viewport(0, 0, resolution, resolution);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Tell WebGL we want to affect texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    // Bind the texture to texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Tell the shader we bound the texture to texture unit 0
    gl.uniform1i(progDraw.uTexture, 0);
    gl.uniform2f(progDraw.uResolution, resolution, resolution);
    gl.drawElements(gl.TRIANGLES, bufObj.inx.len, gl.UNSIGNED_SHORT, 0);
}

initScene();