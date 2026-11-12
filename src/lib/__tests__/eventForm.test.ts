import {
  addressChanged,
  editTarget,
  eventChanges,
  formFromEvent,
  locationToSave,
  validateEvent,
  type EditableEvent,
} from '../eventForm';

const saved: EditableEvent = {
  title: 'Sunday run',
  description: 'Bring water',
  location: { label: 'Aspire', address: '1 Main St, Toronto', lat: 43.6, lng: -79.4 },
  startsAt: 1_800_000_000_000,
};

describe('formFromEvent', () => {
  it('fills the form, and shows a label that is just the address as empty', () => {
    expect(formFromEvent(saved).label).toBe('Aspire');
    const noLabel = { ...saved, location: { ...saved.location, label: saved.location.address } };
    expect(formFromEvent(noLabel).label).toBe('');
  });
});

describe('validateEvent', () => {
  it('needs a title and an address', () => {
    expect(validateEvent(formFromEvent(saved))).toBeNull();
    expect(validateEvent({ ...formFromEvent(saved), title: '  ' })).not.toBeNull();
    expect(validateEvent({ ...formFromEvent(saved), address: '' })).not.toBeNull();
  });
});

describe('locationToSave', () => {
  it('keeps the saved pin when the address is unchanged, and only changes the label', () => {
    const v = { ...formFromEvent(saved), label: 'The Rec' };
    expect(addressChanged(saved, v)).toBe(false);
    expect(locationToSave(saved, v, null)).toEqual({ ...saved.location, label: 'The Rec' });
  });

  it('uses the geocoder answer for a new address, or no pin if it failed', () => {
    const v = { ...formFromEvent(saved), address: '9 King St', label: '' };
    expect(addressChanged(saved, v)).toBe(true);
    expect(locationToSave(saved, v, { lat: 1, lng: 2, formattedAddress: '9 King St W, Toronto' })).toEqual({
      label: '9 King St W, Toronto',
      address: '9 King St W, Toronto',
      lat: 1,
      lng: 2,
    });
    expect(locationToSave(saved, v, null)).toEqual({ label: '9 King St', address: '9 King St', lat: 0, lng: 0 });
  });
});

describe('eventChanges', () => {
  it('reports nothing for an untouched form', () => {
    const v = formFromEvent(saved);
    expect(eventChanges(saved, v, locationToSave(saved, v, null))).toEqual({
      fields: {},
      timeChanged: false,
      any: false,
    });
  });

  it('lists only the fields that changed, trimmed', () => {
    const v = { ...formFromEvent(saved), title: ' Long run ', description: 'Bring water' };
    const c = eventChanges(saved, v, locationToSave(saved, v, null));
    expect(c.fields).toEqual({ title: 'Long run' });
    expect(c.timeChanged).toBe(false);
  });

  it('flags a new time so the reminder is sent again for the new date', () => {
    const v = { ...formFromEvent(saved), startsAt: saved.startsAt + 3_600_000 };
    const c = eventChanges(saved, v, locationToSave(saved, v, null));
    expect(c).toEqual({ fields: {}, timeChanged: true, any: true });
  });

  it('treats a stored location with keys in another order as unchanged', () => {
    const shuffled = { ...saved, location: { lng: -79.4, lat: 43.6, address: '1 Main St, Toronto', label: 'Aspire' } };
    const v = formFromEvent(shuffled);
    expect(eventChanges(shuffled, v, locationToSave(shuffled, v, null)).any).toBe(false);
  });
});

describe('editTarget', () => {
  it('sends a recurring date to the series editor while the series exists', () => {
    expect(editTarget({ seriesId: 's1' }, true)).toBe('series');
  });
  it('edits one-off events and dates whose series was deleted directly', () => {
    expect(editTarget({}, false)).toBe('event');
    expect(editTarget({ seriesId: 's1' }, false)).toBe('event');
  });
});
