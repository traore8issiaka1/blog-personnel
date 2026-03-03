import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import AppShell from "./components/AppShell";
import LoadingView from "./components/LoadingView";
import { AppProvider, useAppContext } from "./context/AppContext";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const FriendsPage = lazy(() => import("./pages/FriendsPage"));
const ArticlesPage = lazy(() => import("./pages/ArticlesPage"));

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1F4B99" },
    secondary: { main: "#0EA5A3" },
    warning: { main: "#D97706" },
    background: { default: "#F2F6FB", paper: "#FFFFFF" },
    text: { primary: "#102A43", secondary: "#486581" },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Segoe UI", "Poppins", "Helvetica Neue", sans-serif',
    h4: { fontWeight: 800, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(16, 42, 67, 0.08)",
          boxShadow: "0 10px 30px rgba(31, 75, 153, 0.08)",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: "1rem",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(16, 42, 67, 0.08)",
          boxShadow: "0 8px 24px rgba(16, 42, 67, 0.08)",
        },
      },
    },
  },
});

function ProtectedRoute({ children }) {
  const { currentUser, isBootstrapping } = useAppContext();
  if (isBootstrapping) return <LoadingView label="Verification de la session..." />;
  return currentUser ? children : <Navigate to="/auth" replace />;
}

function PublicAuthRoute({ children }) {
  const { currentUser, isBootstrapping } = useAppContext();
  if (isBootstrapping) return <LoadingView label="Chargement..." />;
  return currentUser ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingView label="Chargement de l'application..." />}>
      <Routes>
        <Route
          path="/auth"
          element={
            <PublicAuthRoute>
              <AuthPage />
            </PublicAuthRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="friends" element={<FriendsPage />} />
          <Route path="articles" element={<ArticlesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </ThemeProvider>
  );
}
