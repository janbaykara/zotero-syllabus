import { getPayload } from 'payload'
import config from '@payload-config'
import 'dotenv/config'
import { Command } from 'commander'

const program = new Command()

program
  .name('deleteusers')
  .description('Delete users from Payload')
  .version('1.0.0')
  .requiredOption('-e, --email <email>', 'Email address of the user to delete')
  .parse()

async function deleteUser(email: string) {
  console.log(process.env.MONGODB_URI)
  console.log('🚀 Initializing Payload...')
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  console.log('✓ Payload initialized successfully')

  // Check if user already exists
  console.log(`\n🔍 Checking if user with email "${email}" already exists...`)
  const existingUser = await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: "janbaykara@pm.me",
      },
    }
  })
  process.exit(0)
}

// Main execution
async function main() {
  const options = program.opts()
  await deleteUser(options.email)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
