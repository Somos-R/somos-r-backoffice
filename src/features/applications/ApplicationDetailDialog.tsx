import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Badge, Button, Dialog, DialogActions, DialogContent, DialogTitle, Input, Loader, Select,
} from '../../components/ui'
import { applicationsQueries } from '../../queries/applications'
import { AFFECTED, invalidateAffected } from '../../queries/invalidation'
import ApplicationDocuments from './ApplicationDocuments'
import { applicationsService, type ApplicationDecision, type ApplicationReview } from '../../services/applications'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorMessage } from '../../lib/apiError'
import { t, interpolate } from '../../lib/i18n'
import {
  MAX_SUMMARY_LENGTH, MIN_SUMMARY_LENGTH, STATUS_COLOR, formatDate, isReviewable, statusLabel, typeLabel, unapprovedRequired, documentStatusLabel,
} from './applicationStatus'

interface Props {
  applicationId: string
  onClose: () => void
  /** The page shows the result (success or the translated failure) in its snackbar. */
  onNotify: (message: string, severity: 'success' | 'error') => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="dt">{label}</Typography>
      <Typography variant="body2" component="dd" sx={{ m: 0, wordBreak: 'break-word' }}>{children}</Typography>
    </Box>
  )
}

const REVIEW_COLOR: Record<ApplicationReview['decision'], 'success' | 'warning' | 'error'> = {
  approved: 'success',
  changes_requested: 'warning',
  rejected: 'error',
}

