import { useState } from 'react';
import { CATEGORIES, URGENCY_LEVELS, SKILLS, AVAILABILITY_SLOTS, MIN_AGE_OPTIONS } from '../config/taxonomy.js';
import { validateListing } from '../workflow/assignments.js';
import { useData } from '../state/DataContext.jsx';
import { CheckboxGroup, useAction } from './ui.jsx';

export const emptyListing = (organizationId) => ({
  organization_id: organizationId,
  title: '',
  description: '',
  category: '',
  secondary_categories: [],
  urgency: 'medium',
  required_skills: [],
  preferred_skills: [],
  schedule_slots: [],
  schedule_mode: 'any',
  location: '',
  hours_per_session: 2,
  capacity: 1,
  min_age: 18,
  supervised: true,
  serves_minors: false,
  requires_background_check: false,
});

export default function ListingForm({ initial, onDone }) {
  const { Assignment, actions } = useData();
  const [l, setL] = useState(initial);
  const [errors, setErrors] = useState([]);
  const [run, busy] = useAction();
  const set = (k) => (v) => setL((p) => ({ ...p, [k]: v }));
  const input = (k) => (e) => set(k)(e.target.type === 'checkbox' ? e.target.checked : e.target.value);

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateListing({ ...l, capacity: Number(l.capacity) }, Assignment);
    setErrors(errs);
    if (errs.length) return;
    const row = await run(() => actions.saveListing(l), l.id ? 'Listing updated.' : 'Listing posted to the Needs Board.');
    if (row) onDone();
  };

  return (
    <form onSubmit={submit} className="stack" noValidate>
      {errors.length > 0 && (
        <div className="alert alert-error" role="alert">
          <strong>Please fix:</strong>
          <ul>{errors.map((er) => <li key={er}>{er}</li>)}</ul>
        </div>
      )}
      <label className="field"><span>Title *</span><input value={l.title} onChange={input('title')} required maxLength={80} /></label>
      <label className="field"><span>Description *</span><textarea rows={3} value={l.description} onChange={input('description')} required maxLength={600} /></label>
      <p className="hint">Do not include personal phone numbers or email addresses. Share contact details privately in the approval message.</p>
      <div className="grid-2">
        <label className="field">
          <span>Primary category *</span>
          <select value={l.category} onChange={input('category')} required>
            <option value="">Choose…</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Urgency</span>
          <select value={l.urgency} onChange={input('urgency')}>
            {URGENCY_LEVELS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Volunteers needed *</span><input type="number" min={1} max={200} value={l.capacity} onChange={input('capacity')} /></label>
        <label className="field"><span>Hours per shift</span><input type="number" min={0} max={24} step={0.5} value={l.hours_per_session} onChange={input('hours_per_session')} /></label>
        <label className="field"><span>Location (public place)</span><input value={l.location} onChange={input('location')} maxLength={80} placeholder="e.g. Community center, Remote" /></label>
        <label className="field">
          <span>Minimum age</span>
          <select value={l.min_age} onChange={input('min_age')}>
            {MIN_AGE_OPTIONS.map((a) => <option key={a} value={a}>{a}+</option>)}
          </select>
        </label>
      </div>
      <CheckboxGroup legend="Secondary categories" options={CATEGORIES.filter((c) => c !== l.category)} value={l.secondary_categories} onChange={set('secondary_categories')} columns={3} />
      <CheckboxGroup legend="Required skills" hint="Worth double in the skills score." options={SKILLS} value={l.required_skills} onChange={set('required_skills')} columns={3} />
      <CheckboxGroup legend="Preferred skills" options={SKILLS.filter((s) => !l.required_skills.includes(s))} value={l.preferred_skills} onChange={set('preferred_skills')} columns={3} />
      <CheckboxGroup legend="Time slots" hint="Leave empty for a flexible schedule." options={AVAILABILITY_SLOTS} value={l.schedule_slots} onChange={set('schedule_slots')} columns={3} />
      <fieldset>
        <legend>Schedule requirement</legend>
        <label className="check"><input type="radio" name="mode" checked={l.schedule_mode === 'any'} onChange={() => set('schedule_mode')('any')} /><span>Volunteer can pick any one slot</span></label>
        <label className="check"><input type="radio" name="mode" checked={l.schedule_mode === 'all'} onChange={() => set('schedule_mode')('all')} /><span>Volunteer must attend every slot (mandatory — filters out others)</span></label>
      </fieldset>
      <fieldset>
        <legend>Safety</legend>
        <label className="check"><input type="checkbox" checked={l.supervised} onChange={input('supervised')} /><span>A staff supervisor is on site (required for volunteers under 18)</span></label>
        <label className="check"><input type="checkbox" checked={l.serves_minors} onChange={input('serves_minors')} /><span>Volunteers will work with minors (requires supervision; adult volunteers need a background check you verify)</span></label>
        <label className="check"><input type="checkbox" checked={l.requires_background_check} onChange={input('requires_background_check')} /><span>Background check required</span></label>
      </fieldset>
      <div className="row-end">
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{l.id ? 'Save listing' : 'Post listing'}</button>
      </div>
    </form>
  );
}
