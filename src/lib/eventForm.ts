/**
 * The create / edit event form's rules, kept out of the screen so they can be
 * tested. The screen is src/components/EventForm.tsx.
 */

export type EventLocation = { label: string; address: string; lat: number; lng: number };

/** What the admin typed. `startsAt` is epoch ms. */
export interface EventFormValues {
  title: string;
  description: string;
  label: string;
  address: string;
  startsAt: number;
}

/** The parts of a saved event the form edits. */
export interface EditableEvent {
  title: string;
  description?: string;
  location: EventLocation;
  startsAt: number;
}

/** The form's starting values for an event. A label that's just the address (the fallback) shows as empty. */
export function formFromEvent(e: EditableEvent): EventFormValues {
  return {
    title: e.title,
    description: e.description ?? '',
    label: e.location.label === e.location.address ? '' : e.location.label,
    address: e.location.address,
    startsAt: e.startsAt,
  };
}

export function validateEvent(v: EventFormValues): string | null {
  if (!v.title.trim() || !v.address.trim()) return 'Title and address are required.';
  return null;
}

/** Only look the address up again when it changed (looking it up costs a call and can move the pin). */
export function addressChanged(before: EditableEvent | null, v: EventFormValues): boolean {
  return !before || v.address.trim() !== before.location.address;
}

/**
 * The location to save. `found` is the geocoder's answer for a changed
 * address (null when it failed or wasn't asked); otherwise the saved
 * coordinates are kept. An empty label falls back to the address.
 */
export function locationToSave(
  before: EditableEvent | null,
  v: EventFormValues,
  found: { lat: number; lng: number; formattedAddress?: string } | null,
): EventLocation {
  let base: Omit<EventLocation, 'label'>;
  if (before && !addressChanged(before, v)) {
    base = { address: before.location.address, lat: before.location.lat, lng: before.location.lng };
  } else {
    const typed = v.address.trim();
    base = found
      ? { address: found.formattedAddress || typed, lat: found.lat, lng: found.lng }
      : { address: typed, lat: 0, lng: 0 }; // no pin; the map is hidden
  }
  return { ...base, label: v.label.trim() || base.address };
}

/**
 * The fields to write when editing, only those that changed. `timeChanged`
 * tells the caller to clear `reminderSentAt`, so a moved event gets its
 * evening-before reminder for the new date.
 */
export function eventChanges(
  before: EditableEvent,
  v: EventFormValues,
  location: EventLocation,
): { fields: Partial<Omit<EditableEvent, 'startsAt'>>; timeChanged: boolean; any: boolean } {
  const fields: Partial<Omit<EditableEvent, 'startsAt'>> = {};
  if (v.title.trim() !== before.title) fields.title = v.title.trim();
  if (v.description.trim() !== (before.description ?? '')) fields.description = v.description.trim();
  if (JSON.stringify(location) !== JSON.stringify(sameKeyOrder(before.location))) fields.location = location;
  const timeChanged = v.startsAt !== before.startsAt;
  return { fields, timeChanged, any: timeChanged || Object.keys(fields).length > 0 };
}

const sameKeyOrder = (l: EventLocation): EventLocation => ({
  address: l.address,
  lat: l.lat,
  lng: l.lng,
  label: l.label,
});

/**
 * Where an admin's Edit goes (only offered before the event starts). A date
 * of a recurring event is edited through its series: the nightly sync would
 * undo changes made to the one date. A date whose series is gone is left
 * alone by the sync, so it's edited like a one-off event.
 */
export function editTarget(e: { seriesId?: string }, seriesExists: boolean): 'series' | 'event' {
  return e.seriesId && seriesExists ? 'series' : 'event';
}
