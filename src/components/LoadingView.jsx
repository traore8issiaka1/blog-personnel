import { Box, CircularProgress, Typography } from "@mui/material";

export default function LoadingView({ label = "Chargement..." }) {
  return (
    <Box
      sx={{
        minHeight: "40vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 1.5,
      }}
      role="status"
      aria-live="polite"
    >
      <CircularProgress size={30} />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
