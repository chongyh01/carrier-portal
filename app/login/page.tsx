export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;

  return (
    <main style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: "24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; border-color: #3b82f6 !important; }
        button:hover { opacity: 0.9; }
      `}</style>

      <form method="POST" action="/api/login" style={{ width: "100%", maxWidth: "360px", background: "#1e293b", borderRadius: "12px", padding: "32px", border: "1px solid #334155" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <div style={{ width: "32px", height: "32px", background: "#3b82f6", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontSize: "16px" }}>🚛</span>
          </div>
          <span style={{ color: "white", fontWeight: 700, fontSize: "18px", letterSpacing: "-0.3px" }}>Carrier Intelligence</span>
        </div>

        <h1 style={{ color: "white", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Enter password</h1>
        <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "20px" }}>This site is in private beta. Enter the access password to continue.</p>

        {error && (
          <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px", fontFamily: "'DM Mono', monospace" }}>Incorrect password. Please try again.</p>
        )}

        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          autoFocus
          style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "2px solid #334155", background: "#0f172a", color: "white", fontSize: "15px", fontFamily: "'DM Sans', sans-serif", marginBottom: "16px" }}
        />
        <input type="hidden" name="redirect" value={redirect ?? "/"} />

        <button type="submit" style={{ width: "100%", padding: "12px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          Enter
        </button>
      </form>
    </main>
  );
}
