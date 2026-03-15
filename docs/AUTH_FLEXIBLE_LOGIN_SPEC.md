# Flexible Login Specification — Email or Username

**Status**: Proposed  
**Last updated**: 2026-03-15  
**Owner**: Backend team  
**Frontend tracking**: Implemented in `LoginPage.tsx` (commit 3a350aa)

---

## 1. Overview

Users should be able to sign in using either their **email address** or their **username** in a single input field. The backend must intelligently detect which identifier was provided and authenticate accordingly.

**User-facing behavior:**
- Signup requires both email and username (username is now mandatory).
- Login accepts either email or username in the "Email or Username" field.
- No additional UI complexity — one field handles both cases.

---

## 2. Requirements

### 2.1 Functional Requirements

1. The `signIn` mutation must accept either email or username in the same input field.
2. The backend must detect which identifier type was provided and perform the appropriate lookup.
3. Authentication logic remains unchanged — only the user lookup strategy differs.
4. Username must be unique per user (enforced at signup).
5. Usernames must be stored in a normalized, case-insensitive format for reliable matching.

### 2.2 Non-Functional Requirements

1. **Security**: Timing attacks should not reveal whether an email or username exists.
2. **Performance**: Lookup should use indexed fields (email and username both indexed).
3. **UX**: Error messages should not reveal which identifier type was attempted.

---

## 3. GraphQL Schema Change

### Current Schema

```graphql
input SignInInput {
  email: String!
  password: String!
  deviceName: String
}
```

### Proposed Schema (Option A — Rename Field)

```graphql
input SignInInput {
  emailOrUsername: String!
  password: String!
  deviceName: String
}
```

**Rationale**: Most explicit and self-documenting. Field name matches the user-facing label.

### Alternative Schema (Option B — Overload Email Field)

Keep the field name as `email` but document that it accepts either format:

```graphql
input SignInInput {
  email: String!  # Accepts email or username
  password: String!
  deviceName: String
}
```

**Rationale**: No breaking change for existing clients. Less explicit but simpler migration.

**Recommendation**: Use **Option A** for clarity. Frontend is already sending the correct field name.

---

## 4. Detection Logic

The backend should determine the identifier type using this algorithm:

```javascript
function detectIdentifierType(input: string): 'email' | 'username' {
  // Emails must contain '@' and a domain part
  // Usernames cannot contain '@'
  return input.includes('@') ? 'email' : 'username';
}
```

**Validation rules:**
- Email format: Must match standard email regex (validated separately).
- Username format: Alphanumeric + underscores/hyphens, 3-30 characters (defined at signup).

**Edge case**: If a user inputs `"john@"` (invalid email, no domain), it should be treated as an email and fail email validation, not fall through to username lookup.

---

## 5. Lookup Strategy

### Pseudocode

```javascript
async function authenticateUser(emailOrUsername: string, password: string) {
  const identifierType = detectIdentifierType(emailOrUsername);
  
  let user;
  if (identifierType === 'email') {
    const normalizedEmail = emailOrUsername.toLowerCase().trim();
    user = await db.users.findOne({ email: normalizedEmail });
  } else {
    const normalizedUsername = emailOrUsername.toLowerCase().trim();
    user = await db.users.findOne({ username: normalizedUsername });
  }
  
  if (!user) {
    throw new Error('Invalid credentials'); // Generic message for security
  }
  
  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    throw new Error('Invalid credentials');
  }
  
  return user;
}
```

### Database Requirements

Both `email` and `username` fields must be:
- Indexed for fast lookups
- Unique constraints enforced
- Stored in lowercase/normalized form

---

## 6. Validation Rules

### At Signup
- **Email**: Required, must be valid email format, unique, stored lowercase.
- **Username**: Required, must be 3-30 characters, alphanumeric + `_-`, unique, stored lowercase.
- **Password**: Required, minimum 8 characters.

### At Login
- **Email or Username**: Required, non-empty string.
- Detection is automatic based on `@` presence.
- Both lookups are case-insensitive.

