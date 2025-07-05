import chrome from 'chrome-aws-lambda'
import puppeteer from 'puppeteer-core'

function parseTimeToSeconds(timeStr) {
  const match = timeStr.match(/^(\d+)(s|min|h)$/)
  if (!match) return null
  const num = parseInt(match[1])
  const unit = match[2]
  const multipliers = { s: 1, min: 60, h: 3600 }
  return num * multipliers[unit]
}

export default async function handler(req, res) {
  const { video, time } = req.query
  if (!video || !time) {
    return res.status(400).send('Missing ?video & ?time=5s/1min')
  }

  const seconds = parseTimeToSeconds(time)
  if (!seconds) return res.status(400).send('Invalid time format')

  const browser = await puppeteer.launch({
    args: chrome.args,
    executablePath: await chrome.executablePath,
    headless: chrome.headless
  })

  const page = await browser.newPage()

  const html = `
    <html>
      <body style="margin:0;overflow:hidden">
        <video id="v" src="${video}" style="width:100vw;height:100vh" autoplay muted></video>
        <script>
          const v = document.getElementById('v');
          v.addEventListener('loadeddata', () => {
            v.currentTime = ${seconds};
          });
        </script>
      </body>
    </html>
  `

  await page.setViewport({ width: 1280, height: 720 })
  await page.setContent(html, { waitUntil: 'networkidle2' })

  await page.waitForFunction(
    seconds => document.querySelector('video')?.currentTime >= seconds,
    { timeout: 8000 },
    seconds
  )

  const buffer = await page.screenshot({ type: 'jpeg' })

  await browser.close()
  res.setHeader('Content-Type', 'image/jpeg')
  res.send(buffer)
}
 
