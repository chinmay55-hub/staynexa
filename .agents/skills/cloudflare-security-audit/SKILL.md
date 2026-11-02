---
name: cloudflare-security-audit
description: >-
  Comprehensive security audit runbook and verification tool for Cloudflare-protected web applications,
  APIs, and SaaS platforms. Covers WAF, SSL/TLS, DDoS, DNSSEC, Zone Lockdown, Rate Limiting, HTTP
  Security Headers, Bot Management, and Origin IP Cloaking.
---

# Cloudflare Security Audit & Hardening Skill

This skill provides an end-to-end, multi-layer security auditing procedure for web applications, SaaS platforms, and APIs protected behind Cloudflare. Use this skill when evaluating an existing deployment, auditing release readiness, hardening edge protections, or remediating web security vulnerabilities.

---

## 1. Cloudflare Security Audit Pillars

Every security audit must inspect and score the following 8 core domains:

```
┌────────────────────────────────────────────────────────┐
│             CLOUDFLARE SECURITY AUDIT PILLARS          │
├────────────────────────────────────────────────────────┤
│ 1. DNS & Zone Protection       │ 5. Bot Management     │
│ 2. SSL/TLS & Cryptography      │ 6. Access Control     │
│ 3. Web Application Firewall    │ 7. HTTP Security      │
│ 4. Rate Limiting & DDoS        │ 8. Origin Cloaking    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Comprehensive Audit Checklist

### Domain 1: DNS & Zone Configuration
- [ ] **Proxy Status (Orange Cloud)**: All public web endpoints (apex, `www`, API, portals) must have proxy status enabled (`Proxied` / Orange Cloud). Only un-proxied records (e.g. mail servers, SSH) should be DNS-only (`Grey Cloud`).
- [ ] **DNSSEC (Domain Name System Security Extensions)**: Enabled on the domain with cryptographic DS records published at the registrar to prevent DNS spoofing and cache poisoning.
- [ ] **CNAME Flattening**: Apex domain (`@`) should use CNAME flattening.
- [ ] **Unused Record Removal**: Clean up dangling DNS records pointing to retired AWS/Vercel/Heroku/Supabase instances to prevent Subdomain Takeover.

### Domain 2: SSL/TLS & Edge Cryptography
- [ ] **Encryption Mode**: Must be set to **Full (Strict)**.
  > [!CAUTION]
  > NEVER use **Flexible** mode. Flexible mode decrypts traffic at the Cloudflare edge and forwards plaintext HTTP to the origin, exposing traffic to interception and violating compliance standards.
- [ ] **Minimum TLS Version**: Enforce **TLS 1.2** or **TLS 1.3** as the floor. Reject TLS 1.0 and TLS 1.1 connections.
- [ ] **TLS 1.3 Zero-RTT (0-RTT)**: Disable 0-RTT on endpoints handling state-changing requests (POST, PUT, DELETE) to protect against replay attacks.
- [ ] **HTTP Strict Transport Security (HSTS)**:
  - Enabled with minimum `max-age=31536000` (1 year).
  - `includeSubDomains: true`.
  - `preload: true` (after confirming all subdomains support HTTPS).
- [ ] **Authenticated Origin Pulls (AOP)**: Enable Cloudflare client certificates on origin server to reject requests that do not come through the Cloudflare proxy.

### Domain 3: Web Application Firewall (WAF)
- [ ] **Cloudflare Managed Ruleset**: Enabled with sensitivity set to High or Medium.
- [ ] **OWASP Core Ruleset**: Enabled with anomaly threshold tuned:
  - Paranoia Level: Level 2 recommended for SaaS applications.
  - Score Threshold: Low/Medium for strict protection without false positives.
- [ ] **Custom WAF Rules**:
  - Block requests from known malicious ASNs / anonymizing VPNs attempting credential brute-forcing.
  - Geolocation restriction if service is region-specific.
  - Protect Admin & Secret paths (`/super-admin*`, `/api/admin*`, `/.env*`, `/actuator*`).

### Domain 4: Rate Limiting & DDoS Mitigation
- [ ] **HTTP DDoS Attack Mitigation**: Set to High sensitivity.
- [ ] **Login & Authentication Rate Limit**:
  - Limit: Max 5 POST requests per minute per IP to `/api/auth/login`, `/auth/v1/token`.
  - Action: Managed Challenge or Block for 15 minutes.
- [ ] **Sensitive Endpoint Rate Limit (e.g., QR Token Resolution)**:
  - Limit: Max 30 requests per minute per IP to token resolution APIs.
  - Action: Interactive Challenge (Turnstile).
- [ ] **API Abuse Protection**: Enforce burst limiting for unauthenticated public APIs (max 60 requests per minute per IP).

### Domain 5: Bot Management & Turnstile
- [ ] **Bot Fight Mode / Super Bot Fight Mode**:
  - Definitely Automated: Block or Managed Challenge.
  - Likely Automated: Managed Challenge.
  - Verified Bots: Allow (permits Googlebot, Bingbot, uptime monitors).
- [ ] **Cloudflare Turnstile**: Replace legacy CAPTCHAs with privacy-preserving Turnstile on login, signup, order placement, and contact forms.
- [ ] **Scrape Shield**: Enable email address obfuscation, server-side excludes, and hotlink protection.

### Domain 6: Access Control & Zone Lockdown
- [ ] **Zone Lockdown**: Restrict administrative consoles (e.g. `/super-admin*`) to specified corporate static IP ranges.
- [ ] **Cloudflare Zero Trust (Access)**: Wrap internal dashboards and development/staging environments behind identity-aware zero-trust authentication (Google Workspace, Okta, Azure AD).

### Domain 7: HTTP Security Headers & Transform Rules
Ensure edge response transform rules inject the following modern security headers:
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: SAMEORIGIN` (or `DENY`)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- [ ] `Content-Security-Policy`: Disallow untrusted inline scripts and lock script sources to trusted origins.

