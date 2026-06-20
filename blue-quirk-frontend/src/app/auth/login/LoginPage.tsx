"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField, Button, Card, CardContent, Box } from "@mui/material";
import { authProvider } from "../authProvider";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    login: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await authProvider.login(form);
      router.push("/admin-v2");
    } catch {
      alert("Invalid credentials");
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <Card sx={{ width: 420 }}>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Login"
              fullWidth
              margin="normal"
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
            />

            <TextField
              label="Email"
              fullWidth
              margin="normal"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}