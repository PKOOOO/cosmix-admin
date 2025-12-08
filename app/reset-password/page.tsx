// app/reset-password/page.tsx

'use client'
import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSignIn } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function ResetPasswordContent() {
    const router = useRouter()
    const { isLoaded, signIn, setActive } = useSignIn()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [successfulCreation, setSuccessfulCreation] = useState(false)

    if (!isLoaded) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    // Step 1: Request password reset code
    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await signIn?.create({
                strategy: 'reset_password_email_code',
                identifier: email,
            })
            setSuccessfulCreation(true)
        } catch (err: any) {
            console.error('Error:', err)
            setError(err.errors?.[0]?.message || 'Virhe lähetettäessä nollauskoodia')
        } finally {
            setLoading(false)
        }
    }

    // Step 2: Reset password with code
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const result = await signIn?.attemptFirstFactor({
                strategy: 'reset_password_email_code',
                code,
                password,
            })

            if (result?.status === 'complete') {
                await setActive({ session: result.createdSessionId })
                setSuccess(true)
                setTimeout(() => {
                    router.push('/dashboard')
                }, 2000)
            }
        } catch (err: any) {
            console.error('Error:', err)
            setError(err.errors?.[0]?.message || 'Salasanan nollaus epäonnistui')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center px-4">
                <div className="w-full max-w-md">
                    <div className="rounded-lg border bg-card p-6 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                            <svg
                                className="h-6 w-6 text-green-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <h3 className="mb-2 text-lg font-semibold">Salasana vaihdettu!</h3>
                        <p className="text-sm text-muted-foreground">
                            Sinut ohjataan automaattisesti...
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold">
                        {!successfulCreation ? 'Nollaa salasana' : 'Syötä nollauskoodi'}
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        {!successfulCreation
                            ? 'Syötä sähköpostiosoitteesi saadaksesi nollauskoodin'
                            : `Lähetimme nollauskoodin osoitteeseen ${email}`
                        }
                    </p>
                </div>

                {!successfulCreation ? (
                    <form onSubmit={handleRequestReset} className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                Sähköpostiosoite
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Syötä sähköpostiosoitteesi"
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        {error && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Lähetetään...
                                    </>
                                ) : (
                                    'Lähetä nollauskoodi'
                                )}
                            </Button>

                            <Link href="/sign-in" className="w-full">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Takaisin kirjautumiseen
                                </Button>
                            </Link>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <label htmlFor="code" className="text-sm font-medium">
                                Nollauskoodi
                            </label>
                            <input
                                id="code"
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Syötä sähköpostissa saamasi koodi"
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="password" className="text-sm font-medium">
                                Uusi salasana
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Vähintään 8 merkkiä"
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        {error && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Nollataan...
                                    </>
                                ) : (
                                    'Nollaa salasana'
                                )}
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setSuccessfulCreation(false)}
                                className="w-full"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Takaisin
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    )
}