### Domain 8: Origin IP Cloaking & Firewall Lockdown
- [ ] **Origin Cloaking**: Ensure the true origin IP address (Vercel, AWS EC2, GCP, Supabase) is never published in DNS history or leaked via outgoing emails/webhooks.
- [ ] **Origin Firewall (Security Groups / iptables)**: Configure origin firewall to ONLY allow inbound HTTP/HTTPS traffic from Cloudflare's published IP ranges:
  - IPv4: https://www.cloudflare.com/ips-v4
  - IPv6: https://www.cloudflare.com/ips-v6
  - Reject all direct connections from arbitrary public IP addresses.

---

## 3. Automated Verification Runbook (CLI Scripts)

Use the following commands to verify a domain's Cloudflare security posture from your terminal:

### 1. Test Proxy & SSL/TLS Configuration
```bash
# Verify headers, Cloudflare edge serving, and HSTS
curl -Iv https://example.com 2>&1 | grep -iE "(cf-ray|server|strict-transport|x-content-type|x-frame|content-security)"

# Verify TLS version (TLS 1.2 and 1.3 should succeed, TLS 1.0 and 1.1 must fail)
curl -v --tls-max 1.1 https://example.com 2>&1 | grep -i "handshake failure\|error"
```

### 2. Verify DNSSEC Status
```bash
# Verify DNSSEC AD (Authenticated Data) flag and RRSIG records
dig +dnssec example.com
```

### 3. Verify Direct Origin Access is Blocked
```bash
# Test direct access to origin IP (should return 403 or drop connection)
curl -k -H "Host: example.com" https://<ORIGIN_IP>
```

---

## 4. Audit Scoring & Report Generation

When reporting findings, group items by severity:
- **CRITICAL**: Flexible SSL mode, origin IP exposed with open port 80/443, DNSSEC missing on financial/auth domains.
- **HIGH**: No rate limiting on authentication routes, TLS 1.0/1.1 enabled, missing HSTS header.
- **MEDIUM**: Bot fight mode disabled, missing security headers (`X-Frame-Options`, `X-Content-Type-Options`), overly permissive CORS headers.
- **LOW**: Sub-optimal cache TTL for static assets, lack of Cloudflare Turnstile on low-risk forms.
