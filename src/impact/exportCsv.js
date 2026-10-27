// CSV export of verified service, e.g. for school community-service requirements.
// Only organization-verified completions are exported.

const escape = (value) => {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(header, rows) {
  return [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
}

export function serviceRecordRows(assignments, lookup) {
  return assignments
    .filter((a) => a.status === 'completed' && a.verified_by_org)
    .sort((a, b) => (a.completed_at ?? '').localeCompare(b.completed_at ?? ''))
    .map((a) => {
      const opp = lookup.Opportunity.get(a.opportunity_id);
      const org = lookup.Organization.get(a.organization_id ?? opp?.organization_id);
      return [
        lookup.VolunteerProfile.get(a.volunteer_id)?.display_name ?? '',
        opp?.title ?? '',
        org?.name ?? '',
        org?.verified ? 'verified' : 'unverified',
        a.hours_verified,
        a.completed_at ? a.completed_at.slice(0, 10) : '',
        a.simulated ? 'simulated (demo)' : 'real',
      ];
    });
}

export const SERVICE_RECORD_HEADER = ['Volunteer', 'Activity', 'Organization', 'Organization status', 'Verified hours', 'Date verified', 'Record type'];

export function downloadCsv(filename, csv) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
