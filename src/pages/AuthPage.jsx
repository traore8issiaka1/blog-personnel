import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

const initialLogin = { username: "", password: "" };
const initialRegister = { name: "", username: "", password: "" };

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAppContext();
  const [tab, setTab] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [error, setError] = useState("");

  async function handleLoginSubmit(event) {
    event.preventDefault();
    const result = await login(loginForm);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate("/dashboard");
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    const result = await register(registerForm);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate("/dashboard");
  }

  return (
    <Box className="auth-page">
      <Grid container spacing={2} sx={{ width: "100%", maxWidth: 980 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="h4">Bienvenue</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1.25 }}>
              Creez votre espace blog personnel, partagez vos articles avec vos amis, puis gerez
              votre cercle social facilement.
            </Typography>
            <Stack spacing={1.2} sx={{ mt: 3 }}>
              <Typography variant="body2">1. Inscription ou connexion</Typography>
              <Typography variant="body2">2. Ajout et validation d&apos;amis</Typography>
              <Typography variant="body2">3. Publication et moderation de contenu</Typography>
            </Stack>
            <Alert severity="info" sx={{ mt: 3 }}>
              Demo: `issiaka / pass123` et `hawa / pass123`
            </Alert>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5">Acces a l&apos;application</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Connectez-vous pour ouvrir votre tableau de bord.
            </Typography>

            <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mt: 2 }}>
              <Tab value="login" label="Connexion" />
              <Tab value="register" label="Inscription" />
            </Tabs>

            {tab === "login" ? (
              <Box component="form" sx={{ mt: 2 }} onSubmit={handleLoginSubmit}>
                <Stack spacing={2}>
                  <TextField
                    label="Nom utilisateur"
                    autoComplete="username"
                    value={loginForm.username}
                    onChange={(event) =>
                      setLoginForm((prev) => ({ ...prev, username: event.target.value }))
                    }
                  />
                  <TextField
                    label="Mot de passe"
                    type="password"
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                  />
                  <Button type="submit" variant="contained" size="large">
                    Se connecter
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Box component="form" sx={{ mt: 2 }} onSubmit={handleRegisterSubmit}>
                <Stack spacing={2}>
                  <TextField
                    label="Nom complet"
                    autoComplete="name"
                    value={registerForm.name}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                  <TextField
                    label="Nom utilisateur"
                    autoComplete="username"
                    value={registerForm.username}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, username: event.target.value }))
                    }
                  />
                  <TextField
                    label="Mot de passe"
                    type="password"
                    autoComplete="new-password"
                    value={registerForm.password}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                  />
                  <Button type="submit" variant="contained" size="large">
                    Creer un compte
                  </Button>
                </Stack>
              </Box>
            )}

            {error ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            ) : null}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
