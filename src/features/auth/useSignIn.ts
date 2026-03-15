import { useMutation } from "@apollo/client";
import { SIGN_IN } from "./graphql";
import { useAuth } from "../../lib/auth/AuthContext";
import type { AuthPayload } from "../../types";

export function useSignIn() {
  const { login } = useAuth();
  const [mutate, { loading, error }] = useMutation<{ signIn: AuthPayload }>(
    SIGN_IN
  );

  const signIn = async (email: string, password: string) => {
    const { data } = await mutate({
      variables: { input: { email, password } },
    });
    if (data?.signIn) {
      login(data.signIn.accessToken, data.signIn.refreshToken, data.signIn.user);
    }
    return data?.signIn;
  };

  return { signIn, loading, error };
}
