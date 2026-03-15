import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query Me {
    me {
      userId
      email
      timezone
      username
      createdAt
      updatedAt
    }
  }
`;

export const SIGN_UP = gql`
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      accessToken
      refreshToken
      user {
        userId
        email
        timezone
        username
      }
    }
  }
`;

export const SIGN_IN = gql`
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      accessToken
      refreshToken
      user {
        userId
        email
        timezone
        username
      }
    }
  }
`;

export const SIGN_OUT = gql`
  mutation SignOut {
    signOut
  }
`;

export const REFRESH_SESSION = gql`
  mutation RefreshSession($rt: String!) {
    refreshSession(refreshToken: $rt) {
      accessToken
      refreshToken
      user {
        userId
        email
      }
    }
  }
`;

export const UPDATE_ME = gql`
  mutation UpdateMe($input: UpdateMeInput!) {
    updateMe(input: $input) {
      userId
      username
      timezone
    }
  }
`;
