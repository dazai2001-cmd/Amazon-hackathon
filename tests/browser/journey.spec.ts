import { test, expect } from '@playwright/test';
import WebSocket from 'ws';
import { syntheticPose } from '../../shared/motion';
import { DEFAULT_PROFILE } from '../../shared/motion';

test('remote navigation opens setup and Back restores the main menu', async ({ page }) => {
  await page.goto('/'); const story = page.getByRole('button', { name: /^Story/ }); await expect(story).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(page.getByRole('button', { name: /^Training/ })).toBeFocused();
  await page.getByRole('button', { name: 'Controller Setup' }).click(); await expect(page.getByRole('dialog', { name: 'Controller Setup' })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(story).toBeFocused();
  await page.getByRole('button', { name: 'Settings', exact: true }).click(); await expect(page.getByRole('button', { name: /3D resolution/ })).toContainText('Auto');
});
test('pairing receives real relay traffic, clears a tracking dropout and continues to calibration', async ({ page, request }) => {
  await page.goto('/'); await page.getByRole('button', { name: /^Story/ }).click();
  await expect(page.getByRole('dialog', { name: /Connect. Calibrate/ })).toBeVisible();
  await expect(page.getByText('Wi-Fi QR pairing · No USB required')).toBeVisible();
  const code = (await page.locator('.manual-pair strong').innerText()).trim();
  const pairing = await (await request.post('/api/join', { data: { code } })).json();
  const phone = new WebSocket(`ws://127.0.0.1:8897/relay?role=phone&code=${code}&token=${pairing.phoneToken}`);
  await new Promise<void>(resolve => phone.once('open', resolve));
  let sequence = 0; const send = (visible: boolean) => phone.send(JSON.stringify({ type: 'pose', seq: sequence++, t: performance.now(), landmarks: visible ? syntheticPose() : [], fps: visible ? 20 : 0 }));
  const timer = setInterval(() => send(true), 60);
  try {
    await expect(page.getByText('You’re in view. Ready to move.')).toBeVisible();
    clearInterval(timer); send(false); await expect(page.getByText('Continuing in', { exact: false })).toHaveCount(0);
    await page.getByRole('button', { name: 'Keep setup open' }).click();
    await page.getByRole('button', { name: /Let’s move/ }).click(); await expect(page).toHaveURL(/\/calibrate/);
  } finally { clearInterval(timer); phone.close(); }
});
test('remote profile creation and switching preserve original progress', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('moveroom.training.v1', JSON.stringify({ version: 1, xp: 180, lastRewardDay: '2026-10-13', preference: { pace: 'start', squat: 'shallow', pushup: 'wall', effort: 'same' }, history: [] }));
  });
  await page.goto('/'); await page.getByRole('button', { name: 'Squire', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'New squire name' }); await input.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Edit new squire name' })).toBeVisible();
  await page.keyboard.type('Mara'); await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Create squire' }).click(); await expect(page.getByRole('button', { name: 'Mara', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View training progress' }).click(); await expect(page.getByText('Level 1 · 0 XP')).toBeVisible();
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Mara', exact: true }).click();
  await page.getByRole('button', { name: 'Squire', exact: true }).click(); await page.getByRole('button', { name: 'View training progress' }).click();
  await expect(page.getByText('Level 4 · 180 XP')).toBeVisible();
});
test('the new courtyard model renders at TV density and exposes its quality measurements', async ({ page }) => {
  await page.addInitScript(profile => {
    localStorage.setItem('moveroom.profile', JSON.stringify(profile)); localStorage.setItem('moveroom.player-guide.v1', 'seen');
  }, DEFAULT_PROFILE);
  await page.goto('/chapter?platform=firetv');
  const guide = page.getByRole('dialog', { name: /Player guide/ });
  if (await guide.count()) await page.getByRole('button', { name: /Close player guide|Let.*begin|Return to/ }).first().click();
  await expect(page.locator('.first-person-canvas')).toHaveAttribute('data-render-width', '1920');
  await expect(page.locator('.first-person-canvas')).toHaveAttribute('data-quality', /1080|720/);
  await expect(page.locator('.first-person-canvas')).toBeVisible(); await page.screenshot({ path: 'artifacts/improved-courtyard.png' });
});
test('background inference processes an actual video frame without a camera permission', async ({ page }) => {
  await page.goto('/phone');
  const result = await page.evaluate(async () => {
    const module = await import(`${location.origin}/src/lib/pose-inference.ts`);
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
    const context = canvas.getContext('2d')!; context.fillStyle = '#000'; context.fillRect(0, 0, 640, 480);
    const video = document.createElement('video'); video.muted = true; video.srcObject = canvas.captureStream(15); await video.play();
    const processor = await module.createPoseInference('CPU', 'lite');
    try { const result = await processor.detect(video, performance.now()); return { execution: result.execution, landmarks: result.landmarks.length }; }
    finally { processor.close(); (video.srcObject as MediaStream).getTracks().forEach(track => track.stop()); }
  });
  expect(result).toEqual({ execution: 'worker', landmarks: 0 });
});

