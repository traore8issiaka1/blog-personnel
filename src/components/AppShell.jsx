import { useMemo, useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

const navItems = [
  { label: "Tableau de bord", path: "/dashboard" },
  { label: "Amis", path: "/friends" },
  { label: "Articles", path: "/articles" },
];

export default function AppShell() {
  const { currentUser, logout } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabValue = useMemo(() => {
    const active = navItems.find((item) => location.pathname.startsWith(item.path));
    return active?.path ?? false;
  }, [location.pathname]);

  return (
    <Box>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "rgba(255,255,255,0.95)",
          color: "text.primary",
          borderBottom: "1px solid rgba(16, 42, 67, 0.1)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Toolbar sx={{ gap: 1.5, minHeight: 72 }}>
          {isMobile ? (
            <IconButton aria-label="Ouvrir le menu" onClick={() => setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          ) : null}
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Blog Personnel
          </Typography>

          {!isMobile ? (
            <Tabs
              value={tabValue}
              indicatorColor="secondary"
              onChange={(_, value) => navigate(value)}
              sx={{ flexGrow: 1, minHeight: 40, ml: 1 }}
            >
              {navItems.map((item) => (
                <Tab key={item.path} label={item.label} value={item.path} />
              ))}
            </Tabs>
          ) : (
            <Box sx={{ flexGrow: 1 }} />
          )}

          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar sx={{ bgcolor: "primary.main", width: 34, height: 34 }}>
              {currentUser?.name?.charAt(0)?.toUpperCase() ?? "U"}
            </Avatar>
            {!isMobile ? (
              <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                {currentUser?.name}
              </Typography>
            ) : null}
          </Stack>
          <Button color="primary" variant="outlined" onClick={logout}>
            Deconnexion
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260, p: 1.5 }}>
          <Typography variant="subtitle1" sx={{ px: 1, py: 1, fontWeight: 700 }}>
            Navigation
          </Typography>
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.path}
                selected={tabValue === item.path}
                onClick={() => {
                  navigate(item.path);
                  setDrawerOpen(false);
                }}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      <Container sx={{ py: 3, maxWidth: "lg" }}>
        <Outlet />
      </Container>
    </Box>
  );
}
