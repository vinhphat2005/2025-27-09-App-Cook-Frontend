# OTP Email Verification System

## Tổng quan

Hệ thống OTP Email Verification cung cấp một giải pháp thay thế cho Firebase link verification bằng cách gửi mã OTP 6 số thực sự qua email.

## Tính năng

### ✅ **Đã có**:
1. **Gửi OTP 6 số qua email** - thay vì link verification
2. **Validation email nâng cao** - kiểm tra email thật, domain hợp lệ, chặn disposable email
3. **Rate limiting** - cooldown 60 giây giữa các lần gửi
4. **Security features**:
   - Tối đa 3 lần thử sai OTP
   - OTP hết hạn sau 10 phút
   - Tự động clean up expired OTP
5. **UI/UX hoàn chỉnh**:
   - Input 6 ô riêng biệt cho OTP
   - Auto-focus và auto-verify
   - Countdown timer cho resend
   - Clear error messages

### 🔄 **Flow hoạt động**:

#### Đăng ký (Registration):
1. User nhập email + password
2. System validate email (format, domain, disposable check)
3. System check email đã tồn tại chưa
4. Gửi OTP 6 số qua email
5. User nhập OTP
6. Verify OTP thành công → Tạo Firebase account
7. Đăng nhập tự động

#### Đăng nhập (Login):
1. User nhập email
2. System gửi OTP 6 số qua email
3. User nhập OTP
4. Verify OTP thành công → Redirect đến password login
   (Note: Cần custom authentication để login hoàn toàn passwordless)

## Files và Structure

```
lib/
├── otpEmailService.ts          # Core OTP service
├── emailVerification.ts       # Firebase link verification (existing)
└── config.ts                  # Environment configuration

app/
├── otp-register.tsx           # OTP registration flow
├── otp-login.tsx              # OTP login flow
├── register.tsx               # Standard registration (updated)
└── login.tsx                  # Standard login (updated)

docs/
└── OTP_EMAIL_VERIFICATION.md  # This documentation
```

## Configuration

### Environment Variables (.env)
```env
# Required for email sending (when using real email service)
EXPO_PUBLIC_EMAIL_SERVICE_API_KEY=your_sendgrid_api_key
EXPO_PUBLIC_EMAIL_SERVICE_FROM=noreply@yourapp.com
```

### Mock vs Real Implementation

#### Current Implementation (Mock):
- **Email sending**: Console log only (for testing)
- **Storage**: In-memory Map (lost when app restarts)
- **Success rate**: 95% simulated

#### Production Implementation Requirements:
- **Email service**: SendGrid, Mailgun, or AWS SES
- **Storage**: Redis or Database for OTP storage
- **Real email validation**: Email validation API
- **Monitoring**: Track success rates, failed attempts

## Security Features

### 🔒 **Email Validation**:
```typescript
// Format validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Disposable email blocking
const disposableDomains = [
  '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
  'mailinator.com', 'yopmail.com'
];

// Common typo detection
const domainCorrections = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com'
};
```

### 🔒 **OTP Security**:
- **6-digit numeric**: Balance between security và usability
- **10-minute expiry**: Reasonable time window
- **3 attempts max**: Prevent brute force
- **Rate limiting**: 60-second cooldown
- **Auto cleanup**: Expired OTP tự động xóa

### 🔒 **Storage Security**:
```typescript
interface OTPData {
  otp: string;           // 6-digit code
  email: string;         // User email
  purpose: 'register' | 'login';
  expiresAt: number;     // Timestamp
  attempts: number;      // Failed attempts
  maxAttempts: number;   // Max allowed (3)
}
```

## API Interface

### Core Methods:
```typescript
interface OTPEmailService {
  sendOTPEmail(email: string, purpose: 'register' | 'login'): Promise<OTPResponse>;
  verifyOTP(email: string, otp: string, otpId: string): Promise<VerifyOTPResponse>;
  resendOTP(email: string, otpId: string): Promise<OTPResponse>;
  validateEmailReal(email: string): Promise<ValidationResult>;
}
```

### Response Types:
```typescript
interface OTPResponse {
  success: boolean;
  message: string;
  otpId?: string;      // Unique identifier for this OTP session
}

interface VerifyOTPResponse {
  success: boolean;
  message: string;
  user?: any;          // User data if verification successful
}
```

## Usage Examples

### Basic OTP Registration:
```typescript
// Send OTP
const result = await otpEmailService.sendOTPEmail('user@example.com', 'register');
if (result.success) {
  const otpId = result.otpId;
  // Show OTP input screen
}

// Verify OTP
const verifyResult = await otpEmailService.verifyOTP('user@example.com', '123456', otpId);
if (verifyResult.success) {
  // Create Firebase account
  // Auto login
}
```

### Email Validation:
```typescript
const validation = await otpEmailService.validateEmailReal('user@gmai.com');
if (!validation.valid) {
  // Show error: "Có phải bạn muốn dùng user@gmail.com?"
}
```

## Integration với Firebase

