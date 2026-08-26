<script>
/**
 * Scanner — an animated signal field rendered on a WebGL2 fragment shader.
 *
 * A Svelte 5 port of the React Bits `Scanner` component. The shader is the
 * original; everything around it is rewritten for runes and Tailwind, and
 * the styling props are gone in favour of utility classes on the host.
 *
 * WHAT IT DRAWS. A field of scan lines bent by a slow interference signal,
 * with a sweep travelling across them. The output is premultiplied, and its
 * alpha *is* its intensity, so the dark parts of the field are transparent
 * rather than black: it lays over a surface instead of covering it. That is
 * what lets it sit behind content on either theme.
 *
 * COLOURS come from the caller, so the page can hand it VAZHI's palette and
 * swap the three stops when the theme changes. Nothing is hard-coded here.
 *
 * COST. The render loop is suspended when the element scrolls out of view
 * (IntersectionObserver) and when the tab is hidden, so an idle page is not
 * paying for a shader nobody is looking at. `ogl` is imported dynamically
 * inside the effect, which keeps it out of the server bundle and out of the
 * prerender pass — this page is prerendered.
 *
 * DEGRADATION. If WebGL2 is unavailable, or the context is lost, or the
 * viewer has asked for reduced motion, nothing is mounted and `onfallback`
 * fires so the caller can paint something static instead. The component
 * never leaves a blank hole where a background should be.
 */
let { color1, color2, color3, speed = 0.5, sweepSpeed = 0.25, sweepWidth = 1.6, sweepFalloff = 6, scale = 1.5, frequency = 2, ripple = 0.22, bandDensity = 11, lineSharpness = 5.5, glow = 0.22, scanDirection = 'vertical', colorSpread = 0.7, brightness = 1.0, contrast = 1.15, softness = 1.4, vignette = 0.45, scanline = true, grain = true, grainIntensity = 0.05, opacity = 1.0, mouseInteraction = true, mouseRadius = 0.5, mouseStrength = 0.5, disabled = false, class: className = '', onfallback } = $props();
let host = $state(null);
/** `#4a7c59` → `[0.29, 0.486, 0.349]`. Falls back to white on a bad value. */
function hexToRgb(hex) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!match)
        return [1, 1, 1];
    return [
        Number.parseInt(match[1], 16) / 255,
        Number.parseInt(match[2], 16) / 255,
        Number.parseInt(match[3], 16) / 255
    ];
}
function directionToFloat(direction) {
    if (direction === 'horizontal')
        return 1;
    if (direction === 'diagonal')
        return 2;
    return 0;
}
const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;
const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uSweepSpeed;
uniform float uSweepWidth;
uniform float uSweepFalloff;
uniform float uScale;
uniform float uFrequency;
uniform float uRipple;
uniform float uBandDensity;
uniform float uLineSharpness;
uniform float uGlow;
uniform float uColorSpread;
uniform float uBrightness;
uniform float uContrast;
uniform float uSoftness;
uniform float uVignette;
uniform float uOpacity;
uniform float uScanline;
uniform float uGrain;
uniform float uGrainIntensity;
uniform float uDirection;
uniform vec2 uMouse;
uniform float uMouseEnabled;
uniform float uMouseRadius;
uniform float uMouseStrength;
uniform float uMouseActive;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;

const float TAU = 6.2831853;

float signalField(vec2 p, float t) {
  float w = sin(p.x * 1.3 + t * 0.7);
  w += sin(p.y * 1.7 - t * 0.52) * 0.8;
  w += sin((p.x + p.y) * 0.9 + t * 0.91) * 0.6;
  w += sin((p.x - p.y) * 1.53 - t * 0.63) * 0.42;
  return w * 0.35;
}

vec3 palette(float f) {
  f = clamp(f, 0.0, 1.0);
  f = pow(f, uContrast);
  vec3 c = mix(uColor1, uColor2, smoothstep(0.08, 0.6, f));
  return mix(c, uColor3, smoothstep(0.68, 1.0, f));
}

float scanBand(float x, float aa, float sharp) {
  float v = mix(0.5, 0.5 + 0.5 * cos(x * TAU), aa);
  return pow(v, sharp);
}

