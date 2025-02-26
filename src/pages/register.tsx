import React, { useState, useEffect } from 'react';

interface College {
  id: number;
  name: string;
}

interface FormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  collegeId: string;
  collegeRegistrationNumber: string;
  customAddress: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  [key: string]: string;
}

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phoneNumber: '',
    collegeId: '',
    collegeRegistrationNumber: '',
    customAddress: '',
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [colleges, setColleges] = useState<College[]>([
    { id: 1, name: 'University of Technology' },
    { id: 2, name: 'City College' },
    { id: 3, name: 'State University' },
    { id: 4, name: 'Liberal Arts College' },
    { id: 5, name: 'Technical Institute' },
  ]);

  const validateStep = (currentStep: number): boolean => {
    const newErrors: FormErrors = {};
    
    if (currentStep === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = 'Phone number is required';
      } else if (!/^\d{10,15}$/.test(formData.phoneNumber.replace(/[^0-9]/g, ''))) {
        newErrors.phoneNumber = 'Phone number is invalid';
      }
    }
    
    if (currentStep === 2) {
      if (!formData.collegeId) newErrors.collegeId = 'Please select your college';
      if (!formData.collegeRegistrationNumber.trim()) {
        newErrors.collegeRegistrationNumber = 'Registration number is required';
      }
      if (!formData.customAddress.trim()) newErrors.customAddress = 'Address is required';
    }
    
    if (currentStep === 3) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateStep(step)) {
      setLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        setLoading(false);
        // Here you would normally redirect to success page or login
        alert('Registration successful!');
      }, 1500);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: 'None', color: '#777' };
    
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#f44336', '#ff9800', '#2196f3', '#4caf50'];
    
    return {
      strength,
      label: labels[strength - 1] || 'Weak',
      color: colors[strength - 1] || colors[0]
    };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  // Progress indicator
  const progress = ((step - 1) / 3) * 100;

  return (
    <div className="min-h-screen bg-[#2b2b2b] text-[#e7e7e7]">
      {/* Header with logo and progress */}
      <header className="pt-8 pb-4 px-6">
        <div className="flex items-center justify-center mb-6">
          <h1 className="ml-3 text-2xl font-extrabold text-[#00bfff]">Sosika</h1>
        </div>
        
        <div className="w-full bg-[#3a3a3a] h-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#00bfff] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between mt-2 text-sm text-[#a0a0a0]">
          <span className={step >= 1 ? "text-[#e7e7e7] font-medium" : ""}>Personal</span>
          <span className={step >= 2 ? "text-[#e7e7e7] font-medium" : ""}>College</span>
          <span className={step >= 3 ? "text-[#e7e7e7] font-medium" : ""}>Security</span>
          <span className={step >= 4 ? "text-[#e7e7e7] font-medium" : ""}>Done</span>
        </div>
      </header>

      <main className="px-6 pb-8">
        <form onSubmit={handleSubmit}>
          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold mb-6">Personal Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-[#3a3a3a] border ${errors.fullName ? 'border-red-500' : 'border-[#555555]'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e7e7e7] transition`}
                    placeholder="Enter your full name"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-red-500 text-sm">{errors.fullName}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-[#3a3a3a] border ${errors.email ? 'border-red-500' : 'border-[#555555]'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e7e7e7] transition`}
                    placeholder="your@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-red-500 text-sm">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-[#3a3a3a] border ${errors.phoneNumber ? 'border-red-500' : 'border-[#555555]'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e7e7e7] transition`}
                    placeholder="Enter your phone number"
                  />
                  {errors.phoneNumber && (
                    <p className="mt-1 text-red-500 text-sm">{errors.phoneNumber}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: College Information */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold mb-6">College Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="collegeId" className="block text-sm font-medium mb-1">
                    Select Your College
                  </label>
                  <select
                    id="collegeId"
                    name="collegeId"
                    value={formData.collegeId}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-[#3a3a3a] border ${errors.collegeId ? 'border-red-500' : 'border-[#555555]'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e7e7e7] transition appearance-none`}
                  >
                    <option value="">Select your college</option>
                    {colleges.map(college => (
                      <option key={college.id} value={college.id}>
                        {college.name}
                      </option>
                    ))}
                  </select>
                  {errors.collegeId && (
                    <p className="mt-1 text-red-500 text-sm">{errors.collegeId}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="collegeRegistrationNumber" className="block text-sm font-medium mb-1">
                    College Registration Number
                  </label>
                  <input
                    type="text"
                    id="collegeRegistrationNumber"
                    name="collegeRegistrationNumber"
                    value={formData.collegeRegistrationNumber}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-[#3a3a3a] border ${errors.collegeRegistrationNumber ? 'border-red-500' : 'border-[#555555]'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e7e7e7] transition`}
                    placeholder="Enter your registration number"
                  />
                  {errors.collegeRegistrationNumber && (
                    <p className="mt-1 text-red-500 text-sm">{errors.collegeRegistrationNumber}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="customAddress" className="block text-sm font-medium mb-1">
                    Delivery Address
                  </label>
                  <textarea
                    id="customAddress"
                    name="customAddress"
                    value={formData.customAddress}
                    onChange={handleChange}
                    rows={3}
                    className={`w-full px-4 py-3 bg-[#3a3a3a] border ${errors.customAddress ? 'border-red-500' : 'border-[#555555]'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e7e7e7] transition`}
                    placeholder="Enter your delivery address"
                  />
                  {errors.customAddress && (
                    <p className="mt-1 text-red-500 text-sm">{errors.customAddress}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Security Information */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold mb-6">Create Password</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 bg-[#3a3a3a] border ${errors.password ? 'border-red-500' : 'border-[#555555]'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e7e7e7] transition`}
                      placeholder="Create a strong password"
                    />
                  </div>
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between">
                        <div className="w-full bg-[#444444] h-2 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-300"
                            style={{ 
                              width: `${(passwordStrength.strength / 4) * 100}%`,
                              backgroundColor: passwordStrength.color 
                            }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm" style={{ color: passwordStrength.color }}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <ul className="mt-2 text-xs text-[#a0a0a0] space-y-1">
                        <li className={formData.password.length >= 8 ? "text-green-400" : ""}>
                          ✓ At least 8 characters
                        </li>
                        <li className={/[A-Z]/.test(formData.password) ? "text-green-400" : ""}>
                          ✓ At least one uppercase letter
                        </li>
                        <li className={/[0-9]/.test(formData.password) ? "text-green-400" : ""}>
                          ✓ At least one number
                        </li>
                        <li className={/[^A-Za-z0-9]/.test(formData.password) ? "text-green-400" : ""}>
                          ✓ At least one special character
                        </li>
                      </ul>
                    </div>
                  )}
                  {errors.password && (
                    <p className="mt-1 text-red-500 text-sm">{errors.password}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-[#3a3a3a] border ${errors.confirmPassword ? 'border-red-500' : 'border-[#555555]'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e7e7e7] transition`}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-red-500 text-sm">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center py-12 animate-fadeIn">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">Registration Complete!</h2>
              <p className="text-[#a0a0a0] mb-8">Your account has been created successfully.</p>
              <button
                type="button"
                className="w-full py-4 px-6 bg-[#e7e7e7] text-[#2b2b2b] rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                onClick={() => {
                  // Would normally redirect to login or dashboard
                  alert('Redirecting to login...');
                }}
              >
                Continue to Login
              </button>
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 4 && (
            <div className="flex mt-12 space-x-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-4 border border-[#555555] text-[#e7e7e7] rounded-xl font-medium hover:bg-[#3a3a3a] transition-all"
                >
                  Back
                </button>
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-4 bg-[#e7e7e7] text-[#2b2b2b] rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 bg-[#e7e7e7] text-[#2b2b2b] rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex justify-center items-center"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-[#2b2b2b]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Create Account'
                  )}
                </button>
              )}
            </div>
          )}
        </form>

        {/* Login link */}
        {step < 4 && (
          <div className="text-center mt-8">
            <p className="text-[#a0a0a0]">
              Already have an account? <a href="#" className="text-[#e7e7e7] underline">Log in</a>
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default RegisterPage;