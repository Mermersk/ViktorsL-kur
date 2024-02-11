#version 300 es
precision mediump float;
#define PI 3.1415926535

layout(location = 0) out vec4 outColor;

uniform vec2 u_resolution;
uniform float u_time;

uniform sampler2D u_laekurTex;

//Random from book of shaders, section: noise
float randomBOS(in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))
                 * 43758.5453123);
}

float random(float seed) {

	return fract(sin(seed )* 4922891.0);
}

vec2 hashwithoutsine21(float p)
{
	vec3 p3 = fract(vec3(p,p,p) * vec3(.1031, .1030, .0973));
	p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx+p3.yz)*p3.zy);
}

//Quintic smoothstep. Regular smoothstep is: x*x*(3.0-2.0*x) (edges not defined, are baked in as 0.0 and 1.0)
//Qunitic smoothstep: x*x*x*(x*(x*6.-15.)+10.) (edges are 0.0 and 1.0))
float quinticSS(float x) {
	return x*x*x*(x*(x*6.0 - 15.0 ) + 10.0);
}

float noise2d(vec2 seed) {

	vec2 i = floor(seed);
	vec2 f = fract(seed);
	
	float lowerLeftCorner = randomBOS(i);
	float lowerRightCorner = randomBOS(i + vec2(1.0, 0.0));
	float upperRightCorner = randomBOS(i + vec2(1.0, 1.0));
	float upperLeftCorner = randomBOS(i + vec2(0.0, 1.0));
	
	vec2 smoothFract = smoothstep(vec2(0.0), vec2(1.0), f);
	
	//smoothFract.x = quinticSS(f.x);
	//smoothFract.y = quinticSS(f.y);
	
	//float n = mix(lowerLeftCorner, lowerRightCorner, smoothFract.x);
	//n *= mix(upperLeftCorner, upperRightCorner, smoothFract.x);
	//n *= mix(lowerLeftCorner, upperLeftCorner, smoothFract.y);
	//n *= mix(lowerRightCorner, upperRightCorner, smoothFract.y);
	
	float upperCells = mix(upperLeftCorner, upperRightCorner, smoothFract.x);
	float lowerCells = mix(lowerLeftCorner, lowerRightCorner, smoothFract.x);
	
	float n = mix(lowerCells, upperCells, smoothFract.y);
	//float n = mix(mix(lowerLeftCorner, upperLeftCorner, smoothFract.y), mix(lowerRightCorner, upperRightCorner, smoothFract.y), smoothFract.x);
	
	// -- Represents the rate of change now on 2 diagonal lines of box
	float l = abs(lowerLeftCorner - upperRightCorner);
	float u = abs(upperLeftCorner - lowerRightCorner);
	float t = (l + u)/2.0;
	float ballsOfChange = distance(vec2(0.5), f);//length(vec2(abs(upperCells - lowerCells)));
	ballsOfChange = 1.0 - step(t, ballsOfChange);
	
	//n += ballsOfChange;
	//Lines in each cell for debug purposes
	//n += lineAB3(vec2(0.0), vec2(0.0, 1.0), f) + lineAB3(vec2(0.0), vec2(1.0, 0.0), f);
	return n;
	
}
/*
Fractal brownian motion
Is about adding noise together. From book of shaders:
By adding different iterations of noise (octaves), where we successively 
increment the frequencies in regular steps (lacunarity) and decrease the amplitude (gain) 
of the noise we can obtain a finer granularity in the noise and get more fine detail. 
This technique is called "fractal Brownian Motion" (fBM), or simply "fractal noise".

For each octave(iteration): Increase the frequency of the wave(by 2.0) -> Called the lacunarity value.
							Decrease the amplitude of the wave(by 0.5) -> Called the gain.
*/
float fbm(vec2 uv) {
	float fbm = 0.0;
	
	//Constant value, octaves is the number of iterations.
	int octaves = 6;
	float lacunarity = 1.6;
	float gain = 0.5;
	
	//Initial values, are changed on each ocatve/iteration.
	float amplitude = 0.5;
	float frequency = 1.0;
	
	for (int i = 0; i < octaves; i++) {
		fbm += amplitude * noise2d(uv * frequency);
		
		frequency *= lacunarity;
		amplitude *= gain;
	
	}
	
	return fbm;
}

float distortedFBM(vec2 uv) {
	uv *= 3.0;
	vec2 d = vec2(fbm(vec2(uv.x, uv.y)), fbm(vec2(uv.x + 83462.0, uv.y + 34993.0)));
	vec2 d2 = vec2(fbm(vec2(uv.x - 34.93, uv.y - 4533.0)), fbm(vec2(uv.x + 862.0, uv.y + 393.0)));

	float dfbm = fbm(uv + d + d2);

	return dfbm;

}