void main() {
  float aspect = iResolution.x / iResolution.y;
  vec2 uv0 = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
  vec2 p = uv0 / max(uScale, 0.001);

  float t = iTime * uSpeed;

  float mouseBoost = 0.0;
  if (uMouseEnabled > 0.5) {
    vec2 mUv = vec2((uMouse.x * 2.0 - 1.0) * aspect, uMouse.y * 2.0 - 1.0);
    vec2 md = uv0 - mUv;
    float r = max(uMouseRadius, 0.001);
    mouseBoost = exp(-dot(md, md) / (r * r)) * uMouseStrength * uMouseActive;
  }

  float axis;
  if (uDirection < 0.5) axis = p.y;
  else if (uDirection < 1.5) axis = p.x;
  else axis = (p.x + p.y) * 0.70710678;

  float sig = signalField(p * uFrequency, t);
  float coord = axis + sig * uRipple;

  float phase = coord / max(uSweepWidth, 0.05) - t * uSweepSpeed;
  float sweep = pow(0.5 + 0.5 * cos(phase * TAU), max(uSweepFalloff, 0.1));

  float lc = coord * uBandDensity;
  float aa = 1.0 / (1.0 + uSoftness * fwidth(lc) * 3.0);
  aa = clamp(aa * (1.0 + mouseBoost * 0.6), 0.0, 1.0);

  float bodyBase = clamp(0.5 + 0.5 * sig, 0.0, 1.0);
  float body = bodyBase * bodyBase * uGlow * sweep;

  float sharp = max(uLineSharpness, 0.1);
  float split = uColorSpread * 0.16;
  float fr = clamp(scanBand(lc + split, aa, sharp) * sweep + body, 0.0, 1.0);
  float fg = clamp(scanBand(lc, aa, sharp) * sweep + body, 0.0, 1.0);
  float fb = clamp(scanBand(lc - split, aa, sharp) * sweep + body, 0.0, 1.0);

  vec3 col = vec3(palette(fr).r, palette(fg).g, palette(fb).b);

  float inten = (fr + fg + fb) * 0.3333333 * uBrightness;
  inten *= 1.0 + mouseBoost * 0.9;

  if (uScanline > 0.5) {
    inten *= 1.0 - 0.18 * (0.5 + 0.5 * cos(gl_FragCoord.y * 1.7));
  }

  if (uGrain > 0.5) {
    float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453);
    inten += (g - 0.5) * uGrainIntensity;
  }

  inten *= clamp(1.0 - uVignette * smoothstep(0.55, 1.65, length(uv0)), 0.0, 1.0);
  inten = clamp(inten, 0.0, 1.0);

  float a = clamp(inten * uOpacity, 0.0, 1.0);
  fragColor = vec4(clamp(col, 0.0, 1.0) * a, a);
}
`;
/**
 * The live program, kept outside the setup effect so the props effect below
 * can push uniform changes without tearing the context down and rebuilding
 * it on every recolour.
 *
 * Reactive because it is assigned from an async callback that resolves
 * after the uniforms effect has already run once; without that the first
 * colour push would be dropped.
 */
let program = $state(null);
/* --------------------------------------------------------------- setup */
$effect(() => {
    if (!host || disabled) {
        if (disabled)
            onfallback?.();
        return;
    }
    const container = host;
    let disposed = false;
    let teardown = null;
    void (async () => {
        let Renderer, Program, Mesh, Triangle;
        try {
            // Dynamic, so `ogl` never loads during SSR or the prerender pass.
            ({ Renderer, Program, Mesh, Triangle } = await import('ogl'));
        }
        catch {
            onfallback?.();
            return;
        }
        if (disposed)
            return;
        let renderer;
        try {
            renderer = new Renderer({
                webgl: 2,
                alpha: true,
                premultipliedAlpha: true,
                antialias: false,
                dpr: Math.min(window.devicePixelRatio || 1, 2)
            });
        }
        catch {
            // No WebGL2 on this device, or the context was refused.
            onfallback?.();
            return;
        }
        const gl = renderer.gl;
        // ogl falls back to WebGL1 when 2 is unavailable, and WebGL1 cannot
        // compile a `#version 300 es` shader. Bail here rather than let the
        // program fail to link and paint nothing at all.
        if (typeof WebGL2RenderingContext === 'undefined' ||
            !(gl instanceof WebGL2RenderingContext)) {
            onfallback?.();
            return;
        }
        gl.clearColor(0, 0, 0, 0);
        const canvas = gl.canvas;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        container.appendChild(canvas);
        const geometry = new Triangle(gl);
        const created = new Program(gl, {
            vertex,
            fragment,
            uniforms: {
                iTime: { value: 0 },
                iResolution: { value: new Float32Array([1, 1]) },
                uSpeed: { value: speed },
                uSweepSpeed: { value: sweepSpeed },
                uSweepWidth: { value: sweepWidth },
                uSweepFalloff: { value: sweepFalloff },
                uScale: { value: scale },
                uFrequency: { value: frequency },
                uRipple: { value: ripple },
                uBandDensity: { value: bandDensity },
                uLineSharpness: { value: lineSharpness },
                uGlow: { value: glow },
                uColorSpread: { value: colorSpread },
                uBrightness: { value: brightness },
                uContrast: { value: contrast },
                uSoftness: { value: softness },
                uVignette: { value: vignette },
                uOpacity: { value: opacity },
                uScanline: { value: scanline ? 1 : 0 },
                uGrain: { value: grain ? 1 : 0 },
                uGrainIntensity: { value: grainIntensity },
                uDirection: { value: directionToFloat(scanDirection) },
                uMouse: { value: new Float32Array([0.5, 0.5]) },
                uMouseEnabled: { value: mouseInteraction ? 1 : 0 },
                uMouseRadius: { value: mouseRadius },
                uMouseStrength: { value: mouseStrength },
                uMouseActive: { value: 0 },
                uColor1: { value: new Float32Array(hexToRgb(color1)) },
                uColor2: { value: new Float32Array(hexToRgb(color2)) },
                uColor3: { value: new Float32Array(hexToRgb(color3)) }
            }
        });
        const mesh = new Mesh(gl, { geometry, program: created });
        program = created;
        const setSize = () => {
            const rect = container.getBoundingClientRect();
            renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
            const res = created.uniforms.iResolution.value;
            res[0] = gl.drawingBufferWidth;
            res[1] = gl.drawingBufferHeight;
            renderer.render({ scene: mesh });
        };
        const resizeObserver = new ResizeObserver(setSize);
        resizeObserver.observe(container);
        setSize();
        /* ---------------------------------------------------- pointer */
        const current = [0.5, 0.5];
        let target = [0.5, 0.5];
        let active = 0;
        let targetActive = 0;
        /*
            The host takes no pointer events, so it is never a hit-test
            target and its own listeners would never fire. The pointer is
            tracked on the window instead and tested against the container's
            box, which also means the focus keeps following correctly while
            the pointer is over a link sitting on top of the canvas.
        */
        const onPointerMove = (event) => {
            const rect = container.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0)
                return;
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
            if (inside) {
                target = [x, 1 - y];
                targetActive = 1;
            }
            else {
                targetActive = 0;
            }
        };
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        /* ------------------------------------------------------- loop */
        let frame = 0;
        let onScreen = true;
        let pageVisible = !document.hidden;
        const started = performance.now();
        const loop = (now) => {
            created.uniforms.iTime.value = (now - started) * 0.001;
            if (!mouseInteraction)
                targetActive = 0;
            current[0] += 0.05 * (target[0] - current[0]);
            current[1] += 0.05 * (target[1] - current[1]);
            const pointer = created.uniforms.uMouse.value;
            pointer[0] = current[0];
            pointer[1] = current[1];
            active += 0.05 * (targetActive - active);
            created.uniforms.uMouseActive.value = active;
            renderer.render({ scene: mesh });
            frame = requestAnimationFrame(loop);
        };
        const start = () => {
            if (onScreen && pageVisible && frame === 0)
                frame = requestAnimationFrame(loop);
        };
        const stop = () => {
            if (frame !== 0) {
                cancelAnimationFrame(frame);
                frame = 0;
            }
        };
        const intersectionObserver = new IntersectionObserver(([entry]) => {
            onScreen = entry.isIntersecting;
            if (onScreen)
                start();
            else
                stop();
        }, { threshold: 0 });
        intersectionObserver.observe(container);
        const onVisibility = () => {
            pageVisible = !document.hidden;
            if (pageVisible)
                start();
            else
                stop();
        };
        document.addEventListener('visibilitychange', onVisibility);
        start();
        teardown = () => {
            stop();
            resizeObserver.disconnect();
            intersectionObserver.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pointermove', onPointerMove);
            program = null;
            canvas.remove();
            gl.getExtension('WEBGL_lose_context')?.loseContext();
        };
        // The effect may have been torn down while `ogl` was still loading.
        if (disposed)
            teardown();
    })();
    return () => {
        disposed = true;
        teardown?.();
    };
});
/* ----------------------------------------------------- live uniforms */
/**
 * Pushes prop changes onto the running program.
 *
 * Separate from setup on purpose: recolouring on a theme switch must not
 * rebuild the GL context, which would flash the panel.
 */
