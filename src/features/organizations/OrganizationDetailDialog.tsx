import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import { Alert, Badge, Button, Dialog, DialogActions, DialogContent, DialogTitle, Loader } from '../../components/ui'
import { catalogQueries } from '../../queries/catalogs'
import { organizationsQueries } from '../../queries/organizations'
import { t, interpolate } from '../../lib/i18n'
import { statusesOf } from '../users/userStatus'
import { LINK_COLOR, STATUS_COLOR, formatDate, linkLabel, statusLabel, typeLabel } from './organizationStatus'

interface Props {
  organizationId: string
  onClose: () => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="dt">{label}</Typography>
      <Typography variant="body2" component="dd" sx={{ m: 0, wordBreak: 'break-word' }}>{children}</Typography>
    </Box>
  )
}

const USER_STATUS_COLOR = { active: 'success', inactive: 'error', locked: 'warning', pending: 'warning' } as const

/** Read-only: the profile of an organization with its people, its links and what it runs. Opening it is audited by the server. */
export default function OrganizationDetailDialog({ organizationId, onClose }: Props) {
  const { data: organization, isLoading, isError } = useQuery(organizationsQueries.detail(organizationId))
  const { data: roles = [] } = useQuery(catalogQueries.roles())
  const roleLabels = Object.fromEntries(roles.map((role) => [role.code, role.label]))

  return (
    <Dialog open onClose={onClose} maxWidth="md">
      <DialogTitle showClose onClose={onClose}>{organization?.legal_name ?? t.organizations.title}</DialogTitle>
      <DialogContent>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><Loader /></Box>
        )}
        {isError && <Alert severity="error">{t.organizations.detail.loadError}</Alert>}
        {organization && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              <Badge label={statusLabel(organization.status)} color={STATUS_COLOR[organization.status] ?? 'default'} />
              <Badge label={typeLabel(organization.type)} />
            </Box>

            <Box component="section" aria-labelledby="organization-profile">
              <Typography id="organization-profile" variant="subtitle2" component="h2" fontWeight={600} mb={1}>
                {t.organizations.detail.profile}
              </Typography>
              <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                <Field label={t.organizations.detail.taxId}>{organization.tax_id ?? t.organizations.none}</Field>
                <Field label={t.organizations.detail.legalRepresentative}>{organization.legal_representative ?? t.organizations.none}</Field>
                <Field label={t.organizations.detail.city}>{organization.city ?? t.organizations.none}</Field>
                <Field label={t.organizations.detail.address}>{organization.address ?? t.organizations.none}</Field>
                <Field label={t.organizations.detail.contactEmail}>{organization.contact_email ?? t.organizations.none}</Field>
                <Field label={t.organizations.detail.contactPhone}>{organization.contact_phone ?? t.organizations.none}</Field>
                <Field label={t.organizations.detail.created}>{formatDate(organization.created_at)}</Field>
                <Field label={t.organizations.detail.approved}>
                  {organization.approved_at ? formatDate(organization.approved_at) : t.organizations.none}
                </Field>
                {organization.recyclers_count !== null && (
                  <Field label={t.organizations.detail.recyclers}>{organization.recyclers_count}</Field>
                )}
              </Box>
            </Box>

            <Box component="section" aria-labelledby="organization-staff">
              <Typography id="organization-staff" variant="subtitle2" component="h2" fontWeight={600} mb={1}>
                {interpolate(t.organizations.detail.staff, { count: organization.staff.length })}
              </Typography>
              {organization.staff.length === 0 ? (
                <Typography variant="body2" color="text.secondary">{t.organizations.detail.noStaff}</Typography>
              ) : (
                <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {organization.staff.map((person) => (
                    <Box
                      component="li"
                      key={person.id}
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{person.full_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {`${person.email} · ${(person.role_code && (roleLabels[person.role_code] ?? (t.sidebar.roles as Record<string, string>)[person.role_code])) || person.role_code || t.organizations.none}`}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {statusesOf(person).map((state) => (
                          <Badge key={state} label={t.users.status[state]} color={USER_STATUS_COLOR[state]} />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <Box component="section" aria-labelledby="organization-links">
              <Typography id="organization-links" variant="subtitle2" component="h2" fontWeight={600} mb={1}>
                {interpolate(t.organizations.detail.links, { count: organization.links.length })}
              </Typography>
              {organization.links.length === 0 ? (
                <Typography variant="body2" color="text.secondary">{t.organizations.detail.noLinks}</Typography>
              ) : (
                <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {organization.links.map((link) => (
                    <Box component="li" key={link.id} sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight={500}>{link.other.legal_name}</Typography>
                        <Badge label={linkLabel(link.status)} color={LINK_COLOR[link.status] ?? 'default'} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" component="p">
                        {[typeLabel(link.other.type), link.other.city].filter(Boolean).join(' · ')}
                        {` · ${interpolate(t.organizations.detail.requestedOn, { date: formatDate(link.requested_at) })}`}
                        {link.decided_at ? ` · ${interpolate(t.organizations.detail.decidedOn, { date: formatDate(link.decided_at) })}` : ''}
                      </Typography>
                      {link.rejection_reason && (
                        <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{link.rejection_reason}</Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {organization.warehouses !== null && (
              <Box component="section" aria-labelledby="organization-warehouses">
                <Typography id="organization-warehouses" variant="subtitle2" component="h2" fontWeight={600} mb={1}>
                  {interpolate(t.organizations.detail.warehouses, { count: organization.warehouses.length })}
                </Typography>
                {organization.warehouses.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">{t.organizations.detail.noWarehouses}</Typography>
                ) : (
                  <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {organization.warehouses.map((warehouse) => (
                      <Box component="li" key={warehouse.id} sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                        <Typography variant="body2">{warehouse.name}</Typography>
                        {!warehouse.is_active && <Badge label={t.organizations.detail.inactive} color="error" />}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>{t.organizations.detail.closeButton}</Button>
      </DialogActions>
    </Dialog>
  )
}
