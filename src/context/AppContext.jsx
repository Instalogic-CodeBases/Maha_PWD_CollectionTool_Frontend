import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import API from '../api/client.js';
import { dedupeSubs } from '../lib/helpers.js';

/*
  AppContext holds the same in-memory caches the prototype kept as globals
  (fields, computerIds, submissions, users, templates, ...) and the loader
  functions that refresh them from the backend. The behaviour is a 1:1 port:
  loaders both update React state (to re-render) and return the loaded value
  (so callers that need it immediately — e.g. the officer district switch — can
  use it without waiting for a re-render).
*/

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUserState] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [fields, setFields] = useState([]);
  const [computerIds, setComputerIds] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [currentTemplateId, setCurrentTemplateIdState] = useState(null);
  const [allDistrictsList, setAllDistrictsList] = useState([]);
  const [apiDistricts, setApiDistricts] = useState([]);
  const [districtCircle, setDistrictCircle] = useState({});
  const [formVersionId, setFormVersionId] = useState(null);
  const [fillDistrict, setFillDistrictState] = useState('');

  // Refs mirror the latest values for synchronous reads inside loaders
  // (avoids stale closures), exactly like the original module-level globals.
  const currentUserRef = useRef(null);
  const templateIdRef = useRef(null);
  const fillDistrictRef = useRef('');

  const setCurrentUser = useCallback((u) => {
    currentUserRef.current = u;
    setCurrentUserState(u);
  }, []);

  const setCurrentTemplateId = useCallback((id) => {
    templateIdRef.current = id;
    setCurrentTemplateIdState(id);
  }, []);

  const setFillDistrict = useCallback((d) => {
    fillDistrictRef.current = d;
    setFillDistrictState(d);
  }, []);

  // ---------- loaders (refresh caches from backend) ----------
  const loadContext = useCallback(async () => {
    const ctx = await API.context();
    setFormVersionId(ctx.formVersionId);
    setFields(ctx.fields || []);
    setComputerIds(ctx.computerIds || []);
    setApiDistricts(ctx.districts || []);
    const cu = currentUserRef.current;
    if (cu && cu.role !== 'admin') {
      const updated = { ...cu, districts: (ctx.districts || []).map((d) => d.name) };
      setCurrentUser(updated);
    }
    const map = {};
    (ctx.districts || []).forEach((d) => { map[d.name] = d.circle || ''; });
    setDistrictCircle(map);
    return ctx;
  }, [setCurrentUser]);

  // Officer: load the fields for the template assigned to a specific district.
  const loadFieldsForDistrict = useCallback(async (d) => {
    try {
      const ctx = await API.contextForDistrict(d || '');
      setFormVersionId(ctx.formVersionId);
      setFields(ctx.fields || []);
      if (ctx.computerIds) setComputerIds(ctx.computerIds);
      return ctx;
    } catch (err) {
      return null; // keep current fields on failure
    }
  }, []);

  const loadSubmissions = useCallback(async () => {
    const list = await API.listSubmissions();
    setSubmissions(list || []);
    return list || [];
  }, []);

  const loadComputerIds = useCallback(async () => {
    const raw = await API.listComputerIds();
    // API entity uses {code}; the rest of the UI expects {computerId}. Normalize.
    const mapped = (raw || []).map((c) => ({ id: c.id, computerId: c.code, schemeName: c.schemeName }));
    setComputerIds(mapped);
    return mapped;
  }, []);

  const loadUsers = useCallback(async () => {
    const raw = await API.listUsers();
    const mapped = (raw || []).map((u) => {
      const roleObjs = (u.userRoles || []).map((ur) => ur.role).filter(Boolean);
      const isAdmin = roleObjs.some((r) => r.roleName === 'SuperAdmin' || r.roleName === 'Admin');
      return {
        id: u.id,
        name: u.name,
        username: u.email,
        email: u.email,
        phone: u.phone,
        role: isAdmin ? 'admin' : 'officer',
        roleName: roleObjs.map((r) => r.roleName).join(', ') || '—',
        hierarchyNodeName: u.primaryHierarchyNode ? u.primaryHierarchyNode.name : '—',
        pwCircleNames: u.pwCircleNames || '',
        isActive: u.isActive,
        districts: u.primaryHierarchyNode ? [u.primaryHierarchyNode.name] : [],
      };
    });
    setUsers(mapped);
    return mapped;
  }, []);

  const loadTemplates = useCallback(async () => {
    let list;
    try { list = (await API.listTemplates()) || []; } catch (e) { list = []; }
    setTemplates(list);
    let id = templateIdRef.current;
    if (id == null || !list.some((t) => String(t.id) === String(id))) {
      const def = list.find((t) => t.isDefault) || list[0];
      id = def ? def.id : null;
      setCurrentTemplateId(id);
    }
    return list;
  }, [setCurrentTemplateId]);

  const loadTemplateFields = useCallback(async () => {
    const id = templateIdRef.current;
    if (id != null) {
      const f = (await API.templateFields(id)) || [];
      setFields(f);
      return f;
    }
    const ctx = await API.context();
    setFields(ctx.fields || []);
    return ctx.fields || [];
  }, []);

  const loadAllDistricts = useCallback(async () => {
    try {
      const list = (await API.listAllDistricts()) || [];
      setAllDistrictsList(list);
      return list;
    } catch (e) {
      setAllDistrictsList([]);
      return [];
    }
  }, []);

  // ---------- auth ----------
  const login = useCallback(async (email, password) => {
    const resp = await API.login(email, password);
    const roles = (resp.user && resp.user.roles) || [];
    const isAdmin = roles.some((r) => r === 'SuperAdmin' || r === 'Admin');
    const ctx = await loadContext();
    const user = {
      name: (resp.user && resp.user.name) || email,
      role: isAdmin || ctx.isAdmin ? 'admin' : 'officer',
      districts: (ctx.districts || []).map((d) => d.name),
    };
    setCurrentUser(user);
    return user;
  }, [loadContext, setCurrentUser]);

  // Circle-based login (User/Officer flow). Same session handling as email login.
  const circleLogin = useCallback(async (pwCircleId, password) => {
    const resp = await API.circleLogin(pwCircleId, password);
    const roles = (resp.user && resp.user.roles) || [];
    const isAdmin = roles.some((r) => r === 'SuperAdmin' || r === 'Admin');
    const ctx = await loadContext();
    const user = {
      name: (resp.user && resp.user.name) || '',
      role: isAdmin || ctx.isAdmin ? 'admin' : 'officer',
      districts: (ctx.districts || []).map((d) => d.name),
    };
    setCurrentUser(user);
    return user;
  }, [loadContext, setCurrentUser]);

  const logout = useCallback(async () => {
    try { await API.logout(); } catch (e) { /* ignore */ }
    setCurrentUser(null);
    setFillDistrict('');
    setCurrentTemplateId(null);
    setSubmissions([]);
    setUsers([]);
    setFields([]);
  }, [setCurrentUser, setFillDistrict, setCurrentTemplateId]);

  // Restore the session on load from the auth cookie so a refresh doesn't log out.
  const restoreSession = useCallback(async () => {
    try {
      const resp = await API.me();
      const roles = (resp.user && resp.user.roles) || [];
      const isAdmin = roles.some((r) => r === 'SuperAdmin' || r === 'Admin');
      let ctx = {};
      try { ctx = await loadContext(); } catch (e) { ctx = {}; }
      setCurrentUser({
        name: (resp.user && resp.user.name) || (resp.user && resp.user.email) || '',
        role: isAdmin || ctx.isAdmin ? 'admin' : 'officer',
        districts: (ctx.districts || []).map((d) => d.name),
      });
    } catch (e) {
      setCurrentUser(null); // not authenticated / cookie expired
    } finally {
      setAuthReady(true);
    }
  }, [loadContext, setCurrentUser]);

  useEffect(() => { restoreSession(); }, [restoreSession]);

  // ---------- derived ----------
  const scopedSubmissions = useCallback(() => {
    const unique = dedupeSubs(submissions);
    if (!currentUser) return unique;
    if (currentUser.role === 'admin') return unique;
    const d = currentUser.districts || [];
    return unique.filter((s) => d.includes(s.district));
  }, [submissions, currentUser]);

  const value = {
    // state
    currentUser, authReady, fields, computerIds, submissions, users, templates,
    currentTemplateId, allDistrictsList, apiDistricts, districtCircle,
    formVersionId, fillDistrict,
    // setters
    setCurrentUser, setFields, setComputerIds, setSubmissions, setUsers,
    setTemplates, setCurrentTemplateId, setAllDistrictsList, setFillDistrict,
    // loaders
    loadContext, loadFieldsForDistrict, loadSubmissions, loadComputerIds,
    loadUsers, loadTemplates, loadTemplateFields, loadAllDistricts,
    // auth
    login, circleLogin, logout,
    // derived
    scopedSubmissions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}