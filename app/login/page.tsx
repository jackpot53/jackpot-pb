'use client'
import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
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
import { AnimatedLogo } from '@/components/app/animated-logo'

const authSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요.'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.'),
})

type AuthFormValues = z.infer<typeof authSchema>


function AuthForm() {
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect') ?? '/'
  const router = useRouter()
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
        const result = await signIn(values.email, values.password)
        if (result?.error) {
          setServerError('이메일 또는 비밀번호가 올바르지 않습니다.')
        } else {
          router.push(redirectPath.startsWith('/') && !redirectPath.startsWith('//') ? redirectPath : '/')
          router.refresh()
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
    <>
      {/* Mode tabs */}
      <div className="flex rounded-lg bg-gray-100 p-1 mb-7">
        {(['login', 'signup'] as const).map((m) => (
          <button key={m} type="button"
            onClick={() => { setMode(m); setServerError(null) }}
            className="flex-1 py-2 text-sm font-medium rounded-md transition-all"
            style={mode === m
              ? { background: '#fff', color: '#111', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
              : { color: '#6b7280' }
            }>
            {m === 'login' ? '로그인' : '계정 만들기'}
          </button>
        ))}
      </div>

      {signUpSuccess && (
        <div className="text-sm rounded-lg p-4 flex flex-col gap-1 mb-5 bg-emerald-50 border border-emerald-200">
          <p className="font-semibold text-emerald-700">이메일을 확인해주세요</p>
          <p className="leading-relaxed text-xs mt-0.5 text-emerald-600">
            가입 확인 링크를 이메일로 보냈습니다.<br />
            받은 메일함에서 <strong>&quot;Confirm your signup&quot;</strong> 링크를 클릭해주세요.
          </p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-xs font-medium text-gray-500 uppercase tracking-wide">이메일</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    disabled={isSubmitting}
                    className="h-10 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:border-gray-400"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-xs font-medium text-gray-500 uppercase tracking-wide">비밀번호</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={mode === 'login' ? '비밀번호 입력' : '6자 이상의 비밀번호'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    disabled={isSubmitting}
                    className="h-10 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:border-gray-400"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {serverError && (
            <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm bg-red-50 border border-red-200" role="alert">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
              <span className="text-red-600">{serverError}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 mt-1 font-semibold text-sm rounded-lg border-0 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#111', color: '#fff' }}
          >
            {isSubmitting
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'login' ? '인증 중...' : '등록 중...'}</>
              : mode === 'login' ? '시작하기' : '계정 생성'
            }
          </Button>
        </form>
      </Form>

      <p className="text-center text-xs mt-6 text-gray-400">
        {mode === 'login' ? (
          <>
            처음이신가요?{' '}
            <button type="button" className="font-semibold text-gray-700 hover:text-gray-900 transition-colors"
              onClick={() => { setMode('signup'); setServerError(null) }}>
              계정 만들기
            </button>
          </>
        ) : (
          <>
            이미 계정이 있으신가요?{' '}
            <button type="button" className="font-semibold text-gray-700 hover:text-gray-900 transition-colors"
              onClick={() => { setMode('login'); setServerError(null) }}>
              로그인
            </button>
          </>
        )}
      </p>
    </>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">

      <div className="w-full max-w-3xl flex flex-col md:flex-row rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">

        {/* Left panel */}
        <div className="hidden md:flex md:w-[48%] items-center justify-center bg-gray-950">
          <AnimatedLogo size={160} />
        </div>

        {/* Right panel */}
        <div className="w-full md:w-[52%] p-8 md:p-12 flex flex-col justify-center">
          {/* Mobile header */}
          <div className="flex md:hidden items-center gap-2 mb-8">
            <AnimatedLogo size={28} />
            <span className="text-sm font-semibold text-gray-800">Jackpot PB</span>
          </div>

          <div className="mb-7">
            <h1 className="text-xl font-bold text-gray-900">환영합니다</h1>
            <p className="text-sm text-gray-400 mt-1">계속하려면 로그인해주세요.</p>
          </div>

          <Suspense fallback={null}>
            <AuthForm />
          </Suspense>
        </div>

      </div>
    </main>
  )
}
