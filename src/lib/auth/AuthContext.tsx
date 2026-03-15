import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useApolloClient } from "@apollo/client";
import type { User } from "../../types";
import {
  getAccessToken,
  setTokens,
  clearTokens,
} from "./tokens";
import { ME_QUERY } from "../../features/auth/graphql";

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const apolloClient = useApolloClient();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    apolloClient
      .query({ query: ME_QUERY, fetchPolicy: "network-only" })
      .then(({ data }) => {
        if (data?.me) {
          setUser(data.me);
        } else {
          clearTokens();
        }
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => setLoading(false));
  }, [apolloClient]);

  const login = useCallback(
    (accessToken: string, refreshToken: string, user: User) => {
      setTokens(accessToken, refreshToken);
      setUser(user);
    },
    []
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    apolloClient.clearStore();
  }, [apolloClient]);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
