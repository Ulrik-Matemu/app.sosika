import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import NotificationHandler from '../components/my-components/notification-handler';

interface LoginFormData {
  email: string;
  password: string;
}

interface FormErrors {
  [key: string]: string;
}

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitPreviousUser = async () => {
  
    const email = localStorage.getItem('email');
    const password = localStorage.getItem('password');
  
    if (!email || !password) {
      return;
    }
  
    setLoading(true);
  
    try {
      const response = await fetch('https://sosika-backend.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
  
      console.log('Login successful:', data);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
  
      alert('Login Successful');
      window.location.href = '#/explore'; 
    } catch (error) {
      console.error('Login Error:', error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch('https://sosika-backend.onrender.com/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTimeout(() => {
          setLoading(false);
          console.log('Login successful:', data);

          // Store the token (if received)
          localStorage.setItem('token', data.token);
          localStorage.setItem('email', formData.email);
          localStorage.setItem('password', formData.password);
          console.log(data.userId);
          localStorage.setItem('userId', data.userId);

          alert('Login Successful')

          // Navigate to explore page
          window.location.href = '#/explore';



        }, 1500);
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login Error:', error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('An unknown error occurred');
      }
      setLoading(false);
    }
  };


  const toggleRememberMe = () => {
    setRememberMe(!rememberMe);
    console.log(rememberMe);
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    handleSubmitPreviousUser();
  }, []); // Empty dependency array ensures it runs only once

  return (
    <div className="min-h-screen bg-[#2b2b2b] text-[#e7e7e7] flex flex-col">
      <NotificationHandler />
      {/* Top wave decoration */}
      <div className="relative h-40 overflow-hidden">
        <svg className="absolute top-0 w-full" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="#3a3a3a"
            fillOpacity="1"
            d="M0,64L48,80C96,96,192,128,288,122.7C384,117,480,75,576,80C672,85,768,139,864,138.7C960,139,1056,85,1152,69.3C1248,53,1344,75,1392,85.3L1440,96L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
          ></path>
        </svg>
      </div>

      {/* Logo */}
      <div className="flex justify-center -mt-4 mb-4">
        <div className="flex items-center justify-center mb-4">
          <h1 className="ml-3 text-3xl font-extrabold text-[#00bfff]">Sosika<span className='text-[12px] font-medium text-green-400'> BETA</span></h1>
        </div>

      </div>

      {/* Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="max-w-md w-full mx-auto">
          <h1 className="text-3xl font-bold text-center mb-2">Welcome Back</h1>
          <p className="text-[#a0a0a0] text-center mb-8">Sign in to continue to Sosika</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-0 inset-y-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 bg-[#3a3a3a] border ${errors.email ? 'border-red-500' : 'border-[#555555]'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e7e7e7] transition`}
                  placeholder="your@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-red-500 text-sm">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
                <a href="#" className="text-sm text-[#e7e7e7] hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <div className="absolute left-0 inset-y-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-10 py-3 bg-[#3a3a3a] border ${errors.password ? 'border-red-500' : 'border-[#555555]'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e7e7e7] transition`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute right-0 inset-y-0 pr-3 flex items-center"
                  onClick={toggleShowPassword}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-red-500 text-sm">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center">
              <button
                type="button"
                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none ${rememberMe ? 'bg-[#e7e7e7]' : 'bg-[#555555]'}`}
                role="switch"
                aria-checked={rememberMe}
                onClick={toggleRememberMe}
              >
                <span className="sr-only">Remember me</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-[#2b2b2b] shadow transform ring-0 transition ease-in-out duration-200 ${rememberMe ? 'translate-x-5' : 'translate-x-0'}`}
                ></span>
              </button>
              <span className="ml-3 text-sm text-[#a0a0a0]">Remember me</span>
              
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-4 bg-[#e7e7e7] text-[#2b2b2b] rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-[#2b2b2b]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8">



          </div>

          <div className="mt-8 text-center">
            <p className='text-[#a0a0a0] mb-10'>Forgot Password.<Link to="/reset-password" className='text-blue-400'>Click Me</Link></p>
            <p className="text-[#a0a0a0]">
              Don't have an account?{' '}<Link to="/register" className="text-[#e7e7e7] font-medium hover:underline">
  Register
</Link>

            </p>
          </div>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="relative h-20 overflow-hidden">
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="#3a3a3a"
            fillOpacity="1"
            d="M0,224L48,229.3C96,235,192,245,288,240C384,235,480,213,576,186.7C672,160,768,128,864,117.3C960,107,1056,117,1152,133.3C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          ></path>
        </svg>
      </div>
    </div>
  );
};

export default LoginPage;