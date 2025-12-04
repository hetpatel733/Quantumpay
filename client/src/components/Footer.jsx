import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const Footer = () => {
  const footerSections = [
    {
      title: 'Developer',
      links: ['Documentation', 'API Reference', 'Billing', 'Supported Currencies']
    },
    {
      title: 'Resources',
      links: ['Pricing', 'FAQ', 'Blog', 'Case Studies']
    },
    {
      title: 'Company',
      links: ['About Us', 'Careers', 'Contact us', 'Press Kit']
    },
    {
      title: 'Legal',
      links: ['Restricted Jurisdictions', 'User Agreement', 'Privacy Policy', 'Cookie Policy']
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
    <footer className="bg-[#20263B] dark:bg-gray-950 text-white py-12 px-6 transition-colors duration-300">
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
                    key={link}
                    className="text-sm text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-teal-400 cursor-pointer transition-colors duration-200"
                  >
                    {link}
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
            <a href="mailto:support@quantumpay.com" target="_blank" className="hover:text-primary transition-colors">
              support@quantumpay.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
