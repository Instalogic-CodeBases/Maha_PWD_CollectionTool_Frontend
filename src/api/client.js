/* =====================================================================

   client.js — single place to configure the backend and talk to it.

   Direct port of the prototype's api.js. Every screen goes through these

   helpers; the request/response contract is IDENTICAL to the original.



   IMPORTANT (auth cookie):

   Login sets an HttpOnly auth cookie. For the browser to send it on every

   request, all calls use credentials:'include', and the API must:

     - run over HTTPS (the "https" launch profile, port 7167), and

     - set the cookie SameSite=None; Secure (already done in Program.cs), and

     - allow this exact origin with AllowCredentials() in CORS (done — the dev

       server is pinned to http://localhost:5500 in vite.config.js).

   If you change the API port or the frontend origin, update BOTH the value

   below and the WithOrigins(...) list in the API's Program.cs.

   ===================================================================== */



// Configurable via a Vite env var (VITE_API_BASE_URL) but defaults to the

// same value the prototype used, so it works out of the box.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';  // '' = same-origin, calls go to /api and are proxied by IIS



async function request(method, path, body, isForm) {

  const opts = {

    method,

    credentials: 'include', // send/receive the auth cookie

    headers: {},

  };

  if (body !== undefined && body !== null) {

    if (isForm) {

      opts.body = body; // FormData (file upload) — no JSON header

    } else {

      opts.headers['Content-Type'] = 'application/json';

      opts.body = JSON.stringify(body);

    }

  }



  let res;

  try {

    res = await fetch(BASE_URL + path, opts);

  } catch (networkErr) {

    throw new Error(

      'Cannot reach the API at ' + BASE_URL +

      '. Is it running (https profile) and is this origin allowed in CORS?'

    );

  }



  if (res.status === 401) {

    const e = new Error('Not authenticated');

    e.status = 401;

    throw e;

  }



  // File downloads (Excel) come back as blobs.

  const ct = res.headers.get('content-type') || '';

  if (ct.includes('spreadsheetml') || ct.includes('octet-stream')) {

    if (!res.ok) throw new Error('Request failed (' + res.status + ')');

    return await res.blob();

  }



  let payload = null;

  const text = await res.text();

  if (text) {

    try {
      payload = JSON.parse(text);
    } catch {
      // The response wasn't JSON — most commonly this means the request
      // never reached the API at all (e.g. VITE_API_BASE_URL is missing/wrong
      // and the dev server served back index.html instead of proxying to the
      // backend). Treat this as a hard failure instead of silently handing
      // callers a raw HTML/text string where they expect an array/object —
      // that used to cause confusing crashes like "x.filter is not a function"
      // deep inside a page component.
      const e = new Error(
        'Received a non-JSON response from ' + BASE_URL + path +
        '. Check that VITE_API_BASE_URL in .env points at the running backend.'
      );
      e.status = res.status;
      throw e;
    }

  }



  if (!res.ok) {

    const msg = (payload && (payload.message || payload.title)) ||

      ('Request failed (' + res.status + ')');

    const e = new Error(msg);

    e.status = res.status;

    e.payload = payload;

    throw e;

  }

  return payload;

}



