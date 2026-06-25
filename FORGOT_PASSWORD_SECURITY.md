# Forgot Password System - Security Documentation

## Overview
This document explains the security measures implemented in the Training Management System's forgot password functionality.

## Security Features Implemented

### 1. Email Enumeration Prevention
**Location**: `src/app/api/auth/forgot-password/route.ts`

The system prevents email enumeration attacks by always returning a generic response, regardless of whether the email exists in the database.

```typescript
// Always return generic response to prevent email enumeration
const genericResponse = NextResponse.json({
  message: 'If an account with that email exists, a password reset link has been sent.',
});
```

**Why this matters**: Attackers cannot determine which email addresses are registered in the system by testing different addresses.

### 2. Secure Token Generation
**Location**: `src/lib/crypto.ts`

Password reset tokens are generated using cryptographically secure random bytes:

```typescript
export function generateSecureToken(): string {
  return crypto.randomBytes(RESET_TOKEN_LENGTH).toString('hex');
}
```

- Uses Node.js `crypto.randomBytes()` for cryptographically secure random generation
- 32 bytes (256 bits) of entropy converted to hexadecimal
- Equivalent to 64-character hex string

**Why this matters**: Tokens cannot be predicted or guessed by attackers.

### 3. Token Hashing
**Location**: `src/lib/crypto.ts`

Tokens are hashed before storage in the database using SHA-256:

```typescript
export async function hashToken(token: string): Promise<string> {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

**Why this matters**: 
- If the database is compromised, attackers cannot use the stored hashes to reset passwords
- Plain tokens are never stored in the database
- Tokens are only transmitted via email (which should be secure)

### 4. Timing-Safe Token Verification
**Location**: `src/lib/crypto.ts`

Token verification uses timing-safe comparison to prevent timing attacks:

```typescript
export async function verifyTokenHash(token: string, hash: string): Promise<boolean> {
  const tokenHash = await hashToken(token);
  return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
}
```

**Why this matters**: Attackers cannot use timing analysis to determine valid tokens.

### 5. Token Expiration
**Location**: `src/lib/crypto.ts`

Tokens have a strict expiration time (15 minutes by default):

```typescript
export function getTokenExpiryDate(): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES);
  return now;
}

export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
```

**Why this matters**: 
- Reduces the window of opportunity for token abuse
- Tokens cannot be used indefinitely
- Configurable via environment variable

### 6. Single-Use Tokens
**Location**: `src/app/api/auth/reset-password/route.ts`

Tokens are marked as used after successful password reset:

```typescript
// Mark token as used
await prisma.passwordResetToken.update({
  where: { id: resetToken.id },
  data: { used: true },
});

// Clean up any other unused tokens for this user
await prisma.passwordResetToken.deleteMany({
  where: {
    userId: resetToken.userId,
    used: false,
    id: { not: resetToken.id },
  },
});
```

**Why this matters**:
- Each token can only be used once
- Prevents token reuse attacks
- Automatically cleans up old tokens

### 7. Rate Limiting
**Location**: `src/app/api/auth/forgot-password/route.ts`

In-memory rate limiting prevents abuse:

```typescript
const RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_WINDOW_MINUTES = 10;

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
  
  const record = rateLimitMap.get(email);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(email, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}
```

**Why this matters**:
- Prevents email flooding attacks
- Limits the number of password reset requests per email
- Configurable via environment variables

**Note**: For production deployment, consider using Redis or a similar distributed cache for rate limiting instead of in-memory storage.

### 8. Password Validation
**Location**: `src/app/api/auth/reset-password/route.ts`

New passwords must meet minimum security requirements:

```typescript
if (password.length < 8) {
  return NextResponse.json(
    { error: 'Password must be at least 8 characters long' },
    { status: 400 }
  );
}
```

**Why this matters**: Ensures users set strong passwords during reset.

### 9. Secure Password Hashing
**Location**: `src/lib/auth.ts`

Passwords are hashed using bcrypt with a cost factor of 12:

```typescript
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
```

**Why this matters**:
- Bcrypt is specifically designed for password hashing
- Cost factor of 12 provides good security vs performance balance
- Automatically handles salt generation

### 10. Generic Error Messages
**Location**: Throughout the API endpoints

Error messages are generic to prevent information leakage:

```typescript
// Instead of "User not found" or "Email invalid"
return NextResponse.json({
  message: 'If an account with that email exists, a password reset link has been sent.',
});
```

**Why this matters**: Prevents attackers from gaining information about the system through error messages.

## Database Schema Security

### PasswordResetToken Model
**Location**: `prisma/schema.prisma`

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([tokenHash])
}
```

