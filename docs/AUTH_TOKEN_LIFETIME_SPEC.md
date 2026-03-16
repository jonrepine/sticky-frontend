# Auth Token Lifetime Adjustment Specification

**Status**: Proposed  
**Priority**: High  
**Last updated**: 2026-03-15  
**Issue**: Users are logged out too frequently during active study sessions

---

## Problem Statement

Current token lifetimes from `FRONTEND_API_SPEC.md`:
- **Access token**: 15 minutes
- **Refresh token**: 30 days

For a banking app, 15-minute access tokens make sense. For a **learning app where users actively study for 30-60+ minute sessions**, this causes:
- Disruptive logout mid-session
- Loss of flow state during reviews
- Poor user experience during long study blocks

The frontend should handle token refresh automatically via the Apollo error link, but frequent refreshes still create unnecessary network overhead and potential edge case failures.

---

## Recommended Token Lifetimes

### For Learning Apps (Sticky's Use Case)

| Token Type | Current | Proposed | Reasoning |
|------------|---------|----------|-----------|
| Access Token | 15 min | **4-8 hours** | Covers typical study session lengths without interruption |
| Refresh Token | 30 days | **90 days** | Users may take breaks between study sessions; keep them logged in longer |

### Alternative: Session-Based Lifetime

If backend wants more granular control:
- **Active session**: 8 hours (user is actively making requests)
- **Idle timeout**: 24 hours (no requests, but don't force re-login)
- **Absolute maximum**: 90 days (refresh token expiration)

---

## Security Considerations

**Q: Isn't this less secure?**

A: For Sticky's threat model, yes—but acceptably so:

1. **Not a high-value target**: Learning flashcards aren't financial data, PHI, or PII beyond email/username
2. **Device trust**: Most users access from personal devices, not shared kiosks
3. **Mitigation strategies**:
   - Still rotate refresh tokens on use (already implemented)
   - Implement device fingerprinting if paranoid
   - Allow manual "Sign out all sessions" (already exists)
   - Optional: Add "Remember this device" checkbox at login to extend tokens further on trusted devices

**Comparable apps**:
- Anki Web: Stays logged in for weeks
- Quizlet: Stays logged in indefinitely on trusted devices
- Duolingo: Extended sessions, rarely logs out

---

## Implementation

### Backend Changes Required

1. Update JWT access token expiration in auth service:
   ```javascript
   // Before
   expiresIn: '15m'
   
   // After
   expiresIn: '8h'  // or '4h' as conservative middle ground
   ```

2. Update refresh token expiration:
   ```javascript
   // Before
   expiresIn: '30d'
   
   // After
   expiresIn: '90d'
   ```

3. Update `FRONTEND_API_SPEC.md` Section 3.3:
   ```markdown
   - **Access token**: long-lived (4-8 hours). Send on every request as `Authorization: Bearer <token>`.
   - **Refresh token**: very long-lived (90 days). Use to obtain a new token pair when the access token expires.
   ```

### Frontend Changes Required

**None** — the frontend already handles token refresh automatically via the Apollo error link in `src/lib/graphql/client.ts`.

---

## Testing Checklist

- [ ] User can study for 60+ minutes without interruption
- [ ] Access token correctly expires after new lifetime (4-8 hours)
- [ ] Refresh token correctly expires after 90 days
- [ ] Token refresh flow still works (frontend Apollo error link)
- [ ] "Sign out all sessions" still revokes all tokens

---

## Rollback Plan

If security concerns arise:
1. Revert to 1-hour access tokens (middle ground between 15min and 8h)
2. Keep refresh tokens at 90 days
3. Monitor abuse patterns in logs

---

## User Communication

**Before deployment:**
"You'll stay signed in longer now — no more mid-study logouts!"

**After deployment:**
No announcement needed. Users will simply notice fewer disruptions.

---

## Related Issues

- User feedback: "it locks me out VERY often"
- Use case: Learning apps should prioritize flow state over paranoid security
- Comparable apps: Anki, Quizlet, Duolingo all use extended sessions

---

## Decision

**Recommendation**: Implement 8-hour access tokens and 90-day refresh tokens.

If backend team is conservative, start with 4-hour access tokens as a compromise.
