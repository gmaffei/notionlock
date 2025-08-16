import React from 'react';
import { Link } from 'react-router-dom';

import CookieSettings from './CookieSettings';

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        
        
        <div className="flex flex-col items-center">
          <div className="mb-4 text-center">
            <p className="text-gray-600">
              © 2024 NotionLock. 100% gratuito, sempre.
            </p>
            <p className="text-gray-600">
              Developed with ❤️ by <a href="https://gmlogic.it" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">GMLogic.it</a>
            </p>
          </div>
          
          <nav className="flex space-x-6">
            <Link to="/privacy" className="text-gray-600 hover:text-gray-900 transition">
              Privacy Policy
            </Link>
            <Link to="/faq" className="text-gray-600 hover:text-gray-900 transition">
              FAQ
            </Link>
            <Link to="/about" className="text-gray-600 hover:text-gray-900 transition">
              Chi Siamo
            </Link>
            <Link to="/accessibility" className="text-gray-600 hover:text-gray-900 transition">
              Accessibilità
            </Link>
            <CookieSettings />
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 