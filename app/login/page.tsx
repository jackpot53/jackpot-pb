'use client'
import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { signIn, signUp } from './actions'

const authSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요.'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.'),
})

type AuthFormValues = z.infer<typeof authSchema>

function AuthForm() {
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect') ?? '/'
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [serverError, setServerError] = useState<string | null>(null)
  const [signUpSuccess, setSignUpSuccess] = useState(false)

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: '', password: '' },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(values: AuthFormValues) {
    setServerError(null)
    setSignUpSuccess(false)
    try {
      if (mode === 'login') {
        const result = await signIn(values.email, values.password, redirectPath)
        if (result?.error) {
          setServerError('이메일 또는 비밀번호가 올바르지 않습니다.')
        }
      } else {
        const result = await signUp(values.email, values.password)
        if (result?.error) {
          setServerError(result.error)
        } else {
          setSignUpSuccess(true)
          form.reset()
        }
      }
    } catch {
      setServerError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex border-b">
        <button
          className={`flex-1 pb-2 text-sm font-medium transition-colors ${mode === 'login' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          onClick={() => { setMode('login'); setServerError(null); setSignUpSuccess(false) }}
          type="button"
        >
          로그인
        </button>
        <button
          className={`flex-1 pb-2 text-sm font-medium transition-colors ${mode === 'signup' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          onClick={() => { setMode('signup'); setServerError(null); setSignUpSuccess(false) }}
          type="button"
        >
          계정 만들기
        </button>
      </div>

      {signUpSuccess && (
        <div className="text-sm bg-emerald-50 border border-emerald-200 rounded p-3 flex flex-col gap-1">
          <p className="font-medium text-emerald-700">📧 이메일을 확인해주세요</p>
          <p className="text-emerald-600">
            가입 확인 링크를 이메일로 보냈습니다.<br />
            받은 메일함에서 <strong>"Confirm your signup"</strong> 메일을 열고
            링크를 클릭한 뒤 로그인해주세요.
          </p>
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이메일</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder=""
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                {serverError && (
                  <p className="text-sm text-destructive" role="alert">
                    {serverError}
                  </p>
                )}
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'login' ? '로그인 중...' : '가입 중...'}
              </>
            ) : (
              mode === 'login' ? '로그인' : '계정 만들기'
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm sm:w-[400px]">
        <CardHeader className="pb-0">
          <CardTitle className="text-xl font-semibold">Jackpot</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Suspense fallback={null}>
            <AuthForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  )
}
