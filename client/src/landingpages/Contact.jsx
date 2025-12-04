import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AppButton from '../components/ui/AppButton'

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || ''

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // Clear messages when user starts typing
    if (submitStatus) setSubmitStatus(null)
    if (error) setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSubmitStatus(null)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/general/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          subject: formData.subject,
          comment: formData.message
        })
      })

      const data = await response.json()

      if (data.success) {
        setSubmitStatus('success')
        // Clear form
        setFormData({ name: '', email: '', subject: '', message: '' })
        
        // Auto-clear success message after 5 seconds
        setTimeout(() => setSubmitStatus(null), 5000)
      } else {
        setError(data.message || 'Failed to send message. Please try again.')
      }
    } catch (err) {
      console.error('Contact form error:', err)
      setError('Unable to connect to server. Please try again later.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const contactMethods = [
    {
      icon: 'bi-envelope',
      title: 'Email Us',
      content: 'support@quantumpay.com',
      description: 'Response within 24 hours',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: 'bi-telephone',
      title: 'Call Us',
      content: '+1 (555) 123-4567',
      description: 'Mon-Fri, 9am-6pm EST',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: 'bi-chat-dots',
      title: 'Live Chat',
      content: 'Start a conversation',
      description: 'Available 24/7',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: 'bi-geo-alt',
      title: 'Visit Us',
      content: '123 Crypto Street, SF',
      description: 'San Francisco, CA 94102',
      color: 'from-pink-500 to-pink-600'
    }
  ]

  return (
    <>
      <Navbar />
      <main style={{ marginTop: '80px' }} className="py-20 px-4 dark:bg-gray-900 transition-colors duration-300">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-text-primary dark:text-white mb-6">
              Get in Touch
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary dark:text-gray-400 max-w-3xl mx-auto">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </motion.div>
        </section>

        {/* Contact Methods */}
        <section className="max-w-7xl mx-auto mb-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactMethods.map((method, index) => (
              <motion.div
                key={method.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-surface dark:bg-gray-800 rounded-2xl p-6 shadow-card hover:shadow-elevated dark:shadow-teal-500/10 transition-all text-center"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${method.color} flex items-center justify-center mx-auto mb-4`}>
                  <i className={`bi ${method.icon} text-3xl text-white`}></i>
                </div>
                <h3 className="text-xl font-bold text-text-primary dark:text-white mb-2">
                  {method.title}
                </h3>
                <p className="text-primary dark:text-teal-400 font-semibold mb-1">
                  {method.content}
                </p>
                <p className="text-text-secondary dark:text-gray-400 text-sm">
                  {method.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Contact Form */}
        <section className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-surface dark:bg-gray-800 rounded-3xl shadow-elevated dark:shadow-teal-500/10 p-8 md:p-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary dark:text-white mb-6 text-center">
              Send Us a Message
            </h2>

            {/* Success Message */}
            {submitStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-success-50 dark:bg-green-900/20 border-2 border-success dark:border-green-500 text-success dark:text-green-400 px-6 py-4 rounded-xl mb-6 flex items-center"
              >
                <i className="bi bi-check-circle-fill text-2xl mr-3"></i>
                <span className="font-semibold">Message sent successfully! We'll get back to you soon.</span>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-error-50 dark:bg-red-900/20 border-2 border-error dark:border-red-500 text-error dark:text-red-400 px-6 py-4 rounded-xl mb-6 flex items-center"
              >
                <i className="bi bi-exclamation-circle-fill text-2xl mr-3"></i>
                <span className="font-semibold">{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-text-primary dark:text-white font-semibold mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-secondary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-primary dark:focus:border-teal-400 focus:outline-none transition-colors"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-text-primary dark:text-white font-semibold mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-secondary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-primary dark:focus:border-teal-400 focus:outline-none transition-colors"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-primary dark:text-white font-semibold mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-secondary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-primary dark:focus:border-teal-400 focus:outline-none transition-colors"
                  placeholder="How can we help?"
                />
              </div>

              <div>
                <label className="block text-text-primary dark:text-white font-semibold mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  className="w-full px-4 py-3 rounded-xl border-2 border-secondary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-primary dark:focus:border-teal-400 focus:outline-none transition-colors resize-none"
                  placeholder="Tell us more about your inquiry..."
                ></textarea>
              </div>

              <AppButton
                type="submit"
                variant="primary"
                size="md"
                loading={isSubmitting}
                disabled={isSubmitting}
                fullWidth
              >
                <span className="flex items-center justify-center">
                  Send Message
                  <i className="bi bi-arrow-right ml-2"></i>
                </span>
              </AppButton>
            </form>
          </motion.div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto mt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary dark:text-white mb-4">
              Common Questions
            </h2>
          </motion.div>

          <div className="space-y-4">
            {[
              {
                q: 'What are your support hours?',
                a: 'Our support team is available Monday-Friday, 9am-6pm EST. Enterprise customers have access to 24/7 priority support.'
              },
              {
                q: 'How quickly will I receive a response?',
                a: 'We typically respond to all inquiries within 24 hours. Priority support customers receive responses within 1 hour.'
              },
              {
                q: 'Can I schedule a demo?',
                a: 'Absolutely! Contact our sales team to schedule a personalized demo of our platform.'
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-surface dark:bg-gray-800 rounded-2xl p-6 shadow-card dark:shadow-teal-500/10"
              >
                <h3 className="text-xl font-bold text-text-primary dark:text-white mb-2 flex items-center">
                  <i className="bi bi-question-circle text-primary dark:text-teal-400 mr-3"></i>
                  {faq.q}
                </h3>
                <p className="text-text-secondary dark:text-gray-400 ml-9">
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

export default Contact