**Security features**:
- `tokenHash` stores only the SHA-256 hash, never the plain token
- `used` flag ensures single-use enforcement
- `expiresAt` enforces token expiration
- Cascade delete ensures tokens are removed when user is deleted
- Indexes on `userId` and `tokenHash` for efficient lookups

## Email Security

### Email Service
**Location**: `src/lib/email.ts`

- Uses SMTP with TLS for secure email transmission
- Configured for Outlook SMTP with proper authentication
- HTML email templates with proper styling
- Includes both HTML and plain text versions

**Security considerations**:
- SMTP credentials are stored in environment variables
- Email content is properly escaped to prevent XSS
- Reset links are clearly displayed with expiration notice

## Recommendations for Production

### 1. Use Distributed Rate Limiting
Replace in-memory rate limiting with Redis or similar:
```typescript
// Example with Redis
const rateLimitKey = `reset_password:${email}`;
const currentCount = await redis.get(rateLimitKey);
if (currentCount >= RATE_LIMIT_MAX_REQUESTS) {
  return false;
}
```

### 2. Add Logging
Implement comprehensive security logging:
- Log all password reset requests (without sensitive data)
- Log successful password resets
- Log rate limit violations
- Monitor for suspicious patterns

### 3. Add CAPTCHA
Consider adding CAPTCHA for the forgot password form to prevent automated attacks.

### 4. Implement IP-Based Rate Limiting
Add IP-based rate limiting in addition to email-based limiting:
```typescript
function checkRateLimit(email: string, ip: string): boolean {
  // Check both email and IP limits
  return checkEmailRateLimit(email) && checkIPRateLimit(ip);
}
```

### 5. Add Email Verification
Consider requiring email verification before allowing password reset for new accounts.

### 6. Monitor Token Usage
Track metrics on:
- Token generation rate
- Token usage rate
- Failed token attempts
- Time between token generation and usage

### 7. Secure SMTP Configuration
Ensure SMTP credentials are properly secured:
- Use app-specific passwords when possible
- Enable 2FA on the email account
- Regularly rotate SMTP credentials
- Use environment-specific credentials

## Testing Security

### Security Test Cases

1. **Email Enumeration Test**
   - Request password reset for non-existent email
   - Verify response is identical to existing email

2. **Token Expiration Test**
   - Generate token and wait past expiration
   - Verify token is rejected

3. **Token Reuse Test**
   - Use token successfully
   - Attempt to use same token again
   - Verify second attempt fails

4. **Rate Limiting Test**
   - Send multiple requests rapidly
   - Verify rate limit is enforced

5. **Token Strength Test**
   - Verify tokens are cryptographically random
   - Verify tokens are not predictable

6. **Password Validation Test**
   - Attempt to set weak password
   - Verify validation fails

## Configuration

All security parameters are configurable via environment variables:

```env
# Token expiration (default: 15 minutes)
RESET_TOKEN_EXPIRY_MINUTES=15

# Rate limiting (default: 3 requests per 10 minutes)
RATE_LIMIT_MAX_REQUESTS=3
RATE_LIMIT_WINDOW_MINUTES=10

# Email configuration
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=tfsoperation@transformsolution.net
SMTP_PASS=your_password_here
SMTP_FROM_NAME=Transform Solution
```

## Conclusion

The forgot password system implements multiple layers of security to protect against common attacks while maintaining usability. The combination of secure token generation, hashing, expiration, rate limiting, and generic error messages provides a robust defense against password reset abuse.