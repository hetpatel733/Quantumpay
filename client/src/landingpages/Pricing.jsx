import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AppButton from '../components/ui/AppButton'

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState('monthly')

  const pricingPlans = [
    {
      name: 'Starter',
      description: 'Perfect for individuals and small businesses getting started with crypto',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        'Accept 10+ cryptocurrencies',
        'Up to $10,000 monthly volume',
        '0% processing fees',
        'Basic dashboard analytics',
        'Email support',
        'Standard settlement (24-48h)',
        'Basic API access',
        'Single wallet integration'
      ],
      highlighted: false,
      cta: 'Get Started Free',
      color: 'from-blue-500 to-blue-600'
    },
    {
      name: 'Professional',
      description: 'Ideal for growing businesses that need advanced features',
      monthlyPrice: 49,
      yearlyPrice: 490,
      features: [
        'Accept 50+ cryptocurrencies',
        'Up to $100,000 monthly volume',
        '0% processing fees',
        'Advanced analytics & reporting',
        'Priority email & chat support',
        'Fast settlement (12-24h)',
        'Full API access',
        'Multiple wallet integration',
        'Custom payment pages',
        'Automated conversions',
        'Fraud protection'
      ],
      highlighted: true,
      badge: 'Most Popular',
      cta: 'Start Free Trial',
      color: 'from-primary to-primary-700'
    },
    {
      name: 'Enterprise',
      description: 'For large organizations requiring premium support and features',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      features: [
        'Accept 100+ cryptocurrencies',
        'Unlimited monthly volume',
        '0% processing fees',
        'Enterprise analytics suite',
        '24/7 dedicated support',
        'Instant settlement',
        'White-label API',
        'Unlimited wallet integration',
        'Fully customizable checkout',
        'Advanced automation',
        'Enhanced fraud protection',
        'Compliance assistance',
        'Custom integrations',
        'Dedicated account manager'
      ],
      highlighted: false,
      cta: 'Contact Sales',
      color: 'from-purple-500 to-purple-600'
    }
  ]

  const addons = [
    {
      name: 'Advanced Fraud Detection',
      price: 29,
      description: 'AI-powered fraud detection and risk management'
    },
    {
      name: 'Custom Branding',
      price: 49,
      description: 'Full white-label solution with your branding'
    },
    {
      name: 'Compliance Suite',
      price: 99,
      description: 'KYC/AML tools and regulatory compliance support'
    },
    {
      name: 'Priority Support',
      price: 199,
      description: '24/7 premium support with 1-hour response time'
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
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary dark:text-gray-400 mb-12 max-w-3xl mx-auto">
              No hidden fees. No surprises. Choose the plan that's right for your business.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center bg-surface dark:bg-gray-800 rounded-full p-1 shadow-card gap-1">
              <AppButton
                variant="chip"
                size="md"
                active={billingCycle === 'monthly'}
                onClick={() => setBillingCycle('monthly')}
                className="rounded-full px-8"
              >
                Monthly
              </AppButton>
              <div className="relative">
                <AppButton
                  variant="chip"
                  size="md"
                  active={billingCycle === 'yearly'}
                  onClick={() => setBillingCycle('yearly')}
                  className="rounded-full px-8"
                >
                  Yearly
                </AppButton>
                <span className="absolute -top-2 -right-2 bg-success text-white text-xs px-2 py-1 rounded-full">
                  Save 17%
                </span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Pricing Cards */}
        <section className="max-w-7xl mx-auto mb-20">
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative bg-surface dark:bg-gray-800 rounded-3xl shadow-card hover:shadow-elevated dark:shadow-teal-500/10 transition-all duration-300 overflow-hidden ${
                  plan.highlighted ? 'ring-4 ring-primary dark:ring-teal-400 scale-105 md:scale-110' : ''
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-gradient-to-r from-primary to-primary-700 text-white px-6 py-2 rounded-bl-2xl font-semibold">
                      {plan.badge}
                    </div>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Header */}
                  <div className="mb-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                      <i className="bi bi-star-fill text-3xl text-white"></i>
                    </div>
                    <h3 className="text-3xl font-bold text-text-primary dark:text-white mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-text-secondary dark:text-gray-400">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-8">
                    <div className="flex items-baseline">
                      <span className="text-5xl font-bold text-text-primary dark:text-white">
                        ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                      </span>
                      <span className="text-text-secondary dark:text-gray-400 ml-2">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                    {billingCycle === 'yearly' && plan.monthlyPrice > 0 && (
                      <p className="text-sm text-success dark:text-teal-400 mt-2">
                        Save ${(plan.monthlyPrice * 12) - plan.yearlyPrice} per year
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8 listremove">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start space-x-3">
                        <i className="bi bi-check-circle-fill text-success dark:text-teal-400 text-xl mt-0.5"></i>
                        <span className="text-text-secondary dark:text-gray-400">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <AppButton
                    to={plan.name === 'Enterprise' ? '/contact' : '/signup'}
                    variant={plan.highlighted ? 'primary' : 'secondary'}
                    size="md"
                    className="w-full justify-center"
                    fullWidth
                  >
                    {plan.cta}
                  </AppButton>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Add-ons Section */}
        <section className="max-w-7xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary dark:text-white mb-4">
              Power Up with Add-ons
            </h2>
            <p className="text-xl text-text-secondary dark:text-gray-400">
              Enhance your plan with premium features
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {addons.map((addon, index) => (
              <motion.div
                key={addon.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-surface dark:bg-gray-800 rounded-2xl p-6 shadow-card hover:shadow-elevated dark:shadow-teal-500/10 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-text-primary dark:text-white">
                    {addon.name}
                  </h3>
                  <div className="bg-primary-50 dark:bg-teal-900/40 text-primary dark:text-teal-400 px-3 py-1 rounded-full font-bold">
                    ${addon.price}/mo
                  </div>
                </div>
                <p className="text-text-secondary dark:text-gray-400">
                  {addon.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                q: 'Are there really no processing fees?',
                a: 'Absolutely! We charge 0% processing fees on all crypto transactions. You only pay your chosen monthly subscription.'
              },
              {
                q: 'Can I upgrade or downgrade my plan?',
                a: 'Yes! You can change your plan at any time. Upgrades take effect immediately, and downgrades will apply at the next billing cycle.'
              },
              {
                q: 'What cryptocurrencies do you support?',
                a: 'We support over 100 cryptocurrencies including Bitcoin, Ethereum, USDT, USDC, and many more. Check our Supported Cryptocurrencies page for the full list.'
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes! Our Professional and Enterprise plans come with a 14-day free trial. No credit card required.'
              },
              {
                q: 'What happens if I exceed my monthly volume?',
                a: "We'll notify you when you're approaching your limit. You can upgrade to a higher tier or contact us for custom pricing."
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
                <h3 className="text-xl font-bold text-text-primary dark:text-white mb-3">
                  {faq.q}
                </h3>
                <p className="text-text-secondary dark:text-gray-400">
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary to-primary-700 rounded-3xl p-12 text-center text-white shadow-2xl"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of businesses already accepting crypto payments
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <AppButton to="/signup" variant="inverse" size="lg">
                Start Free Trial
              </AppButton>
              <AppButton to="/contact" variant="outlineWhite" size="lg">
                Contact Sales
              </AppButton>
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  )
}

export default Pricing
