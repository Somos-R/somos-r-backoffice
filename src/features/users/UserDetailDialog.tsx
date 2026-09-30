import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Badge, Button, Dialog, DialogActions, DialogContent, DialogTitle, Input, Loader, Select,
} from '../../components/ui'
import { catalogQueries } from '../../queries/catalogs'
import { AFFECTED, invalidateAffected } from '../../queries/invalidation'
import { usersQueries } from '../../queries/users'
import { adminUsersService, type AdminUserDetail } from '../../services/users'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorMessage } from '../../lib/apiError'
import { t, interpolate } from '../../lib/i18n'
import { hasEditableRole, statusesOf, typeLabel } from './userStatus'

interface Props {
  userId: string
  onClose: () => void
  /** The page shows the result (success or the translated failure) in its snackbar. */
  onNotify: (message: string, severity: 'success' | 'error') => void
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="dt">{label}</Typography>
      <Typography variant="body2" component="dd" sx={{ m: 0, wordBreak: 'break-word' }}>{children}</Typography>
    </Box>
  )
}

type Confirming = 'deactivate' | 'reactivate' | 'revoke' | null

export default function UserDetailDialog({ userId, onClose, onNotify }: Props) {
  const queryClient = useQueryClient()
  const { user: me } = useAuth()
  const { data: user, isLoading, isError } = useQuery(usersQueries.detail(userId))
  const { data: roles = [] } = useQuery(catalogQueries.roles())

  const [confirming, setConfirming] = useState<Confirming>(null)
  const [reason, setReason] = useState('')
  const [roleChoice, setRoleChoice] = useState<string | null>(null)

  const done = (message: string) => {
    invalidateAffected(queryClient, AFFECTED.userChanged)
    onNotify(message, 'success')
  }
  const failed = (err: unknown) => onNotify(getApiErrorMessage(err, t.users.messages.actionError), 'error')

  // Every action reloads the list and this detail; a failure reloads them too (the account
  // probably changed under us), and each one reports its own result, so no global notice.
  const useAction = <V,>(mutationFn: (v: V) => Promise<unknown>, success: (v: V) => string) =>
    useMutation({
      meta: { silent: true, refreshOnError: AFFECTED.userChanged },
      mutationFn,
      onSuccess: (_data, variables) => done(success(variables)),
      onError: failed,
    })

  // The reason travels as a variable, not read from state: the dialog clears it right after confirming.
  const setActive = useAction(
    ({ active, reason: why }: { active: boolean; reason?: string }) => adminUsersService.setActive(userId, active, why),
    ({ active }) => (active ? t.users.messages.reactivated : t.users.messages.deactivated),
  )
  const unlock = useAction(() => adminUsersService.unlock(userId), () => t.users.messages.unlocked)
  const revoke = useAction(() => adminUsersService.revokeSessions(userId), () => t.users.messages.revoked)
  const resend = useAction(() => adminUsersService.resendInvitation(userId), () => interpolate(t.users.messages.resent, { email: user?.email ?? '' }))
  const changeRole = useAction((roleCode: string) => adminUsersService.changeRole(userId, roleCode), () => t.users.messages.roleChanged)

  const close = () => {
    setConfirming(null)
    setReason('')
    onClose()
  }

  const confirm = () => {
    if (confirming === 'deactivate') setActive.mutate({ active: false, reason: reason.trim() || undefined })
    if (confirming === 'reactivate') setActive.mutate({ active: true })
    if (confirming === 'revoke') revoke.mutate(undefined)
    setConfirming(null)
    setReason('')
  }

  const roleLabels = Object.fromEntries(roles.map((role) => [role.code, role.label]))
  const roleText = (u: AdminUserDetail) =>
    (u.role_code && (roleLabels[u.role_code] ?? (t.sidebar.roles as Record<string, string>)[u.role_code])) || u.role_code || t.users.detail.none

  const busy = setActive.isPending || unlock.isPending || revoke.isPending || resend.isPending || changeRole.isPending

  return (
    <>
      <Dialog open onClose={close} maxWidth="sm">
        <DialogTitle showClose onClose={close}>{user?.full_name ?? t.users.title}</DialogTitle>
        <DialogContent>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><Loader /></Box>
          )}
          {isError && <Alert severity="error">{t.users.detail.loadError}</Alert>}
          {user && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {statusesOf(user).map((state) => (
                  <Badge key={state} label={t.users.status[state]} color={state === 'active' ? 'success' : state === 'inactive' ? 'error' : 'warning'} />
                ))}
              </Box>

              <Box component="section" aria-labelledby="user-profile">
                <Typography id="user-profile" variant="subtitle2" component="h2" fontWeight={600} mb={1}>{t.users.detail.profile}</Typography>
                <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Field label={t.users.detail.email}>{user.email}</Field>
                  <Field label={t.users.detail.phone}>{user.phone ?? t.users.detail.none}</Field>
                  <Field label={t.users.detail.document}>{`${user.id_type} ${user.id_number}`}</Field>
                  <Field label={t.users.detail.type}>{typeLabel(user.user_type_code)}</Field>
                  <Field label={t.users.detail.role}>{roleText(user)}</Field>
                  <Field label={t.users.detail.organization}>{user.organization_name ?? t.users.detail.none}</Field>
                  <Field label={t.users.detail.created}>{formatDate(user.created_at)}</Field>
                  <Field label={t.users.detail.emailVerified}>{user.email_verified_at ? t.users.detail.yes : t.users.detail.no}</Field>
                  {user.verification_status && (
                    <Field label={t.users.detail.recyclerVerification}>{t.users.detail.verification[user.verification_status]}</Field>
                  )}
                </Box>
              </Box>

              <Box component="section" aria-labelledby="user-security">
                <Typography id="user-security" variant="subtitle2" component="h2" fontWeight={600} mb={1}>{t.users.detail.security}</Typography>
                <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Field label={t.users.detail.mfa}>{user.mfa_enabled ? t.users.detail.yes : t.users.detail.no}</Field>
                  <Field label={t.users.detail.failedAttempts}>{user.failed_login_attempts}</Field>
                  {user.locked && user.locked_until && (
                    <Field label={t.users.detail.lockedUntil}>{formatDate(user.locked_until)}</Field>
                  )}
                </Box>
              </Box>

              <Box component="section" aria-labelledby="user-actions">
                <Typography id="user-actions" variant="subtitle2" component="h2" fontWeight={600} mb={1}>{t.users.detail.actions}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {hasEditableRole(user.user_type_code) && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <Select
                        label={t.users.actions.roleLabel}
                        value={roleChoice ?? user.role_code ?? ''}
                        onChange={(e) => setRoleChoice(e.target.value)}
                        // Only the roles of the account's own kind of organization are valid.
                        options={roles.filter((r) => !r.user_type_code || r.user_type_code === user.user_type_code).map((r) => ({ value: r.code, label: r.label }))}
                        disabled={busy}
                      />
                      <Button
                        variant="outlined"
                        loading={changeRole.isPending}
                        disabled={busy || !roleChoice || roleChoice === user.role_code}
                        onClick={() => roleChoice && changeRole.mutate(roleChoice)}
                        sx={{ whiteSpace: 'nowrap', mt: 0.25 }}
                      >
                        {t.users.actions.saveRole}
                      </Button>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {user.locked && (
                      <Button variant="outlined" loading={unlock.isPending} disabled={busy} onClick={() => unlock.mutate(undefined)}>
                        {t.users.actions.unlock}
                      </Button>
                    )}
                    {user.pending_activation && (
                      <Button variant="outlined" loading={resend.isPending} disabled={busy} onClick={() => resend.mutate(undefined)}>
                        {t.users.actions.resend}
                      </Button>
                    )}
                    <Button variant="outlined" disabled={busy} onClick={() => setConfirming('revoke')}>
                      {t.users.actions.revokeSessions}
                    </Button>
                    {user.id !== me?.id &&
                      (user.is_active ? (
                        <Button variant="destructive" disabled={busy} onClick={() => setConfirming('deactivate')}>
                          {t.users.actions.deactivate}
                        </Button>
                      ) : (
                        <Button disabled={busy} onClick={() => setConfirming('reactivate')}>
                          {t.users.actions.reactivate}
                        </Button>
                      ))}
                  </Box>
                  {user.id === me?.id && <Typography variant="caption" color="text.secondary">{t.users.detail.ownAccount}</Typography>}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={close}>{t.users.detail.closeButton}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirming !== null} onClose={() => setConfirming(null)} maxWidth="xs">
        <DialogTitle>
          {confirming === 'deactivate' ? t.users.confirm.deactivateTitle : confirming === 'reactivate' ? t.users.confirm.reactivateTitle : t.users.confirm.revokeTitle}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={confirming === 'deactivate' ? 2 : 0}>
            {confirming === 'deactivate' ? t.users.confirm.deactivateMessage : confirming === 'reactivate' ? t.users.confirm.reactivateMessage : t.users.confirm.revokeMessage}
          </Typography>
          {confirming === 'deactivate' && (
            <Input label={t.users.confirm.reasonLabel} value={reason} onChange={(e) => setReason(e.target.value.slice(0, 200))} autoFocus />
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setConfirming(null)}>{t.common.cancel}</Button>
          <Button variant={confirming === 'reactivate' ? 'contained' : 'destructive'} onClick={confirm}>
            {confirming === 'deactivate' ? t.users.confirm.deactivateButton : confirming === 'reactivate' ? t.users.confirm.reactivateButton : t.users.confirm.revokeButton}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
