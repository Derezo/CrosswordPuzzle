"use client";

import { Navigation } from "@/components/Navigation";

export default function PrivacyPolicyPage() {
  return (
    <div>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              🛡️ Privacy Policy
            </h1>
            <p className="text-xl text-purple-300/90 font-medium">
              Your privacy is as vast and protected as the cosmos itself
            </p>
            <p className="text-purple-400/80 mt-2">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Content */}
          <div className="bg-gradient-to-br from-gray-800/80 via-purple-800/60 to-blue-800/60 rounded-2xl shadow-2xl border border-purple-500/30 p-8 backdrop-blur-lg relative overflow-hidden">
            {/* Background cosmic elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-6 right-6 w-20 h-20 bg-purple-400/30 rounded-full blur-xl animate-pulse"></div>
              <div
                className="absolute bottom-6 left-6 w-16 h-16 bg-cyan-400/30 rounded-full blur-lg animate-pulse"
                style={{ animationDelay: "1.5s" }}
              ></div>
            </div>

            <div className="relative z-10 prose prose-invert prose-purple max-w-none">
              {/* Introduction */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🌟</span>
                  Introduction
                </h2>
                <p className="text-purple-200/90 leading-relaxed">
                  Welcome to Galactic Crossword ("we," "our," or "us"). This
                  Privacy Policy explains how we collect, use, disclose, and
                  safeguard your information when you visit our website and use
                  our crossword puzzle application. Please read this privacy
                  policy carefully. If you do not agree with the terms of this
                  privacy policy, please do not access the site.
                </p>
              </section>

              {/* Information We Collect */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  Information We Collect
                </h2>

                <h3 className="text-xl font-semibold text-purple-300 mb-3">
                  Personal Information
                </h3>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  When you create an account, we may collect:
                </p>
                <ul className="text-purple-200/90 list-disc list-inside space-y-2 mb-6">
                  <li>Name (first and last name)</li>
                  <li>Email address</li>
                  <li>Password (encrypted and securely stored)</li>
                  <li>Profile preferences and settings</li>
                </ul>

                <h3 className="text-xl font-semibold text-purple-300 mb-3">
                  Usage Data
                </h3>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  We automatically collect certain information when you use our
                  service:
                </p>
                <ul className="text-purple-200/90 list-disc list-inside space-y-2 mb-6">
                  <li>Puzzle completion times and scores</li>
                  <li>Achievement progress and unlocked achievements</li>
                  <li>Category preferences and favorites</li>
                  <li>Login timestamps and session data</li>
                  <li>Device information and browser type</li>
                  <li>IP address and approximate location</li>
                </ul>

                <h3 className="text-xl font-semibold text-purple-300 mb-3">
                  OAuth Information
                </h3>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  If you choose to sign in with Google:
                </p>
                <ul className="text-purple-200/90 list-disc list-inside space-y-2">
                  <li>Google account email address</li>
                  <li>Basic profile information (name, profile picture)</li>
                  <li>
                    We do not access your Google contacts, emails, or other
                    Google services
                  </li>
                </ul>
              </section>

              {/* How We Use Information */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  How We Use Your Information
                </h2>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  We use the information we collect to:
                </p>
                <ul className="text-purple-200/90 list-disc list-inside space-y-2">
                  <li>Provide and maintain our crossword puzzle service</li>
                  <li>Create and manage your user account</li>
                  <li>Track your puzzle progress and achievements</li>
                  <li>Customize your experience with favorite categories</li>
                  <li>Generate leaderboards and statistics</li>
                  <li>Improve our service and develop new features</li>
                  <li>
                    Send you important service updates (with your consent)
                  </li>
                  <li>
                    Respond to your questions and provide customer support
                  </li>
                  <li>Ensure the security and integrity of our service</li>
                </ul>
              </section>

              {/* Information Sharing */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🤝</span>
                  Information Sharing and Disclosure
                </h2>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  We do not sell, trade, or otherwise transfer your personal
                  information to third parties, except in the following
                  circumstances:
                </p>
                <ul className="text-purple-200/90 list-disc list-inside space-y-2">
                  <li>
                    <strong>Service Providers:</strong> Trusted third parties
                    who help us operate our website and serve our users
                  </li>
                  <li>
                    <strong>Legal Requirements:</strong> When required to comply
                    with applicable laws or legal processes
                  </li>
                  <li>
                    <strong>Safety and Security:</strong> To protect our rights,
                    property, or safety, or that of our users
                  </li>
                  <li>
                    <strong>Business Transfers:</strong> In connection with a
                    merger, acquisition, or sale of assets
                  </li>
                </ul>
              </section>

              {/* Data Security */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔒</span>
                  Data Security
                </h2>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  We implement appropriate security measures to protect your
                  personal information:
                </p>
                <ul className="text-purple-200/90 list-disc list-inside space-y-2">
                  <li>
                    Passwords are encrypted using industry-standard bcrypt
                    hashing
                  </li>
                  <li>
                    All data transmission is secured with SSL/TLS encryption
                  </li>
                  <li>Regular security audits and updates</li>
                  <li>
                    Limited access to personal data on a need-to-know basis
                  </li>
                  <li>Secure server infrastructure and database protection</li>
                </ul>
                <p className="text-purple-200/90 leading-relaxed mt-4">
                  However, no method of transmission over the internet or
                  electronic storage is 100% secure. While we strive to use
                  commercially acceptable means to protect your information, we
                  cannot guarantee its absolute security.
                </p>
              </section>

              {/* Your Rights */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">⚖️</span>
                  Your Privacy Rights
                </h2>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  You have the following rights regarding your personal
                  information:
                </p>
                <ul className="text-purple-200/90 list-disc list-inside space-y-2">
                  <li>
                    <strong>Access:</strong> Request a copy of the personal
                    information we hold about you
                  </li>
                  <li>
                    <strong>Update:</strong> Correct or update your personal
                    information through your profile settings
                  </li>
                  <li>
                    <strong>Delete:</strong> Request deletion of your account
                    and associated data
                  </li>
                  <li>
                    <strong>Portability:</strong> Request a copy of your data in
                    a structured format
                  </li>
                  <li>
                    <strong>Opt-out:</strong> Unsubscribe from marketing
                    communications at any time
                  </li>
                </ul>
                <p className="text-purple-200/90 leading-relaxed mt-4">
                  To exercise any of these rights, please contact us using the
                  information provided below.
                </p>
              </section>

              {/* Cookies */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🍪</span>
                  Cookies and Local Storage
                </h2>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  We use cookies and local storage to enhance your experience:
                </p>
                <ul className="text-purple-200/90 list-disc list-inside space-y-2">
                  <li>
                    <strong>Essential Cookies:</strong> Required for basic site
                    functionality and user authentication
                  </li>
                  <li>
                    <strong>Preference Cookies:</strong> Remember your settings
                    and preferences
                  </li>
                  <li>
                    <strong>Analytics:</strong> Help us understand how users
                    interact with our service
                  </li>
                </ul>
                <p className="text-purple-200/90 leading-relaxed mt-4">
                  You can control cookies through your browser settings, but
                  disabling certain cookies may limit site functionality.
                </p>
              </section>

              {/* Children's Privacy */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">👶</span>
                  Children's Privacy
                </h2>
                <p className="text-purple-200/90 leading-relaxed">
                  Our service is not intended for children under the age of 13.
                  We do not knowingly collect personal information from children
                  under 13. If you are a parent or guardian and believe your
                  child has provided us with personal information, please
                  contact us immediately.
                </p>
              </section>

              {/* Changes to Privacy Policy */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📝</span>
                  Changes to This Privacy Policy
                </h2>
                <p className="text-purple-200/90 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will
                  notify you of any changes by posting the new Privacy Policy on
                  this page and updating the "last updated" date. You are
                  advised to review this Privacy Policy periodically for any
                  changes. Changes to this Privacy Policy are effective when
                  they are posted on this page.
                </p>
              </section>

              {/* Contact Information */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📧</span>
                  Contact Us
                </h2>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  If you have any questions about this Privacy Policy or our
                  privacy practices, please contact us:
                </p>
                <div className="bg-gray-700/60 rounded-xl p-4 border border-gray-600/50">
                  <p className="text-purple-200/90">
                    <strong>Email:</strong> privacy@mittonvillage.com
                  </p>
                  <p className="text-purple-200/90 mt-2">
                    <strong>Website:</strong>{" "}
                    https://crossword.mittonvillage.com
                  </p>
                  <p className="text-purple-200/90 mt-2">
                    <strong>Response Time:</strong> We aim to respond to all
                    privacy inquiries within 48 hours
                  </p>
                </div>
              </section>

              {/* Footer Note */}
              <div className="text-center pt-8 border-t border-gray-500/50">
                <p className="text-purple-300/80 text-sm">
                  ✨ Your privacy is our cosmic responsibility ✨
                </p>
                <p className="text-purple-400/60 text-xs mt-2">
                  This privacy policy ensures your data is protected across the
                  galaxy
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
