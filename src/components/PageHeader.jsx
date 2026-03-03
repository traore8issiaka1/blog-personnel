import { Stack, Typography } from "@mui/material";

export default function PageHeader({ title, subtitle }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="h5">{title}</Typography>
      {subtitle ? (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      ) : null}
    </Stack>
  );
}