//1d noise
float noise(float seed) {
	//Integer part
	float i = floor(seed);
	//Fractional part
	float f = fract(seed);
	
	float n = random(i);
	
	/*
	mix(0.4, 0.6, 0.0<->1.0):
	= a range from 0.4 to 0.6, acroos the values where 0.0 and 1.0 was.
	
	mix(0.4, 0.6, 0.5) = 0.5
	
	mix(a, b, p);
	So what is happening below?
	first two parameters are rnadom number.
	let say i = 1, so a = random(1) = 0.233
	b = random(2) = 0.788
	So range is 0.233 <-> 0.788. can think of this as start and end point of 1 line sgement.
	f = p. f decides how much to take from a or b.
	some values:
	f = 0.0 -> return 0.233
	f = 0.5 -> return 0.51 (number midway between a and b)
	f = 1.0 -> return 0.788
	
	Now f here is the fraction part of the seed. (seed = uv.x*10.0)
	value of f when between i and i+1.0 is linear between 0.0 and 1.0!
	So f in whole image is 10 ranges divided on x-axis equally where each range is 0.0 <-> 1.0.
	So we get a straight line between 0.233(a) and 0.788(b), where those are positions on y-axis 
	 
	*/
	
	//Smoothstep here, low and high edges here are 0.0, 1.0, f is alsi from
	//0.0 to 1.0, What smootshtep gives us here is a smoothing of where to line/curve sgements connect!
	float smoothFractional = smoothstep(0.0, 1.0, f);
	float rand1 = random(i);
	float rand2 = random(i + 1.0);
	//float maxRand = max(rand1, rand2);
	n = mix(rand1, rand2, smoothFractional);
	return n;

}

float circle(vec2 uv, vec2 origin) {
	//uv.x *= 0.5;
	float d = distance(origin, uv);
	float c = smoothstep(0.0, 0.35, d);
	return (1.0 - c)/2.0;
}

float circle2(vec2 uv, vec2 origin, float size) {
	
	float d = distance(origin, uv);
	float c = smoothstep(0.0, size, d);
	return (1.0 - c);


}

//One cycle is equal to 2PI
vec2 eightTrack(float t, float eightTrackSize) {
	//a controls the overall size of the infinty symbol in x and y directions
	float a = eightTrackSize;
	//t = mod(u_time, 2.0*PI);
	float x = a * sin(t);
	float y = a * sin(t) * cos(t);
	
	return vec2(x, y);
	
}

float light(vec2 uv, float bright) {
	float d = length(uv);
    float brightness = bright;
    float l = brightness / d;
    l *= smoothstep(0.00, 0.1, l);
	return l;
}



float singleFly(in vec2 uv, in float startingPlace, float rotation, float eightTrackSize) {
	
	//Move 0 to middle of screen so that the eigthTrack is in the middle
    //uv = (uv * 2.0) - 1.0;
    //uv -= vec2(0.1, 0.2);
    
    float fly = 0.0;
    
    float a = rotation;
    
    mat2 rot = mat2(cos(a), -sin(a),
    				sin(a), cos(a));
    				
    uv = rot * uv;
    
    vec2 inf = eightTrack((u_time*0.06) + startingPlace, eightTrackSize);
    //Makes the point that came from eightTrack the new origin
    vec2 newOrigin = uv - inf;
    
    float l = light(newOrigin, 0.01); //0.01
    //Light tail
    //vec2 t = eightTrack(u_time + startingPlace, eightTrackSize);
    //float lt = circle2(uv, t-0.6, 0.02);
    	
    fly += l; 
    		
	return fly;
}

float manyFlies(in vec2 uv, float startingPlace) {
	float mf = 0.0;
	//vec3 cc = vec3(0.0);
	const int numFlies = 13;
	
	//float startingPlace = 0.0;
	
	for (int i = 0; i < numFlies; i++) {
		mf += singleFly(uv, startingPlace, random(float(i) + startingPlace) * (2.0*PI), random(float(i))*0.85 + 0.5);
		//cc += mf * vec3(random(i+1.0), random(i+1.56), random(i + 3.22)); 
		startingPlace += random(float(i));
	}
	
	return mf;
}

/*
float tail(in vec2 uv) {
	
	float angle = 1.0;
	uv = (uv * 2.0) - 1.0;
	
	mat2 rot = mat2(cos(angle), -sin(angle),
					sin(angle), cos(angle));
					
	uv = rot * uv;
	
	float n = fbm(vec2(uv.x + (u_time * 0.05), uv.y) * 10.0 + 98.0);
	n = (1.0 - length(uv) * 2.0) * n;
	
	float a = atan(uv.y, uv.x) + PI;
	if (a > 0.1) {
		//n = 0.0;
	}
	n *= smoothstep(0.1, 0.3, a);
	
	return n;
	
}
*/

