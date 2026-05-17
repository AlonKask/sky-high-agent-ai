## Security hardening — round 2

The earlier RLS migration already partially landed. The latest scan surfaced additional findings across the database, edge functions, and frontend. Here is the full remaining plan.

### 1. Database — RLS cleanup (single migration)

Drop residual permissive policies and tighten others:

- `user_sessions`: drop `"Users can manage their own sessions"` (role `public`, FOR ALL — bypasses the bulletproof policy).
- `security_events`: drop `"System security event insertion"` and `"System security event logging"` (duplicate public INSERTs).
- `critical_audit_trail`: drop `"Immutable audit trail"` (role `public`, FOR ALL).
- `access_rate_limits`: drop `"System can manage rate limits"` (FOR ALL to authenticated, USING true). Replace with service-role-only management.
- `blocked_ips`: drop `"System can manage blocked IPs"` (uses `current_setting('role')` — bypassable). Replace with `TO service_role`.
- `data_access_audit`, `sensitive_data_access`, `csp_violations`: drop public INSERT-true policies, replace with `TO service_role WITH CHECK (true)`.
- Verify the `BULLETPROOF_*` policies remain in place for authenticated user reads.

### 2. Edge functions — add auth + sanitization

- `create-notification`: require valid JWT; force `user_id = auth.uid()` unless service-role.
- `create-booking`: require valid JWT; verify the caller owns the referenced quote before inserting.
- `advanced-email-analysis` and `process-selected-emails`: require JWT; scope queries to `user_id = auth.uid()`.
- `ai-lead-analysis` and `analyze-emails-for-clients`: require JWT + per-user rate-limit via the shared limiter; cap input payload sizes.
- `gmail-oauth`:
  - Add `escapeHtml()` helper and apply to `error`, `storageError.message`, `userInfo.email`, etc. (lines 385, 733, 738, 1023).
  - Replace `postMessage(..., '*')` with the validated app origin (resolve from an allowlist via the `Origin` header / state param).

### 3. Frontend — XSS

- `src/components/UnifiedEmailBuilder.tsx` (line 824): sanitize `previewContent` with `DOMPurify.sanitize()` everywhere it is set (initial render, `handleContentEdit`, `handleBlur`). DOMPurify is already a dependency.

### 4. Realtime channel authorization

Add RLS on `realtime.messages` to scope `agent_client_chat` subscriptions to the owning user. Because the `realtime` schema is Supabase-reserved, this needs to be applied with caution — I'll add policies that allow `SELECT` on `realtime.messages` only when the topic's `review_id`/`client_id` belongs to the authenticated user.

### 5. Manual / dashboard-only actions (cannot be done from code)

- **Postgres upgrade** — one-click upgrade in Supabase dashboard → Settings → Infrastructure.
- **Leaked-password protection** — enable in Supabase dashboard → Authentication → Policies.
- **SECURITY DEFINER function audit** — Supabase linter flagged functions executable by anon/authenticated. I'll list them after the migration runs and revoke EXECUTE where not needed.

### Order of work

1. Run the RLS cleanup migration (requires your approval).
2. Patch the 6 edge functions (auth, sanitization, postMessage origin).
3. Patch `UnifiedEmailBuilder.tsx` (DOMPurify).
4. Add realtime channel policies.
5. List remaining SECURITY DEFINER functions and revoke EXECUTE from anon/authenticated where appropriate.
6. Re-run the security scan to confirm everything is green except the two dashboard-only items.
