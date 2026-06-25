import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSecureToken, hashToken, getTokenExpiryDate } from '@/lib/crypto';
import { emailService } from '@/lib/email';

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_WINDOW_MINUTES = 10;

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
  
  const record = rateLimitMap.get(email);
  
  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
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

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(email)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Always return generic response to prevent email enumeration
    const genericResponse = NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Return generic response even if user doesn't exist
      return genericResponse;
    }

    // Generate secure token
    const token = generateSecureToken();
    const tokenHash = await hashToken(token);
    const expiresAt = getTokenExpiryDate();

    // Store token in database
    await (prisma as any).passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Create reset link
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    // Send email
    const emailSent = await emailService.sendPasswordResetEmail(user.email, resetLink);

    if (!emailSent) {
      console.error('Failed to send password reset email to:', user.email);
      // In development, return error for debugging
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(
          { error: 'Failed to send email. Check server logs for details.' },
          { status: 500 }
        );
      }
      // Still return generic response to prevent information leakage
    }

    return genericResponse;
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
