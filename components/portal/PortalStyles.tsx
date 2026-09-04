// Shared CSS for every portal role. Deliberately a plain neutral palette
// (slate + indigo) rather than any particular brand's tokens/fonts — swap
// the custom properties below for your own brand and every component in
// components/portal/ picks it up automatically.
export default function PortalStyles() {
  return (
    <style>{`
      :root {
        --ps-bg: #f6f7fb;
        --ps-surface: #ffffff;
        --ps-border: #e2e4ec;
        --ps-ink: #1c2130;
        --ps-muted: #6b7080;
        --ps-accent: #4f5fe0;
        --ps-accent-bg: #eceeff;
        --ps-sidebar: #171a26;
        --ps-good: #1f9d6c;
      }
      * { box-sizing: border-box; }
      body { background: var(--ps-bg); color: var(--ps-ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif; margin: 0; }
      a { color: inherit; }
      .link { background: none; border: none; color: var(--ps-accent); font: inherit; font-weight: 600; cursor: pointer; padding: 0; }
      .link:disabled { opacity: 0.6; cursor: default; }
      .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px;
        padding: 10px 18px; font-weight: 600; font-size: 0.88rem; border: 1px solid transparent; cursor: pointer; }
      .btn:disabled { opacity: 0.6; cursor: default; }
      .btn-primary, .btn-accent { background: var(--ps-accent); color: #fff; }
      .btn-secondary { background: var(--ps-surface); color: var(--ps-ink); border-color: var(--ps-border); }
      .btn-sm { padding: 6px 12px; font-size: 0.8rem; }

      .ps-shell { display: flex; min-height: 100vh; background: var(--ps-bg); }
      .ps-sidebar { width: 230px; flex: 0 0 230px; background: var(--ps-sidebar); display: flex;
        flex-direction: column; padding: 24px 0; }
      .ps-brand { display: flex; align-items: center; gap: 10px; padding: 0 22px 24px; color: #fff;
        font-weight: 700; font-size: 1rem; letter-spacing: 0.2px; }
      .ps-brand-logo { height: 30px; width: auto; max-width: 100%; display: block; object-fit: contain; }
      .ps-brand-fallback { height: 30px; width: 30px; border-radius: 8px; background: var(--ps-accent);
        color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; flex: 0 0 30px; }
      .ps-brand-upload { padding: 0 22px 20px; }
      .ps-nav { display: flex; flex-direction: column; gap: 2px; padding: 0 12px; }
      .ps-nav-item { display: block; padding: 10px 13px; border-radius: 8px; color: rgba(255,255,255,0.62);
        font-weight: 500; font-size: 0.86rem; text-decoration: none; cursor: pointer; }
      .ps-nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
      .ps-nav-item.active { background: rgba(79,95,224,0.28); color: #fff; font-weight: 600; }
      .ps-sidebar-foot { margin-top: auto; padding: 16px 22px 0; border-top: 1px solid rgba(255,255,255,0.08); }
      .ps-signout { display: block; width: 100%; background: none; border: none; color: rgba(255,255,255,0.62);
        font-weight: 500; font-size: 0.86rem; font-family: inherit; text-align: left; padding: 8px 0; cursor: pointer; }
      .ps-signout:hover { color: #fff; }
      .ps-signout:disabled { cursor: default; opacity: 0.6; }

      .ps-view-as-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px;
        background: var(--ps-accent-bg); border: 1px solid var(--ps-accent); border-radius: 12px; padding: 12px 18px;
        font-size: 0.86rem; color: var(--ps-ink); margin-bottom: 4px; }

      .ps-main { flex: 1; min-width: 0; padding: 40px 40px 60px; display: flex; flex-direction: column; gap: 22px; }
      .ps-header { margin-bottom: 4px; display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
      .ps-header-children { display: flex; gap: 10px; flex-wrap: wrap; }
      .ps-header-child { display: flex; align-items: center; gap: 10px; background: var(--ps-surface);
        border: 1.5px solid var(--ps-border); border-radius: 12px; padding: 8px 14px; cursor: pointer; font: inherit;
        text-align: left; }
      .ps-header-child:disabled { cursor: default; }
      .ps-header-child.active { border-color: var(--ps-accent); }
      .ps-eyebrow { font-size: 0.72rem; letter-spacing: 1px; text-transform: uppercase; font-weight: 700;
        color: var(--ps-accent); margin-bottom: 8px; }
      .ps-title { font-weight: 700; color: var(--ps-ink); font-size: 1.9rem; margin: 0 0 10px; }
      .ps-lede { color: var(--ps-muted); line-height: 1.7; max-width: 640px; margin: 0; }

      .ps-card { background: var(--ps-surface); border: 1px solid var(--ps-border); border-radius: 14px; padding: 26px 28px; }
      .ps-card-title { font-weight: 700; color: var(--ps-ink); font-size: 1.15rem; margin-bottom: 18px; }
      .ps-subhead { font-size: 0.72rem; letter-spacing: 0.6px; text-transform: uppercase; font-weight: 700;
        color: var(--ps-muted); margin-bottom: 12px; }
      .muted { color: var(--ps-muted); }

      .ps-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
      @media (max-width: 900px) { .ps-stats { grid-template-columns: 1fr 1fr; } }
      .ps-stat { background: var(--ps-surface); border: 1px solid var(--ps-border); border-radius: 14px; padding: 18px; }
      .ps-stat-dark { background: var(--ps-sidebar); border: none; }
      .ps-stat-dark .ps-stat-label { color: rgba(255,255,255,0.55); }
      .ps-stat-dark .ps-stat-note { color: #fff; font-weight: 600; font-size: 0.9rem; margin-top: 4px; }
      .ps-stat-label { font-size: 0.66rem; letter-spacing: 0.8px; text-transform: uppercase; font-weight: 700;
        color: var(--ps-muted); margin-bottom: 8px; }
      .ps-stat-value { font-weight: 700; font-size: 1.8rem; color: var(--ps-ink); }

      .ps-two-col { display: grid; grid-template-columns: 1.1fr 1fr; gap: 20px; align-items: start; }
      @media (max-width: 760px) { .ps-two-col { grid-template-columns: 1fr; } }

      .ps-roster-table { display: flex; flex-direction: column; }
      .ps-roster-row { display: grid; grid-template-columns: 2fr 1fr; align-items: center; gap: 8px;
        padding: 11px 4px; border-bottom: 1px solid var(--ps-border); text-align: left; border-radius: 8px; }
      .ps-roster-row.active { background: var(--ps-accent-bg); }
      .ps-roster-head { font-size: 0.64rem; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 700;
        color: var(--ps-muted); border-bottom: 1px solid var(--ps-border); }
      .ps-roster-name { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 0.86rem;
        color: var(--ps-ink); text-decoration: none; background: none; border: none; padding: 0; cursor: pointer; font-family: inherit; }
      .ps-roster-name:hover { color: var(--ps-accent); }
      .ps-status { font-size: 0.78rem; color: var(--ps-good); }
      .ps-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--ps-sidebar); color: #fff;
        display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.86rem; flex: 0 0 38px; }
      .ps-avatar-sm { width: 26px; height: 26px; font-size: 0.68rem; flex: 0 0 26px; }

      .ps-child-name { font-weight: 700; font-size: 0.96rem; color: var(--ps-ink); }
      .ps-child-grade { font-size: 0.7rem; color: var(--ps-accent); margin-top: 2px; }

      .ps-teacher-row { display: flex; align-items: center; gap: 10px; background: none; border: none;
        border-radius: 8px; padding: 8px 10px; cursor: pointer; font: inherit; font-weight: 600;
        font-size: 0.86rem; color: var(--ps-ink); text-align: left; width: 100%; }
      .ps-teacher-row:hover, .ps-teacher-row.active { background: var(--ps-accent-bg); }

      .ps-thread { background: var(--ps-bg); border: 1px solid var(--ps-border); border-radius: 12px; padding: 16px; }
      .ps-thread-msg { border-radius: 10px; padding: 6px 12px; max-width: 80%; }
      .ps-thread-msg.mine { align-self: flex-end; background: var(--ps-accent-bg); }
      .ps-thread-msg.theirs { align-self: flex-start; background: var(--ps-border); }

      .portal-input { width: 100%; padding: 8px 12px; border: 1px solid var(--ps-border); border-radius: 8px;
        font: inherit; margin-top: 6px; background: var(--ps-surface); color: var(--ps-ink); }
      .mini-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    `}</style>
  );
}
