import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg'
import { v4 as uuidv4 } from 'uuid'
import fetch from 'node-fetch'

const ffmpeg = createFFmpeg({ log: false })
const cache = {}

const defaultVideo = 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4'

export default async (req, res) => {
  const { s, id } = req.query

  if (id && cache[id]) {
    res.setHeader('Content-Type', 'image/jpeg')
    res.send(cache[id])
    delete cache[id]
    return
  }

  if (!s) {
    res.status(400).send('Missing ?s=timeInSeconds')
    return
  }

  if (!ffmpeg.isLoaded()) await ffmpeg.load()

  const videoRes = await fetch(defaultVideo)
  const videoData = await videoRes.arrayBuffer()

  ffmpeg.FS('writeFile', 'input.mp4', new Uint8Array(videoData))
  await ffmpeg.run(
    '-ss', s,
    '-i', 'input.mp4',
    '-frames:v', '1',
    '-q:v', '2',
    'output.jpg'
  )

  const output = ffmpeg.FS('readFile', 'output.jpg')
  const idKey = uuidv4().slice(0, 8)
  cache[idKey] = Buffer.from(output)
  res.end(`?id=${idKey}`)
}
