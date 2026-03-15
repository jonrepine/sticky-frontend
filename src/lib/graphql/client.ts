import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
  Observable,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "../auth/tokens";
import { REFRESH_SESSION } from "../../features/auth/graphql";
import { triggerSessionExpiry } from "../auth/sessionExpiry";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const httpLink = createHttpLink({
  uri: API_URL,
  headers: {
    "apollo-require-preflight": "true",
  },
});

const authLink = setContext((_, { headers }) => {
  const token = getAccessToken();
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

let isRefreshing = false;
let pendingRequests: (() => void)[] = [];

const resolvePending = () => {
  pendingRequests.forEach((cb) => cb());
  pendingRequests = [];
};

const errorLink = onError(({ graphQLErrors, operation, forward }) => {
  if (!graphQLErrors) return;

  const authError = graphQLErrors.find(
    (e) => e.message === "Authentication required"
  );
  if (!authError) return;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    triggerSessionExpiry();
    return;
  }

  if (isRefreshing) {
    return new Observable((observer) => {
      pendingRequests.push(() => {
        forward(operation).subscribe(observer);
      });
    });
  }

  isRefreshing = true;

  return new Observable((observer) => {
    client
      .mutate({
        mutation: REFRESH_SESSION,
        variables: { rt: refreshToken },
      })
      .then(({ data }) => {
        const payload = data?.refreshSession;
        if (payload) {
          setTokens(payload.accessToken, payload.refreshToken);
          operation.setContext(({ headers = {} }: { headers: Record<string, string> }) => ({
            headers: {
              ...headers,
              Authorization: `Bearer ${payload.accessToken}`,
            },
          }));
        }
        isRefreshing = false;
        resolvePending();
        forward(operation).subscribe(observer);
      })
      .catch(() => {
        isRefreshing = false;
        pendingRequests = [];
        triggerSessionExpiry();
      });
  });
});

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          infoBits: {
            keyArgs: ["categoryId", "status"],
            merge(existing, incoming, { args }) {
              // Only append when paginating (cursor present); otherwise replace
              if (!existing || !args?.cursor) return incoming;
              return {
                ...incoming,
                edges: [...existing.edges, ...incoming.edges],
              };
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: "cache-and-network" },
  },
});
