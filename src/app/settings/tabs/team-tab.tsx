"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, Shield, User, Trash2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  inviteTeamMemberAction,
  updateMemberRoleAction,
  removeMemberAction,
} from "@/app/actions/organization"
import type { OrgRole } from "@/lib/supabase/types"
import { toast } from "sonner"

// ============================================
// Types
// ============================================

interface TeamMember {
  id: string
  user_id: string
  role: string
  invited_at: string | null
  accepted_at: string | null
  created_at: string | null
  email: string | null
}

interface TeamTabProps {
  members: TeamMember[]
}

// ============================================
// Component
// ============================================

export function TeamTab({ members }: TeamTabProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<OrgRole>("member")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const adminCount = members.filter(m => m.role === 'admin').length

  function handleInvite() {
    if (!inviteEmail.trim()) {
      toast.error("Vul een e-mailadres in")
      return
    }

    startTransition(async () => {
      const result = await inviteTeamMemberAction(inviteEmail.trim(), inviteRole)

      if (result.success) {
        toast.success("Uitnodiging verstuurd")
        setDialogOpen(false)
        setInviteEmail("")
        setInviteRole("member")
        router.refresh()
      } else {
        toast.error(result.error ?? "Uitnodigen mislukt")
      }
    })
  }

  function handleToggleRole(memberId: string, currentRole: string) {
    const newRole: OrgRole = currentRole === "admin" ? "member" : "admin"

    startTransition(async () => {
      const result = await updateMemberRoleAction(memberId, newRole)

      if (result.success) {
        toast.success(`Rol gewijzigd naar ${newRole === "admin" ? "Admin" : "Lid"}`)
        router.refresh()
      } else {
        toast.error(result.error ?? "Rol bijwerken mislukt")
      }
    })
  }

  function handleRemoveMember(memberId: string) {
    startTransition(async () => {
      const result = await removeMemberAction(memberId)

      if (result.success) {
        toast.success("Teamlid verwijderd")
        setConfirmDeleteId(null)
        router.refresh()
      } else {
        toast.error(result.error ?? "Verwijderen mislukt")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Teamleden</CardTitle>
            <CardDescription>
              Beheer de leden van je organisatie en hun rechten.
            </CardDescription>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="mr-2 size-4" />
                Lid uitnodigen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Teamlid uitnodigen</DialogTitle>
                <DialogDescription>
                  Stuur een uitnodiging naar een collega om lid te worden van je
                  organisatie.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label
                    htmlFor="invite-email"
                    className="text-sm font-medium"
                  >
                    E-mailadres
                  </label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="collega@bedrijf.nl"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleInvite()
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="invite-role"
                    className="text-sm font-medium"
                  >
                    Rol
                  </label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => setInviteRole(value as OrgRole)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Lid</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={handleInvite}
                  disabled={isPending || !inviteEmail.trim()}
                >
                  {isPending ? "Bezig..." : "Uitnodigen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <User className="mb-3 size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nog geen teamleden. Nodig collega&apos;s uit om samen te werken.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                    {member.role === "admin" ? (
                      <Shield className="size-4 text-primary" />
                    ) : (
                      <User className="size-4 text-muted-foreground" />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      {member.email ?? "Onbekend"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge
                        variant={
                          member.role === "admin" ? "default" : "secondary"
                        }
                      >
                        {member.role === "admin" ? "Admin" : "Lid"}
                      </Badge>
                      {!member.accepted_at && (
                        <Badge variant="outline">Uitgenodigd</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Disable role change if this is the only admin */}
                  {member.role === 'admin' && adminCount <= 1 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      title="Kan rol niet wijzigen — dit is de enige admin"
                    >
                      <Shield className="mr-1 size-4" />
                      Enige admin
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleToggleRole(member.id, member.role)}
                      title={
                        member.role === "admin"
                          ? "Wijzig naar Lid"
                          : "Wijzig naar Admin"
                      }
                    >
                      {member.role === "admin" ? (
                        <>
                          <User className="mr-1 size-4" />
                          Maak lid
                        </>
                      ) : (
                        <>
                          <Shield className="mr-1 size-4" />
                          Maak admin
                        </>
                      )}
                    </Button>
                  )}

                  {/* Disable remove if this is the only admin */}
                  {confirmDeleteId === member.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        {isPending ? "Bezig..." : "Bevestig"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Annuleer
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending || (member.role === 'admin' && adminCount <= 1)}
                      onClick={() => setConfirmDeleteId(member.id)}
                      title={
                        member.role === 'admin' && adminCount <= 1
                          ? "Kan de enige admin niet verwijderen"
                          : "Verwijder teamlid"
                      }
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
