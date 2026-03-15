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
import { useSignIn } from "./useSignIn";

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, loading, error } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn(email, password);
    if (result) navigate("/new");
  };

  return (
    <Container size={420} py={80}>
      <Title ta="center" fw={800}>
        Welcome back
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Don&apos;t have an account?{" "}
        <Anchor component={Link} to="/signup" size="sm">
          Sign up
        </Anchor>
      </Text>
      <Group justify="center" mt="md">
        <Badge color="grape" variant="light" radius="xl">
          New here?
        </Badge>
        <Anchor component={Link} to="/how-to-remember" size="sm">
          Read how memory works first
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
              label="Email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <PasswordInput
              label="Password"
              placeholder="Your password"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            <Button type="submit" fullWidth loading={loading}>
              Sign in
            </Button>
            <Button
              component={Link}
              to="/how-to-remember"
              variant="subtle"
              color="gray"
              rightSection={<IconArrowRight size={16} />}
            >
              Why Sticky is built this way
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
