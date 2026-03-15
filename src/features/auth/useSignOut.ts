import { useMutation } from "@apollo/client";
import { SIGN_OUT } from "./graphql";
import { useAuth } from "../../lib/auth/AuthContext";

export function useSignOut() {
  const { logout } = useAuth();
  const [mutate, { loading }] = useMutation(SIGN_OUT);

  const signOut = async () => {
    try {
      await mutate();
    } finally {
      logout();
    }
  };

  return { signOut, loading };
}
