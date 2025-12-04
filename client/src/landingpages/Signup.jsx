import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AppButton from '../components/ui/AppButton'
import { authAPI } from '../api/authAPI'

const Signup = () => {
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountType: 'personal',
    businessName: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

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
    setError(null)
    setSuccess(null)
    
    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!')
      return
    }
    if (!acceptTerms) {
      setError('Please accept the terms and conditions')
      return
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    
    setIsLoading(true)
    
    try {
      // Prepare data for server
      const signupData = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        password: formData.password,
        type: formData.accountType, // 'personal' or 'business'
        ...(formData.accountType === 'business' && formData.businessName && {
          businessName: formData.businessName
        })
      }

      const response = await authAPI.signup(signupData)

      if (response.success) {
        setSuccess(response.message || 'Account created successfully!')
        
        // Clear form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
          accountType: 'personal',
          businessName: ''
        })
        setAcceptTerms(false)
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Account created! Please login to continue.' }
          })
        }, 2000)
      } else {
        setError(response.message || 'Signup failed. Please try again.')
      }
    } catch (err) {
      console.error('Signup error:', err)
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
                Start Your Crypto Journey
              </h1>
              <p className="text-2xl text-text-secondary dark:text-gray-400 mb-12">
                Join thousands of businesses and individuals using QuantumPay for crypto payments.
              </p>

              <div className="space-y-6">
                {[
                  { icon: 'bi-rocket-takeoff', text: 'Get started in minutes', color: 'from-blue-500 to-blue-600' },
                  { icon: 'bi-percent', text: '0% processing fees', color: 'from-green-500 to-green-600' },
                  { icon: 'bi-currency-bitcoin', text: '100+ cryptocurrencies', color: 'from-orange-500 to-orange-600' },
                  { icon: 'bi-shield-check', text: 'Bank-level security', color: 'from-purple-500 to-purple-600' },
                  { icon: 'bi-globe', text: 'Global reach', color: 'from-pink-500 to-pink-600' }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-center space-x-4"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                      <i className={`bi ${feature.icon} text-2xl text-white`}></i>
                    </div>
                    <span className="text-xl text-text-primary dark:text-white font-medium">{feature.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-6">
                {[
                  { value: '100K+', label: 'Users' },
                  { value: '$2B+', label: 'Processed' },
                  { value: '150+', label: 'Countries' }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className="bg-surface dark:bg-gray-800 rounded-2xl p-4 shadow-card dark:shadow-teal-500/10 text-center"
                  >
                    <div className="text-3xl font-bold text-primary dark:text-teal-400">{stat.value}</div>
                    <div className="text-text-secondary dark:text-gray-400">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Side - Signup Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full"
            >
              <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-2xl dark:shadow-teal-500/10 p-8 md:p-12">
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold text-text-primary dark:text-white mb-2">
                    Create Account
                  </h2>
                  <p className="text-text-secondary dark:text-gray-400">
                    Sign up now and start accepting crypto payments
                  </p>
                </div>

                {/* Account Type Selector */}
                <div className="mb-6">
                  <label className="block text-text-primary dark:text-white font-semibold mb-3">
                    Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: 'personal', icon: 'bi-person', label: 'Personal' },
                      { value: 'business', icon: 'bi-building', label: 'Business' }
                    ].map((type) => (
                      <motion.button
                        key={type.value}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFormData({ ...formData, accountType: type.value })}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          formData.accountType === type.value
                            ? 'border-primary dark:border-teal-400 bg-primary-50 dark:bg-teal-900/30'
                            : 'border-secondary-200 dark:border-gray-600 hover:border-primary-200 dark:hover:border-teal-500'
                        }`}
                      >
                        <i className={`bi ${type.icon} text-3xl ${formData.accountType === type.value ? 'text-primary dark:text-teal-400' : 'text-text-secondary dark:text-gray-400'} mb-2 block`}></i>
                        <span className={`font-semibold ${formData.accountType === type.value ? 'text-primary dark:text-teal-400' : 'text-text-secondary dark:text-gray-400'}`}>
                          {type.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
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

                  {/* Success Message */}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-success-50 dark:bg-green-900/20 border-2 border-success dark:border-green-500 text-success dark:text-green-400 px-4 py-3 rounded-xl flex items-center"
                    >
                      <i className="bi bi-check-circle-fill text-xl mr-3"></i>
                      <span className="font-semibold">{success}</span>
                    </motion.div>
                  )}

                  {/* Name Inputs */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-text-primary dark:text-white font-semibold mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border-2 border-secondary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-primary dark:focus:border-teal-400 focus:outline-none transition-colors"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-text-primary dark:text-white font-semibold mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border-2 border-secondary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-primary dark:focus:border-teal-400 focus:outline-none transition-colors"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

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

                  {/* Business Name Input - Only for business accounts */}
                  {formData.accountType === 'business' && (
                    <div>
                      <label className="block text-text-primary dark:text-white font-semibold mb-2">
                        Business Name
                      </label>
                      <div className="relative">
                        <i className="bi bi-building absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary dark:text-gray-400 text-xl"></i>
                        <input
                          type="text"
                          name="businessName"
                          value={formData.businessName}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-secondary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-primary dark:focus:border-teal-400 focus:outline-none transition-colors"
                          placeholder="Your company name"
                        />
                      </div>
                    </div>
                  )}

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
                        placeholder="Create a strong password"
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

                  {/* Confirm Password Input */}
                  <div>
                    <label className="block text-text-primary dark:text-white font-semibold mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <i className="bi bi-lock-fill absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary dark:text-gray-400 text-xl"></i>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-secondary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-primary dark:focus:border-teal-400 focus:outline-none transition-colors"
                        placeholder="Re-enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white"
                      >
                        <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'} text-xl`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div>
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="w-5 h-5 mt-1 rounded border-2 border-secondary-300 dark:border-gray-600 text-primary focus:ring-primary"
                      />
                      <span className="text-text-secondary dark:text-gray-400 text-sm">
                        I agree to the{' '}
                        <Link to="/terms" className="text-primary dark:text-teal-400 hover:text-primary-700 dark:hover:text-teal-300 font-semibold">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="text-primary dark:text-teal-400 hover:text-primary-700 dark:hover:text-teal-300 font-semibold">
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
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
                    Create Account
                  </AppButton>
                </form>

                {/* Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-secondary-200 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-surface dark:bg-gray-800 text-text-secondary dark:text-gray-400">Or sign up with</span>
                  </div>
                </div>

                {/* Social Signup */}
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

                {/* Login Link */}
                <p className="text-center mt-8 text-text-secondary dark:text-gray-400">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary dark:text-teal-400 hover:text-primary-700 dark:hover:text-teal-300 font-semibold">
                    Sign in
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

export default Signup
