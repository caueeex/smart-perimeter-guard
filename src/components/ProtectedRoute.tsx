/**
 * Componente para proteger rotas que requerem autenticação
 */
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { apiUtils } from '@/services/api';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  // Verificar se está autenticado
  if (!apiUtils.isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  // Verificar se requer permissão de admin
  if (requireAdmin) {
    const user = apiUtils.getUser();
    if (!user || user.role !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

