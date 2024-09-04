import React from 'react';
import logo from '../assets/logo.jpg';

const AuthLayouts = ({ children }) => {
  return (
    <>
      <header className='flex justify-center items-center py-3 h-20 shadow-md bg-white rounded-lg'>
        <div className='flex items-center space-x-4'>
          <p className='text-gray-600'>
            Developed by{' '}
            <a
              href="https://haris-sheikh-10eb1.web.app/"
              target='_blank'
              style={{ color: "rgb(0 172 180 / var(--tw-bg-opacity))" }}
              className="font-semibold"
            >
              Haris Sheikh
            </a>{' '}
            &copy; {new Date().getFullYear()} Haris Chat App.
          </p>
          <img
            src={logo}
            alt='logo'
            width={50}
            className='rounded-full'
          />
        </div>
      </header>

      {children}
    </>
  );
};

export default AuthLayouts;
