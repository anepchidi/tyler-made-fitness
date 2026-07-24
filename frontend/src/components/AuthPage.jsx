import { useState } from 'react';
import { API } from '../api/client';

export default function AuthPage({ onLogin }) {
  const [authMode, setAuthMode] = useState("login");
  const [credentials, setCredentials] = useState({ username: "", password: "", email: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const endpoint = authMode === "login" ? "token" : "register";
    const body = authMode === "login"
      ? new URLSearchParams({ username: credentials.username, password: credentials.password })
      : JSON.stringify(credentials);
    const headers = authMode === "login"
      ? { "Content-Type": "application/x-www-form-urlencoded" }
      : { "Content-Type": "application/json" };

    try {
      const res = await fetch(`${API}/${endpoint}`, { method: "POST", headers, body });
      const data = await res.json();
      if (res.ok) {
        if (authMode === "login") {
          onLogin(data.access_token, data.user_id, data.username);
        } else {
          setAuthMode("login");
          setError("Account created! Please log in.");
        }
      } else {
        setError(data.detail || "Authentication failed");
      }
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const s = {
    page: { width:"100vw", height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0a0a0a" },
    card: { background:"white", padding:"40px", borderRadius:"16px", width:"360px", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" },
    title: { textAlign:"center", marginBottom:"30px", fontSize:"24px", color:"#111", fontWeight:"800" },
    input: { width:"100%", padding:"12px 14px", marginBottom:"14px", border:"1px solid #ddd", borderRadius:"8px", fontSize:"15px", boxSizing:"border-box", outline:"none" },
    btn: { width:"100%", padding:"14px", background: loading ? "#aaa" : "#007bff", color:"white", border:"none", borderRadius:"8px", cursor: loading ? "not-allowed" : "pointer", fontSize:"16px", fontWeight:"bold" },
    error: { textAlign:"center", fontSize:"14px", marginBottom:"14px", padding:"10px", borderRadius:"8px", background:"#fff0f0", color:"#cc0000" },
    success: { textAlign:"center", fontSize:"14px", marginBottom:"14px", padding:"10px", borderRadius:"8px", background:"#f0fff4", color:"#007700" },
    toggle: { textAlign:"center", color:"#007bff", cursor:"pointer", marginTop:"18px", fontSize:"14px" },
  };

  const isSuccess = error.startsWith("Account created");

  return (
    <div style={s.page}>
      <form onSubmit={handleAuth} style={s.card}>
        <h2 style={s.title}>
          {authMode === "login" ? "Welcome Back" : "Join "}
          {authMode !== "login" && <span style={{color:"#007bff"}}>TylerMade</span>}
        </h2>
        {error && <div style={isSuccess ? s.success : s.error}>{error}</div>}
        <input style={s.input} type="text" placeholder="Username" required
          onChange={e => setCredentials({ ...credentials, username: e.target.value })} />
        {authMode === "signup" && (
          <input style={s.input} type="email" placeholder="Email" required
            onChange={e => setCredentials({ ...credentials, email: e.target.value })} />
        )}
        <input style={s.input} type="password" placeholder="Password" required
          onChange={e => setCredentials({ ...credentials, password: e.target.value })} />
        <button type="submit" style={s.btn} disabled={loading}>
          {loading ? "Please wait..." : authMode === "login" ? "Login" : "Sign Up"}
        </button>
        <p style={s.toggle} onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setError(""); }}>
          {authMode === "login" ? "Need an account? Sign up" : "Already have an account? Login"}
        </p>
      </form>
    </div>
  );
}