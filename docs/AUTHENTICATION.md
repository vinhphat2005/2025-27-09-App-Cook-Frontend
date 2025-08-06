# Authentication System

This document describes the authentication system implemented for the App-cook application.

## Overview

The authentication system provides:
- Protected routes for authenticated users
- Automatic redirects for unauthenticated users
- Loading states during authentication checks
- Persistent authentication state using AsyncStorage

## Components

### AuthGuard Component

The `AuthGuard` component is a wrapper that protects routes requiring authentication.

```tsx
import { AuthGuard } from "@/components/AuthGuard";

// Wrap any component that requires authentication
<AuthGuard>
  <YourProtectedComponent />
</AuthGuard>
```

**Features:**
- Automatically redirects to `/login` if user is not authenticated
- Shows loading indicator while checking authentication state
- Handles authentication state hydration

### useAuth Hook

The `useAuth` hook provides authentication utilities and state management.

```tsx
import { useAuth } from "@/hooks/useAuth";

function MyComponent() {
  const { 
    isAuthenticated, 
    token, 
    user, 
    login, 
    logout, 
    requireAuth, 
    redirectIfAuthenticated 
  } = useAuth();

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Text>Please log in</Text>;
  }

  // Programmatic authentication check
  const handleProtectedAction = () => {
    if (requireAuth()) {
      // User is authenticated, proceed with action
      performAction();
    }
    // If not authenticated, user will be redirected to login
  };

  return <Text>Welcome, {user?.email}!</Text>;
}
```

## Protected Routes

### (tabs) Layout
The tab navigation is protected using `AuthGuard`:

```tsx
// app/(tabs)/_layout.tsx
export default function TabLayout() {
  return (
    <AuthGuard>
      <Tabs>
        {/* Tab screens */}
      </Tabs>
    </AuthGuard>
  );
}
```

### Detail Page
The detail page is also protected:

```tsx
// app/detail.tsx
export default function DetailScreen() {
  return (
    <AuthGuard>
      <ParallaxScrollView>
        {/* Detail content */}
      </ParallaxScrollView>
    </AuthGuard>
  );
}
```

## Authentication Store

The authentication state is managed using Zustand with persistence:

```tsx
// store/authStore.ts
interface AuthState {
  token: string | null;
  user: any | null;
  isAuthenticated: boolean;
  login: (token: string, user: any) => void;
  logout: () => void;
}
```

## Usage Examples

### Login Flow
```tsx
const { login } = useAuth();

const handleLogin = async (credentials) => {
  try {
    // Call your API
    const response = await api.login(credentials);
    
    // Store authentication data
    login(response.token, response.user);
    
    // Navigate to protected area
    router.replace("/(tabs)");
  } catch (error) {
    console.error("Login failed:", error);
  }
};
```

### Logout Flow
```tsx
const { logout } = useAuth();

const handleLogout = () => {
  logout();
  router.replace("/login");
};
```

### Conditional Rendering
```tsx
const { isAuthenticated } = useAuth();

return (
  <View>
    {isAuthenticated ? (
      <Text>Welcome back!</Text>
    ) : (
      <Button title="Login" onPress={() => router.push("/login")} />
    )}
  </View>
);
```

## Best Practices

1. **Always use AuthGuard for protected routes** - Don't manually check authentication in components
2. **Use the useAuth hook** - Provides consistent authentication state and utilities
3. **Handle loading states** - The AuthGuard component handles this automatically
4. **Persist authentication** - The store automatically persists to AsyncStorage
5. **Clear authentication on logout** - Always call `logout()` to clear stored data

## Security Considerations

- Tokens are stored in AsyncStorage (consider using SecureStore for production)
- Authentication state is client-side only
- Implement proper token refresh mechanisms for production
- Add server-side validation for all protected endpoints
- Consider implementing biometric authentication for enhanced security 