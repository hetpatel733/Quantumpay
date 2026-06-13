import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const documentMap = {
  documentation: {
    title: 'Documentation',
    note: 'Mock Document: full developer documentation will be added here soon.'
  },
  'api-reference': {
    title: 'API Reference',
    note: 'Mock Document: the API reference and examples are coming soon.'
  },
  billing: {
    title: 'Billing',
    note: 'Mock Document: billing details and invoicing content are not available yet.'
  },
  'supported-currencies': {
    title: 'Supported Currencies',
    note: 'Mock Document: the supported currencies list will be published later.'
  },
  faq: {
    title: 'FAQ',
    note: 'Mock Document: FAQ content is currently a placeholder.'
  },
  blog: {
    title: 'Blog',
    note: 'Mock Document: the QuantumPay blog is under construction.'
  },
  'case-studies': {
    title: 'Case Studies',
    note: 'Mock Document: customer case studies will be added in a future release.'
  },
  'about-us': {
    title: 'About Us',
    note: 'Mock Document: company story and background content are coming soon.'
  },
  careers: {
    title: 'Careers',
    note: 'Mock Document: open roles and hiring information are not live yet.'
  },
  'press-kit': {
    title: 'Press Kit',
    note: 'Mock Document: brand assets and press information will be available later.'
  },
  'restricted-jurisdictions': {
    title: 'Restricted Jurisdictions',
    note: 'Mock Document: jurisdiction and compliance details are a placeholder for now.'
  },
  'user-agreement': {
    title: 'User Agreement',
    note: 'Mock Document: the user agreement page is not published yet.'
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    note: 'Mock Document: privacy policy content will be added soon.'
  },
  'cookie-policy': {
    title: 'Cookie Policy',
    note: 'Mock Document: cookie policy content is not available yet.'
  }
}

const MockDocument = () => {
  const { docSlug } = useParams()
  const document = documentMap[docSlug] || {
    title: 'Mock Document',
    note: 'Mock Document: this page is a placeholder and will be replaced later.'
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background dark:bg-gray-900 pt-24 px-4 sm:px-6 py-16 transition-colors duration-300">
        <section className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-3xl p-8 md:p-12 shadow-elevated dark:shadow-teal-500/10"
          >
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-50 dark:bg-teal-900/30 text-primary dark:text-teal-400 text-sm font-semibold mb-6">
              Mock Document
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-text-primary dark:text-white mb-4">
              {document.title}
            </h1>

            <p className="text-lg text-text-secondary dark:text-gray-400 mb-8 max-w-2xl">
              {document.note}
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="rounded-2xl border border-border dark:border-gray-700 bg-background dark:bg-gray-900 p-5">
                <p className="text-sm uppercase tracking-wide text-text-secondary dark:text-gray-500 mb-2">
                  Status
                </p>
                <p className="text-text-primary dark:text-white font-semibold">Placeholder content</p>
              </div>
              <div className="rounded-2xl border border-border dark:border-gray-700 bg-background dark:bg-gray-900 p-5">
                <p className="text-sm uppercase tracking-wide text-text-secondary dark:text-gray-500 mb-2">
                  Note
                </p>
                <p className="text-text-primary dark:text-white font-semibold">Mock Document page</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary dark:bg-teal-500 text-white font-semibold hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth"
              >
                Back Home
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-border dark:border-gray-700 text-text-primary dark:text-white hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth font-semibold"
              >
                Contact Support
              </Link>
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  )
}

export default MockDocument