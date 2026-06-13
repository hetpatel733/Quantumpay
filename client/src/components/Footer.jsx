import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const Footer = () => {
  const footerSections = [
    {
      title: 'Developer',
      links: [
        { label: 'Documentation', to: '/docs/documentation' },
        { label: 'API Reference', to: '/docs/api-reference' },
        { label: 'Billing', to: '/docs/billing' },
        { label: 'Supported Currencies', to: '/docs/supported-currencies' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { label: 'Pricing', to: '/pricing' },
        { label: 'FAQ', to: '/docs/faq' },
        { label: 'Blog', to: '/docs/blog' },
        { label: 'Case Studies', to: '/docs/case-studies' }
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', to: '/docs/about-us' },
        { label: 'Careers', to: '/docs/careers' },
        { label: 'Contact us', to: '/contact' },
        { label: 'Press Kit', to: '/docs/press-kit' }
      ]
    },
    {
      title: 'Legal',
      links: [
        { label: 'Restricted Jurisdictions', to: '/docs/restricted-jurisdictions' },
        { label: 'User Agreement', to: '/docs/user-agreement' },
        { label: 'Privacy Policy', to: '/docs/privacy-policy' },
        { label: 'Cookie Policy', to: '/docs/cookie-policy' }
      ]
    }
  ]

  const socialLinks = [
    { icon: 'bi-twitter', url: 'https://twitter.com', label: 'Twitter' },
    { icon: 'bi-telegram', url: 'https://web.telegram.org', label: 'Telegram' },
    { icon: 'bi-discord', url: 'https://discord.com', label: 'Discord' },
    { icon: 'bi-facebook', url: 'https://facebook.com', label: 'Facebook' },
    { icon: 'bi-instagram', url: 'https://instagram.com', label: 'Instagram' },
    { icon: 'bi-linkedin', url: 'https://linkedin.com', label: 'LinkedIn' }
  ]

  return (
    <footer className="bg-[#20263B] dark:bg-gray-950 text-white py-12 px-4 sm:px-6 transition-colors duration-300 w-full overflow-hidden">
      {/* Footer Navigation Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {footerSections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="min-w-0"
            >
              <h2 className="text-lg font-bold mb-4 text-white">{section.title}</h2>
              <ul className="space-y-2 listremove">
                {section.links.map((link) => (
                  <li
                    key={link.label}
                    className="text-sm transition-colors duration-200"
                  >
                    {link.to ? (
                      <Link
                        to={link.to}
                        className="text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-teal-400"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-600 cursor-not-allowed" title="Coming soon">
                        {link.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Social Media Links */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex justify-center items-center gap-5 my-8 flex-wrap"
        >
          {socialLinks.map((social) => (
            <motion.a
              key={social.label}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="text-gray-300 text-2xl hover:text-white transition-all duration-300 p-2 rounded-full hover:bg-white/10 flex items-center justify-center w-12 h-12"
            >
              <i className={`bi ${social.icon}`}></i>
            </motion.a>
          ))}
        </motion.div>

        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex justify-center items-center gap-3 my-8"
        >
          <img
            src="/images/logoimg.webp"
            alt="QuantumPay Logo"
            className="h-12 w-12 rounded-lg"
          />
          <p className="text-2xl font-bold text-white m-0">QuantumPay</p>
        </motion.div>

        {/* Copyright Text */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-400">
            © 2013-2025 QuantumPay, Inc. All Rights Reserved.
          </p>
          <p className="text-sm text-gray-400">
            <a href="mailto:hetpatel7627@gmail.com" target="_blank" className="hover:text-primary transition-colors">
              hetpatel7627@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
