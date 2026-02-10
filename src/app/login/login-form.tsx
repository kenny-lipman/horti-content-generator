'use client'

import { useState, useTransition } from 'react'
import { Leaf, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { login, signup, resetPassword } from './actions'

type Mode = 'auth' | 'forgot-password'

export function LoginForm({ message }: { message?: string }) {
  const [mode, setMode] = useState<Mode>('auth')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAction(action: (fd: FormData) => Promise<{ error?: string; message?: string }>) {
    return (formData: FormData) => {
      setError(null)
      setSuccess(null)
      startTransition(async () => {
        const result = await action(formData)
        if (result?.error) setError(result.error)
        if (result?.message) setSuccess(result.message)
      })
    }
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
            <h1 className="text-xl font-semibold tracking-tight">Floriday Content Generator</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered productfotografie voor de sierteelt
            </p>
          </div>
        </div>

        {/* Messages */}
        {(message || error) && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error || message}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
            {success}
          </div>
        )}

        {/* Forgot Password Mode */}
        {mode === 'forgot-password' ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Wachtwoord vergeten</h2>
              <p className="text-sm text-muted-foreground">
                Vul je e-mailadres in en we sturen een resetlink.
              </p>
            </div>
            <form action={handleAction(resetPassword)} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="text-sm font-medium">E-mailadres</label>
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  placeholder="naam@bedrijf.nl"
                  required
                  disabled={isPending}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Versturen...' : 'Verstuur resetlink'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setMode('auth'); setError(null); setSuccess(null) }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Terug naar inloggen
              </Button>
            </form>
          </div>
        ) : (
          /* Login / Signup Tabs */
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Inloggen</TabsTrigger>
              <TabsTrigger value="signup">Account aanmaken</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="space-y-4 pt-2">
              <form action={handleAction(login)} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-sm font-medium">E-mailadres</label>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="naam@bedrijf.nl"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="text-sm font-medium">Wachtwoord</label>
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    placeholder="Minimaal 6 tekens"
                    minLength={6}
                    required
                    disabled={isPending}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? 'Inloggen...' : 'Inloggen'}
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { setMode('forgot-password'); setError(null); setSuccess(null) }}
                >
                  Wachtwoord vergeten?
                </button>
              </form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup" className="space-y-4 pt-2">
              <form action={handleAction(signup)} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="signup-org" className="text-sm font-medium">
                    Bedrijfsnaam <span className="text-muted-foreground font-normal">(optioneel)</span>
                  </label>
                  <Input
                    id="signup-org"
                    name="org_name"
                    type="text"
                    placeholder="Bijv. Kwekerij De Bloem"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="signup-email" className="text-sm font-medium">E-mailadres</label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="naam@bedrijf.nl"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="signup-password" className="text-sm font-medium">Wachtwoord</label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="Minimaal 6 tekens"
                    minLength={6}
                    required
                    disabled={isPending}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? 'Account aanmaken...' : 'Account aanmaken'}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Je ontvangt een verificatie-email om je account te activeren.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
