// Authentication service for WebSalesV3
const API_BASE_URL = 'https://api.gajkesaristeels.in';
const LOGIN_ENDPOINT = `${API_BASE_URL}/user/token`;
const LOGOUT_ENDPOINT = `${API_BASE_URL}/user/logout`;
const USER_ROLE_ENDPOINT = `${API_BASE_URL}/user/manage/get`;
const CURRENT_USER_ENDPOINT = `${API_BASE_URL}/user/manage/current-user`;

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  role: string;
}

export interface UserRoleResponse {
  username: string;
  password: string | null;
  roles: string;
  employeeId: number;
  firstName: string;
  lastName: string;
}

export interface CurrentUserDto {
  password: string;
  username: string;
  authorities: Array<{
    authority: string;
  }>;
  accountNonExpired: boolean;
  accountNonLocked: boolean;
  credentialsNonExpired: boolean;
  enabled: boolean;
}

export interface AuthError {
  message: string;
  status?: number;
}

// Token management
export const tokenManager = {
  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  },

  setToken: (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
      // Also set cookie for middleware access
      const isDevelopment = window.location.hostname === 'localhost';
      const cookieOptions = isDevelopment 
        ? `authToken=${token}; path=/; max-age=86400; samesite=strict`
        : `authToken=${token}; path=/; max-age=86400; secure; samesite=strict`;
      document.cookie = cookieOptions;
    }
  },

  removeToken: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userData');
      localStorage.removeItem('currentUser');
      // Also remove cookie
      document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  },

  getAuthHeader: (): string | null => {
    const token = tokenManager.getToken();
    return token ? `Bearer ${token}` : null;
  },

  // Role management
  setUserRole: (roleData: UserRoleResponse): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userRole', roleData.roles);
      localStorage.setItem('userData', JSON.stringify(roleData));
    }
  },

  getUserRole: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userRole');
    }
    return null;
  },

  getUserData: (): UserRoleResponse | null => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  },

  // Current user management
  setCurrentUser: (currentUser: CurrentUserDto): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
  },

  getCurrentUser: (): CurrentUserDto | null => {
    if (typeof window !== 'undefined') {
      const currentUser = localStorage.getItem('currentUser');
      return currentUser ? JSON.parse(currentUser) : null;
    }
    return null;
  }
};

// Authentication API calls
export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await fetch(LOGIN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Login failed: ${response.status} ${errorText}`);
      }

      const tokenData = await response.text();
      
      // Parse the response - it returns "ADMIN <token>"
      const [role, token] = tokenData.split(' ');
      
      if (!token) {
        throw new Error('Invalid response format from server');
      }

      // Store token in localStorage
      tokenManager.setToken(token);

      // Fetch detailed user role information
      try {
        console.log('Fetching role for username:', credentials.username);
        console.log('Token being used:', token);
        
        const roleResponse = await fetch(`${USER_ROLE_ENDPOINT}?username=${credentials.username}`, {
          credentials: 'include', // Ensure cookies are sent
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`, // Manually add token
            'Content-Type': 'application/json',
          },
        });

        if (roleResponse.ok) {
          const userRoleData: UserRoleResponse = await roleResponse.json();
          tokenManager.setUserRole(userRoleData);
          console.log('User role data stored:', userRoleData);
        } else {
          console.warn('Failed to fetch user role data:', roleResponse.status, roleResponse.statusText);
          const errorText = await roleResponse.text();
          console.warn('Error response:', errorText);
        }
      } catch (roleError) {
        console.warn('Error fetching user role data:', roleError);
      }

      // Fetch current user details
      try {
        const currentUserResponse = await fetch(CURRENT_USER_ENDPOINT, {
          credentials: 'include',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (currentUserResponse.ok) {
          const currentUserData: CurrentUserDto = await currentUserResponse.json();
          tokenManager.setCurrentUser(currentUserData);
          console.log('Current user data stored:', currentUserData);
        } else {
          console.warn('Failed to fetch current user data:', currentUserResponse.status);
        }
      } catch (currentUserError) {
        console.warn('Error fetching current user data:', currentUserError);
      }

      return {
        token,
        role: role || 'USER'
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      const token = tokenManager.getToken();
      
      if (!token) {
        // No token to logout, just clear local storage
        tokenManager.removeToken();
        return;
      }

      const response = await fetch(LOGOUT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      // Clear token regardless of response status
      tokenManager.removeToken();

      if (!response.ok) {
        console.warn('Logout request failed, but token was cleared locally');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear the token even if the request fails
      tokenManager.removeToken();
    }
  },

  isAuthenticated: (): boolean => {
    return !!tokenManager.getToken();
  },

  getStoredToken: (): string | null => {
    return tokenManager.getToken();
  },

  getUserRole: (): string | null => {
    return tokenManager.getUserRole();
  },

  getUserData: (): UserRoleResponse | null => {
    return tokenManager.getUserData();
  },

  getCurrentUser: (): CurrentUserDto | null => {
    return tokenManager.getCurrentUser();
  }
};
