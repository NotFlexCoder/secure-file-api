import express from 'express'

const app = express()

app.get('/', (req, res) => {
  const { file, password, id } = req.query

  if (!file && !id) return res.status(400).send('Missing file or id')
  if (!password) return res.status(400).send('Password is required')

  if (file) {
    const encoded = Buffer.from(file + '::' + password).toString('base64')
    const fileUrl = `${req.protocol}://${req.get('host')}?id=${encoded}&password=${password}`
    return res.send({ link: fileUrl })
  }

  if (id) {
    try {
      const decoded = Buffer.from(id, 'base64').toString()
      const [originalFile, originalPass] = decoded.split('::')
      if (password === originalPass) {
        return res.send({ file: originalFile })
      } else {
        return res.status(403).send('Incorrect password')
      }
    } catch {
      return res.status(400).send('Invalid ID')
    }
  }

  res.status(400).send('Invalid request')
})

export default app
 
