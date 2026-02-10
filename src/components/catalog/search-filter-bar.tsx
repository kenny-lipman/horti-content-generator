"use client"

import { useState, useEffect, useRef } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SearchFilterBarProps {
  onSearchChange: (query: string) => void
  onCategoryChange: (category: string) => void
  totalCount: number
  categories?: string[]
  initialSearch?: string
  initialCategory?: string
}

export function SearchFilterBar({
  onSearchChange,
  onCategoryChange,
  totalCount,
  categories = [],
  initialSearch = "",
  initialCategory = "",
}: SearchFilterBarProps) {
  const [inputValue, setInputValue] = useState(initialSearch)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip de eerste render — die komt van de server
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      onSearchChange(inputValue)
    }, 400)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [inputValue, onSearchChange])

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {/* Zoek input */}
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Zoek op naam of SKU..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Categorie filter */}
        {categories.length > 0 && (
          <Select
            onValueChange={onCategoryChange}
            defaultValue={initialCategory || "all"}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Alle categorieën" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle categorieën</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Resultaten teller */}
      <p className="text-sm text-muted-foreground whitespace-nowrap">
        {totalCount} {totalCount === 1 ? "product" : "producten"}
      </p>
    </div>
  )
}
