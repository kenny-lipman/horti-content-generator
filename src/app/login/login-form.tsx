"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { login, signup } from "./actions"

export function LoginForm() {
  const [isPending, startTransition] = useTransition()

  function handleLogin(formData: FormData) {
    startTransition(async () => {
      await login(formData)
    })
  }

  function handleSignup(formData: FormData) {
    startTransition(async () => {
      await signup(formData)
    })
  }

  return (
    <form className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          E-mailadres
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="naam@bedrijf.nl"
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Wachtwoord
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          minLength={6}
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Button
          formAction={handleLogin}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "Bezig..." : "Inloggen"}
        </Button>

        <Button
          formAction={handleSignup}
          variant="outline"
          disabled={isPending}
          className="w-full"
        >
          Account aanmaken
        </Button>
      </div>
    </form>
  )
}
