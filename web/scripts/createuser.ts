import { getPayload } from 'payload'
import config from '@payload-config'
import 'dotenv/config'
import { Command } from 'commander'

const program = new Command()

program
  .name('create-user')
  .description('Create a new Payload user')
  .version('1.0.0')
  .requiredOption('-e, --email <email>', 'Email address for the new user')
  .requiredOption('-p, --password <password>', 'Password for the new user')
  .parse()

async function createUser(email: string, password: string) {
  console.log(process.env.MONGODB_URI)
  console.log('🚀 Initializing Payload...')
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  console.log('✓ Payload initialized successfully')

  // Check if user already exists
  console.log(`\n🔍 Checking if user with email "${email}" already exists...`)
  const existingUser = await payload.find({
    collection: 'users',
    where: {
      email: {
        equals: email,
      },
    },
    limit: 1,
  })

  if (existingUser.docs.length > 0) {
    console.error(`❌ User with email "${email}" already exists`)
    process.exit(1)
  }

  // Create the user
  console.log(`\n📝 Creating new user with email "${email}"...`)
  try {
    const config = {
      collection: 'users',
      data: {
        email,
        password,
        zoteroUserId: "3447477",
        role: "admin"
      },
      disableVerificationEmail: true,
    }
    console.log({ config })
    const user = await payload.create(config)

    console.log(`✅ User created successfully!`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    process.exit(0)
  } catch (error: any) {
    console.error(`❌ Error creating user:`, error.message)
    if (error.errors) {
      error.errors.forEach((err: any) => {
        console.error(`   - ${err.message}`)
      })
    }
    process.exit(1)
  }
}

// Main execution
async function main() {
  const options = program.opts()
  await createUser(options.email, options.password)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
