import { useEffect, useMemo, useState } from 'react';
import { api, messageFrom } from './api/client';
import { useAuth } from './context/AuthContext';

const today = new Date().toLocaleDateString('en-CA');

function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

function ButtonContent({ loading, children, loadingText }) {
  return (
    <>
      {loading && <Spinner />}
      <span>{loading ? loadingText : children}</span>
    </>
  );
}

function Brand() {
  return (
    <div className="brand" aria-label="Roll Call">
      <img className="brand-mark" src="/roll-call-mark.svg" alt="" />
      <span className="wordmark">ROLL CALL</span>
    </div>
  );
}

function AuthScreen() {
  const { authenticate, restoringSession } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const signup = mode === 'register';

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await authenticate(mode, form);
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <p className="eyebrow">Personal attendance ledger</p>
        <h1>Keep your attendance<br /><em>clear.</em></h1>
        <p>One quiet place to track every class, every semester, and the percentage that matters.</p>
      </section>
      <section className="auth-card">
        <Brand />
        {restoringSession && <p className="session-check"><Spinner /> Checking saved session...</p>}
        <h2>{signup ? 'Start your ledger' : 'Welcome back'}</h2>
        <p className="muted">{signup ? 'Create your private account in a minute.' : 'Sign in to continue your record.'}</p>
        <form onSubmit={submit}>
          {signup && (
            <label>
              Name
              <input required minLength="2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
            </label>
          )}
          <label>
            Email
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input required minLength="8" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary wide" disabled={saving}>
            <ButtonContent loading={saving} loadingText="Please wait...">{signup ? 'Create account' : 'Sign in'}</ButtonContent>
          </button>
        </form>
        <button className="text-button" onClick={() => { setMode(signup ? 'login' : 'register'); setError(''); }}>
          {signup ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </section>
    </main>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const [years, setYears] = useState([]);
  const [summary, setSummary] = useState({ subjects: [], overall: { total: 0, present: 0, percentage: 0 } });
  const [yearLabel, setYearLabel] = useState('');
  const [subject, setSubject] = useState({ name: '', yearId: '' });
  const [selectedYear, setSelectedYear] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [previous, setPrevious] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [action, setAction] = useState({ type: '', id: '' });

  const isBusy = Boolean(action.type);
  const isAddingYear = action.type === 'add-year';
  const isAddingSubject = action.type === 'add-subject';
  const isSavingPrevious = action.type === 'save-previous';
  const deletingId = action.type === 'delete-subject' ? action.id : '';

  async function load({ showRefresh = false } = {}) {
    if (showRefresh) setRefreshing(true);
    try {
      const [yearsRes, summaryRes] = await Promise.all([
        api.get('/years'),
        api.get('/attendance/summary'),
      ]);
      setYears(yearsRes.data.years);
      setSummary(summaryRes.data);
    } finally {
      if (showRefresh) setRefreshing(false);
      setInitialLoading(false);
    }
  }

  async function runAction(nextAction, task) {
    setAction(nextAction);
    setError('');
    setNotice('');
    try {
      await task();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setAction({ type: '', id: '' });
    }
  }

  useEffect(() => {
    load().catch((err) => {
      setError(messageFrom(err));
      setInitialLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!subject.yearId && years[0]) setSubject((current) => ({ ...current, yearId: years[0]._id }));
  }, [years, subject.yearId]);

  const visibleSubjects = useMemo(
    () => (selectedYear ? summary.subjects.filter((item) => item.year._id === selectedYear) : summary.subjects),
    [summary, selectedYear]
  );

  async function addYear(event) {
    event.preventDefault();
    await runAction({ type: 'add-year', id: '' }, async () => {
      await api.post('/years', { label: yearLabel });
      setYearLabel('');
      setNotice('Year added.');
      await load({ showRefresh: true });
    });
  }

  async function addSubject(event) {
    event.preventDefault();
    await runAction({ type: 'add-subject', id: '' }, async () => {
      await api.post('/subjects', subject);
      setSubject({ name: '', yearId: subject.yearId });
      setNotice('Subject added.');
      await load({ showRefresh: true });
    });
  }

  async function mark(subjectId, status) {
    await runAction({ type: `mark-${status}`, id: subjectId }, async () => {
      await api.post('/attendance', { subjectId, status, date: today });
      setNotice(`Marked ${status} for today.`);
      await load({ showRefresh: true });
    });
  }

  function openPrevious(item) {
    setPrevious({ subjectId: item._id, name: item.name, attended: item.manualPresent || 0, total: item.manualTotal || 0 });
  }

  async function savePrevious(event) {
    event.preventDefault();
    await runAction({ type: 'save-previous', id: previous.subjectId }, async () => {
      await api.patch(`/subjects/${previous.subjectId}/previous-lectures`, {
        attended: Number(previous.attended),
        total: Number(previous.total),
      });
      setNotice('Previous lectures updated.');
      setPrevious(null);
      await load({ showRefresh: true });
    });
  }

  async function removeSubject(id) {
    if (!window.confirm('Remove this subject and its attendance entries?')) return;
    await runAction({ type: 'delete-subject', id }, async () => {
      await api.delete(`/subjects/${id}`);
      setNotice('Subject removed.');
      await load({ showRefresh: true });
    });
  }

  return (
    <main className="app-shell">
      <header>
        <div>
          <Brand />
          <p className="date-line">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="profile">
          <span>{user.name}</span>
          <button className="text-button" onClick={logout}>Sign out</button>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Attendance at a glance</p>
          <h1>{summary.overall.percentage}% <span>overall</span></h1>
          <p>{summary.overall.present} present out of {summary.overall.total} classes recorded.</p>
        </div>
        <div className="hero-mark" aria-hidden="true">{summary.overall.percentage}%</div>
      </section>

      {(notice || error || refreshing) && (
        <p className={error ? 'flash error' : 'flash'}>
          <span>{refreshing ? <><Spinner /> Syncing your ledger...</> : error || notice}</span>
          {(notice || error) && <button onClick={() => { setError(''); setNotice(''); }}>×</button>}
        </p>
      )}

      {initialLoading ? (
        <div className="panel-loader"><Spinner /> Loading your subjects...</div>
      ) : (
        <section className={refreshing ? 'content-grid is-refreshing' : 'content-grid'}>
          <aside className="setup-panel">
            <p className="eyebrow">Set up</p>
            <h2>Your subjects</h2>
            <form onSubmit={addYear} className="compact-form">
              <label>
                Add semester / year
                <input required disabled={isAddingYear} value={yearLabel} onChange={(e) => setYearLabel(e.target.value)} placeholder="e.g. Semester 5" />
              </label>
              <button className="secondary" disabled={isAddingYear}>
                <ButtonContent loading={isAddingYear} loadingText="Adding year...">Add year</ButtonContent>
              </button>
            </form>
            {years.length > 0 && (
              <form onSubmit={addSubject} className="compact-form">
                <label>
                  Add subject
                  <select required disabled={isAddingSubject} value={subject.yearId} onChange={(e) => setSubject({ ...subject, yearId: e.target.value })}>
                    {years.map((year) => <option key={year._id} value={year._id}>{year.label}</option>)}
                  </select>
                  <input required disabled={isAddingSubject} value={subject.name} onChange={(e) => setSubject({ ...subject, name: e.target.value })} placeholder="e.g. Database Systems" />
                </label>
                <button className="secondary" disabled={isAddingSubject}>
                  <ButtonContent loading={isAddingSubject} loadingText="Adding subject...">Add subject</ButtonContent>
                </button>
              </form>
            )}
            <div className="year-list">
              {years.map((year) => (
                <button key={year._id} className={selectedYear === year._id ? 'year-chip active' : 'year-chip'} onClick={() => setSelectedYear(selectedYear === year._id ? '' : year._id)}>
                  {year.label}
                </button>
              ))}
            </div>
          </aside>

          <section className="records">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Today's roll call</p>
                <h2>{selectedYear ? years.find((year) => year._id === selectedYear)?.label : 'All subjects'}</h2>
              </div>
              <span className="legend"><i /> 75% target</span>
            </div>
            {visibleSubjects.length === 0 ? (
              <div className="empty">
                <strong>No subjects yet.</strong>
                <p>Add a semester and subject to begin your record.</p>
              </div>
            ) : (
              <div className="subject-list">
                {visibleSubjects.map((item) => {
                  const markingPresent = action.type === 'mark-present' && action.id === item._id;
                  const markingAbsent = action.type === 'mark-absent' && action.id === item._id;
                  const deleting = deletingId === item._id;

                  return (
                    <article className="subject-card" key={item._id}>
                      <div className="subject-name">
                        <span className="initial">{item.name[0]}</span>
                        <div>
                          <h3>{item.name}</h3>
                          <p>{item.year.label} · {item.present}/{item.total} classes</p>
                        </div>
                      </div>
                      <div className="percentage">
                        <strong className={item.percentage < 75 ? 'below-target' : ''}>{item.percentage}%</strong>
                        <div className="meter"><span style={{ width: `${item.percentage}%` }} /></div>
                      </div>
                      <div className="actions">
                        <button className="present" disabled={isBusy} onClick={() => mark(item._id, 'present')}>
                          <ButtonContent loading={markingPresent} loadingText="Saving">Present</ButtonContent>
                        </button>
                        <button className="absent" disabled={isBusy} onClick={() => mark(item._id, 'absent')}>
                          <ButtonContent loading={markingAbsent} loadingText="Saving">Absent</ButtonContent>
                        </button>
                        <button className="previous" disabled={isBusy} onClick={() => openPrevious(item)}>Previous</button>
                        <button className="delete" disabled={isBusy} title="Remove subject" onClick={() => removeSubject(item._id)}>
                          {deleting ? <Spinner /> : '×'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      )}

      {previous && (
        <div className="modal-backdrop" role="presentation">
          <form className="previous-dialog" onSubmit={savePrevious}>
            <button type="button" className="dialog-close" disabled={isSavingPrevious} onClick={() => setPrevious(null)}>×</button>
            <p className="eyebrow">Previous lectures</p>
            <h2>{previous.name}</h2>
            <p>Include classes from before you started using Roll Call.</p>
            <div className="number-fields">
              <label>
                Lectures attended
                <input required min="0" type="number" disabled={isSavingPrevious} value={previous.attended} onChange={(e) => setPrevious({ ...previous, attended: e.target.value })} />
              </label>
              <label>
                Total lectures held
                <input required min="0" type="number" disabled={isSavingPrevious} value={previous.total} onChange={(e) => setPrevious({ ...previous, total: e.target.value })} />
              </label>
            </div>
            <button className="primary" disabled={isSavingPrevious}>
              <ButtonContent loading={isSavingPrevious} loadingText="Saving lectures...">Save previous lectures</ButtonContent>
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

export default function App() {
  const { user } = useAuth();
  return user ? <Dashboard /> : <AuthScreen />;
}
