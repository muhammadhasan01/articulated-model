"use strict";

let canvas;
let gl;
let program;

let projectionMatrix;
let modelViewMatrix;

let instanceMatrix;

let modelViewMatrixLoc;
let normalViewMatrixLoc;

let vertices = [
    vec4(-0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, 0.5, 0.5, 1.0),
    vec4(0.5, 0.5, 0.5, 1.0),
    vec4(0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5, 0.5, -0.5, 1.0),
    vec4(0.5, 0.5, -0.5, 1.0),
    vec4(0.5, -0.5, -0.5, 1.0)
];


let torsoId = 0;
let headId = 1;
let head1Id = 1;
let head2Id = 10;
let leftUpperArmId = 2;
let leftLowerArmId = 3;
let rightUpperArmId = 4;
let rightLowerArmId = 5;
let leftUpperLegId = 6;
let leftLowerLegId = 7;
let rightUpperLegId = 8;
let rightLowerLegId = 9;


let torsoHeight = 4.0;
let torsoWidth = 4.5;
let upperArmHeight = 1.5;
let lowerArmHeight = 1.5;
let upperArmWidth = 1.0;
let lowerArmWidth = 0.5;
let upperLegWidth = 1.0;
let lowerLegWidth = 0.5;
let lowerLegHeight = 2.0;
let upperLegHeight = 3.0;
let headHeight = 1.5;
let headWidth = 1.5;

let zoomValue = 0.0;

let numNodes = 10;

let theta = [0, 0, 0, 0, 0, 0, 180, 0, 180, 0, 0];
let stack = [];

let environmentMap = [];

for (let i = 0; i < numNodes; i++) environmentMap[i] = createNode(null, null, null, null);

let pointsArray = [];
let normalsArray = [];

function scale4(a, b, c) {
    let result = mat4();
    result[0][0] = a;
    result[1][1] = b;
    result[2][2] = c;
    return result;
}

function createNode(transform, render, sibling, child) {
    return {
        transform: transform,
        render: render,
        sibling: sibling,
        child: child
    }
}

function initNodes(Id) {

    let m = mat4();

    switch (Id) {

        case torsoId:

            m = rotate(theta[torsoId], 0, 1, 0);
            environmentMap[torsoId] = createNode(m, torso, null, headId);
            break;

        case headId:
        case head1Id:
        case head2Id:


            m = translate(0.0, torsoHeight + 0.5 * headHeight, 0.0);
            m = mult(m, rotate(theta[head1Id], 1, 0, 0))
            m = mult(m, rotate(theta[head2Id], 0, 1, 0));
            m = mult(m, translate(0.0, -0.5 * headHeight, 0.0));
            environmentMap[headId] = createNode(m, head, leftUpperArmId, null);
            break;


        case leftUpperArmId:

            m = translate(-(torsoWidth + upperArmWidth) * 0.5, 0.7 * torsoHeight, 0.0);
            m = mult(m, rotate(theta[leftUpperArmId], 1, 0, 0));
            environmentMap[leftUpperArmId] = createNode(m, leftUpperArm, rightUpperArmId, leftLowerArmId);
            break;

        case rightUpperArmId:

            m = translate((torsoWidth + upperArmWidth) * 0.5, 0.7 * torsoHeight, 0.0);
            m = mult(m, rotate(theta[rightUpperArmId], 1, 0, 0));
            environmentMap[rightUpperArmId] = createNode(m, rightUpperArm, leftUpperLegId, rightLowerArmId);
            break;

        case leftUpperLegId:

            m = translate(-(torsoWidth + upperLegWidth) * 0.2, 0.01 * upperLegHeight, 0.0);
            m = mult(m, rotate(theta[leftUpperLegId], 1, 0, 0));
            environmentMap[leftUpperLegId] = createNode(m, leftUpperLeg, rightUpperLegId, leftLowerLegId);
            break;

        case rightUpperLegId:

            m = translate((torsoWidth + upperLegWidth) * 0.2, 0.01 * upperLegHeight, 0.0);
            m = mult(m, rotate(theta[rightUpperLegId], 1, 0, 0));
            environmentMap[rightUpperLegId] = createNode(m, rightUpperLeg, null, rightLowerLegId);
            break;

        case leftLowerArmId:

            m = translate(0.0, upperArmHeight, 0.0);
            m = mult(m, rotate(theta[leftLowerArmId], 1, 0, 0));
            environmentMap[leftLowerArmId] = createNode(m, leftLowerArm, null, null);
            break;

        case rightLowerArmId:

            m = translate(0.0, upperArmHeight, 0.0);
            m = mult(m, rotate(theta[rightLowerArmId], 1, 0, 0));
            environmentMap[rightLowerArmId] = createNode(m, rightLowerArm, null, null);
            break;

        case leftLowerLegId:

            m = translate(0.0, upperLegHeight, 0.0);
            m = mult(m, rotate(theta[leftLowerLegId], 1, 0, 0));
            environmentMap[leftLowerLegId] = createNode(m, leftLowerLeg, null, null);
            break;

        case rightLowerLegId:

            m = translate(0.0, upperLegHeight, 0.0);
            m = mult(m, rotate(theta[rightLowerLegId], 1, 0, 0));
            environmentMap[rightLowerLegId] = createNode(m, rightLowerLeg, null, null);
            break;

    }

}

