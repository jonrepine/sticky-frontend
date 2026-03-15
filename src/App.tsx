import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ApolloProvider } from "@apollo/client";
import { Center, Loader } from "@mantine/core";
import { client } from "./lib/graphql/client";
import { AuthProvider, useAuth } from "./lib/auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";

const LoginPage = lazy(() =>
  import("./features/auth/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const SignupPage = lazy(() =>
  import("./features/auth/SignupPage").then((module) => ({ default: module.SignupPage }))
);
const WorkspacePage = lazy(() =>
  import("./features/workspace/WorkspacePage").then((module) => ({
    default: module.WorkspacePage,
  }))
);
const HowToRememberPage = lazy(() =>
  import("./features/guides/HowToRememberPage").then((module) => ({
    default: module.HowToRememberPage,
  }))
);
const HowToUseStickyPage = lazy(() =>
  import("./features/guides/HowToUseStickyPage").then((module) => ({
    default: module.HowToUseStickyPage,
  }))
);
const MyCardsPage = lazy(() =>
  import("./features/my-cards/MyCardsPage").then((module) => ({ default: module.MyCardsPage }))
);
const InfoBitDetailPage = lazy(() =>
  import("./features/infobits/InfoBitDetailPage").then((module) => ({
    default: module.InfoBitDetailPage,
  }))
);
const SettingsPage = lazy(() =>
  import("./features/settings/SettingsPage").then((module) => ({ default: module.SettingsPage }))
);
const PlaygroundPage = lazy(() =>
  import("./features/playground/PlaygroundPage").then((module) => ({
    default: module.PlaygroundPage,
  }))
);

function RouteLoader() {
  return (
    <Center h="50vh">
      <Loader size="lg" />
    </Center>
  );
}

function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
}

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/new" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <AuthRedirect>
                  <LazyRoute>
                    <LoginPage />
                  </LazyRoute>
                </AuthRedirect>
              }
            />
            <Route
              path="/signup"
              element={
                <AuthRedirect>
                  <LazyRoute>
                    <SignupPage />
                  </LazyRoute>
                </AuthRedirect>
              }
            />
            <Route
              path="/how-to-remember"
              element={
                <LazyRoute>
                  <HowToRememberPage />
                </LazyRoute>
              }
            />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/new" replace />} />
              <Route
                path="infobits/:id"
                element={
                  <LazyRoute>
                    <InfoBitDetailPage />
                  </LazyRoute>
                }
              />
              <Route
                path="my-cards"
                element={
                  <LazyRoute>
                    <MyCardsPage />
                  </LazyRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <LazyRoute>
                    <SettingsPage />
                  </LazyRoute>
                }
              />
              <Route
                path="playground"
                element={
                  <LazyRoute>
                    <PlaygroundPage />
                  </LazyRoute>
                }
              />
              <Route
                path="how-to-use-sticky"
                element={
                  <LazyRoute>
                    <HowToUseStickyPage />
                  </LazyRoute>
                }
              />
              <Route
                path=":section"
                element={
                  <LazyRoute>
                    <WorkspacePage />
                  </LazyRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/new" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ApolloProvider>
  );
}
