import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import {
  continueWithEmail,
  resendSignup,
  signInWithGoogle,
  cooldownRemaining,
} from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Logo from '@/components/Logo'
import { Mail, ArrowLeft } from 'lucide-react'

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type AuthFormData = z.infer<typeof authSchema>

const Auth: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [cooldownStart, setCooldownStart] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormData>({ resolver: zodResolver(authSchema) })

  useEffect(() => {
    if (!cooldownStart) return
    const timer = setInterval(() => {
      const remaining = cooldownRemaining(cooldownStart, Date.now())
      setSecondsLeft(remaining)
      if (remaining === 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownStart])

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true)
    try {
      const next = searchParams.get('next') || '/app'
      const { error } = await continueWithEmail(data.email, next)

      if (error) {
        if (error.message && error.message.includes('repeated signup')) {
          await resendSignup(data.email, next)
          toast({
            title: 'Email re-sent',
            description: `We've re-sent your confirmation to ${data.email}`,
          })
          setShowSuccess(true)
          setUserEmail(data.email)
          setCooldownStart(Date.now())
        } else {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          })
        }
      } else {
        toast({
          title: 'Check your inbox',
          description: `We've sent a magic link to ${data.email}`,
        })
        setShowSuccess(true)
        setUserEmail(data.email)
        setCooldownStart(Date.now())
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (secondsLeft > 0) return
    setIsLoading(true)
    try {
      const next = searchParams.get('next') || '/app'
      const { error } = await resendSignup(userEmail, next)
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Email re-sent',
          description: `We've sent another link to ${userEmail}`,
        })
        setCooldownStart(Date.now())
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      const next = searchParams.get('next') || '/app'
      const { error } = await signInWithGoogle(next)
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to sign in with Google.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetToAuthForm = () => {
    setShowSuccess(false)
    setUserEmail('')
    setCooldownStart(null)
    setSecondsLeft(0)
    reset()
  }

  if (showSuccess) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex flex-col items-center">
              <Logo className="h-8 mb-2" />
              <CardTitle>Check your email</CardTitle>
              <CardDescription className="text-muted-foreground">
                We've sent a magic link to {userEmail}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 bg-muted/30 rounded-lg">
              <Mail className="h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground mb-4">
                Click the link in your email to continue. You can close this tab.
              </p>
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={secondsLeft > 0 || isLoading}
                className="w-full"
              >
                {secondsLeft > 0 ? `Resend (${secondsLeft})` : 'Resend'}
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={resetToAuthForm}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Try a different email
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Continue with email
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              We'll send you a magic link
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                autoComplete="email"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Continue'}
            </Button>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                or
              </span>
            </div>
          </div>
          <Button
            onClick={onGoogleSignIn}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            {/* Google SVG icon here */}
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default Auth