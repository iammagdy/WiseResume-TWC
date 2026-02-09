import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
 import { Mail, Lock, Loader2, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
 import { InputFormField } from '@/components/ui/form-field';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/safeClient';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
   const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
     email: false,
     password: false,
   });
 
   // Validation errors
   const getEmailError = (): string | undefined => {
     if (!email) return 'Email is required';
     try {
       emailSchema.parse(email);
       return undefined;
     } catch (e) {
       if (e instanceof z.ZodError) {
         return e.errors[0]?.message;
       }
       return 'Invalid email';
     }
   };
 
   const getPasswordError = (): string | undefined => {
     if (!password) return 'Password is required';
     try {
       passwordSchema.parse(password);
       return undefined;
     } catch (e) {
       if (e instanceof z.ZodError) {
         return e.errors[0]?.message;
       }
       return 'Invalid password';
     }
   };
 
    const emailError = getEmailError();
    const passwordError = getPasswordError();

  // Check auth state on mount and redirect if authenticated
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          navigate('/dashboard', { replace: true });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

   const validateInputs = (): boolean => {
     setTouched({ email: true, password: true });
     return !emailError && !passwordError;
  };
 
   const validateEmail = (): boolean => {
     setTouched(prev => ({ ...prev, email: true }));
     return !emailError;
   };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateInputs()) return;

    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in.');
          } else {
            toast.error(error.message);
          }
          return;
        }

        // If auto-confirm is enabled, user gets a session immediately
        if (data.session) {
          toast.success('Account created successfully!');
          navigate('/dashboard');
        } else {
          toast.success('Account created! You can now sign in.');
          setMode('login');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail()) return;

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Check your email for the reset link!');
      setMode('login');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });

      if (error) {
        toast.error('Failed to sign in with Google');
      }
    } catch (e) {
      toast.error('Failed to sign in with Google');
    } finally {
      setTimeout(() => {
        setSocialLoading(null);
      }, 2000);
    }
  };

  const handleAppleSignIn = async () => {
    setSocialLoading('apple');
    try {
      const { error } = await lovable.auth.signInWithOAuth('apple', {
        redirect_uri: window.location.origin,
      });

      if (error) {
        toast.error('Failed to sign in with Apple');
      }
    } catch (e) {
      toast.error('Failed to sign in with Apple');
    } finally {
      setTimeout(() => {
        setSocialLoading(null);
      }, 2000);
    }
  };

  const isLogin = mode === 'login';
  const isForgotPassword = mode === 'forgot-password';

  return (
    <MobileLayout>
      <div className="flex-1 flex flex-col px-4 py-8 pb-safe">
        {/* Back button */}
        <motion.button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground mb-8 min-h-[44px] touch-manipulation active:opacity-70"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-base">Back to Home</span>
        </motion.button>

        <motion.div
          className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">
              {isForgotPassword
                ? 'Reset Password'
                : isLogin
                ? 'Welcome Back'
                : 'Create Account'}
            </h1>
            <p className="text-muted-foreground">
              {isForgotPassword
                ? "Enter your email and we'll send you a reset link"
                : isLogin
                ? 'Sign in to access your saved resumes'
                : 'Sign up to save your resumes'}
            </p>
          </div>

          {/* Forgot Password Form */}
          {isForgotPassword ? (
            <form onSubmit={handlePasswordReset} className="space-y-5">
               <InputFormField
                 id="reset-email"
                 label="Email"
                 type="email"
                 icon={<Mail className="w-4 h-4" />}
                 value={email}
                 onChange={setEmail}
                 onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                 placeholder="you@example.com"
                 autoComplete="email"
                 error={emailError}
                 touched={touched.email}
                 required
               />

              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-lg font-semibold gradient-primary glow-primary mt-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-primary hover:underline text-base min-h-[44px] touch-manipulation"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Login/Signup Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                 <InputFormField
                   id="email"
                   label="Email"
                   type="email"
                   icon={<Mail className="w-4 h-4" />}
                   value={email}
                   onChange={setEmail}
                   onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                   placeholder="you@example.com"
                   autoComplete="email"
                   error={emailError}
                   touched={touched.email}
                   required
                 />
 
                 <InputFormField
                   id="password"
                   label="Password"
                   type={showPassword ? 'text' : 'password'}
                   icon={<Lock className="w-4 h-4" />}
                   value={password}
                   onChange={setPassword}
                   onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                   placeholder="••••••••"
                   autoComplete={isLogin ? 'current-password' : 'new-password'}
                   error={passwordError}
                   touched={touched.password}
                   required
                   rightElement={
                     <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      aria-controls="password"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                   }
                 />

                {/* Forgot Password Link */}
                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setMode('forgot-password')}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors touch-manipulation"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-14 text-lg font-semibold gradient-primary glow-primary mt-6"
                  disabled={isLoading || socialLoading !== null}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {isLogin ? 'Signing In...' : 'Creating Account...'}
                    </>
                  ) : (
                    isLogin ? 'Sign In' : 'Create Account'
                  )}
                </Button>
              </form>

              {/* Social Auth Divider */}
              <div className="my-6 flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              {/* Social Auth Buttons */}
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full h-12 text-base font-medium gap-3"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || socialLoading !== null}
                >
                  {socialLoading === 'google' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  Continue with Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full h-12 text-base font-medium gap-3 bg-black text-white hover:bg-black/90 hover:text-white border-black"
                  onClick={handleAppleSignIn}
                  disabled={isLoading || socialLoading !== null}
                >
                  {socialLoading === 'apple' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                  )}
                  Continue with Apple
                </Button>
              </div>

              {/* Toggle */}
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setMode(isLogin ? 'signup' : 'login')}
                  className="text-primary hover:underline text-base min-h-[44px] touch-manipulation"
                >
                  {isLogin
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
                </button>
              </div>
            </>
          )}

          {/* Skip option */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant="ghost"
              onClick={() => navigate('/upload')}
              className="text-muted-foreground"
            >
              Continue without account
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </MobileLayout>
  );
}
