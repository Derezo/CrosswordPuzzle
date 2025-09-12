"use client";

import Link from "next/link";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-900 via-purple-900 to-indigo-900 border-t border-purple-500/30 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🌌</span>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Galactic Crossword
                </h3>
                <p className="text-purple-300/80 text-sm">
                  Journey through the cosmos
                </p>
              </div>
            </div>
            <p className="text-purple-200/70 text-sm leading-relaxed mb-4">
              Embark on an interstellar word adventure! Solve daily crossword
              puzzles, unlock cosmic achievements, and explore themed categories
              from across the galaxy.
            </p>
            <div className="flex items-center gap-4 text-sm text-purple-300/70">
              <span>Made with ✨ and 🚀</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/puzzle"
                  className="text-purple-300/80 hover:text-white transition-colors duration-200 flex items-center gap-2"
                >
                  <span>🧩</span>
                  <span>Daily Puzzle</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/theme-globe"
                  className="text-purple-300/80 hover:text-white transition-colors duration-200 flex items-center gap-2"
                >
                  <span>🌌</span>
                  <span>Theme Globe</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/leaderboard"
                  className="text-purple-300/80 hover:text-white transition-colors duration-200 flex items-center gap-2"
                >
                  <span>🏆</span>
                  <span>Leaderboard</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/achievements"
                  className="text-purple-300/80 hover:text-white transition-colors duration-200 flex items-center gap-2"
                >
                  <span>⭐</span>
                  <span>Achievements</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">
              Legal & Support
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-purple-300/80 hover:text-white transition-colors duration-200 flex items-center gap-2"
                >
                  <span>🛡️</span>
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-purple-300/80 hover:text-white transition-colors duration-200 flex items-center gap-2"
                >
                  <span>📜</span>
                  <span>Terms of Service</span>
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}
                  className="text-purple-300/80 hover:text-white transition-colors duration-200 flex items-center gap-2"
                >
                  <span>📧</span>
                  <span>Contact Support</span>
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Derezo/CrosswordPuzzle"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-300/80 hover:text-white transition-colors duration-200 flex items-center gap-2"
                >
                  <span>⭐</span>
                  <span>Star on GitHub</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-purple-500/30 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-purple-300/70">
            © {new Date().getFullYear()} Galactic Crossword. All rights
            reserved across the universe.
          </div>
          <div className="flex items-center gap-6 text-sm text-purple-300/70">
            <Link
              href="/privacy"
              className="hover:text-white transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            <span className="text-purple-500/50">•</span>
            <Link
              href="/terms"
              className="hover:text-white transition-colors duration-200"
            >
              Terms of Service
            </Link>
            <span className="text-purple-500/50">•</span>
            <span>Made with 💜 for word explorers</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
