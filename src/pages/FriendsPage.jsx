import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ConfirmDialog from "../components/ConfirmDialog";
import FeedbackSnackbar from "../components/FeedbackSnackbar";
import PageHeader from "../components/PageHeader";
import { useAppContext } from "../context/AppContext";
import { areFriends } from "../lib/helpers";

function UserLine({ name, actions, badge }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
      sx={{ py: 0.5 }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography>{name}</Typography>
        {badge ? <Chip label={badge} size="small" color="info" /> : null}
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {actions}
      </Stack>
    </Stack>
  );
}

function SectionCard({ title, children }) {
  return (
    <Paper sx={{ p: 2.25 }}>
      <Typography variant="h6">{title}</Typography>
      <Divider sx={{ my: 1 }} />
      <Stack spacing={1}>{children}</Stack>
    </Paper>
  );
}

export default function FriendsPage() {
  const {
    currentUser,
    users,
    friendRequests,
    sendFriendRequest,
    respondToRequest,
    removeFriend,
    blockUser,
    unblockUser,
  } = useAppContext();

  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState({ open: false, type: "success", message: "" });
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Confirmer",
    confirmColor: "primary",
    action: null,
  });

  const incomingRequests = useMemo(
    () =>
      friendRequests.filter(
        (request) => request.toUserId === currentUser.id && request.status === "pending"
      ),
    [friendRequests, currentUser.id]
  );

  const friends = useMemo(
    () => users.filter((user) => currentUser.friendIds.includes(user.id)),
    [users, currentUser.friendIds]
  );

  const blocked = useMemo(
    () => users.filter((user) => currentUser.blockedUserIds.includes(user.id)),
    [users, currentUser.blockedUserIds]
  );

  const searchResults = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return [];
    return users.filter(
      (user) =>
        user.id !== currentUser.id &&
        (user.name.toLowerCase().includes(keyword) || user.username.toLowerCase().includes(keyword))
    );
  }, [search, users, currentUser.id]);

  async function apply(action, successMessage) {
    const result = await action();
    if (result.ok) {
      setFeedback({ open: true, type: "success", message: successMessage });
    } else {
      setFeedback({ open: true, type: "error", message: result.error });
    }
    return result;
  }

  function openConfirm(config) {
    setConfirmState({ open: true, ...config });
  }

  function closeConfirm() {
    setConfirmState((prev) => ({ ...prev, open: false }));
  }

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Gestion des amis" subtitle="Invitations, blocages et relations." />

      <SectionCard title="Rechercher des utilisateurs">
        <TextField
          fullWidth
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nom ou nom utilisateur"
          inputProps={{ "aria-label": "Rechercher des utilisateurs" }}
        />
        {search.trim() && searchResults.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucun resultat.
          </Typography>
        ) : null}
        <Stack spacing={1}>
          {searchResults.map((user) => {
            const isFriend = areFriends(currentUser, user);
            const isBlocked = currentUser.blockedUserIds.includes(user.id);
            const hasPending = friendRequests.some(
              (request) =>
                request.status === "pending" &&
                ((request.fromUserId === currentUser.id && request.toUserId === user.id) ||
                  (request.fromUserId === user.id && request.toUserId === currentUser.id))
            );

            let actions = (
              <Button
                size="small"
                variant="contained"
                onClick={() => apply(() => sendFriendRequest(user.id), "Demande envoyee.")}
              >
                Ajouter
              </Button>
            );
            if (isFriend) {
              actions = <Typography variant="body2">Deja ami</Typography>;
            } else if (isBlocked) {
              actions = (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => apply(() => unblockUser(user.id), "Utilisateur debloque.")}
                >
                  Debloquer
                </Button>
              );
            } else if (hasPending) {
              actions = <Typography variant="body2">Demande en attente</Typography>;
            }

            return <UserLine key={user.id} name={user.name} badge={`@${user.username}`} actions={actions} />;
          })}
        </Stack>
      </SectionCard>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Demandes recues">
            {incomingRequests.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucune demande en attente.
              </Typography>
            ) : (
              incomingRequests.map((request) => {
                const sender = users.find((user) => user.id === request.fromUserId);
                return (
                  <UserLine
                    key={request.id}
                    name={sender?.name ?? "Utilisateur inconnu"}
                    badge={sender ? `@${sender.username}` : undefined}
                    actions={
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() =>
                            apply(() => respondToRequest(request.id, true), "Demande acceptee.")
                          }
                        >
                          Accepter
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            apply(() => respondToRequest(request.id, false), "Demande refusee.")
                          }
                        >
                          Refuser
                        </Button>
                      </>
                    }
                  />
                );
              })
            )}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Utilisateurs bloques">
            {blocked.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucun utilisateur bloque.
              </Typography>
            ) : (
              blocked.map((user) => (
                <UserLine
                  key={user.id}
                  name={user.name}
                  badge={`@${user.username}`}
                  actions={
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => apply(() => unblockUser(user.id), "Utilisateur debloque.")}
                    >
                      Debloquer
                    </Button>
                  }
                />
              ))
            )}
          </SectionCard>
        </Grid>
      </Grid>

      <SectionCard title="Mes amis">
        {friends.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucun ami pour l&apos;instant.
          </Typography>
        ) : (
          friends.map((friend) => (
            <UserLine
              key={friend.id}
              name={friend.name}
              badge={`@${friend.username}`}
              actions={
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() =>
                      openConfirm({
                        title: "Supprimer cet ami ?",
                        description: `Cette action retirera ${friend.name} de votre liste d'amis.`,
                        confirmLabel: "Supprimer",
                        confirmColor: "error",
                        action: async () =>
                          apply(() => removeFriend(friend.id), "Ami supprime de votre liste."),
                      })
                    }
                  >
                    Supprimer
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    onClick={() =>
                      openConfirm({
                        title: "Bloquer cet utilisateur ?",
                        description: `${friend.name} ne pourra plus interagir avec vous tant qu'il est bloque.`,
                        confirmLabel: "Bloquer",
                        confirmColor: "warning",
                        action: async () => apply(() => blockUser(friend.id), "Utilisateur bloque."),
                      })
                    }
                  >
                    Bloquer
                  </Button>
                </>
              }
            />
          ))
        )}
      </SectionCard>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        confirmColor={confirmState.confirmColor}
        onClose={closeConfirm}
        onConfirm={async () => {
          await confirmState.action?.();
          closeConfirm();
        }}
      />

      <FeedbackSnackbar
        open={feedback.open}
        type={feedback.type}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </Stack>
  );
}