function traverse(Id) {

    if (Id == null) return;
    stack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, environmentMap[Id].transform);
    environmentMap[Id].render();
    if (environmentMap[Id].child != null) traverse(environmentMap[Id].child);
    modelViewMatrix = stack.pop();
    if (environmentMap[Id].sibling != null) traverse(environmentMap[Id].sibling);
}

function uniformMatrix() {
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    let normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];
    gl.uniformMatrix3fv(normalViewMatrixLoc, false, flatten(normalMatrix));
}

function torso() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * torsoHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(torsoWidth, torsoHeight, torsoWidth));
    uniformMatrix();
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 6 * i, 6);
}

function head() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * headHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(headWidth, headHeight, headWidth));
    uniformMatrix();
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 6 * i, 6);
}

function leftUpperArm() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperArmHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(upperArmWidth, upperArmHeight, upperArmWidth));
    uniformMatrix();
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 6 * i, 6);
}

function leftLowerArm() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerArmHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(lowerArmWidth, lowerArmHeight, lowerArmWidth));
    uniformMatrix();
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 6 * i, 6);
}

function rightUpperArm() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperArmHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(upperArmWidth, upperArmHeight, upperArmWidth));
    uniformMatrix();
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 6 * i, 6);
}

function rightLowerArm() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerArmHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(lowerArmWidth, lowerArmHeight, lowerArmWidth));
    uniformMatrix();
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 6 * i, 6);
}

function leftUpperLeg() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperLegHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(upperLegWidth, upperLegHeight, upperLegWidth));
    uniformMatrix();
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 6 * i, 6);
}

function leftLowerLeg() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerLegHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(lowerLegWidth, lowerLegHeight, lowerLegWidth));
    uniformMatrix();
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 6 * i, 6);
}

function rightUpperLeg() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperLegHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(upperLegWidth, upperLegHeight, upperLegWidth));
    uniformMatrix();
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 6 * i, 6);
}

function rightLowerLeg() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerLegHeight, 0.0));
    instanceMatrix = mult(instanceMatrix, scale4(lowerLegWidth, lowerLegHeight, lowerLegWidth))
    uniformMatrix();
    for (let i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 6 * i, 6);
}

function quad(a, b, c, d) {
    let t1 = subtract(vertices[b], vertices[a]);
    let t2 = subtract(vertices[c], vertices[a]);
    let normal = cross(t1, t2);
    normal[3] = 0.0;

    pointsArray.push(vertices[a]);
    normalsArray.push(normal);

    pointsArray.push(vertices[b]);
    normalsArray.push(normal);

    pointsArray.push(vertices[c]);
    normalsArray.push(normal);

    pointsArray.push(vertices[a]);
    normalsArray.push(normal);

    pointsArray.push(vertices[c]);
    normalsArray.push(normal);

    pointsArray.push(vertices[d]);
    normalsArray.push(normal);
}


function cube() {
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
}

function configureCubeMap() {
    let cubeMap = gl.createTexture();
    let red = new Uint8Array([255, 0, 0, 255]);
    let green = new Uint8Array([0, 255, 0, 255]);
    let blue = new Uint8Array([0, 0, 255, 255]);
    let cyan = new Uint8Array([0, 255, 255, 255]);
    let magenta = new Uint8Array([255, 0, 255, 255]);
    let yellow = new Uint8Array([255, 255, 0, 255]);

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA,
        1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, red);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA,
        1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, green);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA,
        1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, blue);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA,
        1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, cyan);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA,
        1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, yellow);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA,
        1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, magenta);


    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 0);
}


