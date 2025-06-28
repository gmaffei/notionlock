import React from 'react';
import { Link } from 'react-router-dom';
import AdBanner from './AdBanner';

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <AdBanner size="horizontal" className="mb-8" />
        
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-gray-600">
              © 2024 NotionLock. 100% gratuito, sempre.
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
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 