$effect(() => {
    const uniforms = program?.uniforms;
    if (!uniforms)
        return;
    const numbers = {
        uSpeed: speed,
        uSweepSpeed: sweepSpeed,
        uSweepWidth: sweepWidth,
        uSweepFalloff: sweepFalloff,
        uScale: scale,
        uFrequency: frequency,
        uRipple: ripple,
        uBandDensity: bandDensity,
        uLineSharpness: lineSharpness,
        uGlow: glow,
        uColorSpread: colorSpread,
        uBrightness: brightness,
        uContrast: contrast,
        uSoftness: softness,
        uVignette: vignette,
        uOpacity: opacity,
        uScanline: scanline ? 1 : 0,
        uGrain: grain ? 1 : 0,
        uGrainIntensity: grainIntensity,
        uDirection: directionToFloat(scanDirection),
        uMouseEnabled: mouseInteraction ? 1 : 0,
        uMouseRadius: mouseRadius,
        uMouseStrength: mouseStrength
    };
    for (const [name, value] of Object.entries(numbers)) {
        if (uniforms[name])
            uniforms[name].value = value;
    }
    for (const [name, hex] of [
        ['uColor1', color1],
        ['uColor2', color2],
        ['uColor3', color3]
    ]) {
        const slot = uniforms[name]?.value;
        if (!(slot instanceof Float32Array))
            continue;
        const [r, g, b] = hexToRgb(hex);
        slot[0] = r;
        slot[1] = g;
        slot[2] = b;
    }
});
</script>

<!--
	The host. `pointer-events-none` so the scanner never intercepts a click
	meant for a link sitting over it; the pointer focus is tracked from the
	container's own move events, which still fire because the listener is on
	the element rather than relying on hit testing.
-->
<div
	bind:this={host}
	aria-hidden="true"
	class="pointer-events-none relative h-full w-full overflow-hidden {className}"
></div>
