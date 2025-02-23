# Animated SVG to MP4

Converts a CSS-animated SVG to an MP4 video.

On macOS, you may suffer from poor performance:
<https://github.com/puppeteer/puppeteer/issues/476>.

## Installing dependencies

Install `nodejs` and `ffmpeg`.
Then install node dependencies by running `npm install`.

## Example invocation

    mkdir out-dir
    node index.js example.svg 2 24 out-dir

This command will read `example.svg` as input and create a 2 seconds long animation
at 24 frames-per-second. The output is stored in the file `out-dir/output.mp4`.

## SVG format

All animated elements should set
[`animation-play-state`](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-play-state)
equal to `paused` or `var(--play-state)`, where `--play-state` is
a custom CSS property attached to the `svg` element.

There should be a custom CSS property `--start` attached to the `svg` element.
This represents the instant at which to start the animation.
All animated elements should use
[`animation-delay`](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-delay)
and incorporate the value `--start` in it.

See `example.svg` for an example.

## How it works

`index.js` reads the SVG file and changes the value of `--play-state` to `paused`.
It then opens up a headless browser using `puppeteer` and loads the SVG into it.
Then it repeatedly changes the value of `--start` and takes screenshots.
Those screenshots are converted to an mp4 file using `ffmpeg`.

## Prompt for converting an SVG to use CSS animations

If you are working with a newer SVG that uses native animation elements, you will need to convert it before using this script.  AI assistants like Claude are pretty good at doing this for you. 

Here is an example of a prompt that I've used to accomplish this.  (In this case I was using Claude in a development environment so it also ran the script for me in the integrated terminal.)

```markdown

I want to use this script index.js to turn this svg into a mp4 file: {{ source svg file path }}
It runs correctly with example.svg, but I noticed that the example.svg has different animation properties than my svg.

The main differences between our svg and example.svg are:

1. Animation Control Properties:
    - example.svg uses CSS variables `--start` and `--play-state` which are required by the converter
    - Ours uses SVG native animations (`<animate>` and `<animateTransform>`) without these control properties
2. Animation Method:
    - example.svg uses CSS animations with @keyframes
    - Ours uses SVG's native animation elements

To make this work, we need to 

1. Modify our svg to add the required control properties:
    
    ```css
    svg {
      --start: 0s;
      --play-state: running;
    }
    ```
    
2. Convert the SVG animations to use CSS animations with the proper control variables. For example:
    
    ```css
    .rotating-triangle {
      animation: rotate 20s linear infinite;
      animation-play-state: var(--play-state);
      animation-delay: calc(0s - var(--start));
    }
    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    ```
    
3. Run the conversion with appropriate duration and framerate parameters based on our longest animation.

You can also check out this readme for more information: readme.md
```
