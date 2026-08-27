import { useState } from 'react';

/* ============================================================================
   Icons.jsx — ONE consistent icon set for the whole app.
   ----------------------------------------------------------------------------
   Feather / Lucide-style: 24×24 viewBox, stroke-based, inherit `currentColor`,
   uniform 1.8 stroke. No external dependency — swap any emoji/inline SVG for
   <Icon name="edit" /> and everything stays visually consistent.

   Usage:
     import { Icon } from '../components/Icons.jsx';
     <Icon name="edit" />                 // 18px default
     <Icon name="trash" size={16} />
     <Icon name="download" className="x"/>

   Available names:
     dashboard users dataform template cids viewdata reports upload download
     view edit trash add save search filter refresh settings lock logout
     calendar map layers file document chevronUp chevronDown close check
     alert pdf eye eyeOff sortAsc sortDesc
   ============================================================================ */

const BASE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  dataform: (
    <>
      <path d="M9 2h6a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1z" />
      <path d="M9 12h6M9 16h4" />
    </>
  ),
  template: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </>
  ),
  cids: <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />,
  viewdata: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </>
  ),
  reports: (
    <>
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="6" rx="1" />
      <rect x="12" y="8" width="3" height="10" rx="1" />
      <rect x="17" y="5" width="3" height="13" rx="1" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M12 3v12M7 8l5-5 5 5" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M12 15V3M7 10l5 5 5-5" />
    </>
  ),
  view: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  add: <path d="M12 5v14M5 12h14" />,
  save: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  filter: <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />,
  refresh: (
    <>
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  map: (
    <>
      <path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 9 5-9 5-9-5 9-5z" />
      <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h4" />
    </>
  ),
  document: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h4" />
    </>
  ),
  pdf: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8.5 14v4M8.5 14h1.2a1.1 1.1 0 0 1 0 2.2H8.5M13 14v4h.9a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H13zM16.6 14H18M16.6 14v4M16.6 16h1.1" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m3 3 18 18" />
      <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-3 3.7M6.2 6.2C3.5 8.1 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4.2-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  chevronUp: <path d="m6 15 6-6 6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="M20 6 9 17l-5-5" />,
  alert: (
    <>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  sortAsc: <path d="m6 15 6-6 6 6" />,
  sortDesc: <path d="m6 9 6 6 6-6" />,
};

export function Icon({ name, size = 18, className, style, title }) {
  const d = PATHS[name] || PATHS.dashboard;
  return (
    <svg
      {...BASE}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {d}
    </svg>
  );
}

/* ----------------------------------------------------------------------------
   BrandMark — Public Works Department crest (road + arch bridge motif).
   Clean vector placeholder styled to sit on a teal chip. To use the OFFICIAL
   Maharashtra PWD / Government logo instead, drop the file at
   /public/pwd-logo.png (or .svg) and replace <BrandMark/> with:
       <img src="/pwd-logo.png" alt="PWD" width={size} height={size} />
   in Layout.jsx and Login.jsx. Nothing else needs to change.
   ---------------------------------------------------------------------------- */
export function BrandMark({ size = 30, color = '#ffffff' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* rising road / carriageway with centre dashes */}
      <path d="M9 40 L20 12" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M39 40 L28 12" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M24 15v3M24 23v3M24 31v3" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />
      {/* arch bridge deck */}
      <path d="M6 40h36" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M13 40a11 11 0 0 1 22 0" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

/* ----------------------------------------------------------------------------
   PwdLogo — shows the OFFICIAL PWD Maharashtra logo from /public/pwd-logo.png.
   Until that file is added it automatically falls back to the vector crest, so
   the UI never breaks. To use the official logo:
     1. Download the PWD Maharashtra logo from https://pwd.maharashtra.gov.in/
        (right-click the emblem in the site header → Save image as…).
     2. Save it into the app's  public/  folder as  pwd-logo.png
        (a transparent PNG or SVG works best). For SVG, pass src="/pwd-logo.svg".
   No code change is needed after that — it will appear automatically.
   ---------------------------------------------------------------------------- */
// Official PWD Maharashtra logo, embedded so it ALWAYS renders (no external file or
// server path needed). This is the exact image you provided.
const PWD_LOGO_SRC = "data:image/png;base64,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";

export function PwdLogo({ size = 30, src = PWD_LOGO_SRC }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <BrandMark size={size} color="#7a2717" />;
  return (
    <img
      src={src}
      alt="PWD Maharashtra"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain", display: "block" }}
      onError={() => setFailed(true)}
    />
  );
}

export default Icon;