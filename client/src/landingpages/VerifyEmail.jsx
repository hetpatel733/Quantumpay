import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from 'contexts/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AppButton from '../components/ui/AppButton'
import { authAPI } from '../utils/api'

const VerifyEmail = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { handleLoginSuccess } = useAuth()

  const [email, setEmail] = useState('')
  const [purpose, setPurpose] = useState('signup')
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    const fromState = location.state?.email
    const fromPurpose = location.state?.purpose
    const pendingEmail = localStorage.getItem('pendingVerificationEmail')
    const pendingPurpose = localStorage.getItem('pendingOtpPurpose')
    setEmail(fromState || pendingEmail || '')
    setPurpose(fromPurpose || pendingPurpose || 'signup')
  }, [location.state])

  const handleVerify = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await authAPI.verifyOtp({ email, otp, purpose })

      if (response.success) {
        setSuccess(response.message || 'Verification successful')
        localStorage.removeItem('pendingVerificationEmail')
        localStorage.removeItem('pendingVerificationUserId')
        localStorage.removeItem('pendingVerificationCode')
        localStorage.removeItem('pendingOtpPurpose')

        if (purpose === 'login' && response.token && response.user) {
          localStorage.setItem('authToken', response.token)
          localStorage.setItem('userData', JSON.stringify(response.user))
          localStorage.setItem('completeUserData', JSON.stringify(response.user))

          if (handleLoginSuccess) {
            handleLoginSuccess(response.user, response.token)
          }

          setTimeout(() => {
            navigate('/dashboard')
          }, 800)
          return
        }

        setTimeout(() => {
          navigate('/login', {
            state: { message: 'Email verified. You can now log in.' }
          })
        }, 1500)
      } else {
        setError(response.message || 'Verification failed')
      }
    } catch (err) {
      console.error('Verify email error:', err)
      setError('Unable to verify email right now. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email first.')
      return
    }

    setIsResending(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await authAPI.resendOtp({ email, purpose })
      if (response.success) {
        setSuccess(response.message || 'A new verification code has been sent')
        if (response.verificationCode) {
          localStorage.setItem('pendingVerificationCode', response.verificationCode)
        }
      } else {
        setError(response.message || 'Could not resend OTP')
      }
    } catch (err) {
      console.error('Resend OTP error:', err)
      setError('Unable to resend verification code right now.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ marginTop: '80px' }} className="min-h-screen py-20 px-4 bg-gradient-to-br from-background via-primary-50 to-accent-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface dark:bg-gray-800 rounded-3xl shadow-2xl dark:shadow-teal-500/10 p-8 md:p-12"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-text-primary dark:text-white mb-3">
                {purpose === 'login' ? 'Two-Factor Verification' : 'Verify Your Email'}
              </h1>
              <p className="text-text-secondary dark:text-gray-400">
                {purpose === 'login'
                  ? 'Enter the OTP sent to your email to complete sign-in.'
                  : 'Enter the OTP sent to your email to activate your account.'}
              </p>
            </div>

            {location.state?.message && (
              <div className="mb-6 rounded-xl border border-primary/20 bg-primary-50 dark:bg-teal-900/20 p-4 text-primary dark:text-teal-200">
                {location.state.message}
              </div>
            )}

            {success && (
              <div className="mb-6 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 p-4 text-green-700 dark:text-green-200">
                {success}
              </div>
            )}

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-text-primary dark:text-white mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-primary dark:text-white mb-2">
                  OTP Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary tracking-[0.3em] text-center"
                  placeholder="123456"
                  maxLength={6}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <AppButton type="submit" disabled={isLoading || !email || otp.length !== 6} className="flex-1">
                  {isLoading ? 'Verifying...' : (purpose === 'login' ? 'Verify & Sign In' : 'Verify Email')}
                </AppButton>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending || !email}
                  className="flex-1 rounded-xl border border-primary text-primary dark:text-teal-300 px-4 py-3 font-semibold hover:bg-primary/10 dark:hover:bg-teal-500/10 transition-colors disabled:opacity-60"
                >
                  {isResending ? 'Resending...' : 'Resend OTP'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default VerifyEmail