test('late rejected camera startup cannot stop its replacement or leave a stale error', async ({ page, request }) => {
  const session = await (await request.post('/api/sessions', { data: {} })).json();
  const tv = new WebSocket(`ws://127.0.0.1:8897/relay?role=tv&code=${session.code}&token=${session.tvToken}`);
  await new Promise<void>(resolve => tv.once('open', resolve));
  tv.on('message', raw => { const packet = JSON.parse(raw.toString()); if (packet.type === 'pose' && packet.seq % 5 === 0) tv.send(JSON.stringify({ type: 'pose-ack', seq: packet.seq, t: packet.t })); });
  await page.addInitScript(() => {
    let calls = 0;
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => {
      if (++calls === 1) return new Promise((_resolve, reject) => { (window as unknown as { rejectOldCamera: () => void }).rejectOldCamera = () => reject(new Error('superseded request')); });
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480; canvas.getContext('2d')!.fillRect(0, 0, 640, 480);
      return Promise.resolve(canvas.captureStream(15));
    } });
  });
  try {
    await page.goto(`/phone#code=${session.code}&token=${session.phoneToken}`); await page.locator('#tracking-quality').selectOption('lite');
    await page.getByRole('button', { name: 'Start my camera' }).click(); await page.getByRole('button', { name: 'Cancel camera startup' }).click();
    await page.getByRole('button', { name: 'Start my camera' }).click();
    // The real model compiles WASM/shaders on first use; shared CI runners
    // can exceed the normal five-second locator wait while still loading.
    await expect(page.locator('.camera-running')).toBeVisible({ timeout: 20000 });
    await page.evaluate(() => (window as unknown as { rejectOldCamera: () => void }).rejectOldCamera());
    await expect(page.locator('.camera-running')).toBeVisible(); await expect(page.getByRole('alert')).toHaveCount(0);
    const live = await page.locator('video').evaluate(video => Boolean(((video as HTMLVideoElement).srcObject as MediaStream)?.getVideoTracks().some(track => track.readyState === 'live'))); expect(live).toBe(true);
    await expect(page.getByText('TV receipt confirmed', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Pause camera' }).click(); await expect(page.locator('.camera-running')).toHaveCount(0);
  } finally { tv.close(); }
});

test('device check supports remote numeric entry and safely reports missing camera input', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Controller Setup' }).click(); await page.getByRole('button', { name: 'Device check', exact: true }).click();
  await expect(page.getByText('Waiting for fresh camera frames')).toBeVisible(); await expect(page.getByRole('button', { name: 'Record 30 seconds' })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Manually counted reps' }).focus(); await page.keyboard.press('Enter'); await page.keyboard.type('12x');
  await page.getByRole('button', { name: 'Done', exact: true }).click(); await expect(page.getByRole('textbox', { name: 'Manually counted reps' })).toHaveValue('12');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('training progress is remote-accessible and Back returns to the current routine', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Controller Setup' }).click(); await page.getByRole('button', { name: 'Try desktop preview' }).click();
  await page.getByRole('button', { name: /^Training/ }).click(); await page.getByRole('button', { name: 'Your progress', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /Squire’s progress/ });
  await expect(dialog).toBeVisible(); await expect(page.getByRole('button', { name: 'Close training progress' })).toBeFocused();
  expect((await dialog.boundingBox())!.height).toBeGreaterThan(400);
  await expect(page.getByText('This week’s oath', { exact: false })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('.training-hall')).toHaveAttribute('data-training-phase', 'plan'); await expect(page.locator('.training-progress-dialog')).toHaveCount(0);
});

test('the progress dialog stays readable in a high-density TV viewport', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:8897', viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  try {
    const page = await context.newPage(); await page.goto('/'); await page.getByRole('button', { name: 'View training progress' }).click();
    const dialog = page.getByRole('dialog', { name: /Squire’s progress/ }); const bounds = (await dialog.boundingBox())!;
    expect(bounds.height).toBeGreaterThan(300); expect(bounds.y).toBeGreaterThanOrEqual(0); expect(bounds.y + bounds.height).toBeLessThanOrEqual(540);
    const goal = (await page.locator('.weekly-oath').boundingBox())!; expect(goal.y + goal.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    await expect(page.getByRole('button', { name: 'Close training progress' })).toBeFocused();
  } finally { await context.close(); }
});

test('cancelling model startup terminates its worker without creating a compatibility tracker', async ({ page }) => {
  await page.goto('/phone');
  const result = await page.evaluate(async () => {
    const module = await import(`${location.origin}/src/lib/pose-inference.ts`), NativeWorker = window.Worker;
    let active = 0;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) { super(url, options); active++; }
      terminate() { active--; super.terminate(); }
    };
    const controller = new AbortController();
    try {
      const starting = module.createPoseInference('CPU', 'lite', controller.signal); controller.abort();
      try { const processor = await starting; processor.close(); return { cancelled: false, active }; }
      catch { return { cancelled: true, active }; }
    } finally { window.Worker = NativeWorker; }
  });
  expect(result).toEqual({ cancelled: true, active: 0 });
});
