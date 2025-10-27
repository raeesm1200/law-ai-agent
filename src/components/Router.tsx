
import React from 'react';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';

interface Route {
  path: string;
  component: React.ComponentType;
}

interface RouterProps {
  routes: Route[];
}

export const Router: React.FC<RouterProps> = ({ routes }) => {
  const currentPath = window.location.pathname;
  const fullURL = window.location.href;
  
  // Debug logging
  console.log('🛣️ Router Debug:', {
    currentPath,
    fullURL,
    availableRoutes: routes.map(r => r.path)
  });
  
  // Add built-in routes for password reset
  if (currentPath === '/forgot-password') {
    return <ForgotPassword />;
  }
  if (currentPath.startsWith('/reset-password')) {
    return <ResetPassword />;
  }
  // Find route by exact path match, ignoring query parameters
  const currentRoute = routes.find(route => route.path === currentPath);
  
  if (currentRoute) {
    console.log('✅ Exact route match found:', currentRoute.path);
    const Component = currentRoute.component;
    return <Component />;
  }
  
  // If no exact match, try to find a route that matches the start of the path
  // This helps with cases where there might be additional path segments
  const partialRoute = routes.find(route => 
    currentPath.startsWith(route.path) && route.path !== '/'
  );
  
  if (partialRoute) {
    console.log('✅ Partial route match found:', partialRoute.path);
    const Component = partialRoute.component;
    return <Component />;
  }
  
  console.log('❌ No route match found, using default');
  
  // Default to first route if no match found
  const DefaultComponent = routes[0]?.component;
  return DefaultComponent ? <DefaultComponent /> : <div>404 - Page not found</div>;
};
