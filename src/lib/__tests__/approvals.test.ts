import { pendingName, shouldNotifyPending } from '../../../functions/src/shared/approvals';

const pending = { status: 'pending', firstName: 'Amy', lastName: 'Lee', email: 'amy@x.com' };
const verified = { ...pending, emailVerified: true };

describe('shouldNotifyPending', () => {
  it('stays quiet at sign-up, before the email is verified', () => {
    expect(shouldNotifyPending(null, pending)).toBe(false);
    expect(shouldNotifyPending(null, { ...pending, emailVerified: false })).toBe(false);
  });

  it('stays quiet on "I\'ve verified" when the email is not verified (nothing changes)', () => {
    expect(shouldNotifyPending(pending, pending)).toBe(false);
    expect(shouldNotifyPending(pending, { ...pending, phone: '555' } as typeof pending)).toBe(false);
  });

  it('notifies once, when a pending member becomes verified', () => {
    expect(shouldNotifyPending(pending, verified)).toBe(true);
    expect(shouldNotifyPending({ ...pending, emailVerified: false }, verified)).toBe(true);
  });

  it('notifies for a doc created already verified', () => {
    expect(shouldNotifyPending(null, verified)).toBe(true);
  });

  it('never notifies again after that', () => {
    expect(shouldNotifyPending(verified, { ...verified, firstName: 'Amelia' })).toBe(false);
    expect(shouldNotifyPending(verified, { ...verified, status: 'approved' })).toBe(false);
  });

  it('ignores members who are not pending', () => {
    expect(shouldNotifyPending({ status: 'approved' }, { status: 'approved', emailVerified: true })).toBe(false);
    expect(shouldNotifyPending({ status: 'evicted' }, { status: 'evicted', emailVerified: true })).toBe(false);
  });
});

describe('pendingName', () => {
  it('uses the full name, then the email, then a fallback', () => {
    expect(pendingName(pending)).toBe('Amy Lee');
    expect(pendingName({ firstName: 'Amy' })).toBe('Amy');
    expect(pendingName({ firstName: ' ', email: 'amy@x.com' })).toBe('amy@x.com');
    expect(pendingName({})).toBe('New member');
  });
});
