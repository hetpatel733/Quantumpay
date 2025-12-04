import React, { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AppButton from '../components/ui/AppButton'
import { AuthContext } from '../contexts/AuthContext'
import { authAPI } from '../api/authAPI'

const Login = () => {
  const navigate = useNavigate()
  const { handleLoginSuccess } = useContext(AuthContext)
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password
      })

      if (response.success) {
        // Store token and user data
        if (response.token) {
          localStorage.setItem('authToken', response.token)
        }
        if (response.user) {
          localStorage.setItem('userData', JSON.stringify(response.user))
        }
        
        // Call context handler to update auth state
        if (handleLoginSuccess) {
          handleLoginSuccess(response.user, response.token)
        }
        
        // Navigate to dashboard
        navigate('/dashboard')
      } else {
        setError(response.message || 'Login failed. Please try again.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Unable to connect to server. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ marginTop: '80px' }} className="min-h-screen py-20 px-4 bg-gradient-to-br from-background via-primary-50 to-accent-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Branding */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="hidden lg:block"
            >
              <h1 className="text-5xl lg:text-6xl font-bold text-text-primary dark:text-white mb-6">
                Welcome Back!
              </h1>
              <p className="text-2xl text-text-secondary dark:text-gray-400 mb-12">
                Login to your QuantumPay account and start accepting crypto payments.
              </p>

              <div className="space-y-6">
                {[
                  { icon: 'bi-shield-check', text: 'Bank-level security' },
                  { icon: 'bi-lightning-charge', text: 'Instant transactions' },
                  { icon: 'bi-graph-up', text: 'Real-time analytics' },
                  { icon: 'bi-headset', text: '24/7 support' }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-center space-x-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center">
                      <i className={`bi ${feature.icon} text-2xl text-white`}></i>
                    </div>
                    <span className="text-xl text-text-primary dark:text-white font-medium">{feature.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Decorative element */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="mt-12 w-64 h-64 mx-auto opacity-20"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-accent"></div>
              </motion.div>
            </motion.div>

            {/* Right Side - Login Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full"
            >
              <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-2xl dark:shadow-teal-500/10 p-8 md:p-12">
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold text-text-primary dark:text-white mb-2">
                    Sign In
                  </h2>
                  <p className="text-text-secondary dark:text-gray-400">
                    Enter your credentials to access your account
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-error-50 dark:bg-red-900/20 border-2 border-error dark:border-red-500 text-error dark:text-red-400 px-4 py-3 rounded-xl flex items-center"
                    >
                      <i className="bi bi-exclamation-circle-fill text-xl mr-3"></i>
                      <span className="font-semibold">{error}</span>
                    </motion.div>
                  )}

                  {/* Email Input */}
                  <div>
                    <label className="block text-text-primary dark:text-white font-semibold mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <i className="bi bi-envelope absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary dark:text-gray-400 text-xl"></i>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-secondary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-primary dark:focus:border-teal-400 focus:outline-none transition-colors"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="block text-text-primary dark:text-white font-semibold mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <i className="bi bi-lock absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary dark:text-gray-400 text-xl"></i>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-secondary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-primary dark:focus:border-teal-400 focus:outline-none transition-colors"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white"
                      >
                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-xl`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-5 h-5 rounded border-2 border-secondary-300 dark:border-gray-600 text-primary focus:ring-primary"
                      />
                      <span className="text-text-secondary dark:text-gray-400">Remember me</span>
                    </label>
                    <Link to="/forgot-password" className="text-primary dark:text-teal-400 hover:text-primary-700 dark:hover:text-teal-300 font-semibold">
                      Forgot Password?
                    </Link>
                  </div>

                  {/* Submit Button */}
                  <AppButton
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={isLoading}
                    disabled={isLoading}
                    fullWidth
                  >
                    Sign In
                  </AppButton>
                </form>

                {/* Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-secondary-200 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-surface dark:bg-gray-800 text-text-secondary dark:text-gray-400">Or continue with</span>
                  </div>
                </div>

                {/* Social Login */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: 'bi-google', name: 'Google' },
                    { icon: 'bi-github', name: 'GitHub' },
                    { icon: 'bi-apple', name: 'Apple' }
                  ].map((provider) => (
                    <motion.button
                      key={provider.name}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center justify-center py-3 rounded-xl border-2 border-secondary-200 dark:border-gray-600 hover:border-primary dark:hover:border-teal-400 transition-colors"
                    >
                      <i className={`bi ${provider.icon} text-2xl text-text-primary dark:text-white`}></i>
                    </motion.button>
                  ))}
                </div>

                {/* Sign Up Link */}
                <p className="text-center mt-8 text-text-secondary dark:text-gray-400">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-primary dark:text-teal-400 hover:text-primary-700 dark:hover:text-teal-300 font-semibold">
                    Sign up for free
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default Login
