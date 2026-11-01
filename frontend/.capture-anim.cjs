const { chromium } = require('playwright')

const SHOTS = 'C:/Users/kiruxa/IdeaProjects/spring-cloud-banking-system/.shots7'

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  await page.goto('http://localhost:5173/', { waitUntil: 'load' })
  await page.getByRole('button', { name: 'Открыть карту' }).first().waitFor({ timeout: 40000 })

  // entrance animation: three frames
  await page.waitForTimeout(120)
  await page.screenshot({ path: SHOTS + '/anim-1.png' })
  await page.waitForTimeout(400)
  await page.screenshot({ path: SHOTS + '/anim-2.png' })
  await page.waitForTimeout(900)
  await page.screenshot({ path: SHOTS + '/anim-3.png' })

  const deck = page.locator('button[aria-label$="Показать карту"]')
  console.log('cards:', await deck.count())

  // grid must not change when switching
  const gridBefore = await page.locator('section[aria-labelledby="accounts-heading"] button').nth(0).innerText()
  await deck.nth((await deck.count()) - 1).click({ position: { x: 30, y: 20 } })
  await page.waitForTimeout(700)
  const gridAfter = await page.locator('section[aria-labelledby="accounts-heading"] button').nth(0).innerText()
  console.log('grid stable:', gridBefore.split('\n')[0] === gridAfter.split('\n')[0], gridBefore.split('\n')[0])
  await page.screenshot({ path: SHOTS + '/anim-4-selected.png' })

  await browser.close()
  console.log('done')
})().catch((error) => {
  console.error('FAILED', error)
  process.exit(1)
})
