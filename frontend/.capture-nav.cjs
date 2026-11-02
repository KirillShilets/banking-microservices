const { chromium } = require('playwright')

const SHOTS = 'C:/Users/kiruxa/IdeaProjects/spring-cloud-banking-system/.shots9'
const APP = 'http://localhost:5173/'

;(async () => {
  const browser = await chromium.launch()
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await desktop.goto(APP, { waitUntil: 'load' })
  await desktop.getByRole('button', { name: 'Открыть карту' }).first().waitFor({ timeout: 40000 })
  await desktop.waitForTimeout(900)

  const nav = desktop.locator('nav[aria-label="Основная навигация"]').first()
  console.log('sidebar items:', await nav.locator('a').count())
  console.log('card block gone:', (await desktop.locator('text=МОИ КАРТЫ').count()) === 0)
  console.log('OIDC gone:', (await desktop.locator('text=OIDC').count()) === 0)
  await desktop.screenshot({ path: SHOTS + '/nav-desktop.png' })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mobile.goto(APP, { waitUntil: 'load' })
  await mobile.getByRole('button', { name: 'Открыть карту' }).first().waitFor({ timeout: 40000 })
  await mobile.waitForTimeout(800)
  await mobile.getByRole('button', { name: 'Ещё' }).click()
  await mobile.waitForTimeout(500)
  console.log('more sheet links:', await mobile.getByRole('dialog').locator('a').count())
  await mobile.screenshot({ path: SHOTS + '/nav-mobile.png' })

  await browser.close()
  console.log('done')
})().catch((error) => {
  console.error('FAILED', error)
  process.exit(1)
})
