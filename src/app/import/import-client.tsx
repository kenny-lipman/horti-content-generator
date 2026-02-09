"use client"

import { useState, useCallback, useRef } from "react"
import Link from "next/link"
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  XCircle,
  FileUp,
  Package,
  Clock,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { ImportTemplate, ImportJob } from "@/lib/supabase/types"

// ============================================
// Types
// ============================================

interface ParsedRow {
  rowNumber: number
  data: Record<string, unknown>
  raw: Record<string, unknown>
}

interface ValidationError {
  row: number
  field: string
  message: string
}

interface ParseResponse {
  rows: ParsedRow[]
  errors: ValidationError[]
  validCount: number
  totalCount: number
  templateId: string
  productType: string
}

interface ImportResponse {
  success: boolean
  jobId: string
  totalRows: number
  successCount: number
  errorCount: number
  errors: Array<{ row: number; error: string }>
}

type Step = 'template' | 'upload' | 'preview' | 'importing' | 'complete'

// ============================================
// Props
// ============================================

interface ImportClientProps {
  templates: ImportTemplate[]
  recentJobs: ImportJob[]
}

// ============================================
// Constanten
// ============================================

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  plant: 'Planten',
  cut_flower: 'Snijbloemen',
  accessory: 'Accessoires',
}

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  grower: 'Kweker',
  wholesaler: 'Groothandel',
  retailer: 'Retailer',
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  uploaded: { label: 'Geupload', variant: 'secondary' },
  validating: { label: 'Valideren', variant: 'secondary' },
  processing: { label: 'Verwerken', variant: 'default' },
  completed: { label: 'Voltooid', variant: 'outline' },
  failed: { label: 'Mislukt', variant: 'destructive' },
}

// ============================================
// Component
// ============================================