### Current Integration:
1. **OTP verification** → Create Firebase account
2. **Firebase account** → Standard authentication flow
3. **Maintained compatibility** với existing Firebase features

### Custom Token Option (Advanced):
```typescript
// For passwordless login, use Firebase Admin SDK to create custom token
const customToken = await admin.auth().createCustomToken(uid);
// Send token back to client for signInWithCustomToken
```

## Testing

### Development Testing:
```bash
# Start app
npx expo start

# Test OTP flow:
1. Go to /otp-register
2. Enter email
3. Check console for OTP code
4. Enter OTP in app
5. Verify Firebase account creation
```

### Production Testing Checklist:
- [ ] Real email delivery
- [ ] OTP expiry handling
- [ ] Rate limiting enforcement
- [ ] Failed attempt blocking
- [ ] Email validation accuracy
- [ ] Disposable email blocking
- [ ] Firebase integration
- [ ] Error handling
- [ ] Performance under load

## Production Deployment

### Required Changes for Production:

#### 1. **Real Email Service**:
```typescript
// Replace MockOTPBackend with real email service
class ProductionEmailService {
  async sendEmail(email: string, otp: string) {
    // Use SendGrid/Mailgun/SES
    const response = await sendGrid.send({
      to: email,
      from: 'noreply@yourapp.com',
      subject: 'Your OTP Code',
      html: `Your verification code is: <strong>${otp}</strong>`
    });
    return response.success;
  }
}
```

#### 2. **Persistent Storage**:
```typescript
// Replace in-memory Map with Redis/Database
class RedisOTPStorage {
  async storeOTP(otpId: string, data: OTPData) {
    await redis.setex(otpId, 600, JSON.stringify(data)); // 10 min expiry
  }
  
  async getOTP(otpId: string): Promise<OTPData | null> {
    const data = await redis.get(otpId);
    return data ? JSON.parse(data) : null;
  }
}
```

#### 3. **Environment Variables**:
```env
# Production .env
EXPO_PUBLIC_SENDGRID_API_KEY=SG.xxx
EXPO_PUBLIC_EMAIL_FROM=noreply@yourapp.com
EXPO_PUBLIC_REDIS_URL=redis://localhost:6379
```

## Monitoring và Analytics

### Metrics to Track:
- OTP delivery rate
- OTP verification success rate
- Failed attempts per email
- Average time to verify
- Most common email domains
- Blocked disposable emails

### Error Monitoring:
- Email delivery failures
- OTP verification failures
- Rate limiting triggers
- Invalid email attempts

## Best Practices

### 🎯 **Security**:
1. Always validate email before sending OTP
2. Implement proper rate limiting
3. Log security events
4. Monitor for suspicious patterns
5. Use HTTPS for all API calls

### 🎯 **User Experience**:
1. Clear error messages
2. Visual feedback for loading states
3. Auto-focus input fields
4. Show remaining attempts
5. Easy resend option

### 🎯 **Performance**:
1. Async email sending
2. Efficient OTP storage
3. Proper cleanup of expired data
4. Connection pooling for email service
5. Caching for email validation

## Troubleshooting

### Common Issues:

#### OTP không được gửi:
- Check email service configuration
- Verify email address format
- Check rate limiting
- Verify network connectivity

#### OTP verification thất bại:
- Check OTP expiry
- Verify attempts count
- Check input validation
- Verify otpId matching

#### Email validation lỗi:
- Check internet connectivity
- Verify email format
- Check disposable domain list
- Review validation logic

### Debug Commands:
```typescript
// Enable debug logging
console.log('OTP Debug:', {
  email: userEmail,
  otpId: otpId,
  attempts: otpAttempts,
  expiresAt: new Date(expiresAt),
  remainingTime: formatTimeRemaining(expiresAt)
});
```

## Migration từ Firebase Link

### Để chuyển từ Firebase link sang OTP:
1. **Gradual rollout**: Cho user chọn giữa link và OTP
2. **Feature flag**: Enable OTP cho một phần user
3. **Fallback**: Giữ Firebase link như backup
4. **Data migration**: Migrate existing users
5. **Monitor**: Track adoption và success rates

### Configuration Toggle:
```typescript
const USE_OTP_VERIFICATION = AppConfig.features.useOTPVerification || false;

if (USE_OTP_VERIFICATION) {
  // Use OTP flow
  router.push('/otp-register');
} else {
  // Use Firebase link flow
  await emailVerificationService.sendVerificationEmail(user);
}
```

## Conclusion

Hệ thống OTP Email Verification cung cấp một alternative robust cho Firebase link verification với những lợi ích:

- ✅ **User-friendly**: OTP 6 số dễ nhập hơn
- ✅ **Secure**: Proper validation và rate limiting
- ✅ **Flexible**: Có thể customize email templates
- ✅ **Mobile-optimized**: Tối ưu cho mobile input
- ✅ **Production-ready**: Architecture scale được

Việc triển khai production chỉ cần thay mock email service bằng real service và persistent storage.