import { useMutation } from "@apollo/client";
import { SIGN_UP } from "./graphql";
import { useAuth } from "../../lib/auth/AuthContext";
import type { AuthPayload } from "../../types";

export function useSignUp() {
  const { login } = useAuth();
  const [mutate, { loading, error }] = useMutation<{ signUp: AuthPayload }>(
    SIGN_UP
  );

  const signUp = async (
    email: string,
    password: string,
    timezone: string,
    username?: string
  ) => {
    const { data } = await mutate({
      variables: {
        input: { email, password, timezone, ...(username ? { username } : {}) },
      },
    });
    if (data?.signUp) {
      login(data.signUp.accessToken, data.signUp.refreshToken, data.signUp.user);
    }
    return data?.signUp;
  };

  return { signUp, loading, error };
}