vec3 owl(in vec2 uv) {
	float owl = 0.0;
	//Trasnlating coordinates
	uv = uv + vec2(0.4, - 0.25);
	
	//Making it synmetric and scaling it
	uv = abs((uv * 50.0) - 25.0);
	
	vec3 o = vec3(1.0);
	
	float d = distance(vec2(0.3, 0.0), uv);
	float eyes = 1.0 - smoothstep(0.18, 0.2, d);
	
	//Pupils
	float p = 1.0 - smoothstep(0.08, 0.1, d);
	
	o *= eyes * vec3(0.5, 0.5, 0.0);
	o -= p;
	
	float owlTimer = -0.3;
	//if (mod(floor(u_time), 3.0) == 0.0 || mod(floor(u_time), 4.0) == 0.0) {
		owlTimer = u_time;
	//}
	//owlTimer = u_time;
	
	//Dimpling
	float dd = distance(vec2(0.3, sin(owlTimer)*0.2 - 0.15), uv);
	float dimpleCircle = 1.0 - smoothstep(0.2, 0.22, dd);
	
	return o * dimpleCircle;

}

vec3 northernLights(vec2 uv) {
	
	uv = (uv * 2.0) - 1.0;
	
	vec3 col = vec3(0.0);
	
	uv.y -= 0.85;
	
	float xNoise = noise(uv.x + u_time*0.3) * 1.0;
	float xNoise2 = noise((uv.x * 35.0) + 8.456 + u_time*2.9) * 0.75;
	
	float line = dot(uv, vec2(xNoise*3.0, xNoise + 2.5));
	float lineDist = line;
	line = 1.0 - abs(line);
	
	float line2 = dot(uv, vec2(xNoise2*3.1, xNoise2 + 2.5));
	line2 = 1.0 - abs(line2);
	//float line = dot(uv, vec2(0.0, 1.0)) + xNoise;
	
	float mNoise = noise(uv.y * 8.0 + u_time);
	line2 *= mNoise * noise(uv.x * 15.0 + u_time*2.0);
	
	col += line * vec3(0.2, 0.8, 0.3) * 1.1;
	col += line2* 0.25 * vec3(0.5, 0.3, 0.85);
	//col = mix(lcol, lcol2, line2Dist);
	//col += line + line2;
	return col;

}

float gyroid (vec3 p) { return dot(sin(p),cos(p.yzx)); }

float gnoise (vec3 p)
{
	p *= 2.0;
    float result = 0.0, a = 0.5;
    float count = 12.0;
    for (float i = 0.; i < count; i++)
    {
        p.z -= u_time*0.015 + result*0.5;
        //p.z += u_time*0.25;
        //p = rotZ(p, iTime*0.01+i);
       
        result += abs(gyroid(p/a))*a;
        a = a / 2.0;
    }
    return result;
}


void main() {
	vec2 uv = gl_FragCoord.xy/u_resolution;
	vec2 texCoords = vec2(uv.x, uv.y);

	vec3 col = vec3(0.0);

	uv = (uv * 2.0) - 1.0;
    uv *= 2.0;
    float ar = u_resolution.x / u_resolution.y;
    uv.x *= ar;

    vec4 tex = texture(u_laekurTex, texCoords);
	//sd.rgb = pow(sd.rgb, vec3(2.2));
    
    col += tex.rgb;

	vec3 grayWhite = normalize(vec3(182.0/255.0, 195.0/255.0, (211.0/255.0)*3.0));
	float likenessToGray = dot(col, grayWhite);

	float speedFBM = fbm(vec2(uv.x + u_time*0.4, uv.y + u_time) + 83478.0);
    
    float fbmNoise = fbm(vec2(uv.x, (uv.y+1.0)*0.5 - 0.5));//fbm(vec2(uv.x, uv.y));
	float fbmNoise2 = fbm(vec2(uv.x, (uv.y+1.0)*0.5 - 0.5 + 32.0 + (likenessToGray + (u_time * (0.65)))));
	vec2 strangeSampler = vec2(fbmNoise, fbmNoise2);
    vec3 noiseCol = texture(u_laekurTex, strangeSampler).rgb;//vec3(fbmNoise);

	// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
	vec3 luminosityFactor = vec3(0.2126, 0.7152, 0.0722);
	float grayscale = dot(tex.rgb, luminosityFactor);
	vec3 grayscaleCol = vec3(grayscale);

	col = mix(col, mix(col, noiseCol, smoothstep(0.55, 0.9, likenessToGray)), 0.15);

	//float fly = singleFly(uv, 0.0, 0.0, 0.15);
	//col += fly;

	float flies = manyFlies(vec2(uv.x-0.4, uv.y - 1.5), 0.0);
	col += mix(vec3(1.83, 0.46, 0.26*flies), col, 0.99) * flies;//mix(vec3(flies), col, 1.0-flies-0.2);

	float flies2 = manyFlies(vec2(uv.x + 0.5, uv.y + 1.2), 320.0);
	col += mix(vec3(1.83, 0.46, 0.26*flies2), col, 0.99) * flies2;

	vec3 p = vec3(uv, length(uv)*0.5);
	float gn = gnoise(p*0.5);

	col = mix(col, vec3(pow((gn+0.7), 0.65)*0.3), max(0.0, uv.y*0.43 + (uv.x*0.15)));

	//Gamma correct
	//col = pow(col, vec3(1.0/2.2));

	outColor = vec4(col, 1.0);
}