---

## 7. Error Handling

### Generic Error Messages (Security Best Practice)

To prevent user enumeration attacks, all authentication failures should return the same generic error:

```json
{
  "errors": [
    {
      "message": "Invalid credentials",
      "extensions": { "code": "UNAUTHENTICATED" }
    }
  ]
}
```

**Never reveal**:
- "Email not found" vs "Password incorrect"
- "Username does not exist"
- Which identifier type was used

### Rate Limiting

Apply the same rate limiting to login attempts regardless of identifier type (e.g., 5 failed attempts per IP per 15 minutes).

---

## 8. Frontend Implementation Reference

The frontend already implements this flow (as of commit 3a350aa):

**LoginPage.tsx**:
```tsx
const [emailOrUsername, setEmailOrUsername] = useState("");
// ...
<TextInput
  label="Email or Username"
  placeholder="you@example.com or username"
  required
  value={emailOrUsername}
  onChange={(e) => setEmailOrUsername(e.currentTarget.value)}
/>
```

**SignupPage.tsx**:
- Username field is now required (not optional).

**Expected GraphQL call**:
```graphql
mutation SignIn($input: SignInInput!) {
  signIn(input: $input) {
    accessToken
    refreshToken
    user { userId email timezone username }
  }
}
```

With variables:
```json
{
  "input": {
    "emailOrUsername": "john@example.com",  // or "john_doe"
    "password": "SecurePass123",
    "deviceName": "iPhone 15 Pro"
  }
}
```

---

## 9. Migration Notes

### Breaking Change Assessment

If the backend implements **Option A** (`emailOrUsername` field):
- This is a **breaking change** for the `SignIn` mutation.
- Existing clients using `email` field will break.
- **Action required**: Deploy frontend and backend simultaneously, or version the API.

If the backend implements **Option B** (overload `email` field):
- This is **backward compatible**.
- Existing clients continue to work.
- New clients can send username to `email` field.

### Recommended Deployment Strategy

1. Deploy backend with new flexible lookup logic.
2. Deploy frontend with updated field name.
3. Update API documentation in `FRONTEND_API_SPEC.md` Section 3.2.

---

## 10. Testing Checklist

- [ ] User can sign up with username and email.
- [ ] User can sign in with email + password.
- [ ] User can sign in with username + password.
- [ ] Invalid email format returns generic error.
- [ ] Invalid username format returns generic error.
- [ ] Wrong password returns generic error (same as invalid email/username).
- [ ] Lookups are case-insensitive (e.g., `JOHN@EXAMPLE.COM` matches `john@example.com`).
- [ ] Rate limiting applies equally to email and username attempts.
- [ ] Timing attack mitigation — both lookup paths take similar time.

---

## 11. Related Documentation

- `docs/FRONTEND_API_SPEC.md` — Section 3.2 (Sign In) will need updating once backend implements this spec.
- `docs/DECISION_LOG.md` — Document final choice between Option A and Option B.

---

## 12. Open Questions

1. **Field name choice**: `emailOrUsername` (Option A) vs overloading `email` (Option B)?
2. **Username constraints**: Are usernames case-sensitive for display but case-insensitive for login?
3. **Migration path**: If Option A is chosen, do we version the API or require simultaneous deployment?

---

## Appendix: Alternative Detection Strategies

### Simple `@` Check (Recommended)
```javascript
input.includes('@') ? 'email' : 'username'
```
- **Pros**: Fast, simple, reliable.
- **Cons**: Assumes usernames never contain `@` (enforced at signup).

### Regex Email Validation
```javascript
/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) ? 'email' : 'username'
```
- **Pros**: More robust email detection.
- **Cons**: Slight performance overhead, still assumes no `@` in usernames.

### Dual Lookup (Not Recommended)
Try email lookup first, fall back to username on failure.
- **Pros**: No detection needed.
- **Cons**: Double database query on every username login (poor performance), potential timing attack vector.

**Decision**: Use simple `@` check with username validation that prohibits `@` characters.
