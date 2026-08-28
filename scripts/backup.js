import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lyuczttevtovpjlndagt.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AleSKAWSvH4Fv9m0X2ly6g_A9elesfQ'

async function runBackup() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data: books, error } = await supabase.from('books').select('*').order('created_at', { ascending: false })

  if (error) {
    console.error('Ошибка бэкапа Supabase:', error.message)
    process.exit(1)
  }

  const backupDir = join(process.cwd(), 'backups')
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true })
  }

  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `books-backup-${timestamp}.json`
  const filepath = join(backupDir, filename)
  const latestPath = join(backupDir, 'latest.json')

  const jsonContent = JSON.stringify(books, null, 2)
  writeFileSync(filepath, jsonContent, 'utf-8')
  writeFileSync(latestPath, jsonContent, 'utf-8')

  console.log(`✅ Резервная копия сохранена (${books.length} книг): ${filepath}`)
}

runBackup()
