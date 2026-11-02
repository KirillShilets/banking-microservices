const { chromium } = require('playwright')

const SHOTS = 'C:/Users/kiruxa/IdeaProjects/spring-cloud-banking-system/.shots3'

;(async () => {
  const browser = await chromium.launch()
  // Fresh context at mobile width so the layout is measured at 390 from the start.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto('http://localhost:5173/', { waitUntil: 'load' })
  await page.getByRole('button', { name: 'Открыть карту' }).first().waitFor({ timeout: 40000 })
  await page.getByRole('button', { name: 'Открыть карту' }).first().click()
  await page.getByRole('button', { name: 'Продолжить' }).click()
  await page.getByRole('button', { name: /Свой дизайн/ }).click()
  await page.setInputFiles('input[type=file]', SHOTS + '/artwork-ok.png')
  await page.waitForTimeout(900)
  await page.screenshot({ path: SHOTS + '/art-5-mobile-photo.png' })
  console.log('mobile photo captured')
  await browser.close()
})().catch((error) => {
  console.error('FAILED', error)
  process.exit(1)
})
