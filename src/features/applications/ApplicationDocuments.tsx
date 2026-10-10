import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Dialog, DialogActions, DialogContent, DialogTitle, Input } from '../../components/ui'
import { AFFECTED, invalidateAffected } from '../../queries/invalidation'
import { applicationsService, type DocumentSlot, type DocumentStatus, type DocumentVerdict } from '../../services/applications'
import { apiClient } from '../../lib/apiClient'
import { getApiErrorMessage } from '../../lib/apiError'
import { t, interpolate } from '../../lib/i18n'
import { DOCUMENT_COLOR, MAX_COMMENT_LENGTH, documentStatusLabel, formatBytes, formatDate } from './applicationStatus'

interface Props {
  applicationId: string
  slots: DocumentSlot[]
  /** Documents can be judged only while the application is submitted or in review. */
  canReview: boolean
  /** The page shows the result (success or the translated failure) in its snackbar. */
  onNotify: (message: string, severity: 'success' | 'error') => void
}

interface Verdict {
  slot: DocumentSlot
  status: Exclude<DocumentVerdict, 'ok'>
}

/**
 * The documents the organization was asked for. A file is never read directly: asking for it gets a
 * signed link of a few minutes (the server audits that as the act of viewing it), opened in a new tab
 * because that tab cannot send credentials; the link itself is the credential.
 */
export default function ApplicationDocuments({ applicationId, slots, canReview, onNotify }: Props) {
  const queryClient = useQueryClient()
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const failed = (err: unknown) => {
    // The verdict may have been refused because the application moved on: reload everything.
    invalidateAffected(queryClient, AFFECTED.applicationChanged)
    setVerdict(null)
    onNotify(getApiErrorMessage(err, t.applications.messages.actionError), 'error')
  }

  const open = useMutation({
    meta: { silent: true },
    mutationFn: (documentId: string) => {
      setBusyId(documentId)
      return applicationsService.openDocument(applicationId, documentId)
    },
    // The link is a path of the API: it needs the API's address in front.
    onSuccess: (access) => window.open(new URL(access.url, apiClient.defaults.baseURL).toString(), '_blank', 'noopener,noreferrer'),
    onError: failed,
    onSettled: () => setBusyId(null),
  })

  // The comment travels as a variable, not read from state: the dialog clears it right after confirming.
  const judge = useMutation({
    meta: { silent: true },
    mutationFn: (v: { documentId: string; status: DocumentVerdict; comment?: string }) => {
      setBusyId(v.documentId)
      return applicationsService.reviewDocument(applicationId, v.documentId, { status: v.status, ...(v.comment ? { comment: v.comment } : {}) })
    },
    onSuccess: (_slot, v) => {
      invalidateAffected(queryClient, AFFECTED.applicationChanged)
      setVerdict(null)
      onNotify(t.applications.documents.messages[v.status], 'success')
    },
    onError: failed,
    onSettled: () => setBusyId(null),
  })

  const askVerdict = (slot: DocumentSlot, status: Verdict['status']) => {
    setComment('')
    setCommentError(false)
    setVerdict({ slot, status })
  }

  const confirmVerdict = () => {
    const text = comment.trim()
    if (!verdict?.slot.document) return
    if (!text) {
      setCommentError(true)
      return
    }
    judge.mutate({ documentId: verdict.slot.document.id, status: verdict.status, comment: text })
  }

  const busy = open.isPending || judge.isPending

  return (
    <Box component="section" aria-labelledby="application-documents">
      <Typography id="application-documents" variant="subtitle2" component="h2" fontWeight={600} mb={1}>
        {t.applications.documents.title}
      </Typography>
      {slots.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{t.applications.documents.none}</Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {slots.map((slot) => {
            const doc = slot.document
            const label = slot.document_type.label
            return (
              <Box component="li" key={slot.document_type.code} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={600}>{label}</Typography>
                  <Badge
                    label={slot.document_type.is_required ? t.applications.documents.required : t.applications.documents.optional}
                    color={slot.document_type.is_required ? 'primary' : 'default'}
                  />
                  {doc ? (
                    <Badge label={documentStatusLabel(doc.status)} color={DOCUMENT_COLOR[doc.status as DocumentStatus] ?? 'default'} />
                  ) : (
                    <Badge label={t.applications.documents.notUploaded} color={slot.document_type.is_required ? 'error' : 'default'} />
                  )}
                </Box>

                {doc && (
                  <>
                    <Typography variant="caption" color="text.secondary" component="p" sx={{ wordBreak: 'break-word' }}>
                      {interpolate(t.applications.documents.fileMeta, {
                        name: doc.original_name,
                        size: formatBytes(doc.size_bytes),
                        date: formatDate(doc.uploaded_at),
                      })}
                    </Typography>
                    {doc.review_comment && (
                      <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{doc.review_comment}</Typography>
                    )}
                    {doc.reviewed_by && doc.reviewed_at && (
                      <Typography variant="caption" color="text.secondary" component="p">
                        {interpolate(t.applications.documents.reviewedBy, { name: doc.reviewed_by.full_name, date: formatDate(doc.reviewed_at) })}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        loading={open.isPending && busyId === doc.id}
                        disabled={busy}
                        aria-label={`${t.applications.documents.open} ${label}`}
                        onClick={() => open.mutate(doc.id)}
                      >
                        {t.applications.documents.open}
                      </Button>
                      {canReview && (
                        <>
                          <Button
                            size="small"
                            color="success"
                            variant="outlined"
                            loading={judge.isPending && busyId === doc.id}
                            disabled={busy || doc.status === 'ok'}
                            aria-label={`${t.applications.documents.approve} ${label}`}
                            onClick={() => judge.mutate({ documentId: doc.id, status: 'ok' })}
                          >
                            {t.applications.documents.approve}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            disabled={busy}
                            aria-label={`${t.applications.documents.notCompliant} ${label}`}
                            onClick={() => askVerdict(slot, 'not_compliant')}
                          >
                            {t.applications.documents.notCompliant}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            disabled={busy}
                            aria-label={`${t.applications.documents.missing} ${label}`}
                            onClick={() => askVerdict(slot, 'missing')}
                          >
                            {t.applications.documents.missing}
                          </Button>
                        </>
                      )}
                    </Box>
                  </>
                )}
              </Box>
            )
          })}
        </Box>
      )}

      <Dialog open={verdict !== null} onClose={() => setVerdict(null)} maxWidth="xs">
        <DialogTitle showClose onClose={() => setVerdict(null)}>
          {verdict ? t.applications.documents.verdictTitle[verdict.status] : ''}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" fontWeight={600} mb={0.5}>{verdict?.slot.document_type.label}</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>{t.applications.documents.verdictHelp}</Typography>
          <Input
            label={t.applications.documents.commentLabel}
            value={comment}
            onChange={(e) => { setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH)); setCommentError(false) }}
            multiline
            minRows={3}
            error={commentError}
            helperText={commentError ? t.applications.documents.commentRequired : undefined}
            disabled={judge.isPending}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setVerdict(null)}>{t.common.cancel}</Button>
          <Button variant="destructive" loading={judge.isPending} onClick={confirmVerdict}>
            {t.applications.documents.confirmVerdict}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
