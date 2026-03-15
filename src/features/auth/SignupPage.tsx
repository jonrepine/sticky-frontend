import { useState } from "react";
import {
  Badge,
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Stack,
  Anchor,
  Alert,
  Container,
  Group,
} from "@mantine/core";
import { IconAlertCircle, IconArrowRight } from "@tabler/icons-react";
import { useNavigate, Link } from "react-router-dom";
import { useSignUp } from "./useSignUp";

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp, loading, error } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const result = await signUp(email, password, timezone, username || undefined);
    if (result) navigate("/how-to-use-sticky?from=signup");
  };

  return (
    <Container size={420} py={80}>
      <Title ta="center" fw={800}>
        Create your account
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account?{" "}
        <Anchor component={Link} to="/login" size="sm">
          Sign in
        </Anchor>
      </Text>
      <Group justify="center" mt="md">
        <Badge color="brand" variant="light" radius="xl">
          Before you start
        </Badge>
        <Anchor component={Link} to="/how-to-remember" size="sm">
          Read how to make facts stick
        </Anchor>
      </Group>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
              >
                {error.message}
              </Alert>
            )}
            <TextInput
              label="Username"
              placeholder="Display name (optional)"
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
            />
            <TextInput
              label="Email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <PasswordInput
              label="Password"
              placeholder="Minimum 8 characters"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              minLength={8}
            />
            <Button type="submit" fullWidth loading={loading}>
              Create account
            </Button>
            <Button
              component={Link}
              to="/how-to-remember"
              variant="subtle"
              color="gray"
              rightSection={<IconArrowRight size={16} />}
            >
              Read the memory article
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