const API = {

  BASE_URL,

  get: (p) => request('GET', p),

  post: (p, b) => request('POST', p, b),

  put: (p, b) => request('PUT', p, b),

  del: (p) => request('DELETE', p),

  postForm: (p, form) => request('POST', p, form, true),



  // ---- convenience wrappers ----

  login: (email, password) => request('POST', '/api/account/login', { email, password }),

  loginCircles: () => request('GET', '/api/account/login-circles'),

  circleLogin: (pwCircleId, password) => request('POST', '/api/account/circle-login', { pwCircleId, password }),

  // Circle Login management (admin) — Batch 2
  getCircleLogins: () => request('GET', '/api/pwcircle/logins'),
  upsertCircleLogin: (pwCircleId, password) => request('POST', '/api/pwcircle/login-account', { pwCircleId, password }),
  deactivateCircleLogin: (pwCircleId) => request('POST', '/api/pwcircle/login-account/' + pwCircleId + '/deactivate'),

  logout: () => request('POST', '/api/account/logout'),

  me: () => request('GET', '/api/account/me'),

  changePassword: (payload) => request('POST', '/api/account/change-password', payload),



  context: () => request('GET', '/api/pwd/context'),

  dashboard: () => request('GET', '/api/pwd/dashboard'),



  listSubmissions: () => request('GET', '/api/pwd/submissions'),

  addSubmission: (district, data) => request('POST', '/api/pwd/submissions', { district, data }),

  deleteSubmission: (id) => request('DELETE', '/api/pwd/submissions/' + id),



  listComputerIds: () => request('GET', '/api/computerid'),

  addComputerId: (code, schemeName) => request('POST', '/api/computerid', { code, schemeName }),

  editComputerId: (id, code, schemeName) => request('PUT', '/api/computerid/' + id, { code, schemeName }),

  deleteComputerId: (id) => request('DELETE', '/api/computerid/' + id),



  addField: (f) => request('POST', '/api/pwd/fields', f),

  editField: (id, f) => request('PUT', '/api/pwd/fields/' + id, f),

  deleteField: (id) => request('DELETE', '/api/pwd/fields/' + id),

  reorderFields: (orderedIds, templateId) => request('POST', '/api/pwd/fields/reorder', { orderedIds, templateId }),



  // ---- district-wise templates ----

  listTemplates: () => request('GET', '/api/pwd/templates'),

  templateFields: (id) => request('GET', '/api/pwd/templates/' + id + '/fields'),

  createTemplate: (m) => request('POST', '/api/pwd/templates', m),

  updateTemplate: (id, m) => request('PUT', '/api/pwd/templates/' + id, m),

  deleteTemplate: (id) => request('DELETE', '/api/pwd/templates/' + id),

  listAllDistricts: () => request('GET', '/api/pwd/districts'),

  contextForDistrict: (d) => request('GET', '/api/pwd/context?district=' + encodeURIComponent(d || '')),



  listUsers: () => request('GET', '/api/user'),

  getUser: (id) => request('GET', '/api/user/' + id),

  userMetadata: () => request('GET', '/api/user/create-metadata'),

  createUser: (m) => request('POST', '/api/user', m),

  updateUser: (id, m) => request('PUT', '/api/user/' + id, m),

  toggleUser: (id) => request('POST', '/api/user/' + id + '/toggle-active'),



  // ---- PW Circle assignment (Batch 2) ----

  getPwCircles: () => request('GET', '/api/pwcircle'),

  getAssignedPwCircles: (userId) => request('GET', '/api/pwcircle/assigned/' + userId),

  assignPwCircles: (payload) => request('POST', '/api/pwcircle/assign', payload),



  // ---- Template Flow (Batch 3) ----

  downloadTemplate: () => request('GET', '/api/pwdtemplate/download'), // returns a Blob



  // ---- Template Flow: upload / submissions / view / edit (Batch 4) ----

  uploadTemplate: (file) => {

    const fd = new FormData();

    fd.append('file', file);

    return request('POST', '/api/pwdtemplate/upload', fd, true);

  },

  getSubmissions: () => request('GET', '/api/pwdtemplate/submissions'),

  // Flat per-work-item rows for Reports / KPI dashboard / Graphs — sourced from
  // the real MDR Excel submission data (Submission + SubmissionDetail + MasterWork).
  getReportData: () => request('GET', '/api/pwdtemplate/report-data'),

  getSubmission: (id) => request('GET', '/api/pwdtemplate/submissions/' + id),

  // SUPER ADMIN: complete Excel across all circles (returns a Blob)
  exportAllCircles: (from, to, circle) => {
    const qs = [];
    if (from) qs.push('from=' + encodeURIComponent(from));
    if (to) qs.push('to=' + encodeURIComponent(to));
    if (circle) qs.push('circle=' + encodeURIComponent(circle));
    return request('GET', '/api/pwdtemplate/export-all' + (qs.length ? '?' + qs.join('&') : ''));
  },

  downloadSubmission: (id, forEdit, forAdmin) => {
    const qs = [];
    if (forEdit) qs.push('forEdit=true');
    if (forAdmin) qs.push('forAdmin=true');
    return request('GET', '/api/pwdtemplate/submissions/' + id + '/download' + (qs.length ? '?' + qs.join('&') : ''));
  }, // Blob

  updateSubmission: (id, file) => {

    const fd = new FormData();

    fd.append('file', file);

    return request('POST', '/api/pwdtemplate/submissions/' + id + '/upload', fd, true);

  },

};



export default API;