export default function ApplicationDetailDialog({ applicationId, onClose, onNotify }: Props) {
  const queryClient = useQueryClient()
  const { user: me } = useAuth()
  const { data: application, isLoading, isError } = useQuery(applicationsQueries.detail(applicationId))

  const [deciding, setDeciding] = useState(false)
  const [decision, setDecision] = useState<ApplicationDecision>('approve')
  const [summary, setSummary] = useState('')
  const [summaryError, setSummaryError] = useState(false)

  // Every action reloads the queue and this detail; a failure reloads them too (someone else may have
  // taken or decided it), and each one reports its own result, so no global notice.
  const done = (message: string) => {
    invalidateAffected(queryClient, AFFECTED.applicationChanged)
    onNotify(message, 'success')
  }
  const failed = (err: unknown) => {
    invalidateAffected(queryClient, AFFECTED.applicationChanged)
    setDeciding(false)
    onNotify(getApiErrorMessage(err, t.applications.messages.actionError), 'error')
  }

  const startReview = useMutation({
    meta: { silent: true },
    mutationFn: () => applicationsService.startReview(applicationId),
    onSuccess: () => done(t.applications.messages.taken),
    onError: failed,
  })

  // The summary travels as a variable, not read from state: the dialog clears it right after confirming.
  const decide = useMutation({
    meta: { silent: true },
    mutationFn: (v: { decision: ApplicationDecision; summary?: string }) => applicationsService.decide(applicationId, v),
    onSuccess: (_data, v) => {
      setDeciding(false)
      done(t.applications.messages[v.decision])
    },
    onError: failed,
  })

  // The server refuses to approve while a required document is not approved: say so up front.
  const blocking = application ? unapprovedRequired(application.documents) : []
  const approvalBlocked = decision === 'approve' && blocking.length > 0
  const needsSummary = decision !== 'approve'
  const confirmDecision = () => {
    const text = summary.trim()
    if (needsSummary && text.length < MIN_SUMMARY_LENGTH) {
      setSummaryError(true)
      return
    }
    decide.mutate({ decision, ...(text ? { summary: text } : {}) })
  }

  const openDecision = () => {
    setDecision('approve')
    setSummary('')
    setSummaryError(false)
    setDeciding(true)
  }

  const reviewable = application ? isReviewable(application.status) : false
  const heldByOther = !!application?.reviewer && application.reviewer.id !== me?.id
  const busy = startReview.isPending || decide.isPending

  return (
    <>
      <Dialog open onClose={onClose} maxWidth="md">
        <DialogTitle showClose onClose={onClose}>{application?.legal_name ?? t.applications.title}</DialogTitle>
        <DialogContent>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><Loader /></Box>
          )}
          {isError && <Alert severity="error">{t.applications.detail.loadError}</Alert>}
          {application && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Badge label={statusLabel(application.status)} color={STATUS_COLOR[application.status] ?? 'default'} />
                <Badge label={typeLabel(application.type)} />
                {application.submission_count > 1 && (
                  <Badge label={interpolate(t.applications.submissionCount, { count: application.submission_count })} />
                )}
              </Box>

              {heldByOther && application.reviewer && (
                <Alert severity="info">{interpolate(t.applications.detail.heldBy, { name: application.reviewer.full_name })}</Alert>
              )}

              <Box component="section" aria-labelledby="application-organization">
                <Typography id="application-organization" variant="subtitle2" component="h2" fontWeight={600} mb={1}>
                  {t.applications.detail.organization}
                </Typography>
                <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  <Field label={t.applications.detail.legalName}>{application.legal_name}</Field>
                  <Field label={t.applications.detail.taxId}>{application.tax_id}</Field>
                  <Field label={t.applications.detail.legalRepresentative}>{application.legal_representative ?? t.applications.none}</Field>
                  <Field label={t.applications.detail.city}>{application.city ?? t.applications.none}</Field>
                  <Field label={t.applications.detail.address}>{application.address ?? t.applications.none}</Field>
                  <Field label={t.applications.detail.contactEmail}>{application.contact_email ?? t.applications.none}</Field>
                  <Field label={t.applications.detail.contactPhone}>{application.contact_phone ?? t.applications.none}</Field>
                </Box>
              </Box>

              <Box component="section" aria-labelledby="application-applicant">
                <Typography id="application-applicant" variant="subtitle2" component="h2" fontWeight={600} mb={1}>
                  {t.applications.detail.applicant}
                </Typography>
                <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  <Field label={t.applications.detail.name}>{application.applicant_name}</Field>
                  <Field label={t.applications.detail.email}>{application.applicant_email}</Field>
                  <Field label={t.applications.detail.document}>{application.applicant_id_number ? `${application.applicant_id_type ?? ''} ${application.applicant_id_number}`.trim() : t.applications.none}</Field>
                  <Field label={t.applications.detail.phone}>{application.applicant_phone ?? t.applications.none}</Field>
                  <Field label={t.applications.detail.emailVerified}>
                    {application.email_verified_at ? formatDate(application.email_verified_at) : t.applications.detail.no}
                  </Field>
                  <Field label={t.applications.detail.consent}>
                    {application.consent_at
                      ? `${formatDate(application.consent_at)}${application.consent_version ? ` · ${application.consent_version}` : ''}`
                      : t.applications.detail.no}
                  </Field>
                  {application.submitted_at && (
                    <Field label={t.applications.detail.submitted}>{formatDate(application.submitted_at)}</Field>
                  )}
                </Box>
              </Box>

              <ApplicationDocuments
                applicationId={applicationId}
                slots={application.documents}
                canReview={reviewable}
                onNotify={onNotify}
              />

              <Box component="section" aria-labelledby="application-history">
                <Typography id="application-history" variant="subtitle2" component="h2" fontWeight={600} mb={1}>
                  {t.applications.detail.history}
                </Typography>
                {application.reviews.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">{t.applications.detail.noHistory}</Typography>
                ) : (
                  <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {application.reviews.map((review) => (
                      <Box component="li" key={review.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                          <Badge label={t.applications.detail.decisions[review.decision]} color={REVIEW_COLOR[review.decision]} />
                          <Typography variant="caption" color="text.secondary">
                            {interpolate(t.applications.detail.reviewMeta, {
                              number: review.submission_number,
                              name: review.reviewer?.full_name ?? t.applications.none,
                              date: formatDate(review.created_at),
                            })}
                          </Typography>
                        </Box>
                        {review.summary && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{review.summary}</Typography>}
                        {review.details.length > 0 && (
                          <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                            {review.details.map((sentBack) => (
                              <Typography component="li" variant="caption" color="text.secondary" key={sentBack.code}>
                                {`${sentBack.label}: ${documentStatusLabel(sentBack.status)}${sentBack.comment ? ` · ${sentBack.comment}` : ''}`}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose}>{t.applications.detail.closeButton}</Button>
          {application && reviewable && application.status === 'submitted' && (
            <Button variant="outlined" loading={startReview.isPending} disabled={busy} onClick={() => startReview.mutate()}>
              {t.applications.actions.startReview}
            </Button>
          )}
          {application && reviewable && (
            <Button disabled={busy} onClick={openDecision}>{t.applications.actions.decide}</Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={deciding} onClose={() => setDeciding(false)} maxWidth="sm">
        <DialogTitle showClose onClose={() => setDeciding(false)}>{t.applications.decision.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Select
              label={t.applications.decision.label}
              value={decision}
              onChange={(e) => { setDecision(e.target.value as ApplicationDecision); setSummaryError(false) }}
              options={[
                { value: 'approve', label: t.applications.decision.options.approve },
                { value: 'request_changes', label: t.applications.decision.options.request_changes },
                { value: 'reject', label: t.applications.decision.options.reject },
              ]}
              disabled={decide.isPending}
            />
            <Typography variant="body2" color="text.secondary">{t.applications.decision.help[decision]}</Typography>
            {approvalBlocked && (
              <Alert severity="warning">
                {interpolate(t.applications.decision.blocked, { documents: blocking.map((slot) => slot.document_type.label).join(', ') })}
              </Alert>
            )}
            <Input
              label={needsSummary ? t.applications.decision.summaryRequired : t.applications.decision.summaryOptional}
              value={summary}
              onChange={(e) => { setSummary(e.target.value.slice(0, MAX_SUMMARY_LENGTH)); setSummaryError(false) }}
              multiline
              minRows={4}
              error={summaryError}
              helperText={summaryError ? interpolate(t.applications.decision.summaryTooShort, { min: MIN_SUMMARY_LENGTH }) : undefined}
              disabled={decide.isPending}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDeciding(false)}>{t.common.cancel}</Button>
          <Button
            variant={decision === 'approve' ? 'contained' : 'destructive'}
            loading={decide.isPending}
            disabled={approvalBlocked}
            onClick={confirmDecision}
          >
            {t.applications.decision.confirm[decision]}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
