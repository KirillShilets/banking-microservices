const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto('http://localhost:5173/', { waitUntil: 'load' })
  await page.getByRole('button', { name: 'Открыть карту' }).first().waitFor({ timeout: 40000 })
  await page.getByRole('button', { name: 'Открыть карту' }).first().click()
  await page.getByRole('button', { name: 'Продолжить' }).click()
  await page.waitForTimeout(600)

  const data = await page.evaluate(() => {
    const panel = document.querySelector('[role="dialog"]')
    const grid = panel?.querySelector('.grid')
    const tiles = panel ? Array.from(panel.querySelectorAll('button[aria-pressed]')) : []
    const rect = (el) => (el ? { w: Math.round(el.getBoundingClientRect().width), x: Math.round(el.getBoundingClientRect().x) } : null)
    return {
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      panel: rect(panel),
      grid: rect(grid),
      gridClass: grid?.className,
      tileRects: tiles.slice(0, 3).map(rect),
      tileClass: tiles[0]?.className?.slice(0, 160),
    }
  })
  console.log(JSON.stringify(data, null, 2))
  await browser.close()
})().catch((error) => {
  console.error('FAILED', error)
  process.exit(1)
})
