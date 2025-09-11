"use client";

import { Navigation } from "@/components/Navigation";

export default function TermsOfServicePage() {
  return (
    <div>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              📜 Terms of Service
            </h1>
            <p className="text-xl text-purple-300/90 font-medium">
              The cosmic rules that govern our intergalactic crossword universe
            </p>
            <p className="text-purple-400/80 mt-2">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Content */}
          <div className="bg-gradient-to-br from-gray-800/80 via-purple-800/60 to-blue-800/60 rounded-2xl shadow-2xl border border-purple-500/30 p-8 backdrop-blur-lg relative overflow-hidden">
            {/* Background cosmic elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-8 right-8 w-24 h-24 bg-purple-400/30 rounded-full blur-xl animate-pulse"></div>
              <div
                className="absolute bottom-8 left-8 w-20 h-20 bg-cyan-400/30 rounded-full blur-lg animate-pulse"
                style={{ animationDelay: "2s" }}
              ></div>
              <div
                className="absolute top-1/3 left-1/4 w-16 h-16 bg-blue-400/20 rounded-full blur-2xl animate-pulse"
                style={{ animationDelay: "1s" }}
              ></div>
            </div>

            <div className="relative z-10 prose prose-invert prose-purple max-w-none">
              {/* Agreement to Terms */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🤝</span>
                  Agreement to Terms
                </h2>
                <p className="text-purple-200/90 leading-relaxed">
                  Welcome to Galactic Crossword (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;). These Terms
                  of Service (&quot;Terms&quot;) govern your access to and use of our
                  website, mobile application, and services (collectively, the
                  &quot;Service&quot;). By accessing or using our Service, you agree to be
                  bound by these Terms. If you do not agree to these Terms, you
                  may not access or use our Service.
                </p>
              </section>

              {/* Description of Service */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🌌</span>
                  Description of Service
                </h2>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  Galactic Crossword is an online crossword puzzle platform that
                  provides:
                </p>
                <ul className="text-purple-200/90 list-disc list-inside space-y-2">
                  <li>Daily crossword puzzles with cosmic themes</li>
                  <li>Category-based puzzle generation from our Theme Globe</li>
                  <li>User accounts and progress tracking</li>
                  <li>Achievement system and leaderboards</li>
                  <li>Favorite category management</li>
                  <li>Community features and social interactions</li>
                </ul>
              </section>

              {/* User Accounts */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">👤</span>
                  User Accounts
                </h2>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  To access certain features of our Service, you must create an
                  account. You agree to:
                </p>
                <ul className="text-purple-200/90 list-disc list-inside space-y-2 mb-6">
                  <li>
                    Provide accurate, current, and complete information during
                    registration
                  </li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Promptly update your account information as needed</li>
                  <li>
                    Accept responsibility for all activities under your account
                  </li>
                  <li>
                    Notify us immediately of any unauthorized use of your
                    account
                  </li>
                </ul>

                <h3 className="text-xl font-semibold text-purple-300 mb-3">
                  Account Termination
                </h3>
                <p className="text-purple-200/90 leading-relaxed">
                  You may terminate your account at any time through your
                  profile settings. We reserve the right to terminate accounts
                  that violate these Terms or engage in harmful activities.
                </p>
              </section>

              {/* Acceptable Use */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  Acceptable Use Policy
                </h2>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  You agree to use our Service responsibly and in accordance
                  with these guidelines:
                </p>

                <h3 className="text-xl font-semibold text-purple-300 mb-3">
                  You MAY:
                </h3>
                <ul className="text-purple-200/90 list-disc list-inside space-y-2 mb-6">
                  <li>Solve puzzles and track your progress</li>
                  <li>Share achievements and celebrate milestones</li>
                  <li>Suggest improvements or report bugs</li>
                  <li>
                    Use the Service for personal entertainment and education
                  </li>
                </ul>

                <h3 className="text-xl font-semibold text-purple-300 mb-3">
                  You MAY NOT:
                </h3>
                <ul className="text-purple-200/90 list-disc list-inside space-y-2">
                  <li>
                    Use automated tools, bots, or scripts to solve puzzles or
                    gain unfair advantages
                  </li>
                  <li>
                    Attempt to reverse engineer, hack, or exploit our systems
                  </li>
                  <li>Share your account credentials with others</li>
                  <li>Create multiple accounts to circumvent limitations</li>
                  <li>
                    Use the Service for any illegal or unauthorized purpose
                  </li>
                  <li>Interfere with other users&apos; enjoyment of the Service</li>
                  <li>
                    Upload malicious code or attempt to damage our
                    infrastructure
                  </li>
                </ul>
              </section>

              {/* Intellectual Property */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">©️</span>
                  Intellectual Property Rights
                </h2>

                <h3 className="text-xl font-semibold text-purple-300 mb-3">
                  Our Content
                </h3>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  The Service, including all puzzles, software, graphics, text,
                  and other content, is owned by Galactic Crossword and is
                  protected by copyright, trademark, and other intellectual
                  property laws. You may not copy, modify, distribute, or create
                  derivative works based on our content without permission.
                </p>

                <h3 className="text-xl font-semibold text-purple-300 mb-3">
                  Your Content
                </h3>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  Any content you submit through suggestions, feedback, or other
                  communications becomes our property and may be used to improve
                  the Service. You retain ownership of your personal data and
                  puzzle progress.
                </p>

                <h3 className="text-xl font-semibold text-purple-300 mb-3">
                  License to Use
                </h3>
                <p className="text-purple-200/90 leading-relaxed">
                  We grant you a limited, non-exclusive, non-transferable
                  license to access and use the Service for personal,
                  non-commercial purposes in accordance with these Terms.
                </p>
              </section>

              {/* User Data and Privacy */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔒</span>
                  User Data and Privacy
                </h2>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  We collect and use your information as described in our
                  Privacy Policy. By using our Service, you consent to our data
                  practices as outlined in the Privacy Policy.
                </p>
                <div className="bg-purple-700/60 rounded-xl p-4 border border-purple-500/50">
                  <p className="text-purple-200/90">
                    <strong>Important:</strong> Please review our{" "}
                    <a
                      href="/privacy"
                      className="text-cyan-300 hover:text-cyan-200 underline"
                    >
                      Privacy Policy
                    </a>{" "}
                    to understand how we collect, use, and protect your
                    information.
                  </p>
                </div>
              </section>

              {/* Disclaimers */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  Disclaimers and Limitations
                </h2>

                <h3 className="text-xl font-semibold text-purple-300 mb-3">
                  Service Availability
                </h3>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  We strive to maintain consistent service availability but
                  cannot guarantee uninterrupted access. The Service may be
                  temporarily unavailable due to maintenance, updates, or
                  technical issues.
                </p>

                <h3 className="text-xl font-semibold text-purple-300 mb-3">
                  Content Accuracy
                </h3>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  While we make every effort to ensure puzzle accuracy and
                  quality, we cannot guarantee that all content is error-free.
                  If you encounter issues, please report them through our
                  support channels.
                </p>

                <h3 className="text-xl font-semibold text-purple-300 mb-3">
                  Third-Party Services
                </h3>
                <p className="text-purple-200/90 leading-relaxed">
                  Our Service may integrate with third-party services (such as
                  Google OAuth). We are not responsible for the availability,
                  accuracy, or reliability of these external services.
                </p>
              </section>

              {/* Liability Limitation */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🛡️</span>
                  Limitation of Liability
                </h2>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, GALACTIC CROSSWORD
                  SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                  CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED
                  TO:
                </p>
                <ul className="text-purple-200/90 list-disc list-inside space-y-2 mb-4">
                  <li>Loss of data or progress</li>
                  <li>Loss of profits or business opportunities</li>
                  <li>Service interruptions or downtime</li>
                  <li>Errors in puzzle content or scoring</li>
                </ul>
                <p className="text-purple-200/90 leading-relaxed">
                  Our total liability shall not exceed the amount you have paid
                  for the Service in the twelve months preceding the claim.
                </p>
              </section>

              {/* Modifications */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔄</span>
                  Modifications to Terms
                </h2>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  We reserve the right to modify these Terms at any time. We
                  will notify users of significant changes through:
                </p>
                <ul className="text-purple-200/90 list-disc list-inside space-y-2 mb-4">
                  <li>Email notifications to registered users</li>
                  <li>Prominent notices on our website</li>
                  <li>In-app notifications</li>
                </ul>
                <p className="text-purple-200/90 leading-relaxed">
                  Your continued use of the Service after changes take effect
                  constitutes acceptance of the modified Terms.
                </p>
              </section>

              {/* Governing Law */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">⚖️</span>
                  Governing Law and Dispute Resolution
                </h2>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  These Terms are governed by and construed in accordance with
                  applicable laws. Any disputes arising from these Terms or your
                  use of the Service will be resolved through:
                </p>
                <ol className="text-purple-200/90 list-decimal list-inside space-y-2 mb-4">
                  <li>
                    <strong>Good Faith Negotiation:</strong> We encourage direct
                    communication to resolve issues
                  </li>
                  <li>
                    <strong>Mediation:</strong> If negotiation fails, disputes
                    may be submitted to mediation
                  </li>
                  <li>
                    <strong>Arbitration:</strong> Final disputes may be resolved
                    through binding arbitration
                  </li>
                </ol>
                <p className="text-purple-200/90 leading-relaxed">
                  You agree to first contact us at legal@mittonvillage.com to
                  attempt resolution before pursuing formal legal action.
                </p>
              </section>

              {/* Severability */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  Severability and Entire Agreement
                </h2>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  If any provision of these Terms is found to be invalid or
                  unenforceable, the remaining provisions will continue in full
                  force and effect.
                </p>
                <p className="text-purple-200/90 leading-relaxed">
                  These Terms, together with our Privacy Policy, constitute the
                  entire agreement between you and Galactic Crossword regarding
                  your use of the Service.
                </p>
              </section>

              {/* Age Requirements */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎂</span>
                  Age Requirements
                </h2>
                <p className="text-purple-200/90 leading-relaxed">
                  You must be at least 13 years old to create an account and use
                  our Service. If you are under 18, you must have parental or
                  guardian consent to use the Service. We do not knowingly
                  collect personal information from children under 13.
                </p>
              </section>

              {/* Contact Information */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📧</span>
                  Contact Information
                </h2>
                <p className="text-purple-200/90 leading-relaxed mb-4">
                  If you have questions about these Terms of Service, please
                  contact us:
                </p>
                <div className="bg-gray-700/60 rounded-xl p-6 border border-gray-600/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-purple-200/90 mb-2">
                        <strong>General Inquiries:</strong>
                      </p>
                      <p className="text-purple-300/90">
                        support@mittonvillage.com
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-200/90 mb-2">
                        <strong>Legal Matters:</strong>
                      </p>
                      <p className="text-purple-300/90">
                        legal@mittonvillage.com
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-200/90 mb-2">
                        <strong>Website:</strong>
                      </p>
                      <p className="text-purple-300/90">
                        https://crossword.mittonvillage.com
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-200/90 mb-2">
                        <strong>Response Time:</strong>
                      </p>
                      <p className="text-purple-300/90">Within 48 hours</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Acknowledgment */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">✍️</span>
                  Acknowledgment
                </h2>
                <div className="bg-purple-900/60 rounded-xl p-6 border border-purple-500/50">
                  <p className="text-purple-200/90 leading-relaxed">
                    By using Galactic Crossword, you acknowledge that you have
                    read, understood, and agree to be bound by these Terms of
                    Service. You also acknowledge that you have read and
                    understand our Privacy Policy.
                  </p>
                </div>
              </section>

              {/* Footer Note */}
              <div className="text-center pt-8 border-t border-gray-500/50">
                <p className="text-purple-300/80 text-sm">
                  ✨ Thank you for being part of our cosmic crossword community
                  ✨
                </p>
                <p className="text-purple-400/60 text-xs mt-2">
                  These terms ensure a fair and enjoyable experience for all
                  space travelers
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
