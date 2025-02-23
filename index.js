let fs = require('fs');
let child_process = require('child_process');
let puppeteer = require("puppeteer");

const usage = 'usage: node index.js <svgPath> <duration> <fps> <outDir>';
const imgExtention = 'png';
const imgType = 'png';

async function main() {
    let [nodePath, progPath, svgPath, duration, fps, outDir] = process.argv;
    if(outDir === undefined) {
        console.error('outDir is not defined');
        console.log(usage);
        process.exit(2);
    }
    const svg = fs.readFileSync(svgPath, 'utf-8');

    duration = parseFloat(duration);
    fps = parseInt(fps);
    console.log('duration: ' + duration + ' s, fps: ' + fps);
    const totalFrames = Math.floor(fps * duration);
    const digits = Math.floor(Math.log10(totalFrames)) + 1;
    console.log('totalFrames: ' + totalFrames);

    process.chdir(outDir);
    await createFrames(svg, fps, totalFrames, digits);
    convertToMP4(fps, totalFrames, digits);
}

async function createFrames(svg, fps, totalFrames, digits) {
    svg = svg.replace('--play-state: running;', '--play-state: paused;');

    console.log('puppeteer.launch')
    const npx_args = { 
        headless: "new",
        args: ['--font-render-hinting=none']
    };
    const docker_args = { 
        headless: "new",
        args: ['--no-sandbox', '--single-process', '--no-zygote', '--font-render-hinting=none']
    };
    
    let browser = await puppeteer.launch(
        process.env.DOCKER_CONTAINER ? docker_args : npx_args
    );

    let page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });
    
    console.log('page.goto')
    try {
        await page.goto('about:blank');
        console.log('setContent')
        await page.setContent(svg);
    } catch (error) {
        console.error('Error during page setup:', error);
        await browser.close();
        process.exit(1);
    }

    let renderSettings = {
        type: imgType,
        omitBackground: false,
    };

    console.log('creating frames');
    try {
        for(let i=1; i <= totalFrames; ++i) {
            try {
                await page.evaluate(function(startVal) {
                    const svg = document.getElementsByTagName('svg')[0];
                    if (!svg) throw new Error('SVG element not found');
                    svg.style.setProperty('--start', startVal);
                }, '' + ((i-1) / fps) + 's');
                
                await new Promise(resolve => setTimeout(resolve, 1));

                const outputElem = await page.$('svg');
                if (!outputElem) {
                    throw new Error('Failed to find SVG element for screenshot');
                }

                let prefix = ('' + i).padStart(digits, '0');
                renderSettings.path = prefix + '.' + imgExtention;
                await outputElem.screenshot(renderSettings);
                
                if(i % fps === 0 || i === totalFrames) {
                    console.log('progress: ' + prefix + ' / ' + totalFrames);
                }
            } catch (frameError) {
                console.error(`Error processing frame ${i}:`, frameError);
                throw frameError; // Re-throw to trigger cleanup
            }
        }
    } catch (error) {
        console.error('Error during frame creation:', error);
        if (browser) {
            await browser.close().catch(console.error);
        }
        process.exit(1);
    }

    try {
        await browser.close();
    } catch (error) {
        console.error('Error closing browser:', error);
        process.exit(1);
    }
    
    return totalFrames, digits;
}

function convertToMP4(fps, totalFrames, digits) {
    console.log('running ffmpeg')
    let output = child_process.execFileSync('ffmpeg',
        ['-hide_banner', '-loglevel', 'warning', '-y',
            '-framerate', '' + fps,
            '-i', '%0' + digits + 'd.' + imgExtention,
            '-c:v', 'libx264', '-vf', 'fps=' + fps, '-pix_fmt', 'yuv420p',
            'output.mp4'],
        {'encoding': 'utf8'});
    console.log(output);
}

main();
