export const dynamic = 'force-dynamic'

import type { Metadata } from "next"
import { getContentLibrary } from "@/lib/data/generation"
import { getOrganizationIdOrDev } from "@/lib/data/auth"
import { ContentLibraryClient } from "./content-library-client"

export const metadata: Metadata = {
  title: "Content Library - Floriday Content Generator",
}

interface ContentPageProps {
  searchParams: Promise<{
    review?: string
    type?: string
    product?: string
    page?: string
  }>
}

export default async function ContentPage({ searchParams }: ContentPageProps) {
  const params = await searchParams
  const organizationId = await getOrganizationIdOrDev()

  const reviewStatus = params.review as 'pending' | 'approved' | 'rejected' | undefined
  const imageType = params.type
  const productId = params.product
  const page = params.page ? parseInt(params.page, 10) : 1

  const { images, total } = await getContentLibrary({
    organizationId,
    reviewStatus,
    imageType,
    productId,
    page,
    pageSize: 50,
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Content Library</h1>
        <p className="text-sm text-muted-foreground">
          Alle gegenereerde afbeeldingen — beoordeel, filter en beheer
        </p>
      </div>

      <ContentLibraryClient
        initialImages={images}
        total={total}
        currentPage={page}
        activeFilters={{
          reviewStatus,
          imageType,
          productId,
        }}
      />
    </div>
  )
}
