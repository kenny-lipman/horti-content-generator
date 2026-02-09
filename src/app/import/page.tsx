import { getImportTemplates, getImportJobs } from '@/lib/data/import'
import { ImportClient } from './import-client'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  const [templates, jobs] = await Promise.all([
    getImportTemplates(),
    getImportJobs(),
  ])

  return <ImportClient templates={templates} recentJobs={jobs} />
}
