import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { CapRoverClient } from './CapRoverClient'

const args = yargs(hideBin(process.argv))
  .command('cleanup', 'cleanup caprover docker images', undefined)
  .options('url', {
    alias: 'u',
    type: 'string',
    description: 'Base URL for caprover',
    default: 'https://captain.caprover.vormadal.com/api/v2/'
  })
  .options('password', {
    alias: 'p',
    type: 'string',
    description: 'Password for caprover',
    demandOption: true
  })
  .options('keep', {
    alias: 'k',
    type: 'number',
    default: 2,
    description: 'Number of versions to keep for each image'
  })
  .parseAsync()

args.then(async (x) => {
  console.log('running...')
  const client = new CapRoverClient(x.url, x.password)
  await client.cleanupDockerImages(x.keep)
  console.log('complete')
})
