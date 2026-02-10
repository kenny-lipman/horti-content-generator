'use client'

import { useState, useTransition } from 'react'
import { Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updatePassword } from '@/app/login/actions'

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await updatePassword(formData)
      if (result?.error) setError(result.error)
      // Bij success redirect de server action naar /
    })
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Branding */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Leaf className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">Nieuw wachtwoord instellen</h1>
            <p className="text-sm text-muted-foreground">
              Kies een nieuw wachtwoord voor je account.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Form */}
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">Nieuw wachtwoord</label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Minimaal 6 tekens"
              minLength={6}
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm_password" className="text-sm font-medium">Wachtwoord bevestigen</label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              placeholder="Herhaal je wachtwoord"
              minLength={6}
              required
              disabled={isPending}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Opslaan...' : 'Wachtwoord opslaan'}
          </Button>
        </form>
      </div>
    </div>
  )
}
