import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import NotificationHandler from '../components/my-components/notification-handler';

const WelcomePage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [animating, setAnimating] = useState(false);
  
  const slides = [
    {
      title: "Fast Delivery",
      description: "Get your favorite food delivered in minutes, not hours",
      image: "welcome/1.jpg",
      icon: "🚀"
    },
    {
      title: "Discover Local Flavors",
      description: "Explore the best restaurants and dishes in your area",
      image: "welcome/2.jpg",
      icon: "🍽️"
    },
    {
      title: "Special Offers Daily",
      description: "Enjoy exclusive deals and discounts on your orders",
      image: "welcome/3.jpg",
      icon: "🎁"
    }
  ];

  // Auto-slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      if (!animating) {
        nextSlide();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [currentSlide, animating]);

  const nextSlide = () => {
    setAnimating(true);
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    setTimeout(() => setAnimating(false), 500);
  };

  const goToSlide = (index: number) => {
    setAnimating(true);
    setCurrentSlide(index);
    setTimeout(() => setAnimating(false), 500);
  };

  const autoLogin = async () => {
    const email = localStorage.getItem('email');
    const password = localStorage.getItem('password');

    if (email && password) {
      window.location.href = '/login';
    }
    
  }

  useEffect(() => {
    autoLogin();
  })

  return (
    <div className="flex flex-col min-h-screen bg-[#2b2b2b] text-[#e7e7e7]">
      <NotificationHandler />
      {/* Logo and Header */}
      <div className="py-8 px-6 flex justify-center items-center">
        <div className="flex items-center">
          <h1 className="ml-3 text-3xl font-extrabold tracking-tight text-[#00bfff]">Sosika<span className='text-[12px] font-medium text-green-400'> BETA</span></h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-between px-6 pb-8">
        {/* Carousel Section */}
        <div className="relative overflow-hidden rounded-3xl bg-[#222222] shadow-xl mb-6 flex-1 max-h-96">
          <div 
            className="flex transition-transform duration-500 ease-in-out h-full"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {slides.map((slide, index) => (
              <div key={index} className="min-w-full flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-[#333333] p-4 rounded-full mb-6 text-4xl">
                  {slide.icon}
                </div>
                <h2 className="text-2xl font-bold mb-2">{slide.title}</h2>
                <p className="text-[#c0c0c0] mb-6 max-w-xs mx-auto">{slide.description}</p>
                <div 
                  className="w-48 h-48 relative rounded-full overflow-hidden bg-[#333333] mb-6"
                >
                  <img 
                    src={slide.image} 
                    alt={slide.title} 
                    className="absolute inset-0 w-full h-full object-cover "
                  />
                  <div className=""></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Carousel Indicators */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentSlide === index ? 'bg-[#e7e7e7] w-6' : 'bg-[#555555]'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-4">
        <Link to="/register">
  <button 
    className="w-full py-4 px-6 bg-[#e7e7e7] text-[#2b2b2b] rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:translate-y-px"
  >
    Get Started
  </button>
</Link>
          
          <Link className="mt-4" to="/login">
          <button style={{marginTop: "10px"}}
            className="w-full py-4 px-6 border-2 border-[#e7e7e7] text-[#e7e7e7] rounded-xl font-bold text-lg hover:bg-[#3a3a3a] transition-all"
          >
            Log In
          </button>
          </Link>
          
          <p className="text-center text-[#a0a0a0] mt-6">
            By continuing, you agree to our <span className="underline">Terms</span> and <span className="underline">Privacy Policy</span>
          </p>
        </div>
      </div>
      
      
    </div>
  );
};

export default WelcomePage;