import { useMemo, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { formatDate } from "../lib/helpers";

export default function ArticleCard({
  article,
  author,
  comments,
  canComment,
  onAddComment,
  actions,
}) {
  const [commentInput, setCommentInput] = useState("");
  const [error, setError] = useState("");
  const [openComments, setOpenComments] = useState(true);

  const sortedComments = useMemo(
    () =>
      [...comments].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [comments]
  );

  async function submitComment() {
    if (!commentInput.trim()) {
      setError("Commentaire vide.");
      return;
    }
    const result = await onAddComment?.(article.id, commentInput);
    if (result?.ok) {
      setCommentInput("");
      setError("");
    } else if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <Card elevation={0}>
      <CardContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1}
        >
          <Typography variant="h6">{article.title}</Typography>
          <Stack direction="row" spacing={1}>
            <Chip size="small" label={article.isPublic ? "Public" : "Prive"} />
            <Chip
              size="small"
              color={article.allowComments ? "success" : "default"}
              label={article.allowComments ? "Commentaires actifs" : "Sans commentaires"}
            />
          </Stack>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Par {author?.name ?? "Utilisateur inconnu"} - maj {formatDate(article.updatedAt)}
        </Typography>

        <Typography variant="body1" sx={{ mt: 2, whiteSpace: "pre-wrap", lineHeight: 1.75 }}>
          {article.content}
        </Typography>

        {actions ? <Box sx={{ mt: 2 }}>{actions}</Box> : null}

        <Divider sx={{ my: 2 }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2">Commentaires ({sortedComments.length})</Typography>
          <IconButton
            size="small"
            aria-label={openComments ? "Masquer commentaires" : "Afficher commentaires"}
            onClick={() => setOpenComments((prev) => !prev)}
          >
            <ExpandMoreIcon
              sx={{
                transform: openComments ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </IconButton>
        </Stack>

        <Collapse in={openComments}>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {sortedComments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucun commentaire.
              </Typography>
            ) : (
              sortedComments.map((comment) => (
                <Box key={comment.id} sx={{ background: "#F4F8FF", p: 1.25, borderRadius: 1.5 }}>
                  <Typography variant="body2">{comment.content}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {comment.authorName ?? "Utilisateur"} - {formatDate(comment.createdAt)}
                  </Typography>
                </Box>
              ))
            )}
          </Stack>
        </Collapse>

        {canComment && article.allowComments ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
            <TextField
              size="small"
              fullWidth
              value={commentInput}
              onChange={(event) => setCommentInput(event.target.value)}
              placeholder="Ajouter un commentaire"
              inputProps={{ "aria-label": `Commenter l'article ${article.title}` }}
            />
            <Button variant="contained" onClick={submitComment}>
              Commenter
            </Button>
          </Stack>
        ) : null}

        {error ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