window.onload = function init() {

    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas, null);
    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.7, 0.7, 0.7, 1.0);

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    instanceMatrix = mat4();

    cube();

    projectionMatrix = ortho(-10.0, 10.0, -10.0, 10.0, -10.0, 10.0);
    modelViewMatrix = mat4();

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    normalViewMatrixLoc = gl.getUniformLocation(program, "normalMatrix");

    let nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    let vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    let vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    let vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    configureCubeMap();

    document.getElementById("zoom").onclick = function(event) {
        zoomValue = event.target.value / 20.0;
        torsoHeight = 4.0 * zoomValue;
        torsoWidth = 1.0 * zoomValue;
        upperArmHeight = 2.0 * zoomValue;
        lowerArmHeight = 2.0 * zoomValue;
        upperArmWidth = 1.0 * zoomValue;
        lowerArmWidth = 0.5 * zoomValue;
        upperLegWidth = 1.0 * zoomValue;
        lowerLegWidth = 0.5 * zoomValue;
        lowerLegHeight = 2.0 * zoomValue;
        upperLegHeight = 3.0 * zoomValue;
        headHeight = 1.5 * zoomValue;
        headWidth = 2.0 * zoomValue;
    };
    document.getElementById("torso").onclick = function(event) {
        theta[torsoId] = event.target.value;
        initNodes(torsoId);
    };
    document.getElementById("head1").onclick = function(event) {
        theta[head1Id] = event.target.value;
        initNodes(head1Id);
    };
    document.getElementById("head2").onclick = function(event) {
        theta[head2Id] = event.target.value;
        initNodes(head2Id);
    };
    document.getElementById("left-upper-arm").onclick = function(event) {
        theta[leftUpperArmId] = event.target.value;
        initNodes(leftUpperArmId);
    };
    document.getElementById("left-lower-arm").onclick = function(event) {
        theta[leftLowerArmId] = event.target.value;
        initNodes(leftLowerArmId);
    };
    document.getElementById("right-upper-arm").onclick = function(event) {
        theta[rightUpperArmId] = event.target.value;
        initNodes(rightUpperArmId);
    };
    document.getElementById("right-lower-arm").onclick = function(event) {
        theta[rightLowerArmId] = event.target.value;
        initNodes(rightLowerArmId);
    };
    document.getElementById("left-upper-leg").onclick = function(event) {
        theta[leftUpperLegId] = event.target.value;
        initNodes(leftUpperLegId);
    };
    document.getElementById("left-lower-leg").onclick = function(event) {
        theta[leftLowerLegId] = event.target.value;
        initNodes(leftLowerLegId);
    };
    document.getElementById("right-upper-leg").onclick = function(event) {
        theta[rightUpperLegId] = event.target.value;
        initNodes(rightUpperLegId);
    };
    document.getElementById("right-lower-leg").onclick = function(event) {
        theta[rightLowerLegId] = event.target.value;
        initNodes(rightLowerLegId);
    };

    for (let i = 0; i < numNodes; i++)
        initNodes(i);

    render();
}


let render = function() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    traverse(torsoId);
    requestAnimFrame(render);
}

function changeToLoadFile(file) {
    let data = JSON.parse(file);
    torsoHeight = data.torsoHeight;
    torsoWidth = data.torsoWidth;
    upperArmHeight = data.upperArmHeight;
    lowerArmHeight = data.lowerArmHeight;
    upperArmWidth = data.upperArmWidth;
    lowerArmWidth = data.lowerArmWidth;
    upperLegWidth = data.upperLegWidth;
    lowerLegWidth = data.lowerLegWidth;
    lowerLegHeight = data.lowerLegHeight;
    upperLegHeight = data.upperLegHeight;
    headHeight = data.headHeight;
    headWidth = data.headWidth;
    render();
}

function loadGlobalData() {
    let input = document.getElementById("load");
    let files = input.files;

    if (files.length == 0) return;

    const file = files[0];

    let reader = new FileReader();

    reader.onload = (e) => changeToLoadFile(e.target.result);
    reader.onerror = (e) => alert(e.target.error.name);

    reader.readAsText(file);
}