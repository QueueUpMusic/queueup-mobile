const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(resolve(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(code, { exports, URL, process, require: (name) => mocks[name] ?? require(name) });
  return exports;
}

const tick = () => new Promise((done) => setImmediate(done));
function setup({ canOpen = async () => true, open = async () => {}, logout = async () => {} } = {}) {
  const calls = [];
  const alerts = [];
  const state = [];
  const refs = [];
  let stateIndex = 0;
  let refIndex = 0;
  const { AccountActions } = load('src/components/account-actions.tsx', {
    react: {
      useRef: (value) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: value }),
      useState: (value) => {
        const index = stateIndex++;
        if (!(index in state)) state[index] = value;
        return [state[index], (next) => { state[index] = next; }];
      },
    },
    'react-native': {
      View: 'View', Text: 'Text', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator',
      StyleSheet: { create: (styles) => styles },
      Alert: { alert: (...args) => alerts.push(args) },
      Linking: {
        canOpenURL: async (url) => { calls.push(['check', url]); return canOpen(url); },
        openURL: async (url) => { calls.push(['open', url]); return open(url); },
      },
    },
    '@/components/queueup-icon': { LogOutIcon: 'Icon' },
    '@/constants/theme': { colors: {}, Radii: {}, Spacing: {} },
    '@/config/server': { getCurrentServer: () => 'https://production.example/api/v1/' },
    '@/context/auth': { useAuth: () => ({ logout: async () => { calls.push(['logout']); await logout(); } }) },
  });
  const render = () => {
    stateIndex = refIndex = 0;
    return AccountActions().props.children;
  };
  return { calls, alerts, render };
}

test('Cancel preserves authentication and duplicate taps show one confirmation', () => {
  const app = setup();
  const [, deletion] = app.render();
  deletion.props.onPress();
  deletion.props.onPress();
  assert.equal(app.alerts.length, 1);
  const [title, message, buttons] = app.alerts[0];
  assert.equal(title, 'Delete Account');
  assert.equal(message, "You'll be signed out of QueueUp and redirected to our website to permanently delete your account. Your account won't be deleted until you confirm on the website.");
  buttons[0].onPress();
  assert.deepEqual(app.calls, []);
  deletion.props.onPress();
  assert.equal(app.alerts.length, 2);
});

test('Continue checks the origin URL, opens browser, then logs out; taps are blocked while busy', async () => {
  let finishOpen;
  const app = setup({ open: () => new Promise((done) => { finishOpen = done; }) });
  const [logout, deletion] = app.render();
  deletion.props.onPress();
  app.alerts[0][2][1].onPress();
  await tick();
  assert.deepEqual(app.calls, [
    ['check', 'https://production.example/account/delete/'],
    ['open', 'https://production.example/account/delete/'],
  ]);
  assert.ok(app.render().every((button) => button.props.disabled));
  logout.props.onPress();
  deletion.props.onPress();
  finishOpen();
  await tick();
  assert.deepEqual(app.calls.at(-1), ['logout']);
  assert.equal(app.calls.length, 3);
});

for (const [name, options] of [
  ['no browser', { canOpen: async () => false }],
  ['browser check rejects', { canOpen: async () => { throw new Error(); } }],
  ['browser launch rejects', { open: async () => { throw new Error(); } }],
]) {
  test(`${name} keeps the user signed in and allows retry`, async () => {
    const app = setup(options);
    app.render()[1].props.onPress();
    app.alerts[0][2][1].onPress();
    await tick();
    assert.ok(!app.calls.some(([name]) => name === 'logout'));
    assert.equal(app.alerts[1][0], 'Could not open website');
    assert.ok(app.render().every((button) => !button.props.disabled));
  });
}

test('logout failure is handled and the user can retry', async () => {
  const app = setup({ logout: async () => { throw new Error('Offline'); } });
  app.render()[1].props.onPress();
  app.alerts[0][2][1].onPress();
  await tick();
  assert.equal(app.alerts[1][0], 'Could not sign out');
  assert.ok(app.render().every((button) => !button.props.disabled));
  app.render()[0].props.onPress();
  await tick();
  assert.equal(app.calls.filter(([name]) => name === 'logout').length, 2);
});

function authSetup({ apiLogout = async () => {}, getSession = async () => ({ user: { username: 'tester', approved: false } }) } = {}) {
  const state = [];
  const refs = [];
  const calls = [];
  let si = 0;
  let ri = 0;
  const { AuthProvider } = load('src/context/auth.tsx', {
    react: {
      createContext: () => ({ Provider: 'Provider' }),
      useRef: (value) => refs[ri++] ?? (refs[ri - 1] = { current: value }),
      useState: (value) => {
        const index = si++;
        if (!(index in state)) state[index] = value;
        return [state[index], (next) => { state[index] = next; }];
      },
      useCallback: (callback) => callback, useMemo: (callback) => callback(), useEffect: () => {},
    },
    '@/lib/api': {
      getSession,
      getCsrfToken: async () => { calls.push('csrf'); },
      logout: async () => { calls.push('logout'); await apiLogout(); },
      clearCsrfToken: () => { calls.push('clearCsrf'); },
    },
    '@/lib/native-push': { unregisterNativePush: async () => { calls.push('unregister'); } },
    '@/types': { ApiError: class extends Error {} },
    'expo-network': {},
  });
  const render = () => {
    si = ri = 0;
    return AuthProvider({ children: null }).props.value;
  };
  return { render, calls };
}

test('existing logout clears local auth, profile, onboarding and CSRF; refresh cannot restore a stale session', async () => {
  let finishSession;
  let finishLogout;
  const session = { user: { username: 'tester', approved: true } };
  let sessionRequests = 0;
  const app = authSetup({
    getSession: () => {
      sessionRequests++;
      return sessionRequests === 1 ? Promise.resolve(session) : new Promise((done) => { finishSession = done; });
    },
    apiLogout: () => new Promise((done) => { finishLogout = done; }),
  });
  await app.render().refresh();
  assert.equal(app.render().status, 'approved');
  const staleRefresh = app.render().refresh();
  const logout = app.render().logout();
  await tick();
  await app.render().refresh();
  assert.equal(sessionRequests, 2, 'refresh is blocked during logout');
  finishLogout();
  await logout;
  finishSession(session);
  await staleRefresh;
  const auth = app.render();
  assert.equal(auth.status, 'logged_out');
  assert.equal(auth.user, null);
  assert.equal(auth.profilePictureUrl, null);
  assert.equal(auth.onboarding, null);
  assert.deepEqual(app.calls, ['unregister', 'csrf', 'logout', 'clearCsrf']);
});

test('failed logout preserves the authenticated state and can be retried', async () => {
  let fail = true;
  const app = authSetup({ apiLogout: async () => { if (fail) throw new Error('Offline'); } });
  await app.render().refresh();
  await assert.rejects(app.render().logout(), /Offline/);
  assert.equal(app.render().status, 'pending');
  assert.equal(app.render().user.username, 'tester');
  fail = false;
  await app.render().logout();
  assert.equal(app.render().status, 'logged_out');
});
