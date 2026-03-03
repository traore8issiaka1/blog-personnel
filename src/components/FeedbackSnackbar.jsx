import { Alert, Snackbar } from "@mui/material";

export default function FeedbackSnackbar({ open, type = "success", message, onClose }) {
  return (
    <Snackbar open={open} autoHideDuration={2500} onClose={onClose} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
      <Alert severity={type} onClose={onClose} variant="filled" sx={{ width: "100%" }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
