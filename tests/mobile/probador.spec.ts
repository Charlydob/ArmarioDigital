import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";

async function flick(page: Page, width: number, duration: number) {
  const box = await page.locator('[data-zone="TORSO"] .garment-slider').boundingBox();
  if (!box) throw new Error("Falta el carrusel");
  const session = await page.context().newCDPSession(page);
  const x = box.x + box.width * .8, y = box.y + box.height * .65;
  await session.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [{x, y}]});
  for (let i=1;i<=8;i++) {
    await page.waitForTimeout(duration/8);
    await session.send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: [{x:x-width*i/8, y}]});
  }
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  const indexBeforeRelease = await activeIndex(page);
  await session.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []});
  await session.detach();
  return indexBeforeRelease;
}
const activeIndex = (page: Page) => page.locator('[data-zone="TORSO"] .garment-choice[aria-pressed=true]').getAttribute('aria-label').then(label => Number(label?.split(' ').pop()));

for (const viewport of [{width:390,height:844},{width:393,height:852},{width:430,height:932}]) {
  test(`swipe, placement, favoritos, panel y PWA ${viewport.width}x${viewport.height}`, async ({ page, context }, testInfo) => {
    await page.setViewportSize(viewport);
    // Headless CDP reports screenX/Y=0. On real mobile they follow the contact.
    // Normalize only the test browser's Touch coordinates, never the slider.
    await page.addInitScript(() => {
      Object.defineProperty(Touch.prototype, "screenX", { get() { return this.clientX; } });
      Object.defineProperty(Touch.prototype, "screenY", { get() { return this.clientY; } });
    });
    await context.addCookies([{name:"armario_session",value:"fixture-only",domain:"localhost",path:"/"}]);
    const png = await sharp(Buffer.from('<svg width="400" height="500" xmlns="http://www.w3.org/2000/svg"><path d="M100 30 L150 5 L250 5 L300 30 L395 125 L310 195 L280 145 L290 480 L110 480 L120 145 L90 195 L5 125 Z" fill="#af4060"/></svg>')).png().toBuffer();
    const blue = await sharp(Buffer.from('<svg width="400" height="500" xmlns="http://www.w3.org/2000/svg"><path d="M100 30 L150 5 L250 5 L300 30 L395 125 L310 195 L280 145 L290 480 L110 480 L120 145 L90 195 L5 125 Z" fill="#238cb4"/></svg>')).png().toBuffer();
    const person = await sharp(Buffer.from('<svg width="900" height="1200" xmlns="http://www.w3.org/2000/svg"><circle cx="450" cy="110" r="70" fill="#d9c9bd"/><path d="M360 200 Q450 170 540 200 L610 640 L540 680 L515 360 L520 1150 L450 1150 L420 740 L390 1150 L320 1150 L335 360 L290 680 L225 640 Z" fill="#d9c9bd"/></svg>')).png().toBuffer();
    let mediaRequests=0;
    await page.route("**/api/media/*", route => { mediaRequests++; return route.fulfill({status:200,contentType:"image/png",body:route.request().url().endsWith("/pose") ? person : route.request().url().endsWith("/top-0") ? blue : png}); });
    await page.route("**/api/favorites/**", async route => {
      const data = route.request().postDataJSON(); const key = new URL(route.request().url()).pathname.split("/favorites/")[1];
      await page.evaluate(({key,value}) => { const values=JSON.parse(localStorage.getItem("fixture-favorites") || "{}");values[key]=value;localStorage.setItem("fixture-favorites",JSON.stringify(values)); }, {key,value:data.favorite});
      await route.fulfill({json:{favorite:data.favorite}});
    });
    const errors: string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto("/mobile-test-fixture");
    const band = page.locator('[data-zone="TORSO"]');
    await expect(band.locator('.placed-png')).toHaveCount(9);
    await expect.poll(() => band.locator('img').evaluateAll(images=>images.every(i=>(i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth>0))).toBe(true);
    const originalHandles = await band.locator(".garment-slide").elementHandles();
    const originalNodes = await band.locator('.garment-slide').evaluateAll(nodes => nodes.map(node=>node.getAttribute('data-garment')));
    let countBefore=mediaRequests;
    const originalSize = await band.locator('.placed-png').evaluateAll(images=>images.map(image=>({width:(image as HTMLElement).style.width,height:(image as HTMLElement).style.height,transform:(image as HTMLElement).style.transform})));
    expect(new Set(originalSize.map(s=>JSON.stringify(s))).size).toBe(1);
    await flick(page,80,650);
    await page.waitForTimeout(1600);
    const slow = await activeIndex(page); expect(slow).toBeLessThanOrEqual(1);
    expect(mediaRequests).toBe(countBefore);
    await page.getByPlaceholder('Buscar prenda…').fill('Camiseta 0');
    await page.locator('.search-results button').click();
    await expect.poll(()=>activeIndex(page)).toBe(0);
    await page.waitForTimeout(500);
    countBefore = mediaRequests;
    const indexDuringFastDrag = await flick(page,175,45);
    expect(indexDuringFastDrag).toBeGreaterThan(0);
    await page.waitForTimeout(1800);
    const fast = await activeIndex(page); const requestsDuringSwipe = mediaRequests-countBefore; expect(fast).toBeGreaterThan(1);
    await page.waitForTimeout(350); expect(await activeIndex(page)).toBe(fast);
    expect(mediaRequests).toBe(countBefore);
    for (const handle of originalHandles) expect(await handle.evaluate(node=>node.isConnected)).toBe(true);
    expect(await band.locator('.garment-slide').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-garment')))).toEqual(originalNodes);
    await expect.poll(() => band.locator('img').evaluateAll(images=>images.every(i=>(i as HTMLImageElement).naturalWidth>0))).toBe(true);
    const chosen = band.locator('.garment-choice[aria-pressed=true] img');
    const pinRect = await band.locator('.pin-button').boundingBox(), imageRect = await chosen.boundingBox();
    expect(pinRect && imageRect && (pinRect.y + pinRect.height <= imageRect.y || pinRect.x >= imageRect.x + imageRect.width || pinRect.x + pinRect.width <= imageRect.x)).toBeTruthy();
    await band.locator('.favorite-button').click();await expect(band.locator('.favorite-button')).toHaveAttribute('aria-pressed','true');
    await page.locator('.compact-pose .favorite-button').click();await expect(page.locator('.compact-pose .favorite-button')).toHaveAttribute('aria-pressed','true');
    await band.locator('.pin-button').click();await expect(band.locator('.pin-button')).toHaveText(/Añadida/);
    await expect(band.locator('.pin-button')).toBeDisabled();
    await page.getByRole('button',{name:'Panel',exact:true}).click();
    await expect(page.locator('.selection-panel')).toBeVisible();
    const panel = page.locator('.selection-panel [data-zone="TORSO"]');
    await panel.getByRole('button',{name:'Camiseta 0',exact:true}).click();
    await expect.poll(()=>activeIndex(page)).toBe(0);
    await expect(page.locator('.body-stage-area canvas')).toHaveCount(1);
    // The new preview makes the canvas non-empty, using the processed, decoded asset.
    await expect.poll(() => page.locator('.body-stage-area canvas').evaluate(c=> {
      const canvas=c as HTMLCanvasElement;
      return canvas.getContext('2d')!.getImageData(Math.round(canvas.width*430/900),Math.round(canvas.height*480/1200),1,1).data[2];
    })).toBeGreaterThan(150);
    const area=await page.locator('.body-stage-area').boundingBox(), space=await page.locator('.try-space').boundingBox();
    expect(area!.width/space!.width).toBeCloseTo(.63,2);
    await page.locator('.favorite-card>.favorite-button').click();
    await expect(page.locator('.favorite-card>.favorite-button')).toHaveAttribute('aria-pressed','true');
    await page.reload();
    await expect(page.getByRole('button',{name:'Panel',exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('.compact-pose .favorite-button')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('.favorite-card>.favorite-button')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('[data-zone="TORSO"] .favorite-button')).toHaveAttribute('aria-pressed','true');
    await page.getByLabel('Solo favoritos').first().check();
    await expect(page.locator('[data-zone="TORSO"] .garment-slide')).toHaveCount(1);
    await expect.poll(()=>page.evaluate(async()=>Boolean(await navigator.serviceWorker.getRegistration()))).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({path:testInfo.outputPath('panel.png')});
    await page.getByRole('button',{name:'Sobre cuerpo',exact:true}).click();
    await expect.poll(async () => {
      const canvas = await page.locator('.body-stage-area canvas').boundingBox();
      const preview = await page.locator('.placed-png').boundingBox();
      return Math.abs(preview!.x + preview!.width / 2 - (canvas!.x + canvas!.width * 430 / 900));
    }).toBeLessThan(1);
    await page.screenshot({path:testInfo.outputPath('sobre-cuerpo.png')});
    console.log(JSON.stringify({viewport,slow,fast,requestsDuringSwipe,indexDuringFastDrag,processedImages:9}));
  });
}
