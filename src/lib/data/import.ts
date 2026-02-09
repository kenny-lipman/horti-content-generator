import 'server-only'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { ImportTemplate, ImportJob } from '@/lib/supabase/types'

// ============================================
// Import Templates
// ============================================

/**
 * Haal alle actieve import templates op, optioneel gefilterd op business_type en product_type.
 */
export async function getImportTemplates(
  businessType?: string,
  productType?: string
): Promise<ImportTemplate[]> {
  const supabase = await createClient()

  let query = supabase
    .from('import_templates')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (businessType) {
    query = query.eq('business_type', businessType)
  }

  if (productType) {
    query = query.eq('product_type', productType)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getImportTemplates] Fout bij ophalen templates:', error.message)
    return []
  }

  return data ?? []
}

/**
 * Haal een enkele import template op basis van ID.
 */
export async function getImportTemplateById(
  id: string
): Promise<ImportTemplate | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('import_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error(`[getImportTemplateById] Fout bij ophalen template ${id}:`, error.message)
    return null
  }

  return data
}

// ============================================
// Import Jobs
// ============================================

/**
 * Maak een nieuwe import job aan.
 * Gebruikt adminClient omdat dit een systeemoperatie is (RLS bypass).
 */
export async function createImportJob(data: {
  organizationId: string
  templateId: string
  filename: string
  fileUrl: string
  totalRows: number
  createdBy: string
}): Promise<ImportJob | null> {
  const supabase = createAdminClient()

  const { data: job, error } = await supabase
    .from('import_jobs')
    .insert({
      organization_id: data.organizationId,
      template_id: data.templateId,
      file_name: data.filename,
      file_url: data.fileUrl,
      total_rows: data.totalRows,
      status: 'uploaded',
      created_by: data.createdBy,
    })
    .select()
    .single()

  if (error) {
    console.error('[createImportJob] Fout bij aanmaken import job:', error.message)
    return null
  }

  return job
}

/**
 * Werk een import job bij met voortgang of status.
 */
export async function updateImportJob(
  jobId: string,
  update: {
    status?: string
    processedRows?: number
    errorRows?: number
    errors?: unknown[]
    completedAt?: string
  }
): Promise<boolean> {
  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = {}
  if (update.status !== undefined) updateData.status = update.status
  if (update.processedRows !== undefined) updateData.processed_rows = update.processedRows
  if (update.errorRows !== undefined) updateData.error_rows = update.errorRows
  if (update.errors !== undefined) updateData.errors = update.errors
  if (update.completedAt !== undefined) updateData.completed_at = update.completedAt

  const { error } = await supabase
    .from('import_jobs')
    .update(updateData)
    .eq('id', jobId)

  if (error) {
    console.error(`[updateImportJob] Fout bij updaten job ${jobId}:`, error.message)
    return false
  }

  return true
}

/**
 * Haal import job historie op voor de huidige organisatie.
 */
export async function getImportJobs(): Promise<ImportJob[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('import_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[getImportJobs] Fout bij ophalen import jobs:', error.message)
    return []
  }

  return data ?? []
}
