const { chromium } = require('playwright')

const SHOTS = 'C:/Users/kiruxa/IdeaProjects/spring-cloud-banking-system/.shots3'

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 1150 } })

  await page.goto('http://localhost:5173/', { waitUntil: 'load' })
  await page.getByRole('button', { name: 'Открыть карту' }).first().waitFor({ timeout: 40000 })
  await page.waitForTimeout(800)

  await page.getByRole('button', { name: 'Открыть карту' }).first().click()
  await page.getByRole('button', { name: 'Продолжить' }).click()
  await page.getByRole('button', { name: /Свой дизайн/ }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: SHOTS + '/art-1-empty.png' })
  console.log('empty uploader captured')

  await page.setInputFiles('input[type=file]', SHOTS + '/artwork-ok.png')
  await page.waitForTimeout(900)
  await page.screenshot({ path: SHOTS + '/art-2-photo.png' })
  console.log('photo applied')

  await page.setInputFiles('input[type=file]', SHOTS + '/artwork-square.png')
  await page.waitForTimeout(900)
  await page.screenshot({ path: SHOTS + '/art-3-warning.png' })
  console.log('warning captured')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(700)
  await page.screenshot({ path: SHOTS + '/art-4-mobile.png' })
  console.log('mobile captured')

  await browser.close()
  console.log('done')
})().catch((error) => {
  console.error('FAILED', error)
  process.exit(1)
})