export function ImportClient({ templates, recentJobs }: ImportClientProps) {
  // Wizard state
  const [step, setStep] = useState<Step>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<ImportTemplate | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null)
  const [importResult, setImportResult] = useState<ImportResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // -----------------------------------------
  // Handlers
  // -----------------------------------------

  const handleTemplateSelect = useCallback((template: ImportTemplate) => {
    setSelectedTemplate(template)
    setFile(null)
    setParseResult(null)
    setError(null)
    setStep('upload')
  }, [])

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile)
    setError(null)

    // Validatie
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.xlsx?$/i)) {
      setError('Alleen Excel bestanden (.xlsx, .xls) zijn toegestaan')
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Bestand mag niet groter zijn dan 10MB')
      return
    }
  }, [])

  const handleUploadAndParse = useCallback(async () => {
    if (!file || !selectedTemplate) return

    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('templateId', selectedTemplate.id)

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Er is een fout opgetreden')
        return
      }

      setParseResult(data as ParseResponse)
      setStep('preview')
    } catch {
      setError('Er is een fout opgetreden bij het uploaden')
    } finally {
      setIsLoading(false)
    }
  }, [file, selectedTemplate])

  const handleConfirmImport = useCallback(async () => {
    if (!parseResult || !selectedTemplate) return

    // Filter alleen geldige rijen (rijen zonder fouten)
    const errorRowNumbers = new Set(parseResult.errors.map((e) => e.row))
    const validRows = parseResult.rows.filter(
      (row) => !errorRowNumbers.has(row.rowNumber)
    )

    if (validRows.length === 0) {
      setError('Geen geldige rijen om te importeren')
      return
    }

    setIsLoading(true)
    setError(null)
    setStep('importing')

    try {
      const response = await fetch('/api/import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: validRows,
          templateId: selectedTemplate.id,
          filename: file?.name || 'import.xlsx',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Er is een fout opgetreden bij het importeren')
        setStep('preview')
        return
      }

      setImportResult(data as ImportResponse)
      setStep('complete')
    } catch {
      setError('Er is een fout opgetreden bij het importeren')
      setStep('preview')
    } finally {
      setIsLoading(false)
    }
  }, [parseResult, selectedTemplate, file])

  const handleReset = useCallback(() => {
    setStep('template')
    setSelectedTemplate(null)
    setFile(null)
    setParseResult(null)
    setImportResult(null)
    setError(null)
  }, [])

  const handleDownloadSample = useCallback(async (templateId: string) => {
    window.open(`/api/import/sample?template_id=${templateId}`, '_blank')
  }, [])

  // Drop handler
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        handleFileSelect(droppedFile)
      }
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // -----------------------------------------
  // Gefilterde templates
  // -----------------------------------------

  const filteredTemplates = filterType
    ? templates.filter((t) => t.product_type === filterType)
    : templates

  const uniqueProductTypes = [
    ...new Set(templates.map((t) => t.product_type)),
  ]

  // -----------------------------------------
  // Render
  // -----------------------------------------

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Excel Import
          </h1>
          <p className="text-sm text-muted-foreground">
            Importeer producten vanuit een Excel bestand
          </p>
        </div>
        {step !== 'template' && step !== 'complete' && (
          <Button variant="ghost" onClick={handleReset}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Opnieuw beginnen
          </Button>
        )}
      </div>

      {/* Stappen indicator */}
      <div className="mb-8">
        <StepIndicator currentStep={step} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto shrink-0 text-destructive/70 hover:text-destructive"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 1: Template selectie */}
      {step === 'template' && (
        <div>
          {/* Filter */}
          {uniqueProductTypes.length > 1 && (
            <div className="mb-4 flex gap-2">
              <Button
                variant={filterType === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(null)}
              >
                Alles
              </Button>
              {uniqueProductTypes.map((type) => (
                <Button
                  key={type}
                  variant={filterType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(type)}
                >
                  {PRODUCT_TYPE_LABELS[type] || type}
                </Button>
              ))}
            </div>
          )}

          {filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Geen import templates beschikbaar
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/30"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        {template.name}
                      </CardTitle>
                      <Badge variant="secondary">
                        {PRODUCT_TYPE_LABELS[template.product_type] || template.product_type}
                      </Badge>
                    </div>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {BUSINESS_TYPE_LABELS[template.business_type] || template.business_type}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadSample(template.id)
                        }}
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Voorbeeld
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Recente imports */}
          {recentJobs.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold">Recente imports</h2>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {recentJobs.slice(0, 5).map((job) => {
                      const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.uploaded
                      return (
                        <div
                          key={job.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {job.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {job.total_rows} rijen
                                {job.processed_rows !== null && (
                                  <> &middot; {job.processed_rows} verwerkt</>
                                )}
                                {job.error_rows !== null && job.error_rows > 0 && (
                                  <> &middot; {job.error_rows} fouten</>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {job.created_at && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(job.created_at).toLocaleDateString('nl-NL')}
                              </span>
                            )}
                            <Badge variant={config.variant}>{config.label}</Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Step 2: File upload */}
      {step === 'upload' && selectedTemplate && (
        <div>
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {selectedTemplate.name}
                  </CardTitle>
                  <CardDescription>
                    {selectedTemplate.description || `Importeer ${PRODUCT_TYPE_LABELS[selectedTemplate.product_type] || selectedTemplate.product_type}`}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadSample(selectedTemplate.id)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download voorbeeld
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Drop zone */}
          <Card
            className={cn(
              "border-2 border-dashed transition-colors",
              file ? "border-primary/50 bg-primary/5" : "hover:border-muted-foreground/50"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              {file ? (
                <>
                  <FileSpreadsheet className="mb-3 h-12 w-12 text-primary" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFile(null)
                        setError(null)
                      }}
                    >
                      Ander bestand
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleUploadAndParse}
                      disabled={isLoading || !!error}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verwerken...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Uploaden en controleren
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <FileUp className="mb-3 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-sm font-medium">
                    Sleep je Excel bestand hierheen
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    of klik om een bestand te selecteren (.xlsx, .xls, max 10MB)
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Selecteer bestand
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="hidden"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0]
                      if (selectedFile) handleFileSelect(selectedFile)
                    }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && parseResult && (
        <div>
          {/* Samenvatting */}
          <div className="mb-4 grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{parseResult.totalCount}</p>
                  <p className="text-xs text-muted-foreground">Totaal rijen</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{parseResult.validCount}</p>
                  <p className="text-xs text-muted-foreground">Geldig</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">
                    {parseResult.totalCount - parseResult.validCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Met fouten</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview tabel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Voorbeeld van de data</CardTitle>
              <CardDescription>
                Controleer de data voordat je importeert. Rijen met fouten worden rood gemarkeerd en overgeslagen.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="whitespace-nowrap px-4 py-2 text-left font-medium">
                        Rij
                      </th>
                      <th className="whitespace-nowrap px-4 py-2 text-left font-medium">
                        Status
                      </th>
                      {getPreviewColumns(parseResult.rows).map((col) => (
                        <th
                          key={col}
                          className="whitespace-nowrap px-4 py-2 text-left font-medium"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parseResult.rows.slice(0, 20).map((row) => {
                      const rowErrors = parseResult.errors.filter(
                        (e) => e.row === row.rowNumber
                      )
                      const hasErrors = rowErrors.length > 0

                      return (
                        <tr
                          key={row.rowNumber}
                          className={cn(
                            hasErrors && "bg-destructive/5"
                          )}
                        >
                          <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                            {row.rowNumber}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2">
                            {hasErrors ? (
                              <span
                                className="flex items-center gap-1 text-xs text-destructive"
                                title={rowErrors.map((e) => `${e.field}: ${e.message}`).join('\n')}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                {rowErrors.length} fout{rowErrors.length > 1 ? 'en' : ''}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle className="h-3.5 w-3.5" />
                                OK
                              </span>
                            )}
                          </td>
                          {getPreviewColumns(parseResult.rows).map((col) => {
                            const fieldError = rowErrors.find((e) => e.field === col)
                            return (
                              <td
                                key={col}
                                className={cn(
                                  "max-w-[200px] truncate whitespace-nowrap px-4 py-2",
                                  fieldError && "text-destructive font-medium"
                                )}
                                title={
                                  fieldError
                                    ? fieldError.message
                                    : String(row.data[col] ?? '')
                                }
                              >
                                {String(row.data[col] ?? '-')}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {parseResult.rows.length > 20 && (
                <div className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
                  Toont 20 van {parseResult.rows.length} rijen
                </div>
              )}
            </CardContent>
          </Card>

          {/* Foutdetails */}
          {parseResult.errors.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Validatiefouten ({parseResult.errors.length})
                </CardTitle>
                <CardDescription>
                  Deze fouten moeten in het Excel bestand gecorrigeerd worden, of de betreffende rijen worden overgeslagen.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-60 overflow-y-auto divide-y">
                  {parseResult.errors.slice(0, 50).map((err, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2 text-sm">
                      <Badge variant="destructive" className="shrink-0 text-xs">
                        Rij {err.row}
                      </Badge>
                      <span className="font-medium">{err.field}:</span>
                      <span className="text-muted-foreground">{err.message}</span>
                    </div>
                  ))}
                  {parseResult.errors.length > 50 && (
                    <div className="px-4 py-2 text-center text-xs text-muted-foreground">
                      En nog {parseResult.errors.length - 50} andere fouten...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Acties */}
          <div className="mt-6 flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep('upload')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug
            </Button>
            <div className="flex items-center gap-3">
              {parseResult.validCount === 0 ? (
                <p className="text-sm text-destructive">
                  Geen geldige rijen om te importeren
                </p>
              ) : (
                <Button onClick={handleConfirmImport} disabled={isLoading}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Importeer {parseResult.validCount} producten
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Importing */}
      {step === 'importing' && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
            <h2 className="text-lg font-semibold">Producten importeren...</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Even geduld, je producten worden aangemaakt.
            </p>
            <Progress value={undefined} className="mt-6 w-64" />
          </CardContent>
        </Card>
      )}

      {/* Step 5: Complete */}
      {step === 'complete' && importResult && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            {importResult.errorCount === 0 ? (
              <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
            ) : (
              <AlertCircle className="mb-4 h-16 w-16 text-yellow-500" />
            )}
            <h2 className="text-xl font-semibold">Import voltooid</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {importResult.successCount} van {importResult.totalRows} producten succesvol geimporteerd
            </p>

            {/* Resultaat details */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 rounded-lg border px-4 py-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-lg font-bold">{importResult.successCount}</p>
                  <p className="text-xs text-muted-foreground">Succesvol</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border px-4 py-3">
                <XCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-lg font-bold">{importResult.errorCount}</p>
                  <p className="text-xs text-muted-foreground">Mislukt</p>
                </div>
              </div>
            </div>

            {/* Import fouten */}
            {importResult.errors.length > 0 && (
              <div className="mt-4 w-full max-w-md">
                <p className="mb-2 text-sm font-medium text-destructive">
                  Fouten tijdens import:
                </p>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive">
                      Rij {err.row}: {err.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Acties */}
            <div className="mt-8 flex gap-3">
              <Button variant="outline" onClick={handleReset}>
                Nieuwe import
              </Button>
              <Button asChild>
                <Link href="/">
                  Bekijk catalogus
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// Sub-componenten
// ============================================

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = [
    { key: 'template', label: 'Template kiezen' },
    { key: 'upload', label: 'Bestand uploaden' },
    { key: 'preview', label: 'Controleren' },
    { key: 'complete', label: 'Voltooid' },
  ]

  // Map importing to same position as complete
  const activeKey = currentStep === 'importing' ? 'complete' : currentStep
  const activeIndex = steps.findIndex((s) => s.key === activeKey)

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const isActive = step.key === activeKey
        const isDone = i < activeIndex
        const isCurrent = currentStep === 'importing' && step.key === 'complete'

        return (
          <div key={step.key} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-8 sm:w-12",
                  isDone ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                  isActive || isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isDone
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? (
                  <CheckCircle className="h-4 w-4" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "hidden text-xs sm:inline",
                  isActive || isCurrent
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {isCurrent ? 'Importeren...' : step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================
// Helpers
// ============================================

/**
 * Bepaal welke kolommen getoond worden in de preview tabel.
 * Neemt de eerste rij en pakt de eerste 6 data velden.
 */
function getPreviewColumns(rows: ParsedRow[]): string[] {
  if (rows.length === 0) return []
  const firstRow = rows[0]
  if (!firstRow) return []

  // Toon de belangrijkste kolommen eerst
  const priorityColumns = ['name', 'sku', 'product_type', 'category', 'description']
  const allColumns = Object.keys(firstRow.data)

  const ordered = [
    ...priorityColumns.filter((col) => allColumns.includes(col)),
    ...allColumns.filter((col) => !priorityColumns.includes(col)),
  ]

  return ordered.slice(0, 7)
}
