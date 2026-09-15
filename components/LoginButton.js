"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { rotaDoCrm } from "../lib/security";

export default function LoginButton() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return (
      <Link className="btn-login" href={rotaDoCrm(user.email)}>
        Painel
      </Link>
    );
  }

  return (
    <Link className="btn-login" href="/login">
      Login
    </Link>
  );
}
