// Iconos de línea propios (mismo trazo en toda la web). Antes cada ficha tenía su copia de este
// componente y los botones mezclaban iconos con emojis.
export default function Icon({ name, className = "h-5 w-5", style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const p = { className, style, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  switch (name) {
    case "leaf": return <svg {...p}><path d="M5 20c8 0 14-6 14-14 0 0-13-2-14 9-.3 3 0 5 0 5z" /><path d="M5 20c1-4 4-8 9-11" /></svg>
    case "sofa": return <svg {...p}><path d="M4 12v5a1 1 0 001 1h1v2M18 18h1a1 1 0 001-1v-5M4 12a2 2 0 012-2h12a2 2 0 012 2M4 12v3h16v-3M17 18v2" /></svg>
    case "cigarette": return <svg {...p}><rect x="2" y="10" width="16" height="4" rx="1" /><path d="M8 10v4M18 8c1 1 1 2 0 3M20 7c1.5 1.5 1.5 3.5 0 5" /></svg>
    case "clipboard": return <svg {...p}><rect x="6" y="4" width="12" height="17" rx="2" /><rect x="9" y="2" width="6" height="4" rx="1" /><path d="M9 11h6M9 15h4" /></svg>
    case "shirt": return <svg {...p}><path d="M8 4l4 2 4-2 4 4-3 3v9H7v-9L4 8z" /></svg>
    case "pride": return <svg {...p} strokeWidth={2}><path d="M4 6h16M4 10.5h16M4 15h16M4 19.5h16" /></svg>
    case "music": return <svg {...p}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>
    case "ticket": return <svg {...p}><path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4z" /></svg>
    case "clock": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
    case "hourglass": return <svg {...p}><path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9" /></svg>
    case "thermometer": return <svg {...p}><path d="M12 15V4a2 2 0 10-4 0v11a4 4 0 104 0z" /></svg>
    case "map": return <svg {...p}><path d="M9 20l-6-2V6l6 2 6-2 6 2v12l-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></svg>
    case "share": return <svg {...p}><circle cx="6" cy="12" r="2.3" /><circle cx="18" cy="6" r="2.3" /><circle cx="18" cy="18" r="2.3" /><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" /></svg>
    case "flag": return <svg {...p}><path d="M5 3v18M5 4h13l-3 4 3 4H5" /></svg>
    case "arrow": return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    case "flame": return <svg {...p}><path d="M12 3c1 3-2 4-2 7a4 4 0 108 0c0-1-1-2-1-2 1 4-1 5-1 5 2-1 3-4 3-6 0-5-4-6-4-9-1 2-3 3-3 5z" /></svg>
    case "ban": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M6 6l12 12" /></svg>
    case "check": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg>
    case "heart": return <svg {...p}><path d="M12 20s-7-4.6-9.5-9.2C1 7.3 3 4 6.5 4 9 4 11 6 12 7c1-1 3-3 5.5-3C21 4 23 7.3 21.5 10.8 19 15.4 12 20 12 20z" /></svg>
    case "back": return <svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
    case "close": return <svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
    case "instagram": return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" /></svg>
    case "users": return <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" /><circle cx="17" cy="9" r="2.4" /><path d="M20.5 20c-.2-2.4-1.5-4.2-3.5-5" /></svg>
    case "id": return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="12" r="2" /><path d="M6 16c.5-1.5 1.5-2 2.5-2s2 .5 2.5 2M14 9h4M14 12h4M14 15h2" /></svg>
    case "star": return <svg {...p} fill="currentColor" stroke="none"><path d="M12 2.5l2.9 6.4 6.9.7-5.2 4.7 1.5 6.9L12 17.8l-6.1 3.4 1.5-6.9-5.2-4.7 6.9-.7z" /></svg>
    case "google": return <svg {...p} fill="currentColor" stroke="none" viewBox="0 0 24 24"><path d="M21.6 12.23c0-.68-.06-1.36-.18-2H12v3.8h5.4a4.62 4.62 0 01-2 3.03v2.5h3.24c1.9-1.75 3-4.33 3-7.33z" /><path d="M12 22c2.7 0 4.97-.9 6.63-2.44l-3.24-2.5c-.9.6-2.06.96-3.4.96-2.6 0-4.8-1.76-5.6-4.13H3.05v2.6A10 10 0 0012 22z" /><path d="M6.4 13.9a6 6 0 010-3.8v-2.6H3.05a10 10 0 000 9l3.35-2.6z" /><path d="M12 5.98c1.47 0 2.8.5 3.83 1.5l2.87-2.87A9.7 9.7 0 0012 2a10 10 0 00-8.95 5.5l3.35 2.6c.8-2.37 3-4.12 5.6-4.12z" /></svg>
    case "calendar": return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
    case "headphones": return <svg {...p}><path d="M4 14v-2a8 8 0 0116 0v2" /><rect x="2" y="14" width="5" height="7" rx="2" /><rect x="17" y="14" width="5" height="7" rx="2" /></svg>
    case "phone": return <svg {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></svg>
    case "car": return <svg {...p}><path d="M5 16l1.5-5a2 2 0 012-1.5h7a2 2 0 012 1.5L19 16" /><rect x="3" y="16" width="18" height="3" rx="1" /><circle cx="7.5" cy="19.5" r="1" /><circle cx="16.5" cy="19.5" r="1" /></svg>
    case "train": return <svg {...p}><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 11h14M8 21l2-4M16 21l-2-4" /><circle cx="9" cy="14" r="0.8" fill="currentColor" /><circle cx="15" cy="14" r="0.8" fill="currentColor" /></svg>
    case "bus": return <svg {...p}><rect x="4" y="3" width="16" height="15" rx="3" /><path d="M4 11h16M8 21v-3M16 21v-3" /><circle cx="8" cy="14.5" r="0.8" fill="currentColor" /><circle cx="16" cy="14.5" r="0.8" fill="currentColor" /></svg>
    case "globe": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>
    case "note": return <svg {...p}><path d="M5 4h14v12l-4 4H5z" /><path d="M15 20v-4h4M8 9h8M8 13h5" /></svg>
    case "search": return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
    case "user": return <svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" /></svg>
    case "sparkle": return <svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>
    case "shield": return <svg {...p}><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" /></svg>
    case "chat": return <svg {...p}><rect x="3" y="4" width="18" height="12" rx="3" /><path d="M8 16v4l4-4" /></svg>
    case "thumbsUp": return <svg {...p}><path d="M7 11v9H4v-9zM7 11l3-7a2 2 0 012 2v4h5a2 2 0 012 2.3l-1.3 6A2 2 0 0115.7 20H7" /></svg>
    case "thumbsDown": return <svg {...p}><path d="M17 13V4h3v9zM17 13l-3 7a2 2 0 01-2-2v-4H7a2 2 0 01-2-2.3l1.3-6A2 2 0 018.3 4H17" /></svg>
    default: return null
  }
}
