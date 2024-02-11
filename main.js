import * as twgl from "./twgl-full.module.js";

console.log("hello i am underwater")

const canvas = document.getElementById("c");
const gl = canvas.getContext("webgl2")

const vertexShaderPromise = fetch("./main.vert").then(
    (response) => {
        return response.text().then( (text) => {
            return text;
        })
    }
)

const fragmentShaderPromise = fetch("./main.frag").then(
    (response) => {
        return response.text().then( (text) => {
            return text;
        })
    }
)

console.log(twgl.isWebGL2(gl))
Promise.all([vertexShaderPromise, fragmentShaderPromise]).then((shadersText) => {
    console.log(shadersText)
    
    const programInfo = twgl.createProgramInfo(gl, shadersText)


    const arrays = {
        //Two triangles make a quad
        a_position: { numComponents: 2, data: [
            -1, -1,
            -1, 1,
            1, -1,

            1, -1,
            1, 1,
            -1, 1,
        ] },
    }

    const buffers = twgl.createBufferInfoFromArrays(gl, arrays)

    const laekurTex = twgl.createTexture(gl, {src: "./Viktorslækur.jpg", flipY: true})
    
    const uniforms = {
        u_laekurTex: laekurTex,
        u_time: 0,
        u_resolution: [canvas.clientWidth, canvas.clientHeight]
    }

    const draw = (time) => {
        gl.useProgram(programInfo.program)
        gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight)
        twgl.setBuffersAndAttributes(gl, programInfo, buffers)

        const timeInSeconds = time * 0.001;
        //console.log(timeInSeconds)
        uniforms.u_time = timeInSeconds

        twgl.setUniforms(programInfo, uniforms)
        twgl.drawBufferInfo(gl, buffers, gl.TRIANGLES, 6)

        requestAnimationFrame(draw)
    }
    
    requestAnimationFrame(draw)
})