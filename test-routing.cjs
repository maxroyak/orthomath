// Puppeteer test script - connect to Chrome via debug protocol
// This runs in WSL but launches Chrome on Windows side
const puppeteer = require('/tmp/node_modules/puppeteer-core');

const CHROME_PATH = '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'http://localhost:5173';
const USER_DATA_DIR = 'C:\\\\Temp\\\\puppeteer-chrome-profile';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();
  
  // Collect console errors
  const consoleErrors = [];
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(`PAGE ERROR: ${err.message}`);
  });

  console.log('=== Step 1: Open landing page ===');
  await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 15000 });
  await sleep(1000);
  const title = await page.title();
  console.log('Title:', title);
  
  // Get the page text to see what's rendered
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Landing page text (first 200 chars):', bodyText.substring(0, 200));

  console.log('\\n=== Step 2: Click "Open demo case" ===');
  // Find and click the "Open demo case" button
  const demoBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => b.textContent.includes('Open demo case'));
  });
  if (demoBtn) {
    await demoBtn.click();
    await sleep(2000);
  }
  const url1 = page.url();
  console.log('URL after demo case click:', url1);
  const bodyText1 = await page.evaluate(() => document.body.innerText);
  console.log('Page text (first 300 chars):', bodyText1.substring(0, 300));

  console.log('\\n=== Step 3: Find and click "Next: Treatment Planning" ===');
  // Get current URL
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  // Look for the Next: Treatment Planning button
  const nextBtnInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const nextBtn = buttons.find(b => b.textContent.includes('Treatment Planning'));
    if (nextBtn) {
      return { 
        found: true, 
        text: nextBtn.textContent,
        disabled: nextBtn.disabled,
        rect: nextBtn.getBoundingClientRect()
      };
    }
    return { found: false };
  });
  console.log('Next button info:', JSON.stringify(nextBtnInfo));

  if (nextBtnInfo.found) {
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Treatment Planning'));
      if (nextBtn) nextBtn.click();
    });
    await sleep(2000);
  }

  const url2 = page.url();
  console.log('URL after clicking Next:', url2);
  const bodyText2 = await page.evaluate(() => document.body.innerText);
  console.log('Treatment Planning page text (first 500 chars):', bodyText2.substring(0, 500));

  console.log('\\n=== Step 4: Check if scenarios are visible ===');
  const scenariosVisible = await page.evaluate(() => {
    const text = document.body.innerText;
    const hasScenarios = text.includes('Non-extraction') || text.includes('Extraction 14/24') || text.includes('Four-premolar');
    const hasScenarioHeader = text.includes('Treatment Scenarios');
    const hasEmptyState = text.includes('No treatment scenarios yet');
    return { hasScenarios, hasScenarioHeader, hasEmptyState };
  });
  console.log('Scenarios visible:', JSON.stringify(scenariosVisible));

  console.log('\\n=== Step 5: Navigate to Comparison via sidebar ===');
  // Click Comparison in sidebar
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const compLink = links.find(a => a.textContent.includes('Comparison'));
    if (compLink) compLink.click();
  });
  await sleep(2000);
  const url3 = page.url();
  console.log('Comparison URL:', url3);
  const bodyText3 = await page.evaluate(() => document.body.innerText);
  console.log('Comparison page text (first 300 chars):', bodyText3.substring(0, 300));

  console.log('\\n=== Step 6: Navigate to Summary via sidebar ===');
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const sumLink = links.find(a => a.textContent.includes('Summary'));
    if (sumLink) sumLink.click();
  });
  await sleep(2000);
  const url4 = page.url();
  console.log('Summary URL:', url4);
  const bodyText4 = await page.evaluate(() => document.body.innerText);
  console.log('Summary page text (first 300 chars):', bodyText4.substring(0, 300));

  console.log('\\n=== Step 7: Navigate back to Diagnostics via sidebar ===');
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const diagLink = links.find(a => a.textContent.includes('Diagnostics'));
    if (diagLink) diagLink.click();
  });
  await sleep(2000);
  const url5 = page.url();
  console.log('Diagnostics URL:', url5);
  const bodyText5 = await page.evaluate(() => document.body.innerText);
  console.log('Diagnostics page text (first 200 chars):', bodyText5.substring(0, 200));

  console.log('\\n=== Step 8: Browser back/forward test ===');
  // Go back to summary
  await page.goBack();
  await sleep(1000);
  const backUrl = page.url();
  console.log('After goBack:', backUrl);
  await page.goBack();
  await sleep(1000);
  const backUrl2 = page.url();
  console.log('After goBack again:', backUrl2);
  await page.goForward();
  await sleep(1000);
  const fwdUrl = page.url();
  console.log('After goForward:', fwdUrl);

  console.log('\\n=== Step 9: Direct URL test - Treatment Planning ===');
  // Extract patient ID from current URL
  const patientId = currentUrl.match(/patient\/([^\/]+)/)?.[1] || 'seed-patient-anna';
  console.log('Patient ID:', patientId);
  await page.goto(`${APP_URL}/patient/${patientId}/scenarios`, { waitUntil: 'networkidle2', timeout: 15000 });
  await sleep(2000);
  const directUrl = page.url();
  console.log('Direct URL:', directUrl);
  const directText = await page.evaluate(() => document.body.innerText);
  console.log('Direct treatment planning text (first 500 chars):', directText.substring(0, 500));

  console.log('\\n=== Step 10: Invalid patient test ===');
  await page.goto(`${APP_URL}/patient/invalid-patient-id/diagnostics`, { waitUntil: 'networkidle2', timeout: 15000 });
  await sleep(2000);
  const invalidText = await page.evaluate(() => document.body.innerText);
  console.log('Invalid patient text:', invalidText.substring(0, 200));

  console.log('\\n=== Step 11: Console errors ===');
  if (consoleErrors.length === 0) {
    console.log('NONE');
  } else {
    consoleErrors.forEach(e => console.log('ERROR:', e));
  }

  await browser.close();
  console.log('\\n=== DONE ===');
}

run().catch(e => {
  console.error('Test failed:', e.message);
  process.exit(1);
});