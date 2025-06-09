// src/components/PrivateRoute.tsx
import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const PrivateRoute: React.FC = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  return user ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
