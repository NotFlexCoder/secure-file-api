import { createWriteStream } from 'fs'
import { pipeline } from 'stream'
import { promisify } from 'util'
import { v4 as uuidv4 } from 'uuid'
import fetch from 'node-fetch'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { tmpdir } from 'os'
import path from 'path'

const streamPipeline = promisify(pipeline)
ffmpeg.setFfmpegPath(ffmpegPath)

const defaultVideo = 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4'

const cache = {}

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

  const videoResponse = await fetch(defaultVideo)
  const tempVideoPath = path.join(tmpdir(), `${uuidv4()}.mp4`)
  const tempImagePath = path.join(tmpdir(), `${uuidv4()}.jpg`)

  await streamPipeline(videoResponse.body, createWriteStream(tempVideoPath))

  await new Promise((resolve, reject) => {
    ffmpeg(tempVideoPath)
      .screenshots({
        timestamps: [s],
        filename: path.basename(tempImagePath),
        folder: path.dirname(tempImagePath),
        size: '720x?'
      })
      .on('end', resolve)
      .on('error', reject)
  })

  const imageBuffer = await import('fs/promises').then(fs => fs.readFile(tempImagePath))
  const randId = uuidv4().slice(0, 8)
  cache[randId] = imageBuffer
  res.end(`?id=${randId}`)
}
 
